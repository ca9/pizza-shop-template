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

  let selectedOrder: typeof data.orders[number];
  let orderStatuses: Array<{ status: string, status_notes: string, created_at: string, readable_status: string }> = [];
  let error: string | null = null;

  // fetchTimeoutForResourcePreservation
  let fetchCount = 0;  // Track the number of fetches
  let maxFetchCount = 100;  // Set the maximum fetch count per refresh
  let showRefreshMessage = false;

  // Select the topmost order on mount
  onMount(() => {
    let orders = data.orders;
    if (orders.length > 0) {
      selectedOrder = orders[0];
      fetchStatus(selectedOrder.id);
    }

    // Set up the interval to fetch the status periodically
    const refreshIntervalObj = setInterval(() => {
      if (fetchCount <= maxFetchCount) {
        fetchCount++;
        fetchStatus(selectedOrder.id);
      } else {
        showRefreshMessage = true;
        clearInterval(refreshIntervalObj);
      }
    }, 30000); // 30 seconds = 30000 ms
  });

  // Ensure correct typing for the orderId parameter
  function selectOrder(order: typeof data.orders[number]) {
    // console.log("Clicked Select Order for : " + orderId);
    selectedOrder = order;
    error = null;
    fetchStatus(order.id);
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
    console.log("to fetch: " + orderId);
    try {
      const response = await fetch('/api/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (response.ok) {
        const result = await response.json();
        orderStatuses = result;
        console.log(orderStatuses);
      } else {
        error = 'Failed to fetch order status';
      }
    } catch (err) {
      error = 'Error fetching order status';
      console.error(err);
    }
  }

  function legibleDate(dateString: string) {
    return new Date(dateString)
            .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function legibleTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
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
    padding: 16px;
    margin: 8px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.1);
    border: 4px solid #7e22ce;
    background-color: white;
  }

  .refresh-message {
    color: red;
    text-align: center;
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
  {#if orderStatuses?.length > 0}
    <h1 class="text-2xl font-bold">Order Status</h1>
    {#if showRefreshMessage}
      <div class="refresh-message text-center">
        <b>Note: </b> Auto-refresh for order-status stopped to save your device's resources! <br />
        Please refresh the page to resume auto-updates to your order status.
      </div>
    {/if}
    <div class="text-center">Order for <strong>{selectedOrder.pizza_size?.size.toLowerCase()} pizza </strong> at <br />
      { legibleTime(selectedOrder.created_at) }, on { legibleDate(selectedOrder.created_at) }
      <br /><p class="text-gray-500 text-xs"> Order ID: {selectedOrder.id} </p>
    </div>
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
            <p class="text-sm text-gray-600 mt-2 text-center">
              {orderStatuses[index].readable_status}
              {#if orderStatuses[index].status_notes} <br /> {orderStatuses[index].status_notes} {/if}
            </p>
          {/if}
        </div>

        <!-- Dotted line logic -->
        {#if index < statusOrder.length - 1}
          <div class="progress-line flex-1 h-1 mx-2 border-t-2 border-dotted border-gray-400"
               class:bg-green-500={index < orderStatuses.length - 1}></div>
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
                on:keydown={(event) => event.key === 'Enter' && selectOrder(order)}
                class:selected={order.id === selectedOrder?.id}
                on:click={() => selectOrder(order)}
        >
          <div class="flex flex-row items-center justify-between">
            <h2 class="text-xl font-bold">
              { legibleDate(order.created_at) }
            </h2>
            <h3 class="font-bold text-right">
              { legibleTime(order.created_at) }
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
