import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Db } from "./kernel/db";
import { clockScript } from "./kernel/clock";
import { slices } from "./slices/index";

export function createApp(db: Db) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/api/clock.js", (_request, response) => response.type("application/javascript").set("Cache-Control", "no-store").send(clockScript()));
  // One broken slice must not take the rest of the application down.
  for (const register of slices) {
    try {
      register(app, db);
    } catch (error) {
      console.error("Slice registration failed", error);
    }
  }
  app.use("/api", (_request, response) => response.status(404).json({ error: "Unknown API route" }));
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (!response.headersSent) response.status(500).json({ error: "Internal server error" });
  });
  const frontend = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
  if (existsSync(frontend)) {
    app.use(express.static(frontend));
    app.get("/{*path}", (_request, response) => response.sendFile(`${frontend}/index.html`));
  }
  return app;
}
