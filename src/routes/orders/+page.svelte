<script lang="ts">
  import { onMount } from 'svelte';
  import Panel from '$lib/components/Panel.svelte'
  import { XMarkSolid20 } from '@withpluto/heroicons-svelte'
  import type { PageData } from './$types'

  export let data: PageData
  let showThanks = data.thank

  function calculateTotal(order: (typeof data.orders)[number]) {
    const totalToppings = order.order_topping.reduce(
      (acc, topping) => acc + topping.quantity,
      0,
    )
    return (
      order.pizza_size!.price +
      Math.max(0, totalToppings - order.pizza_size!.num_included_toppings) *
        order.pizza_size!.price_per_additional_topping
    )
  }

  let selectedOrderId: string;
  let orderStatuses: Array<{ status: string, status_notes: string, created_at: string }> = [];
  let error: string | null = null;

  // Select the topmost order on mount
  onMount(() => {
    let orders = data.orders;
    if (orders.length > 0) {
      selectedOrderId = orders[0].id;
      fetchStatus(selectedOrderId);
      // console.log(selectedOrderId);
    }
  });

  // Ensure correct typing for the orderId parameter
  function selectOrder(orderId: string) {
    // console.log("Clicked Select Order for : " + orderId);
    selectedOrderId = orderId;
    error = null;
    fetchStatus(orderId);
  }

  const statusOrder = ['Order received', 'Order Accepted', 'Cooking', 'On its way!', 'Order Complete'];
  const statusIcons: Record<string, string> = {
    'Order received': 'fas fa-receipt',
    'Order Accepted': 'fas fa-thumbs-up',
    'Cooking': 'fas fa-fire',
    'On its way!': 'fas fa-motorcycle',
    'Order Complete': 'fas fa-check-circle'
  };

  // Fetch order status dynamically via POST
  async function fetchStatus(orderId: string) {
    try {
      const response = await fetch('/api/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (response.ok) {
        const result = await response.json();
        orderStatuses = result.statuses;
      } else {
        error = 'Failed to fetch order status';
      }
    } catch (err) {
      error = 'Error fetching order status';
      console.error(err);
    }
  }

</script>

<style>
  .order-panel-box {
    padding: 1em;
    cursor: pointer;
  }

  .order-panel-box.selected {
    border-color: #007bff;
    background-color: #f0f8ff;
  }

  .status-flow {
    display: flex;
    gap: 1em;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    flex-direction: column;
    justify-content: start;
  }

  .status-not-found {
    color: red;
  }

  .current-selected {
    padding: 16px; /* Equivalent to Tailwind's p-4 */
    margin: 8px; /* Add margin for spacing */
    border-radius: 8px; /* Equivalent to Tailwind's rounded-lg */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.1); /* Equivalent to shadow-lg */
    border: 4px solid #7e22ce; /* Equivalent to Tailwind's ring-4 ring-purple-500 */
    background-color: white; /* Equivalent to Tailwind's bg-white */
  }
</style>

<div class="flex w-full flex-col items-center gap-6">
  {#if showThanks}
    <Panel
      class="flex w-full flex-row items-center justify-between gap-4 bg-blue-400 p-4 text-white"
    >
      <p>Thank you for your order!</p>
      <button on:click={() => (showThanks = false)}><XMarkSolid20 /></button>
    </Panel>
  {/if}

  <!-- Order Status Section -->
  {#if orderStatuses.length > 0}
    <h1 class="text-2xl font-bold">Order Status</h1>
    <!-- p>Order: {selectedOrderId} </p-->
    <div class="status-flow flex sm:flex-row flex-col items-center justify-between w-full">
      {#each statusOrder as status, index}
        {@const isCurrentStatus = index === orderStatuses.length - 1 }
        <div class="status-item {isCurrentStatus ? 'current-selected' : ''}">

          <!-- Icon logic -->
          <i class={statusIcons[status] + ' text-3xl ' + (index <= orderStatuses.length - 1 ? 'text-purple-800' : 'text-gray-400')}></i>

          <!-- Time below each icon -->
          {#if index <= orderStatuses.length - 1}
            <span class="text-sm text-gray-500">{new Date(orderStatuses[index].created_at).toLocaleTimeString([],
                    { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          {/if}

          <!-- Status text: bold for the last one, normal for others -->
          <div class={isCurrentStatus ? 'font-bold text-center text-xl mt-1' : 'text-center text-sm mt-1'}>
            {status}
          </div>

          <!-- Show status_notes by default for the last status, toggle on click for others -->
          {#if isCurrentStatus}
            <p class="text-sm text-gray-600 mt-2">
              {orderStatuses[index].status_notes}
            </p>
          {/if}
        </div>

        <!-- Dotted line logic -->
        {#if index < statusOrder.length - 1}
          <div class="progress-line flex-1 h-1 mx-2 border-t-2 border-dotted border-gray-400" class:bg-green-500={index < orderStatuses.length - 1}></div>
        {/if}
      {/each}
    </div>
  {:else if error}
    <p class="status-not-found">{error}</p>
  {/if}

  <h1 class="text-2xl font-bold">Orders</h1>

  <div class="flex w-full flex-col items-center gap-4">
    { #each data.orders as order }
      {@const price = calculateTotal(order)}
      <Panel class="flex w-full flex-col gap-4 p-6">
        <div
                class="order-panel-box"
                role="button"
                tabindex="0"
                on:keydown={(event) => event.key === 'Enter' && selectOrder(order.id)}
                class:selected={order.id === selectedOrderId}
                on:click={() => selectOrder(order.id)}
        >
          <div class="flex flex-row items-center justify-between">
            <h2 class="text-xl font-bold">
            {new Date(order.created_at).toLocaleDateString()}
            </h2>
            <h3 class="font-bold text-right">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </h3>
          </div>
          <hr class="my-4 border-gray-300">
          <div class="flex flex-row items-start justify-between gap-4">
            <div class="flex flex-col gap-2">
              <p class="text-lg font-bold">
                {order.pizza_size?.size} pizza
                {#if order.order_topping.length > 0}
                  with:
                {/if}
              </p>
              {#if order.order_topping.length > 0}
                <p class="text-sm">
                  Toppings: {order.order_topping
                        .map((topping) => `${topping.topping?.name} x${topping.quantity}`)
                        .join(', ')}
                </p>
              {/if}
              {#if order.special_notes}
                <div class="flex flex-col gap-2">
                  <h2 class="text-xl font-bold">Special notes</h2>
                  <p class="text-sm">
                    {order.special_notes}
                  </p>
                </div>
              {/if}
            </div>

            <div class="flex flex-col gap-2">
              <h2 class="text-xl font-bold">Total</h2>
              <p class="text-2xl font-bold">
                £{price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </Panel>
    {/each}
  </div>
</div>
