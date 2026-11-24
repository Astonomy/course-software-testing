import type { Db } from "../kernel/db";
import { hashPassword } from "../kernel/http";

export function seed(db: Db): void {
  const now = Date.now();

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get("bookstack_user@example.com") as any;
  if (!existingUser) {
    db.prepare("INSERT INTO users (nickname, email, password_hash, verified, created_at) VALUES (?, ?, ?, 1, ?)")
      .run("BookStack User", "bookstack_user@example.com", hashPassword("Password123!"), now);
  }

  const existingShelf = db.prepare("SELECT id FROM shelves WHERE is_bootstrap = 1").get() as any;
  if (!existingShelf) {
    const byName = db.prepare("SELECT id FROM shelves WHERE name = ?").get("Benchmark Bootstrap Shelf") as any;
    if (byName) {
      db.prepare("UPDATE shelves SET is_bootstrap = 1, description = ?, tags = '' WHERE id = ?")
        .run("Entry shelf for the New Shelf creation action.", byName.id);
    } else {
      db.prepare("INSERT INTO shelves (name, description, tags, is_bootstrap, created_at, updated_at) VALUES (?, ?, '', 1, ?, ?)")
        .run("Benchmark Bootstrap Shelf", "Entry shelf for the New Shelf creation action.", now, now);
    }
  }
}
