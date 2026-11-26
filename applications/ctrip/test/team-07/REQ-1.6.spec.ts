// requirements: REQ-1.5, REQ-1.6
import { test, expect } from '@playwright/test';
import {
  action,
  button,
  dialog,
  field,
  heading,
  installClock,
  nav,
  openHome,
  registrationPhone,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-1.6: Reject a code sent only in a previous registration attempt', async ({ page }, testInfo) => {
  const phone = registrationPhone(testInfo);
  await openHome(page);

  await nav(page).getByRole('link', { name: 'Register', exact: true }).click();
  await button(dialog(page, 'Registration agreement and privacy policy'), 'Agree and continue').click();
  await field(page, 'Mobile number').fill(phone);
  await button(page, 'Send code').click();
  await visible(action(page, 'Resend code'));

  await nav(page).getByRole('link', { name: 'Ctrip Travel', exact: true }).click();
  await nav(page).getByRole('link', { name: 'Register', exact: true }).click();
  await button(dialog(page, 'Registration agreement and privacy policy'), 'Agree and continue').click();
  await field(page, 'Mobile number').fill(phone);
  await field(page, 'Verification code').fill('123456');
  await button(page, 'Next, set password').click();

  // The restarted attempt has not sent a code and must not advance.
  await visible(page.getByRole('alert'));
  await heading(page, 'Verify mobile number');
  await expect(page.getByRole('heading', { name: 'Set password', exact: true })).toHaveCount(0);
});
