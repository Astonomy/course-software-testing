// requirements: REQ-1.4, REQ-1.8, REQ-1.13
import { test, expect } from '@playwright/test';
import {
  action,
  button,
  checkbox,
  field,
  installClock,
  openHome,
  signedOut,
  smsLoginForm,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-1.13: Reject an SMS code sent before logout', async ({ page }) => {
  await openHome(page);
  await smsLoginForm(page);
  await field(page, 'Mobile number').fill('13800000011');
  await button(page, 'Send code').click();
  await visible(action(page, 'Resend code'));

  await action(page, 'Password login').click();
  await field(page, 'Account').fill('ctrip_user@example.com');
  await field(page, 'Password').fill('Travel1234');
  await checkbox(page, 'Agree to terms').check();
  await button(page, 'Log in').click();
  await visible(action(page, 'My account'));

  await action(page, 'My account').hover();
  await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
  await signedOut(page);

  await smsLoginForm(page);
  await field(page, 'Mobile number').fill('13800000011');
  await field(page, 'Verification code').fill('123456');
  await checkbox(page, 'Agree to terms').check();
  await button(page, 'Log in').click();

  // No code was sent in this post-logout attempt, so authentication must fail.
  await visible(page.getByRole('alert'));
  await visible(field(page, 'Mobile number'));
  await expect(action(page, 'My account')).toHaveCount(0);
});
