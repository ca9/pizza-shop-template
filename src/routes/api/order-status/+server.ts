import { json } from '@sveltejs/kit';
import { mapOrderStatuses } from '$lib/utils/orderStatusUtils';

export const POST = async ({ locals: { supabase }, request }) => {
    const { orderId } = await request.json();
    // console.log("requested :", orderId);

    // Fetch order status from the database
    const { data: orderStatuses, error } = await supabase
        .from('order_status')
        // .select('status, status_notes, created_at')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) {
        return json({ error: 'Error fetching order status' }, { status: 500 });
    }

    /// Use the shared function to map the order statuses to human-readable format
    const orderStatusesResponse = mapOrderStatuses(orderStatuses);

    // console.log("fetched: ", readableStatuses);
    return json(orderStatusesResponse);
};


