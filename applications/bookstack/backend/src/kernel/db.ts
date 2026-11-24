import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA } from "../foundation/schema";
import { seed } from "../foundation/seed";

export type Db = Database.Database;
const defaultFile = fileURLToPath(new URL("../data/app.db", import.meta.url));

/** Open the database, create tables and insert required initial records idempotently. */
export function openDatabase(file = process.env.DATABASE_URL || defaultFile): Db {
  if (file !== ":memory:") mkdirSync(dirname(resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  try {
    seed(db);
  } catch (error) {
    // Missing seed rows fail individual scenarios; a crash here would fail all of them.
    console.error("Seeding failed", error);
  }
  return db;
}
