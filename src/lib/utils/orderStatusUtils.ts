import {type Database} from '$lib/database';
import type {SupabaseClient} from "@supabase/supabase-js";

// Define reusable types
export type OrderStatusEnum = Database['public']['Enums']['order_status_enum'];
export type OrderStatusRow = Database['public']['Tables']['order_status']['Row'];

export const orderStatusMapping: Record<OrderStatusEnum, string> = {
    "Order Received": "Your order has been received.",
    "Order Accepted": "Your order has been accepted.",
    "Cooking": "We are preparing your meal.",
    "On Its Way": "Your order is out for delivery.",
    "Order Complete": "Enjoy your meal!"
};

// Utility function to get the next status
export function getNextStatus(currentStatus: OrderStatusEnum) {
    const statusStages = Object.keys(orderStatusMapping) as OrderStatusEnum[];
    const currentIndex = statusStages.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusStages.length - 1) {
        return null;
    }
    return statusStages[currentIndex + 1];
}


// Utility function to map the order statuses to human-readable format
export function mapOrderStatuses(orderStatuses: OrderStatusRow[]) {
    return orderStatuses.map(status => ({
        ...status,
        readable_status: orderStatusMapping[status.status] || status.status
    }));
}


/**
 * Advance the order statuses for the provided list of order_ids
 */
export async function advanceOrders(client: SupabaseClient<Database>, orderIds: string[]) {
    const results = [];

    // Fetch all statuses for each order_id
    const {data: orderStatuses, error} = await client
        .from('order_status')
        .select(`*`)
        .in('order_id', orderIds)
        .order('created_at', {ascending: false});

    if (error || !orderStatuses) {
        throw new Error('Failed to fetch latest order statuses');
    }

    const latestStatuses = orderStatuses.reduce(
        (acc: Record<string, OrderStatusRow>, status: OrderStatusRow) => {
            if (!acc[status.order_id] || (new Date(status.created_at) > new Date(acc[status.order_id].created_at))) {
                acc[status.order_id] = status;
            }
            return acc;
        },
        {} as Record<string, OrderStatusRow>
    );

    // Continue with processing the latest statuses
    for (const orderId of orderIds) {
        const status = latestStatuses[orderId];
        if (!status) continue;
        const nextStatus = getNextStatus(status.status);
        if (!nextStatus) {
            results.push({order_id: status.order_id, message: 'Order is already complete.'});
            continue;
        }
        const {error: updateError} = await client
            .from('order_status')
            .insert({order_id: status.order_id, status: nextStatus});
        if (updateError) {
            results.push({order_id: status.order_id, message: `Failed to advance order: ${updateError.message}`});
        } else {
            results.push({order_id: status.order_id, message: `Order advanced to ${nextStatus}`});
        }
    }

    return results;
}

/**
 * Fetch the advancable orders for a given client.
 * - If `allPossible` is true, fetch all orders that aren't complete for the user or admin.
 * - If `allPossible` is false, fetch the most recent order for the user or admin.
 */
export async function getAdvanceableOrders(
    client: SupabaseClient<Database>,
    allPossible: boolean
) {
    // Fetch all orders that have incomplete statuses and join with `order_status`
    if (allPossible) {
        const {data: orders, error} = await client
            .from('order')
            .select(`
                id,
                order_status(status)
            `)
            .not('order_status.status', 'eq', 'Order Complete');

        if (error || !orders) {
            throw new Error(`Failed to fetch orders: ${error?.message || 'Unknown error'}`);
        }

        return orders.map(order => order.id); // Return the order IDs
    } else {
        // Fetch the most recent incomplete order
        const {data: recentOrder, error} = await client
            .from('order')
            .select(`
                id,
                order_status(status)
            `)
            .not('order_status.status', 'eq', 'Order Complete')
            .order('created_at', {ascending: false})
            .limit(1)
            .single();

        if (error || !recentOrder) {
            throw new Error(`No recent orders found: ${error?.message || 'Unknown error'}`);
        }

        return [recentOrder.id]; // Return as an array
    }
}



// Version using email (looks up user first via Admin API)
export async function getAdvanceableOrdersByEmail(
    supabaseAdmin: SupabaseClient<Database>,
    email: string,
    allPossible: boolean
) {
    // Use Admin API to fetch user details based on email
    const { data , error: userError } = await supabaseAdmin
        .auth.admin.listUsers()

    if (userError || !data) {
        throw new Error('Failed to fetch user by email');
    }
    // Find the user by email within the fetched data
    const user = data.users.find(u => u.email === email);
    if (!user) {
        throw new Error('No user found with the provided email.');
    }
    const userId = user.id;
    if (allPossible) {
        const { data: orders, error: ordersError } = await supabaseAdmin
            .from('order')
            .select('id, order_status(status)')
            .eq('user_id', userId)
            .not('order_status.status', 'eq', 'Order Complete')
        if (ordersError || !orders) {
            throw new Error(`Failed to fetch orders: ${ordersError?.message || 'Unknown error'}`);
        }
        return orders.map(order => order.id);
    } else {
        // Fetch the most recent order for the user
        const { data: recentOrder, error: recentOrderError } = await supabaseAdmin
            .from('order')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (recentOrderError || !recentOrder) {
            throw new Error(`No recent orders found: ${recentOrderError?.message || 'Unknown error'}`);
        }
        return [recentOrder.id];
    }
}
