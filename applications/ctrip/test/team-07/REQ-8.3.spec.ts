// requirements: REQ-3.8, REQ-3.9, REQ-8.3
import { test, expect } from '@playwright/test';
import {
  action,
  button,
  heading,
  installClock,
  loginOwner,
  openBooking,
  openHome,
  radio,
  region,
  submitBooking,
  tab,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-8.3: Show a newly paid order in pending vouchers', async ({ page }) => {
  await openHome(page);
  await loginOwner(page, 'profile_read');
  await openBooking(page);
  await submitBooking(page);

  await heading(page, 'Payment');
  await expect(page).toHaveURL(/#\/payment\/[^/]+$/);
  const paymentHash = new URL(page.url()).hash;
  const match = paymentHash.match(/^#\/payment\/([^/]+)$/);
  if (!match) throw new Error(`Missing order number in payment URL: ${page.url()}`);
  const orderNumber = decodeURIComponent(match[1]);
  expect(orderNumber).toMatch(/^CTRIP[0-9]+$/);

  await radio(page, 'Alipay').check();
  await button(page, 'Pay now').click();
  await visible(page.getByRole('status').filter({ hasText: 'Payment successful' }));

  await action(page, 'More services').click();
  await action(page, 'Reimbursement vouchers').click();
  await tab(page, 'Pending').click();

  const pendingVouchers = region(page, 'Pending vouchers');
  await visible(pendingVouchers);

  // The newly paid order has no voucher application and must be eligible.
  await expect(pendingVouchers.getByText(orderNumber, { exact: true })).toBeVisible();
});
