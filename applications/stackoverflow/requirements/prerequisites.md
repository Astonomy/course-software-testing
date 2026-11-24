# Prerequisites: stackoverflow

## Runtime and startup

Node.js 22.12+ and npm. In this application directory, run `npm ci --include=dev --include=optional` before the first launch.

From this application directory, run `.\start.bat` in Windows PowerShell, `start.bat` in Command Prompt, or `sh start.sh` on Linux/macOS. Open the actual URL printed by the launcher; its port is selected automatically.

## Scenario preparation

Read the relevant requirement and its scenario setup in `requirements.yaml`. Prepare the required account, objects, and UI state before reproducing a test. Existing test helpers and fixtures in `../test/baseline/` provide the baseline data and setup steps. Use fresh, identifiable test data when a scenario requires a new object or account.

The application initializes its own starting data. User-created data persists between launches; restarting does not reset it. Do not assume that a previously used local database is a clean instance. Record any setup needed to reproduce your test.
