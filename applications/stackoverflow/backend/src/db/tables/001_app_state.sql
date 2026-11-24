CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  document TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
