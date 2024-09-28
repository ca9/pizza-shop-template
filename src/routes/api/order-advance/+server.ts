import { json } from '@sveltejs/kit';
import { getAdvanceableOrders, advanceOrders } from '$lib/utils/orderStatusUtils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, user } }) => {
    const { order_id, all_possible } = await request.json();
    // Ensure the user is authenticated
    if (!user) {
        return json({ error: 'Unauthorized: User must be logged in to advance orders' }, { status: 401 });
    }
    try {
        let orderIds: string[];
        // 1. If a specific order_id is provided, advance only that order
        if (order_id) {
            orderIds = [order_id];
            // 2. If all_possible is set, advance all eligible orders
        } else if (all_possible) {
            orderIds = await getAdvanceableOrders(supabase, all_possible);
            // 3. Otherwise, advance the most recent order
        } else {
            orderIds = await getAdvanceableOrders(supabase, false); // get most recent
        }

        // Proceed to advance the orders
        const result = await advanceOrders(supabase, orderIds);
        return json({ success: true, result });

    } catch (error: unknown) {
        // Handle the error safely
        if (error instanceof Error) {
            return json({ error: `Failed to advance orders: ${error.message}` }, { status: 500 });
        }
        // Fallback for unexpected error structures
        return json({ error: 'An unknown error occurred while advancing orders' }, { status: 500 });
    }
};
