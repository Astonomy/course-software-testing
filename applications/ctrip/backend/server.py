"""Small same-origin HTTP/JSON server; business behavior lives in app.py."""
import json
import os
import secrets
import sqlite3
import traceback
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from app import dispatch

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / ".data"
DATA.mkdir(exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "frontend"), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/health":
            body = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        # Client-side routes resolve to the entry document.
        target = (ROOT / "frontend" / path.lstrip("/")).resolve()
        if not target.is_file() and not Path(path).suffix:
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api":
            self.send_error(404)
            return
        cookies = SimpleCookie(self.headers.get("Cookie", ""))
        sid = cookies["sid"].value if "sid" in cookies else secrets.token_urlsafe(24)
        status = 200
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 2_000_000:
                raise ValueError("Request too large")
            payload = json.loads(self.rfile.read(length))
            with sqlite3.connect(DATA / "app.sqlite3", timeout=20) as db:
                db.row_factory = sqlite3.Row
                db.execute("PRAGMA foreign_keys=ON")
                db.execute("CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
                # Serialize read-modify-write dispatches, including first-time seeding.
                db.execute("BEGIN IMMEDIATE")
                result = dispatch(payload.get("action", ""), payload.get("data", {}), sid, db)
        except ValueError as exc:
            status, result = 400, {"error": str(exc)}
        except Exception:
            traceback.print_exc()
            status, result = 500, {"error": "Internal server error"}
        body = json.dumps(result, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Set-Cookie", f"sid={sid}; Path=/; HttpOnly; SameSite=Lax")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(
        (os.environ.get("HOST", "0.0.0.0"), int(os.environ.get("PORT", "3000"))), Handler
    )
    print(f"Serving on {server.server_address}", flush=True)
    server.serve_forever()
