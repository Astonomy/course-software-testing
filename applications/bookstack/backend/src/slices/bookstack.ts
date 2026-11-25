import type { Express, Request, Response } from "express";
import type { Db } from "../kernel/db";
import { clearCookie, getCookie, hashPassword, newToken, setCookie, verifyPassword } from "../kernel/http";

type PublicUser = { id: number; nickname: string; email: string };
type ItemType = "shelf" | "book" | "chapter" | "page";

function currentUser(request: Request, db: Db): PublicUser | null {
  const token = getCookie(request, "bookstack_session");
  if (!token) return null;
  const row = db.prepare(
    "SELECT u.id, u.nickname, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?"
  ).get(token) as PublicUser | undefined;
  return row ?? null;
}

function integer(value: unknown): number | null {
  const text = String(value ?? "");
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function tagsText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return clean(value);
}

function publicUser(user: PublicUser) {
  return { id: user.id, nickname: user.nickname, email: user.email };
}

function recordView(db: Db, user: PublicUser | null, type: ItemType, id: number): void {
  if (!user) return;
  db.prepare(
    `INSERT INTO views (user_id, item_type, item_id, viewed_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET viewed_at = excluded.viewed_at`
  ).run(user.id, type, id, Date.now());
}

function isFavorite(db: Db, user: PublicUser | null, type: ItemType, id: number): boolean {
  if (!user) return false;
  return Boolean(db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?").get(user.id, type, id));
}

type Named = { type: ItemType; id: number; name: string; viewed_at?: number; created_at?: number };

function shelfRow(db: Db, id: number): any {
  return db.prepare("SELECT * FROM shelves WHERE id = ?").get(id);
}
function bookRow(db: Db, id: number): any {
  return db.prepare("SELECT * FROM books WHERE id = ?").get(id);
}
function chapterRow(db: Db, id: number): any {
  return db.prepare("SELECT * FROM chapters WHERE id = ?").get(id);
}
function pageRow(db: Db, id: number): any {
  return db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
}

function itemName(db: Db, type: ItemType, id: number): string | null {
  if (type === "shelf") return (shelfRow(db, id)?.name as string | undefined) ?? null;
  if (type === "book") return (bookRow(db, id)?.name as string | undefined) ?? null;
  if (type === "chapter") return (chapterRow(db, id)?.name as string | undefined) ?? null;
  return (pageRow(db, id)?.title as string | undefined) ?? null;
}

function pagesForBook(db: Db, bookId: number, user: PublicUser | null): any[] {
  return db.prepare(
    `SELECT id, title, body, draft, chapter_id, updated_at FROM pages
     WHERE book_id = ? AND (draft = 0 OR author_id = ?)
     ORDER BY updated_at DESC, id DESC`
  ).all(bookId, user?.id ?? -1);
}

function pagesForChapter(db: Db, chapterId: number, user: PublicUser | null): any[] {
  return db.prepare(
    `SELECT id, title, body, draft, chapter_id, updated_at FROM pages
     WHERE chapter_id = ? AND (draft = 0 OR author_id = ?)
     ORDER BY updated_at DESC, id DESC`
  ).all(chapterId, user?.id ?? -1);
}

function bookPayload(db: Db, row: any, user: PublicUser | null): any {
  const chapters = db.prepare(
    "SELECT id, name, description, tags, updated_at FROM chapters WHERE book_id = ? ORDER BY id ASC"
  ).all(row.id);
  const shelf = row.shelf_id ? db.prepare("SELECT id, name FROM shelves WHERE id = ?").get(row.shelf_id) : null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: row.tags,
    shelf: shelf ?? null,
    chapters,
    pages: pagesForBook(db, row.id, user),
    favorite: isFavorite(db, user, "book", row.id),
  };
}

function createBook(db: Db, body: any, shelfId: number | null): any {
  const name = clean(body.name).trim();
  const description = clean(body.description);
  const tags = tagsText(body.tags);
  if (!name) return null;
  const existing = db.prepare(
    `SELECT * FROM books WHERE name = ? AND description = ? AND tags = ?
     AND ((shelf_id IS NULL AND ? IS NULL) OR shelf_id = ?) ORDER BY id ASC LIMIT 1`
  ).get(name, description, tags, shelfId, shelfId) as any;
  if (existing) return existing;
  const now = Date.now();
  const result = db.prepare(
    "INSERT INTO books (name, description, tags, shelf_id, cover, page_template, created_at, updated_at) VALUES (?, ?, ?, ?, '', '', ?, ?)"
  ).run(name, description, tags, shelfId, now, now);
  return bookRow(db, Number(result.lastInsertRowid));
}

