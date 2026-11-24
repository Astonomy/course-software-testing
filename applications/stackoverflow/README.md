# Stack Overflow Course Application

English | [简体中文](README.zh-CN.md)

A full-stack TypeScript application using React, Vite, Express, and SQLite
(`better-sqlite3`). Node.js 22.12 or newer and npm are required.

## Structure

```text
frontend/                 React UI; builds into frontend/dist/
backend/
  src/
    server.ts             Server entry point and database initialization
    app.ts                Express app, API routes, and frontend serving
    api/                  Business API registration
    db/                   SQLite connection, initialization, and SQL tables
  scripts/                Build and backend test helpers
  dist/                   Compiled backend (generated)
package.json              npm workspace configuration and shared commands
deploy.sh                 Checks, build, and server startup (no installation)
```

## Start the Application

Run from the application root:

First install dependencies on your own machine:

```sh
npm ci --include=dev --include=optional
```

Windows: `start.bat` in Command Prompt or `.\start.bat` in PowerShell.
Linux / macOS: `sh start.sh` (or `sh deploy.sh`).

The launcher checks dependencies, builds both workspaces, and starts the server
in the foreground. It does not install dependencies or run business tests.
Startup errors stop the script and print manual recovery commands.

The server initializes the database, serves the built frontend and `/api/`
routes on the same port, and exposes `/api/health`.

Optional environment variables:

```bash
DATABASE_URL=/absolute/path/app.db sh start.sh --port-range 4100-4199
```

- `PORT`: a fixed HTTP port, or `auto`. The launcher defaults to automatic
  selection in 3000–3999. Open the actual URL printed in the terminal.
- `PORT_RANGE`: automatic search range; `--port-range` overrides it.
- `HOST`: listening address; defaults to `127.0.0.1` in the launcher.
- `DATABASE_URL`: SQLite file path, despite its name; defaults to
  `backend/data/app.db`. Relative paths resolve from the process working directory
  (the application root when using the launcher).
  Use an absolute path to select a fixed location, or `:memory:` for temporary data.

The current ARC-Bench agent Runner detects the root `deploy.sh` and invokes it
automatically. Keep this file at the application root when copying the template.

## Development

```bash
npm install --include=dev --include=optional
npm run dev:backend
# In another terminal:
npm run dev:frontend
```

The Vite development server proxies `/api` requests to backend port `3000`.
If you change the backend port during development, update
`frontend/vite.config.ts` accordingly.
