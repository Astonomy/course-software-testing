# REQ-3.5 Test: Invalid-contact feedback is outside Contact information

## Description

Submitting an invalid contact mobile number produces feedback below Airport services rather than inside the required **Contact information** validation region.

## Test method and design basis

**Method:** White-box testing with a Playwright UI test.

In `applications/ctrip/frontend/pages-flights.js`, Contact information contains a dedicated contact-error host. The invalid-contact branch instead writes to the separate submission-alert host outside that region. The test supplies an invalid contact value and scopes the oracle to Contact information rather than merely checking for a page-level alert.

## Requirement reference

**REQ-3.5:** Contact information is the named booking contact-validation region, and contact feedback remains separate from Passenger details.

## Difference from existing tests

`baseline/REQ-3.5.spec.ts` replaces the prefilled contact with a valid value and checks that no alert appears. It does not inspect invalid-contact feedback or its region.

## Preconditions

Sign in as the seeded `user` account and open JD5162 Economy booking through the normal flight-search UI. Use valid passenger data so contact validation is the targeted failure.

## Test description

Playwright-based

1. Enter Full name `Wang Wu` and ID number `110101199001011237` in Passenger details.
2. Replace Contact mobile with `123`.
3. Select Agree to booking terms and click Submit order.
4. Wait for contact rejection and verify that Book flight remains open and Payment is absent.
5. Verify that a visible validation alert appears inside Contact information.

## Requirement: Expected Output

Contact-validation feedback appears inside **Contact information**, separate from Passenger details.

## Observed Output

The alert `Enter a valid contact mobile number` appears below **Airport services**, while **Contact information** contains no alert. The final region-scoped assertion fails.

## Evidence

- [Observed screenshot](assets/REQ-3.5-observed.png)
- [Initial execution log](assets/new-tests-observed.txt)
- [Clean six-test rerun log](assets/all-tests-clean-rerun.txt)

## Automated test

From `applications/ctrip/test/team-07`, with dependencies installed and Ctrip running:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test REQ-3.5.spec.ts --config=playwright.config.ts
```

The expected result on the faulty implementation is one failed test at the Contact information alert assertion.
