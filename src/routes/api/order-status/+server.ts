import { json, type RequestEvent } from '@sveltejs/kit';

// Your API handler for fetching order data asynchronously
export const POST = async ({ request } : RequestEvent ) => {
    const data = await request.json();
    const orderId = data.orderId;

    console.log('Fetching status for order ID:', orderId); // Log the incoming orderId

    // Simulated fetching order statuses
    // todo: replace with actual DB/API calls
    const statuses = [
            { status: 'Order received', status_notes: 'We have received your order', created_at: '2024-09-28T12:00:00Z' },
            { status: 'Order Accepted', status_notes: 'Your order is being prepared', created_at: '2024-09-28T12:05:00Z' },
            { status: 'Cooking', status_notes: 'Cooking in progress', created_at: '2024-09-28T12:15:00Z' },
            // { status: 'On its way!', status_notes: 'Your pizza is on its way', created_at: '2024-09-28T12:30:00Z' },
            // { status: 'Order Complete', status_notes: 'Your order has been delivered', created_at: '2024-09-28T12:45:00Z' }
    ];

    return json({ statuses });
};
