// requirement: REQ-3.5
import { test, expect } from '@playwright/test';
import {
  button,
  checkbox,
  field,
  heading,
  IDS,
  installClock,
  loginOwner,
  openBooking,
  openHome,
  region,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-3.5: Place invalid-contact feedback in Contact information', async ({ page }) => {
  await openHome(page);
  await loginOwner(page, 'user');
  await openBooking(page);

  await field(region(page, 'Passenger details'), 'Full name').fill('Wang Wu');
  await field(region(page, 'Passenger details'), 'ID number').fill(IDS[0]);
  await field(page, 'Contact mobile').fill('123');
  await checkbox(page, 'Agree to booking terms').check();
  await button(page, 'Submit order').click();

  // Wait for rejection without making the unspecified alert wording the oracle.
  await visible(page.getByRole('alert').filter({ hasText: 'Enter a valid contact mobile number' }));
  await heading(page, 'Book flight');
  await expect(page.getByRole('heading', { name: 'Payment', exact: true })).toHaveCount(0);

  await expect(region(page, 'Contact information').getByRole('alert')).toBeVisible();
});
