# REQ-8.3 Test: Newly paid order missing from Pending vouchers

## Description

Ctrip omits a newly created and paid flight order from **Pending vouchers**, even though the order has been paid and no voucher application has been submitted.

## Test method and design basis

**Method:** White-box testing with a Playwright UI end-to-end test.

The source path in `applications/ctrip/backend/app.py` guides the test design:

1. `orders.create` creates a new order without initializing `voucher_status`.
2. `orders.pay` changes the order to `Paid` and records payment information without initializing `voucher_status`.
3. `vouchers.list` skips an order whose `voucher_status` is `NULL`.

The selected input therefore creates a new order through the public UI, pays it using simulated Alipay, and checks the resulting public voucher state. The test does not call internal APIs, inspect the database, or modify the application.

## Requirement reference

- **REQ-3.8:** A valid flight booking can be submitted to the cashier.
- **REQ-3.9:** Selecting Alipay and clicking Pay now simulates payment for the submitted order.
- **REQ-8.3:** Pending vouchers displays eligible paid orders without voucher applications.

## Difference from existing tests

- `baseline/REQ-3.8.spec.ts` stops at the unpaid Payment page.
- `baseline/REQ-3.9.spec.ts` checks Payment successful but does not inspect vouchers.
- `baseline/REQ-8.3.spec.ts` uses pre-seeded voucher orders and does not create and pay a new order.

This test adds the missing **create order → pay order → Pending vouchers** integration path and asserts the dynamically generated order number rather than a seeded order number.

## Preconditions

1. Use a fresh Ctrip application state. The `profile_read` account initially owns no orders or vouchers.
2. Start Ctrip with `sh start.sh --port auto` from `applications/ctrip` and use the URL printed by the launcher.
3. The instructions below use `http://127.0.0.1:3000`. Set `BASE_URL` to the actual URL if the launcher selects another port.
4. Install Node.js, `@playwright/test`, and Chromium for the automated test. Do not commit `node_modules` or generated test results.

For an optional clean rerun, stop Ctrip and remove only the generated `applications/ctrip/.data/app.sqlite3` runtime database before restarting. Do not remove source files.

## Test description

Playwright-based

1. Sign in as `profile_read` using the seeded account credentials in the baseline helpers.
2. Search for a Chengdu–Guangzhou flight on July 21, 2026.
3. Open fares for flight `JD5162` and book Economy fare.
4. Enter Full name `Wang Wu`, ID number `110101199001011237`, and Contact mobile `13800000014`.
5. Select Agree to booking terms and click Submit order.
6. Capture the generated order number from the payment URL.
7. Select Alipay and click Pay now.
8. Verify that Payment successful is displayed.
9. Open More services → Reimbursement vouchers and select Pending.
10. Verify that Pending vouchers contains the generated order number.

## Requirement: Expected Output

Under REQ-8.3, the newly paid order has no voucher application and is eligible for reimbursement. **Pending vouchers should contain the generated order number.**

## Observed Output

The order is created and paid successfully, but **Pending vouchers does not contain the generated order number** and instead displays **No vouchers available**. The final Playwright assertion fails because the order-number element is absent.

Observed executions:

| Run | Application state | Generated order | Observed result |
| --- | --- | --- | --- |
| Initial run | Fresh clone with no existing runtime database | `CTRIP20260719106` | Payment succeeded; the new order was absent from Pending vouchers. |
| Clean rerun | Runtime database deleted while stopped, then reinitialized | `CTRIP20260719293` | The same final assertion failed; Pending vouchers displayed No vouchers available. |

## Evidence

- [First-run screenshot](assets/REQ-8.3-first-run.png)
- [Clean-rerun screenshot](assets/REQ-8.3-clean-rerun.png)
- [Clean-rerun execution log](assets/REQ-8.3-clean-rerun.txt)

## Automated test

Files:

- `REQ-8.3.spec.ts`
- `playwright.config.ts`

From `applications/ctrip/test/team-07`, run:

```sh
npm install --no-save --no-package-lock @playwright/test
npx playwright install chromium
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-8.3.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is **one failed test** at the final Pending vouchers assertion. Earlier booking and payment assertions must pass before that failure is considered valid evidence.
