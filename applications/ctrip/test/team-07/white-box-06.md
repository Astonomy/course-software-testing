# REQ-4.2 Test: Filtering an order resets its countdown

## Description

Selecting the Pending payment filter rerenders the order list and restores one second already elapsed on the pending order's public countdown.

## Test method and design basis

**Method:** White-box testing with a Playwright UI test.

In `applications/ctrip/frontend/pages-account.js`, the order list is loaded once, but every `renderList()` call creates a new `started = Date.now()` while reusing the original `remaining_seconds`. Selecting a lifecycle tab invokes `renderList()`. The test therefore advances the browser clock before filtering and compares captured numeric countdown values before and after the tab change.

## Requirement reference

- **REQ-4.2:** Pending payment filters the Order list while retaining the pending order and its available payment action.
- **REQ-4.4 and the shared timing contract:** Public countdowns use elapsed time.

Filtering must not restore elapsed time.

## Difference from existing tests

- `baseline/REQ-4.2.spec.ts` checks filtered record membership and status, not countdown continuity.
- `baseline/REQ-4.4.spec.ts` checks a decreasing countdown on the unchanged order-detail page, not after list filtering.

## Preconditions

Use the benchmark clock and sign in as `order_read`. The seeded pending order is `CTRIP20260721001`.

## Test description

Playwright-based

1. Open My account → Orders as `order_read`.
2. Read the Time remaining value within record `CTRIP20260721001`.
3. Advance browser time by 1.1 seconds and verify that the countdown decreases.
4. Select the Pending payment tab.
5. Verify that the order remains the sole filtered record.
6. Read the same order's countdown and verify that it is no greater than the elapsed value captured before filtering.

## Requirement: Expected Output

The countdown continues from the elapsed value; filtering does not increase it.

## Observed Output

The countdown increases by one second after filtering:

- Initial observed run: expected at most `86256`, received `86257`.
- Clean six-test rerun: expected at most `86374`, received `86375`.

The exact allowance varies with the seeded runtime state; the observed increase is the fault oracle.

## Evidence

- [Observed screenshot](assets/REQ-4.2-observed.png)
- [Initial execution log](assets/new-tests-observed.txt)
- [Clean six-test rerun log](assets/all-tests-clean-rerun.txt)

## Automated test

From `applications/ctrip/test/team-07`, with dependencies installed and Ctrip running:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-4.2.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is one failed numeric comparison after filtering.
