# REQ-1.6 Test: Reject a code from a previous registration attempt

## Description

After registration is abandoned and restarted, a verification code sent only in the previous attempt still advances the new attempt to Set password.

## Test method and design basis

**Method:** White-box testing with a Playwright UI test.

In `applications/ctrip/backend/app.py`, `auth.send_code` persists a registration verification row by session ID, phone, and purpose. `auth.check_code` accepts that row without a registration-attempt identifier. Returning home and accepting the agreement again does not invalidate the previous row. The test therefore restarts registration through public navigation and omits Send code in the second attempt.

## Requirement reference

- **REQ-1.5:** The visitor accepts the registration agreement before mobile verification.
- **REQ-1.6:** Registration verification uses a code sent in the current attempt before advancing to Set password.

## Difference from existing tests

- `baseline/REQ-1.6.spec.ts` sends and uses the code in one uninterrupted attempt.
- `baseline/REQ-1.9.spec.ts` covers an incorrect code after a current-attempt Send.
- `baseline/REQ-1.15.spec.ts` covers an empty code after a current-attempt Send.

The restarted-attempt path is not covered.

## Preconditions

Use a fresh browser context and the benchmark clock. `registrationPhone(testInfo)` generates a unique, previously unregistered phone number for each run.

## Test description

Playwright-based

1. Open Register and click Agree and continue.
2. Enter the generated mobile number and click Send code.
3. Return home using the Ctrip Travel navigation link.
4. Open Register and accept the agreement again.
5. Enter the same mobile number and `123456`, but do not click Send code in this attempt.
6. Click Next, set password.
7. Verify that a rejection alert appears, Verify mobile number remains, and Set password is absent.

## Requirement: Expected Output

The restarted attempt is rejected because no code was sent in that attempt.

## Observed Output

The registration advances to **Set password** and displays a verification-complete message for the generated phone number. No rejection alert appears.

## Evidence

- [Observed screenshot](assets/REQ-1.6-observed.png)
- [Initial execution log](assets/new-tests-observed.txt)
- [Clean six-test rerun log](assets/all-tests-clean-rerun.txt)

## Automated test

From `applications/ctrip/test/team-07`, with dependencies installed and Ctrip running:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-1.6.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is one failed test at the rejection-alert assertion.
