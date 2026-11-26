// requirement: REQ-1.5
import { test, expect } from '@playwright/test';
import {
  action,
  button,
  dialog,
  heading,
  installClock,
  nav,
  openHome,
  openLogin,
  signedOut,
  visible,
} from '../baseline/helpers';

test.beforeEach(async ({ page }) => {
  await installClock(page);
});

test('REQ-1.5: Decline registration reached through Free registration', async ({ page }) => {
  await openHome(page);
  await openLogin(page);
  await action(page, 'Free registration').click();

  const agreement = dialog(page, 'Registration agreement and privacy policy');
  await visible(agreement);
  await button(agreement, 'Decline').click();

  await expect(agreement).toHaveCount(0);
  await heading(page, 'Ctrip Travel');
  await signedOut(page);
});