function createPage(db: Db, bookId: number, chapterId: number | null, body: any, user: PublicUser | null): any {
  const title = clean(body.title).trim();
  const content = clean(body.body);
  const draft = Boolean(body.draft);
  if (!title) return null;
  if (draft && !user) return undefined;
  const existing = db.prepare(
    `SELECT * FROM pages WHERE book_id = ? AND title = ? AND body = ? AND draft = ?
     AND ((chapter_id IS NULL AND ? IS NULL) OR chapter_id = ?)
     AND ((author_id IS NULL AND ? IS NULL) OR author_id = ?)
     ORDER BY id ASC LIMIT 1`
  ).get(bookId, title, content, draft ? 1 : 0, chapterId, chapterId, draft ? user!.id : null, draft ? user!.id : null) as any;
  if (existing) return existing;
  const now = Date.now();
  const result = db.prepare(
    "INSERT INTO pages (book_id, chapter_id, title, body, draft, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(bookId, chapterId, title, content, draft ? 1 : 0, draft ? user!.id : user?.id ?? null, now, now);
  return pageRow(db, Number(result.lastInsertRowid));
}

export function registerBookStack(app: Express, db: Db): void {
  // ---- authentication ----
  app.get("/api/auth/me", (request, response) => {
    const user = currentUser(request, db);
    response.json({ user: user ? publicUser(user) : null });
  });

  app.post("/api/auth/login", (request, response) => {
    const email = clean(request.body?.email).trim().toLowerCase();
    const password = clean(request.body?.password);
    const row = db.prepare("SELECT * FROM users WHERE lower(email) = ?").get(email) as any;
    if (!row || !verifyPassword(password, row.password_hash)) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = newToken();
    db.prepare("INSERT INTO sessions (token, user_id, created_at, remember) VALUES (?, ?, ?, ?)")
      .run(token, row.id, Date.now(), request.body?.remember ? 1 : 0);
    setCookie(response, "bookstack_session", token);
    response.json({ user: { id: row.id, nickname: row.nickname, email: row.email } });
  });

  app.post("/api/auth/logout", (request, response) => {
    const token = getCookie(request, "bookstack_session");
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    clearCookie(response, "bookstack_session");
    response.json({ ok: true });
  });

  // ---- home dashboard ----
  app.get("/api/home", (request, response) => {
    const user = currentUser(request, db);
    const recentlyUpdated = db.prepare(
      "SELECT id, title, body, updated_at FROM pages WHERE draft = 0 ORDER BY updated_at DESC, id DESC LIMIT 5"
    ).all().map((row: any) => ({ id: row.id, title: row.title, body: row.body }));

    if (!user) {
      response.json({ user: null, recentDrafts: [], recentlyViewed: [], favoriteTop: [], recentlyUpdated });
      return;
    }

    const recentDrafts = db.prepare(
      "SELECT id, title, body, book_id, updated_at FROM pages WHERE draft = 1 AND author_id = ? ORDER BY updated_at DESC, id DESC"
    ).all(user.id).map((row: any) => ({ id: row.id, title: row.title, body: row.body, bookId: row.book_id }));

    const allViewed: Named[] = [];
    for (const type of ["shelf", "book", "chapter", "page"] as ItemType[]) {
      const table = type === "shelf" ? "shelves" : type === "book" ? "books" : type === "chapter" ? "chapters" : "pages";
      const nameColumn = type === "page" ? "title" : "name";
      const rows = db.prepare(
        `SELECT t.id, t.${nameColumn} AS name, v.viewed_at FROM views v JOIN ${table} t ON t.id = v.item_id
         WHERE v.user_id = ? AND v.item_type = ? ORDER BY v.viewed_at DESC`
      ).all(user.id, type) as any[];
      for (const row of rows) allViewed.push({ type, id: row.id, name: row.name, viewed_at: row.viewed_at });
    }
    console.log("[BookStack white-box][1] Collected viewing records", JSON.stringify({
      userId: user.id, count: allViewed.length, allViewed,
    }, null, 2));
    allViewed.sort((a, b) => (b.viewed_at ?? 0) - (a.viewed_at ?? 0));
    const recentlyViewed = allViewed.slice(0, 10);
    console.log("[BookStack white-box][2] Sorted and limited viewing records", JSON.stringify({
      count: recentlyViewed.length, recentlyViewed,
    }, null, 2));

    const favorites: Named[] = [];
    for (const type of ["shelf", "book", "chapter", "page"] as ItemType[]) {
      const rows = db.prepare("SELECT item_id, created_at FROM favorites WHERE user_id = ? AND item_type = ? ORDER BY created_at DESC")
        .all(user.id, type) as any[];
      for (const row of rows) {
        const name = itemName(db, type, row.item_id);
        if (name) favorites.push({ type, id: row.item_id, name, created_at: row.created_at });
      }
    }
    console.log("[BookStack white-box][3] Collected favorites", JSON.stringify({
      count: favorites.length, favorites,
    }, null, 2));
    favorites.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    const favoriteTop = favorites.slice(0, 4);
    const favoriteKeys = new Set(favoriteTop.map((item) => `${item.type}:${item.id}`));
    console.log("[BookStack white-box][4] Selected homepage favorites", JSON.stringify({
      favoriteTop, favoriteKeys: [...favoriteKeys],
    }, null, 2));
    const recentWithoutFavoriteDuplicates = recentlyViewed.filter((item) => !favoriteKeys.has(`${item.type}:${item.id}`));
    console.log("[BookStack white-box][5] Filtered recently viewed records", JSON.stringify({
      beforeCount: recentlyViewed.length,
      afterCount: recentWithoutFavoriteDuplicates.length,
      recentWithoutFavoriteDuplicates,
      removedItems: recentlyViewed.filter((item) => favoriteKeys.has(`${item.type}:${item.id}`)),
    }, null, 2));

    response.json({
      user: publicUser(user),
      recentDrafts,
      recentlyViewed: recentWithoutFavoriteDuplicates,
      favoriteTop,
      recentlyUpdated,
    });
  });

  // ---- shelves ----
  app.get("/api/shelves", (_request, response) => {
    const rows = db.prepare("SELECT id, name, description, tags, is_bootstrap FROM shelves ORDER BY is_bootstrap DESC, name COLLATE NOCASE, id")
      .all();
    response.json({ shelves: rows });
  });

  app.get("/api/shelves/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : shelfRow(db, id);
    if (!row) { response.status(404).json({ error: "Shelf not found" }); return; }
    const user = currentUser(request, db);
    recordView(db, user, "shelf", row.id);
    const books = db.prepare("SELECT id, name, description, tags FROM books WHERE shelf_id = ? ORDER BY name COLLATE NOCASE, id").all(row.id);
    response.json({
      id: row.id, name: row.name, description: row.description, tags: row.tags,
      isBootstrap: Boolean(row.is_bootstrap), books, favorite: isFavorite(db, user, "shelf", row.id),
    });
  });

  app.post("/api/shelves", (request, response) => {
    const name = clean(request.body?.name).trim();
    const description = clean(request.body?.description);
    const tags = tagsText(request.body?.tags);
    if (!name) { response.status(400).json({ error: "Name is required" }); return; }
    let row = db.prepare("SELECT * FROM shelves WHERE name = ? AND description = ? AND tags = ? ORDER BY id ASC LIMIT 1")
      .get(name, description, tags) as any;
    if (!row) {
      const now = Date.now();
      const result = db.prepare(
        "INSERT INTO shelves (name, description, tags, is_bootstrap, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)"
      ).run(name, description, tags, now, now);
      row = shelfRow(db, Number(result.lastInsertRowid));
    }
    response.json({ id: row.id, name: row.name, description: row.description, tags: row.tags });
  });

  app.put("/api/shelves/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : shelfRow(db, id);
    if (!row) { response.status(404).json({ error: "Shelf not found" }); return; }
    if (row.is_bootstrap) { response.status(403).json({ error: "The bootstrap shelf cannot be changed" }); return; }
    const name = clean(request.body?.name).trim();
    if (!name) { response.status(400).json({ error: "Name is required" }); return; }
    const description = clean(request.body?.description);
    const tags = tagsText(request.body?.tags);
    db.prepare("UPDATE shelves SET name = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?")
      .run(name, description, tags, Date.now(), id);
    const updated = shelfRow(db, id);
    response.json({ id: updated.id, name: updated.name, description: updated.description, tags: updated.tags });
  });

  app.delete("/api/shelves/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : shelfRow(db, id);
    if (!row) { response.status(404).json({ error: "Shelf not found" }); return; }
    if (row.is_bootstrap) { response.status(403).json({ error: "The bootstrap shelf cannot be deleted" }); return; }
    db.prepare("DELETE FROM shelves WHERE id = ?").run(id);
    response.json({ ok: true });
  });

  app.post("/api/shelves/:id/books", (request, response) => {
    const id = integer(request.params.id);
    if (id === null || !shelfRow(db, id)) { response.status(404).json({ error: "Shelf not found" }); return; }
    const row = createBook(db, request.body ?? {}, id);
    if (!row) { response.status(400).json({ error: "Name is required" }); return; }
    response.json({ id: row.id, name: row.name, description: row.description, tags: row.tags });
  });

  // ---- books ----
  app.get("/api/books", (_request, response) => {
    const rows = db.prepare("SELECT id, name, description, tags, shelf_id FROM books ORDER BY name COLLATE NOCASE, id").all();
    response.json({ books: rows });
  });

  app.get("/api/books/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : bookRow(db, id);
    if (!row) { response.status(404).json({ error: "Book not found" }); return; }
    const user = currentUser(request, db);
    recordView(db, user, "book", row.id);
    response.json(bookPayload(db, row, user));
  });

  app.post("/api/books", (request, response) => {
    const shelfId = request.body?.shelfId == null ? null : integer(request.body.shelfId);
    if (request.body?.shelfId != null && (shelfId === null || !shelfRow(db, shelfId))) {
      response.status(404).json({ error: "Shelf not found" }); return;
    }
    const row = createBook(db, request.body ?? {}, shelfId);
    if (!row) { response.status(400).json({ error: "Name is required" }); return; }
    response.json({ id: row.id, name: row.name, description: row.description, tags: row.tags });
  });

  app.put("/api/books/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : bookRow(db, id);
    if (!row) { response.status(404).json({ error: "Book not found" }); return; }
    const name = clean(request.body?.name).trim();
    if (!name) { response.status(400).json({ error: "Name is required" }); return; }
    db.prepare("UPDATE books SET name = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?")
      .run(name, clean(request.body?.description), tagsText(request.body?.tags), Date.now(), id);
    const updated = bookRow(db, id);
    response.json({ id: updated.id, name: updated.name, description: updated.description, tags: updated.tags });
  });

  app.delete("/api/books/:id", (request, response) => {
    const id = integer(request.params.id);
    if (id === null || !bookRow(db, id)) { response.status(404).json({ error: "Book not found" }); return; }
    db.prepare("DELETE FROM books WHERE id = ?").run(id);
    response.json({ ok: true });
  });

  // ---- chapters ----
  app.post("/api/books/:id/chapters", (request, response) => {
    const bookId = integer(request.params.id);
    if (bookId === null || !bookRow(db, bookId)) { response.status(404).json({ error: "Book not found" }); return; }
    const name = clean(request.body?.name).trim();
    const description = clean(request.body?.description);
    const tags = tagsText(request.body?.tags);
    if (!name) { response.status(400).json({ error: "Name is required" }); return; }
    let row = db.prepare("SELECT * FROM chapters WHERE book_id = ? AND name = ? AND description = ? AND tags = ? ORDER BY id ASC LIMIT 1")
      .get(bookId, name, description, tags) as any;
    if (!row) {
      const now = Date.now();
      const result = db.prepare(
        "INSERT INTO chapters (book_id, name, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(bookId, name, description, tags, now, now);
      row = chapterRow(db, Number(result.lastInsertRowid));
    }
    response.json({ id: row.id, name: row.name, description: row.description, bookId: row.book_id });
  });

  app.get("/api/chapters/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : chapterRow(db, id);
    if (!row) { response.status(404).json({ error: "Chapter not found" }); return; }
    const user = currentUser(request, db);
    recordView(db, user, "chapter", row.id);
    const book = bookRow(db, row.book_id);
    response.json({
      id: row.id, name: row.name, description: row.description, tags: row.tags,
      book: book ? { id: book.id, name: book.name } : null,
      pages: pagesForChapter(db, row.id, user),
      favorite: isFavorite(db, user, "chapter", row.id),
    });
  });

  // ---- pages ----
  app.post("/api/books/:id/pages", (request, response) => {
    const bookId = integer(request.params.id);
    if (bookId === null || !bookRow(db, bookId)) { response.status(404).json({ error: "Book not found" }); return; }
    const user = currentUser(request, db);
    let chapterId: number | null = null;
    if (request.body?.chapterId != null && request.body.chapterId !== "") {
      chapterId = integer(request.body.chapterId);
      const chapter = chapterId === null ? null : chapterRow(db, chapterId);
      if (!chapter || chapter.book_id !== bookId) { response.status(400).json({ error: "Invalid chapter" }); return; }
    }
    const row = createPage(db, bookId, chapterId, request.body ?? {}, user);
    if (row === undefined) { response.status(401).json({ error: "Login is required to save a draft" }); return; }
    if (!row) { response.status(400).json({ error: "Page title is required" }); return; }
    response.json({ id: row.id, title: row.title, body: row.body, draft: Boolean(row.draft), bookId: row.book_id });
  });

  app.get("/api/pages/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : pageRow(db, id);
    if (!row) { response.status(404).json({ error: "Page not found" }); return; }
    const user = currentUser(request, db);
    if (row.draft && (!user || row.author_id !== user.id)) { response.status(404).json({ error: "Page not found" }); return; }
    if (!row.draft) recordView(db, user, "page", row.id);
    const book = bookRow(db, row.book_id);
    const chapter = row.chapter_id ? chapterRow(db, row.chapter_id) : null;
    response.json({
      id: row.id, title: row.title, body: row.body, draft: Boolean(row.draft),
      book: book ? { id: book.id, name: book.name } : null,
      chapter: chapter ? { id: chapter.id, name: chapter.name } : null,
      canManageDraft: Boolean(row.draft && user && row.author_id === user.id),
      favorite: isFavorite(db, user, "page", row.id),
    });
  });

  app.put("/api/pages/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : pageRow(db, id);
    if (!row) { response.status(404).json({ error: "Page not found" }); return; }
    const user = currentUser(request, db);
    if (row.draft && (!user || row.author_id !== user.id)) { response.status(404).json({ error: "Page not found" }); return; }
    const title = clean(request.body?.title).trim();
    if (!title) { response.status(400).json({ error: "Page title is required" }); return; }
    const draft = request.body?.draft === undefined ? Boolean(row.draft) : Boolean(request.body.draft);
    if (draft && !user) { response.status(401).json({ error: "Login is required to save a draft" }); return; }
    db.prepare("UPDATE pages SET title = ?, body = ?, draft = ?, author_id = ?, updated_at = ? WHERE id = ?")
      .run(title, clean(request.body?.body), draft ? 1 : 0, draft ? user!.id : row.author_id, Date.now(), id);
    const updated = pageRow(db, id);
    response.json({ id: updated.id, title: updated.title, body: updated.body, draft: Boolean(updated.draft), bookId: updated.book_id });
  });

  app.delete("/api/pages/:id", (request, response) => {
    const id = integer(request.params.id);
    const row = id === null ? null : pageRow(db, id);
    if (!row) { response.status(404).json({ error: "Page not found" }); return; }
    const user = currentUser(request, db);
    if (row.draft && (!user || row.author_id !== user.id)) { response.status(404).json({ error: "Page not found" }); return; }
    db.prepare("DELETE FROM pages WHERE id = ?").run(id);
    response.json({ ok: true, bookId: row.book_id });
  });

  // ---- favorites ----
  const validTypes = new Set<ItemType>(["shelf", "book", "chapter", "page"]);
  app.post("/api/favorites/:type/:id", (request, response) => {
    const type = request.params.type as ItemType;
    const id = integer(request.params.id);
    const user = currentUser(request, db);
    if (!user) { response.status(401).json({ error: "Login is required" }); return; }
    if (!validTypes.has(type) || id === null || !itemName(db, type, id)) { response.status(404).json({ error: "Item not found" }); return; }
    db.prepare("INSERT OR IGNORE INTO favorites (user_id, item_type, item_id, created_at) VALUES (?, ?, ?, ?)")
      .run(user.id, type, id, Date.now());
    response.json({ favorite: true });
  });

  app.delete("/api/favorites/:type/:id", (request, response) => {
    const type = request.params.type as ItemType;
    const id = integer(request.params.id);
    const user = currentUser(request, db);
    if (!user) { response.status(401).json({ error: "Login is required" }); return; }
    if (!validTypes.has(type) || id === null) { response.status(400).json({ error: "Invalid item" }); return; }
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?").run(user.id, type, id);
    response.json({ favorite: false });
  });

  app.get("/api/favorites", (request, response) => {
    const user = currentUser(request, db);
    if (!user) { response.json({ favorites: [] }); return; }
    const favorites: Named[] = [];
    for (const type of ["shelf", "book", "chapter", "page"] as ItemType[]) {
      const rows = db.prepare("SELECT item_id, created_at FROM favorites WHERE user_id = ? AND item_type = ? ORDER BY created_at DESC")
        .all(user.id, type) as any[];
      for (const row of rows) {
        const name = itemName(db, type, row.item_id);
        if (name) favorites.push({ type, id: row.item_id, name, created_at: row.created_at });
      }
    }
    favorites.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    response.json({ favorites });
  });
}
