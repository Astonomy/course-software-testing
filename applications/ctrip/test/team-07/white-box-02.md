# REQ-1.5 Test: Decline registration reached through Free registration

## Description

Declining the registration agreement after entering through **Free registration** leaves the visitor on the Log in page instead of returning to the signed-out homepage.

## Test method and design basis

**Method:** White-box testing with a Playwright UI test.

In `applications/ctrip/frontend/pages-core.js`, the Free registration agreement path supplies an empty `onDecline` callback. The ordinary Register path instead navigates home on decline. The test therefore selects the previously untested entry point and activates Decline.

## Requirement reference

**REQ-1.5:** Free registration opens the registration agreement, and Decline returns to the signed-out homepage without creating an account or displaying My account.

## Difference from existing tests

`baseline/REQ-1.5.spec.ts` tests Free registration → Agree and global Register → Decline separately. It does not test Free registration → Decline.

## Preconditions

Start Ctrip from a fresh application state and remain signed out. No account is created for this test.

## Test description

Playwright-based

1. Open the homepage and select Log in.
2. Select Free registration.
3. Verify that Registration agreement and privacy policy appears.
4. Click Decline.
5. Verify that the dialog closes, the Ctrip Travel homepage appears, and signed-out navigation remains visible.

## Requirement: Expected Output

The agreement closes and the signed-out **Ctrip Travel homepage** is displayed. My account is absent.

## Observed Output

The agreement closes, but the **Log in** heading and password-login form remain visible. The homepage heading is absent.

## Evidence

- [Observed screenshot](assets/REQ-1.5-observed.png)
- [Initial execution log](assets/new-tests-observed.txt)
- [Clean six-test rerun log](assets/all-tests-clean-rerun.txt)

## Automated test

Requires Node.js, `@playwright/test`, Chromium, and a running Ctrip instance. From `applications/ctrip/test/team-07`:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-1.5.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is one failed test at the homepage assertion.
