# Prerequisites: ctrip

## Runtime and startup

A full Python 3.8+ distribution with SQLite. No third-party Python packages are required.

From this application directory, run `.\start.bat` in Windows PowerShell, `start.bat` in Command Prompt, or `sh start.sh` on Linux/macOS. Open the actual URL printed by the launcher; its port is selected automatically.

## Scenario preparation

Read the relevant requirement and its scenario setup in `requirements.yaml`. Prepare the required account, objects, and UI state before reproducing a test. Existing test helpers and fixtures in `../test/baseline/` provide the baseline data and setup steps. Use fresh, identifiable test data when a scenario requires a new object or account.

The application initializes its own starting data. User-created data persists between launches; restarting does not reset it. Do not assume that a previously used local database is a clean instance. Record any setup needed to reproduce your test.
