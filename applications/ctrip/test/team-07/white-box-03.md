# REQ-1.13 Test: Reject an SMS code sent before logout

## Description

An SMS verification code sent before logout remains usable in a later login attempt even though no code was sent in the current attempt.

## Test method and design basis

**Method:** White-box testing with a Playwright UI test.

In `applications/ctrip/backend/app.py`, verification rows are keyed by session ID, mobile number, and purpose. `auth.login_sms` accepts a matching persisted row, while logout deletes the login session without invalidating the verification row. The test uses logout as an explicit attempt boundary and then submits the old code without Send code.

## Requirement reference

- **REQ-1.4:** SMS login supports the simulated verification flow.
- **REQ-1.8:** Logout establishes a signed-out state.
- **REQ-1.13:** Authentication must be rejected when no code was sent in the current attempt; a code is valid only after Send code in the current verification attempt.

## Difference from existing tests

- `baseline/REQ-1.13.spec.ts` covers a code when Send code has never been used.
- `baseline/REQ-1.8.spec.ts` covers logout without a pending verification code.
- `baseline/REQ-1.4.spec.ts` covers successful same-attempt authentication.

No baseline covers Send code → logout → a new SMS attempt without Send code.

## Preconditions

Use a fresh browser context. The seeded SMS account is `13800000011`; the simulated code is `123456`. The password account used to traverse logout is `ctrip_user@example.com` / `Travel1234`.

## Test description

Playwright-based

1. Open Log in → Verification code login.
2. Enter `13800000011`, click Send code, and wait for Resend code.
3. Switch to Password login and sign in as `ctrip_user@example.com`.
4. Open My account and select Log out.
5. Open Verification code login again.
6. Enter `13800000011` and `123456`, accept the terms, and click Log in without sending a code after logout.
7. Verify that authentication is rejected, the SMS form remains, and My account is absent.

## Requirement: Expected Output

The post-logout attempt is rejected because no verification code was sent in that attempt.

## Observed Output

Authentication succeeds using the pre-logout code. The signed-in homepage appears with **My account**, and no rejection alert is displayed.

## Evidence

- [Observed screenshot](assets/REQ-1.13-observed.png)
- [Initial execution log](assets/new-tests-observed.txt)
- [Clean six-test rerun log](assets/all-tests-clean-rerun.txt)

## Automated test

From `applications/ctrip/test/team-07`, with dependencies installed and Ctrip running:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-1.13.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is one failed test at the rejection-alert assertion.
