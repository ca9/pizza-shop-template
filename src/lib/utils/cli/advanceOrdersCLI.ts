import { createClient } from '@supabase/supabase-js';
import { advanceOrders, getAdvanceableOrdersByEmail, getAdvanceableOrders } from '$lib/utils/orderStatusUtils';
import dotenv from 'dotenv';
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// console.log('Current working directory:', process.cwd());
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdminClient = createClient(supabaseUrl, supabaseAdminKey);

interface Args {
    email?: string;
    orderId?: string;
    all: boolean;
}

const args = yargs(hideBin(process.argv))
    .option('email', { type: 'string', describe: 'Advance orders for the given email', demandOption: false })
    .option('orderId', { type: 'string', describe: 'Advance a specific order by ID', demandOption: false })
    .option('all', { type: 'boolean', describe: 'Advance all possible orders', default: false })
    .help().parseSync() as Args;

async function runCLI() {
    const { email, orderId, all } = args;

    try {
        let orderIds: string[];
        if (!email) {
            if (orderId) {
                // If specific orderId is provided, advance that specific order
                orderIds = [orderId];
            } else {
                // Fetch advancable orders for the client
                orderIds = await getAdvanceableOrders(supabaseAdminClient, all);
                if (!orderIds.length) {
                    console.log('No orders to advance.');
                    return;
                }
            }
        } else {
            orderIds = await getAdvanceableOrdersByEmail(supabaseAdminClient, email, all);
        }
        // Advance the orders
        const results = await advanceOrders(supabaseAdminClient, orderIds);
        console.log('Advance results:', results);
    } catch (error) {
        console.error('Error advancing orders:', (error as Error).message);
    }
}

runCLI();
