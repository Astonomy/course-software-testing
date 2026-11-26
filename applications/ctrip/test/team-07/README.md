# Ctrip — Team 07

## Team members

- `ssh` — team leader

## Submitted tests

| Method | Test | Requirements | Fault exposed |
| --- | --- | --- | --- |
| White-box | [Newly paid order missing from Pending vouchers](white-box-01.md) | REQ-3.8, REQ-3.9, REQ-8.3 | A newly created and paid order is omitted from Pending vouchers. |
| White-box | [Decline registration reached through Free registration](white-box-02.md) | REQ-1.5 | Decline leaves the visitor on Log in instead of returning home. |
| White-box | [Reject an SMS code sent before logout](white-box-03.md) | REQ-1.4, REQ-1.8, REQ-1.13 | A pre-logout SMS code authenticates in a later attempt. |
| White-box | [Reject a code from a previous registration attempt](white-box-04.md) | REQ-1.5, REQ-1.6 | A previous attempt's code advances a restarted registration. |
| White-box | [Invalid-contact feedback outside Contact information](white-box-05.md) | REQ-3.5 | Contact feedback appears below Airport services instead of in Contact information. |
| White-box | [Filtering resets the order countdown](white-box-06.md) | REQ-4.2, REQ-4.4 | Filtering restores elapsed time on the pending order countdown. |

## Automation and reproduction

Each test document provides its requirement basis, source path, baseline comparison, preconditions, steps, expected and actual behavior, evidence, and exact individual run command.

Install the temporary Playwright dependencies from this directory:

```sh
npm install --no-save --no-package-lock @playwright/test
npx playwright install chromium
```

With Ctrip running at the URL printed by its launcher, execute all six tests:

```sh
BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.config.ts
```

Change `BASE_URL` if Ctrip uses another port. The expected result on the faulty implementation is **six failed tests**, each at its documented fault assertion. Do not commit `node_modules`, generated test results, or runtime databases.

## Evidence

- [Five additional tests: observed execution log](assets/new-tests-observed.txt)
- [All six tests: clean rerun log](assets/all-tests-clean-rerun.txt)

All six failures were reproduced together after deleting only the generated runtime database while Ctrip was stopped and then restarting with fresh seed data. Individual screenshots and the voucher-specific execution evidence are linked from each test document.
