import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { advanceOrders, getAdvanceableOrders, getAdvanceableOrdersByEmail } from '$lib/utils/orderStatusUtils';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database';
import dotenv from "dotenv";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// console.log('Current working directory:', process.cwd());
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdminClient = createClient(supabaseUrl, supabaseAdminKey);

// Path to the cron metadata file
const CRON_FILE_PATH = path.resolve('cronJobs.json');

// Define the type structure for the cron data
interface CronData {
    [key: string]: {
        orderId?: string;
        userEmail?: string;
        allPossible?: boolean;
        minuteFrequency: number;
        maxDelayMinutes: number;
        startedAt: string;
        action?: string;
    };
}

/**
 * Utility function to read cron metadata from a file.
 */
function readCronFile(): CronData {
    try {
        if (fs.existsSync(CRON_FILE_PATH)) {
            const fileContents = fs.readFileSync(CRON_FILE_PATH, 'utf-8');
            return JSON.parse(fileContents);
        }
    } catch (error) {
        console.error('Error reading cron file:', error);
    }
    return {};
}

/**
 * Utility function to write cron metadata to a file.
 */
function writeCronFile(data: CronData) {
    try {
        fs.writeFileSync(CRON_FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to cron file:', error);
    }
}

/**
 * Start a cron job to randomly advance orders based on a 1-10 minute interval.
 */
export function startAdvanceOrdersCron({
                                           client,
                                           minuteFrequency = 1,
                                           maxDelayMinutes = 10,
                                           orderId,
                                           userEmail,
                                           allPossible,
                                       }: {
    client: SupabaseClient<Database>;
    minuteFrequency: number;
    maxDelayMinutes: number;
    orderId?: string;
    userEmail?: string;
    allPossible?: boolean;
}) {
    // Generate a unique cron key with all params for uniqueness
    const cronKey = `advanceOrders_${orderId || 'anyOrder'}_${userEmail || 'anyUser'}_${allPossible ? 'all' : 'latest'}`;

    // Read cron file and check if cron job exists
    const cronMetadata = readCronFile();
    if (cronMetadata[cronKey]) {
        console.log(`Cron job '${cronKey}' is already running.`);
        return;
    }

    const task = cron.schedule(`*/${minuteFrequency} * * * *`, async () => {
        console.log(`Cron job triggered for '${cronKey}'`);
        const cronRunData = readCronFile()

        if (cronRunData[cronKey]?.action === 'STOP') {
            console.log(`Cron job ${cronKey} has been marked to stop.`);
            delete cronRunData[cronKey];
            writeCronFile(cronRunData);
            task.stop();
            process.exit(0);
        }

        let orderIds: string[] = [];

        try {
            // Fetch orders based on parameters
            if (orderId) {
                orderIds.push(orderId);
            } else if (userEmail) {
                orderIds = await getAdvanceableOrdersByEmail(client, userEmail, allPossible || false);
            } else {
                orderIds = await getAdvanceableOrders(client, allPossible || false);
            }
            if (!orderIds.length) {
                console.log('No orders to advance.');
                return;
            }
            const lastUpdateTimes = await getLastOrderStatusUpdateTimes(client, orderIds);
            for (const [orderId, lastUpdateTime] of Object.entries(lastUpdateTimes)) {
                const now = new Date();
                const lastUpdateDate = new Date(lastUpdateTime);
                const minutesSinceLastUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60);
                if ( minutesSinceLastUpdate >= ( Math.random() * maxDelayMinutes )) {
                    console.log(`Advancing order ${orderId} after ${minutesSinceLastUpdate} minutes.`);
                    await advanceOrders(client, [orderId]);
                } else {
                    console.log(`Skipped advancing order ${orderId} on this cron run.`);
                }
            }
        } catch (error) {
            console.error(`Error in cron job for '${cronKey}':`, error);
        }
    });

    // Update the file to track the cron
    cronMetadata[cronKey] = {
        minuteFrequency,
        maxDelayMinutes,
        orderId,
        userEmail,
        allPossible,
        startedAt: new Date().toISOString(),
        action: 'RUNNING'
    };
    writeCronFile(cronMetadata);
    console.log(`Cron job starting with key '${cronKey}'`);
    task.start();
}

/**
 * Stop a specific cron job and remove it from the file.
 */
export function stopCronJob(cronKey: string) {
    const cronMetadata = readCronFile();
    cronMetadata[cronKey].action = "STOP";
    writeCronFile(cronMetadata);
    console.log(cronKey +  " marked to stop.");
}


// Stopping all crons by marking them as STOP in the file
export function stopAllCrons() {
    const cronMetadata = readCronFile();
    for (const key in cronMetadata) {
        cronMetadata[key].action = 'STOP';
    }
    writeCronFile(cronMetadata);
    console.log('All cron jobs marked to stop.');
}

/**
 * Fetch the latest order status update times for multiple orders.
 */
async function getLastOrderStatusUpdateTimes(client: SupabaseClient<Database>, orderIds: string[]) {
    const { data: statusRecords, error } = await client
        .from('order_status')
        .select('order_id, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error('Failed to fetch last status updates');
    }

    const latestUpdates: Record<string, string> = {};
    for (const record of statusRecords || []) {
        const { order_id, created_at } = record;
        if (!latestUpdates[order_id] || new Date(created_at) > new Date(latestUpdates[order_id])) {
            latestUpdates[order_id] = created_at;
        }
    }

    return latestUpdates;
}

// Define the CLI interface using yargs
const argv = yargs(hideBin(process.argv))
    .command('start', 'Start the cron job', (yargs) => {
        return yargs
            .option('minuteFrequency', { type: 'number', default: 1, describe: 'Frequency in minutes to run cron' })
            .option('maxDelayMinutes', { type: 'number', default: 10, describe: 'Max delay between cron executions' })
            .option('orderId', { type: 'string', describe: 'Specific order ID to advance', demandOption: false })
            .option('email', { type: 'string', describe: 'Email to advance orders for a user', demandOption: false })
            .option('all', { type: 'boolean', describe: 'Advance all possible orders', default: false });
    })
    .command('stop', 'Stop the cron job', (yargs) => {
        return yargs.option('cronKey', { type: 'string', describe: 'Cron key to stop', demandOption: false });
    })
    .demandCommand(1, 'You need to specify a command: start, stop or stop-all')
    .help()
    .parseSync(); // Ensures the parsed values are not promise-like

// Handle CLI actions
const action = argv._[0] as string; // 'start' or 'stop'

if (action === 'start') {
    const minuteFrequency = argv.minuteFrequency as number;
    const maxDelayMinutes = argv.maxDelayMinutes as number;
    const orderId = argv.orderId as string | undefined;
    const userEmail = argv.email as string | undefined;
    const allPossible = argv.all as boolean;

    if (minuteFrequency <= 0 || maxDelayMinutes <= 0) {
        console.error('Invalid minute frequency or max delay minutes.');
        process.exit(1);
    }

    startAdvanceOrdersCron({
        client: supabaseAdminClient,
        minuteFrequency,
        maxDelayMinutes,
        orderId,
        userEmail,
        allPossible,
    });
} else if (action === 'stop') {
    const cronKey = argv.cronKey as string || undefined;
    if (cronKey) {
        console.log("Stopping specifically " + cronKey);
        stopCronJob(cronKey);
    } else {
        stopAllCrons();
    }
} else {
    console.error('Invalid command. Use start or stop.');
}
