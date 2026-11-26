// requirements: REQ-4.2, REQ-4.4
import { test, expect } from '@playwright/test';
import {
  countdownSeconds,
  installClock,
  openHome,
  openOrders,
  record,
  records,
  region,
  tab,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-4.2: Preserve the order countdown when filtering orders', async ({ page }) => {
  await openHome(page);
  await openOrders(page, 'order_read');

  const order = record(region(page, 'Order list'), 'CTRIP20260721001');
  const timer = order.getByRole('timer', { name: 'Time remaining', exact: true });
  await visible(timer);
  const initial = await countdownSeconds(timer);
  expect(initial).toBeGreaterThan(0);

  await page.clock.runFor(1100);
  const elapsed = await countdownSeconds(timer);
  expect(elapsed).toBeLessThan(initial);

  await tab(page, 'Pending payment').click();
  await expect(records(region(page, 'Order list'))).toHaveCount(1);
  await visible(timer);

  // Filtering must not restore time already elapsed before the tab change.
  const afterFilter = await countdownSeconds(timer);
  expect(afterFilter).toBeLessThanOrEqual(elapsed);
});
