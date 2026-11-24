# Software Testing Course Applications

Six applications for black-box and white-box testing exercises. Each application can be configured and started independently. Requirements are included in its `requirements/` directory. The implementations may contain business logic defects for students to discover.

| Application | Directory | Dependencies | First-time setup |
| --- | --- | --- | --- |
| 12306 | `applications/12306` | Full Python 3.8+ distribution, including SQLite | No third-party Python packages |
| BookStack | `applications/bookstack` | Node.js 22.12+ and npm | Run `npm ci --include=dev --include=optional` in the application directory |
| Ctrip | `applications/ctrip` | Full Python 3.8+ distribution, including SQLite | No third-party Python packages |
| Keep | `applications/keep` | Node.js 18+ | No third-party dependencies |
| PrestaShop | `applications/prestashop` | Node.js 22.12+ and npm | Run `npm ci --include=dev --include=optional` in the application directory |
| Stack Overflow | `applications/stackoverflow` | Node.js 22.12+ and npm | Run `npm ci --include=dev --include=optional` in the application directory |

For a shared classroom setup, use Node.js 24.x and Python 3.12+. If Windows PowerShell blocks `npm` because of its execution policy, use `npm.cmd`. Install SQLite native dependencies on your own operating system; do not copy another machine's `node_modules`. If no suitable prebuilt native module is available, npm may require Python and C/C++ build tools. Follow the installation error messages to prepare those tools.

## Classroom Task: Explore More Fault-Revealing Tests

### Task

- Fork this repository to your GitHub account, clone your fork, and create a branch for your team's submission.
- Check the team assignments below and run your assigned web system.
- Apply the black-box and white-box testing techniques learned in today's lecture to explore fault-revealing test cases.
- Follow the TA's [BookStack demonstration](FOLLOWING.md) as an example.
- After identifying at least one valid test for your assigned system, you may explore other web systems in this repository.

### Valid Test Criteria

A test case is considered valid only if it meets all three criteria:

- **Requirement Compliance:** The test must stay within the scope of existing requirements and must not target unspecified functionality.
- **Diversity:** The test must not duplicate existing test cases.
- **Fault-Revealing Capability:** The test must reliably expose a behavioral inconsistency between the reference system and the target implementation.

### Submission & Bonus

- **Submission:** Submit reproducible test cases via pull requests (PRs) as a team. Each test should clearly describe its reproduction steps, expected behavior, and actual behavior.
- **Bonus:** 0.5 points per valid test, up to 3 bonus points in total per team.
- **Deadline:** November 24, 2026, at 24:00 (midnight, Asia/Shanghai, UTC+8; equivalently November 25 at 00:00).

### Submission Location and PR Format

Place all submissions under `applications/<app>/test/team-<ID>/`, using your two-digit team ID from the assignments below (for example, `team-04`). Keep test documents, optional automation scripts, and supporting evidence inside your own team directory.

Existing tests are included in each application's `test/baseline/` directory, together with their helpers and fixtures. Read these sources when checking that your tests add new coverage. They are reference material; running them separately requires a Playwright setup and is not part of application startup. Do not modify the baseline files.

Example layout (filenames illustrate the format, not a required number of tests):

```text
applications/bookstack/test/team-04/
├── README.md
├── black-box-01.md
├── white-box-01.md
└── assets/
    └── actual-result.png
```

The team `README.md` should list team members and link to the submitted test cases. Use one Markdown document per test case, including:

- **Test method and design basis:** State whether the test is black-box or white-box and explain how you selected its inputs. For white-box tests, identify the relevant source file and condition, branch, or path.
- **Requirement reference:** Identify the applicable requirement IDs.
- **Difference from existing tests:** Explain the additional behavior, input combination, or path covered.
- **Preconditions and reproduction steps:** Include required setup and test data so the TA can reproduce the failure.
- **Expected and actual behavior:** Explain the discrepancy and provide the basis for the reference system's expected behavior.
- **Evidence:** Include relevant screenshots, logs, or automation scripts. For scripts, document dependencies and the exact run command.

Use this PR title format:

```text
[BookStack][Team 04] Add fault-revealing tests
```

Replace the application name and team ID as appropriate. The PR description should link to the test documents and briefly summarize the failures found.

Push your submission branch to your fork, then open a PR targeting `code-philia/course-software-testing` on branch `main`.

Submit tests against the provided implementation without modifying application source code or fixing the bugs. Do not modify another team's submission files or commit generated dependencies, build outputs, or runtime databases. If you explore another application, submit under that application's `test/team-<ID>/` directory using the same team ID.

## Team Assignments

Each team is assigned one application as its primary testing target. The 26 teams (60 students) are randomly distributed across six applications within predefined quotas.

| Application | Assigned Teams (ID and Leader) | Teams |
| --- | --- | ---: |
| 12306 | 6 (Intersect), 13 (xxnyzzz), 14 (JonathanYink), 17 (liweiming0325), 25 (TheToror) | 5 |
| BookStack | 4 (shaoven), 11 (WuTong), 15 (wjinpark), 24 (herein) | 4 |
| Ctrip | 5 (yearyang), 7 (ssh), 8 (IsaaArc), 12 (yulezhi), 19 (luisztc) | 5 |
| Keep | 3 (welzien), 18 (YingYujie), 20 (Maponi), 22 (WuDi) | 4 |
| PrestaShop | 2 (xxjellyfish), 9 (koishi510), 10 (Che_Zhai_adshen1), 23 (rac_01) | 4 |
| Stack Overflow | 1 (zqx), 16 (cherilynnkong), 21 (leonzhu314), 26 (mrdeenk) | 4 |

## Start an application

For example, to start BookStack, enter `applications/bookstack`, prepare its dependencies as listed above, and run:

Windows PowerShell:

```powershell
.\start.bat
```

Windows Command Prompt:

```bat
start.bat
```

Linux / macOS:

```sh
sh start.sh
```

Use the same commands in each of the other five application directories. `sh deploy.sh` invokes the same launcher. Running `sh start.sh` does not require setting the executable permission on the script.

The launchers check dependencies and exit with instructions if anything is missing. They do not download or install dependencies. BookStack, PrestaShop, and Stack Overflow build their frontend and backend before starting; wait for the build to finish.

By default, each launcher searches for an available port in **3000–3999**. Open the actual URL printed in the terminal; do not assume it is port 3000. All six applications can run simultaneously. To change the search range:

```powershell
.\start.bat --port auto --port-range 4100-4199
```

```sh
sh start.sh --port auto --port-range 4100-4199
```

Other options include `--port 4108` for a fixed port, `--host 0.0.0.0` for access from other machines on your network, and `--check-deps` to check dependencies without starting. Command-line options override the `PORT`, `PORT_RANGE`, and `HOST` environment variables. The default listening address is `127.0.0.1`.

Press Ctrl+C to stop normally. Configuration errors, build failures, and abnormal exits that the launcher can catch produce manual startup commands for the current operating system. If the terminal is forcibly closed, the launcher is killed, or power is lost, the script may have no opportunity to print those instructions.

## Requirements and data

Each application's `requirements/requirements.yaml` is the requirements entry point, and `requirements/prerequisites.md` describes the preconditions. Reference materials and assets are preserved in the same directory. Application code initializes the starting data. Databases and state files created during use are excluded from Git; launchers do not clear existing data.

Additional application-specific instructions are available in each application's `启动说明.md` (Chinese).
