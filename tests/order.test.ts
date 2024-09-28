import type { Database } from '../src/lib/database'
import { withSupawright } from 'supawright'
import { expect } from '@playwright/test'
import { advanceOrders } from "$lib/utils/orderStatusUtils";

const test = withSupawright<Database, 'public'>(['public'], {})

function randomString(length: number) {
  return Math.random()
    .toString(36)
    .substring(2, length + 2)
}

test('can order a pizza', async ({ supawright, page }) => {
  const email = `${randomString(10)}@example.com`
  const password = randomString(10)
  const user = await supawright.createUser({ email, password, email_confirm: true })
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 3000 })

  await page.getByText('Medium').click()
  await page.getByTestId('pepperoni-plus').click()
  await page.getByTestId('mushrooms-plus').click()
  await page.getByTestId('extra cheese-plus').click()
  await page.getByTestId('extra cheese-plus').click()

  await page.click('button[type="submit"]')
  await page.waitForURL('/orders*', { timeout: 3000 })

  const { data: order, error: orderFetchError } = await supawright
    .supabase()
    .from('order')
    .select('*, pizza_size (*), order_topping (*)')
    .eq('user_id', user.id)
    .single()
  if (orderFetchError) {
    throw orderFetchError
  }

  expect(order.order_topping.length).toBe(3)
  expect(order.pizza_size!.size).toBe('Medium')

  const { data: order_status, error: orderStatusError } = await supawright
      .supabase()
      .from('order_status')
      .select('*')
      .eq('order_id', order.id)
      .single()
  if (orderStatusError) {
    throw orderStatusError
  }
  expect(order_status.status).toBe("Order Received");

  await advanceOrders(supawright.supabase(), [order.id]);
  const { data: order_status2, error: orderStatusError2 } = await supawright
      .supabase()
      .from('order_status')
      .select('*')
      .eq('order_id', order.id )
      .order("created_at", { ascending: false } ).limit(1)
      .single()
  if (orderStatusError2) {
    throw orderStatusError2
  }

  expect(order_status2.status).toBe("Order Accepted");
})
