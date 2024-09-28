import { createClient } from '@supabase/supabase-js';
import {advanceOrders, getAdvanceableOrdersByEmail, getAdvanceableOrders} from '$lib/utils/orderStatusUtils';
import dotenv from 'dotenv';

// console.log('Current working directory:', process.cwd());
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY!;
// const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

async function runCLI() {
    const supabaseAdminClient = createClient(supabaseUrl, supabaseAdminKey);
    const args = process.argv.slice(2);

    // Helper to get argument value by flag (e.g. --order or --user)
    const getArgValue = (flag: string) => {
        const index = args.indexOf(flag);
        return index !== -1 && args[index + 1] ? args[index + 1] : null;
    };

    // Fetch arguments
    const orderId = getArgValue('--order');
    const userEmail = getArgValue('--email');
    const allPossible = args.includes('--all=true');

    try {
        let orderIds: string[];
        if (!userEmail) {
            if (orderId) {
                // If specific orderId is provided, advance that specific order
                orderIds = [orderId];
            } else {
                // Fetch advancable orders for the client
                orderIds = await getAdvanceableOrders(supabaseAdminClient, allPossible);
                if (!orderIds.length) {
                    console.log('No orders to advance.');
                    return;
                }
            }
        } else {
            orderIds = await getAdvanceableOrdersByEmail(supabaseAdminClient, userEmail, allPossible);
        }
        // Advance the orders
        const results = await advanceOrders(supabaseAdminClient, orderIds);
        console.log('Advance results:', results);
    } catch (error) {
        console.error('Error advancing orders:', (error as Error).message);
    }
}

runCLI();
