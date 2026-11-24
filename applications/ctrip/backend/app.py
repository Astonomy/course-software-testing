"""Ctrip travel services: transactional JSON business layer."""
import json
import random
import time
from datetime import datetime, timedelta

BUSINESS_DATE = "2026-07-19"
BUSINESS_CLOCK = "2026-07-19T08:00:00+08:00"
SEED_KEY = "ctrip_seed_v1"


def now_real():
    return time.time()


def money(value):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return 0


def user_public(row):
    if not row:
        return None
    keys = ("id", "email", "username", "mobile", "nickname", "real_name",
            "gender", "birth_date")
    return {k: row[k] for k in keys}


def ensure_schema(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      username TEXT,
      mobile TEXT UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT,
      real_name TEXT,
      gender TEXT,
      birth_date TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions(
      sid TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verify_codes(
      sid TEXT NOT NULL, phone TEXT NOT NULL, code TEXT NOT NULL,
      purpose TEXT NOT NULL, created_at REAL NOT NULL,
      PRIMARY KEY(sid, phone, purpose)
    );
    CREATE TABLE IF NOT EXISTS travelers(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      name TEXT NOT NULL, id_number TEXT
    );
    CREATE TABLE IF NOT EXISTS addresses(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      recipient TEXT, city TEXT, district TEXT, street TEXT, mobile TEXT
    );
    CREATE TABLE IF NOT EXISTS contacts(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      name TEXT, mobile TEXT, email TEXT, is_default INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS invoice_titles(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      type TEXT, name TEXT, taxpayer_id TEXT, special_vat INTEGER DEFAULT 0,
      registered_address TEXT, registered_phone TEXT, bank_name TEXT, bank_account TEXT
    );
    CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER,
      number TEXT UNIQUE, flight TEXT, flight_date TEXT, origin TEXT,
      destination TEXT, airline TEXT, departure TEXT, fare INTEGER,
      taxes INTEGER, total INTEGER, payment_status TEXT, display_status TEXT,
      booking_date TEXT, contact_mobile TEXT, passengers_json TEXT,
      services_json TEXT, itinerary_json TEXT, created_ts REAL,
      expires_at REAL, paid_at TEXT, payment_date TEXT, travel_status TEXT,
      voucher_status TEXT, voucher_issued TEXT, cancelled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS status_history(
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      mode TEXT, flight_number TEXT, origin TEXT, destination TEXT,
      flight_date TEXT, label TEXT, created_at REAL
    );
    """)
    row = db.execute("SELECT value FROM kv WHERE key=?", (SEED_KEY,)).fetchone()
    if row:
        return
    seed(db)
    db.execute("INSERT OR REPLACE INTO kv(key,value) VALUES(?,?)", (SEED_KEY, "1"))


def seed(db):
    def add_user(email=None, password="Travel1234", username=None, mobile=None,
                 nickname=None, real_name=None, gender=None, birth_date=None):
        if mobile:
            existing = db.execute("SELECT id FROM users WHERE mobile=?", (mobile,)).fetchone()
            if existing:
                return existing["id"]
        if email:
            existing = db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
            if existing:
                return existing["id"]
        cur = db.execute(
            "INSERT INTO users(email,username,mobile,password,nickname,real_name,gender,birth_date,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (email, username, mobile, password, nickname, real_name, gender, birth_date, BUSINESS_DATE))
        return cur.lastrowid

    users = {}
    users["user"] = add_user("ctrip_user@example.com", username="ctrip_user",
                             mobile="13800000010", nickname="Ctrip User",
                             real_name="Traveler One")
    users["profile_read"] = add_user(
        "ctrip_profile_read@example.com", mobile="13800000013",
        nickname="Profile Reader", real_name="Li Ming", gender="Male",
        birth_date="1990-01-01")
    account_specs = {
        "order_read": ("ctrip_order_read@example.com", "13800000012"),
        "order_cancel": ("ctrip_order_cancel@example.com", "13800000019"),
        "personal_read": ("ctrip_personal_read@example.com", "13800000020"),
        "contact_search": ("ctrip_contact_search@example.com", "13800000021"),
        "invoice_search": ("ctrip_invoice_search@example.com", "13800000022"),
        "traveler_create": ("ctrip_traveler_create@example.com", "13800000024"),
        "invoice_create": ("ctrip_invoice_create@example.com", "13800000036"),
        "phone_binding": ("ctrip_phone_binding@example.com", "13800000018"),
        "email_binding": ("ctrip_email_binding@example.com", "13800000025"),
        "password_change": ("ctrip_password_change@example.com", "13800000026"),
        "profile_edit": ("ctrip_profile_edit@example.com", "13800000027"),
        "voucher_read": ("ctrip_voucher_read@example.com", "13800000028"),
        "voucher_pending": ("ctrip_voucher_pending@example.com", "13800000029"),
        "voucher_history": ("ctrip_voucher_history@example.com", "13800000030"),
        "status_history_use": ("ctrip_status_history_use@example.com", "13800000031"),
        "status_history_clear": ("ctrip_status_history_clear@example.com", "13800000032"),
        "status_route_history": ("ctrip_status_route_history@example.com", "13800000033"),
        "history_isolation": ("ctrip_history_isolation@example.com", "13800000034"),
        "address_create": ("ctrip_address_create@example.com", "13800000035"),
        "address_detail": ("ctrip_address_detail@example.com", "13800000037"),
        "address_delete": ("ctrip_address_delete@example.com", "13800000038"),
        "address_batch": ("ctrip_address_batch@example.com", "13800000039"),
        "contact_create": ("ctrip_contact_create@example.com", "13800000040"),
        "contact_delete": ("ctrip_contact_delete@example.com", "13800000145"),
        "contact_batch_1": ("ctrip_contact_batch_1@example.com", "13800000146"),
        "contact_batch_2": ("ctrip_contact_batch_2@example.com", "13800000147"),
        "invoice_delete": ("ctrip_invoice_delete@example.com", "13800000048"),
        "invoice_batch": ("ctrip_invoice_batch@example.com", "13800000049"),
        "income_vat": ("ctrip_invoice_vat@example.com", "13800000050"),
        "invoice_vat": ("ctrip_invoice_vat@example.com", "13800000050"),
        "traveler_edit": ("ctrip_traveler_edit@example.com", "13800000051"),
        "traveler_search_created": ("ctrip_traveler_search_created@example.com", "13800000052"),
        "traveler_decline": ("ctrip_traveler_decline@example.com", "13800000053"),
        "traveler_delete": ("ctrip_traveler_delete@example.com", "13800000054"),
        "traveler_batch": ("ctrip_traveler_batch@example.com", "13800000055"),
    }
    for key, (email, mobile) in account_specs.items():
        if key in users:
            continue
        users[key] = add_user(email, mobile=mobile, nickname=key.replace("_", " ").title())

    # SMS-enabled verified accounts used by verification-code login scenarios.
    for phone in ("13800000011", "13800000041", "13800000042", "13800000043"):
        add_user(f"sms_{phone}@example.com", mobile=phone, username=f"sms_{phone}",
                 nickname="SMS Traveler")

    def add_traveler(owner, name, id_number=None):
        db.execute("INSERT INTO travelers(owner_id,name,id_number) VALUES(?,?,?)",
                   (users[owner], name, id_number))

    def add_address(owner, recipient, city, district, street, mobile):
        db.execute("INSERT INTO addresses(owner_id,recipient,city,district,street,mobile) VALUES(?,?,?,?,?,?)",
                   (users[owner], recipient, city, district, street, mobile))

    def add_contact(owner, name, mobile=None, email=None, is_default=0):
        db.execute("INSERT INTO contacts(owner_id,name,mobile,email,is_default) VALUES(?,?,?,?,?)",
                   (users[owner], name, mobile, email, is_default))

    def add_invoice(owner, name, taxpayer_id, type_="Company"):
        db.execute("INSERT INTO invoice_titles(owner_id,type,name,taxpayer_id) VALUES(?,?,?,?)",
                   (users[owner], type_, name, taxpayer_id))

    add_traveler("user", "Zhang San")
    add_traveler("user", "Li Si")
    add_traveler("personal_read", "Li Si")
    add_address("personal_read", "Zhang San", "Shanghai", "Pudong New Area",
                "No. 100 Century Avenue", "13800000020")
    add_contact("contact_search", "Zhang San", "13800000021", "zhang.san@example.com", 1)
    add_invoice("invoice_search", "Shanghai Example Technology Co., Ltd.", "91310000123456789A")

    def add_order(owner, number, flight, flight_date, origin, destination, airline,
                  departure, fare, taxes, total, payment_status, display_status,
                  payment_date=None, travel_status=None, voucher_status=None,
                  voucher_issued=None, booking_date="2026-07-19"):
        db.execute("""INSERT INTO orders(owner_id,number,flight,flight_date,origin,destination,
            airline,departure,fare,taxes,total,payment_status,display_status,booking_date,
            contact_mobile,passengers_json,services_json,itinerary_json,created_ts,expires_at,
            paid_at,payment_date,travel_status,voucher_status,voucher_issued)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (users.get(owner), number, flight, flight_date, origin, destination, airline,
             departure, fare, taxes, total, payment_status, display_status, booking_date,
             None, json.dumps(["Wang Wu"]), json.dumps([]), None, now_real(),
             now_real() + 86400 if payment_status == "Pending payment" else None,
             BUSINESS_DATE if payment_status == "Paid" else None, payment_date,
             travel_status, voucher_status, voucher_issued))

    add_order("order_read", "CTRIP20260721001", "JD5162", "2026-07-21", "Chengdu",
              "Guangzhou", "Other airline", "09:00", 460, 70, 530,
              "Pending payment", "Pending payment")
    add_order("order_read", "CTRIP20260722002", "CZ3401", "2026-07-22", "Chengdu",
              "Guangzhou", "China Southern", "11:00", 320, 70, 390,
              "Paid", "Not traveled", payment_date="2026-07-18")
    add_order("order_read", "CTRIP20260718003", "MU5234", "2026-07-18", "Chengdu",
              "Guangzhou", "Other airline", "07:30", 580, 70, 650,
              "Paid", "Pending review", payment_date="2026-07-17")
    add_order("order_cancel", "CTRIP20260721004", "JD5162", "2026-07-21", "Chengdu",
              "Guangzhou", "Other airline", "09:00", 460, 70, 530,
              "Pending payment", "Pending payment")
    add_order("voucher_read", "CTRIP20260718004", "JD5162", "2026-07-18", "Chengdu",
              "Guangzhou", "Other airline", "09:00", 460, 70, 530,
              "Paid", "Completed", payment_date="2026-07-18",
              travel_status="Completed", voucher_status="Completed",
              voucher_issued="Issued voucher")
    add_order("voucher_pending", "CTRIP20260721005", "JD5162", "2026-07-21", "Chengdu",
              "Guangzhou", "Other airline", "09:00", 460, 70, 530,
              "Paid", "Not traveled", payment_date="2026-07-19",
              travel_status="Not traveled", voucher_status="None")
    add_order("voucher_history", "CTRIP20260514001", "JD5162", "2026-05-14", "Chengdu",
              "Guangzhou", "Other airline", "09:00", 460, 70, 530,
              "Paid", "Completed", payment_date="2026-05-14",
              travel_status="Completed", voucher_status="None", booking_date="2026-05-14")


def current_user(db, sid):
    row = db.execute(
        "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.sid=?",
        (sid,)).fetchone()
    return row


def require_user(db, sid):
    row = current_user(db, sid)
    if not row:
        raise ValueError("Sign in required")
    return row


def set_session(db, sid, user_id):
    db.execute("INSERT OR REPLACE INTO sessions(sid,user_id,created_at) VALUES(?,?,?)",
               (sid, user_id, now_real()))


def records_for(db, table, owner_id):
    rows = db.execute(f"SELECT * FROM {table} WHERE owner_id=? ORDER BY id",
                      (owner_id,)).fetchall()
    return [dict(r) for r in rows]


def personal_payload(db, user_id):
    return {
        "travelers": records_for(db, "travelers", user_id),
        "addresses": records_for(db, "addresses", user_id),
        "contacts": records_for(db, "contacts", user_id),
        "invoice_titles": records_for(db, "invoice_titles", user_id),
    }


def can_access_order(row, user):
    if not row:
        return False
    if row["owner_id"] is None:
        return True
    return bool(user and row["owner_id"] == user["id"])


def serialize_order(row, include_admin=True):
    if not row:
        return None
    d = dict(row)
    for key in ("passengers_json", "services_json", "itinerary_json"):
        try:
            d[key] = json.loads(d.get(key) or "[]")
        except Exception:
            d[key] = []
    remaining = 0
    if d.get("payment_status") == "Pending payment" and d.get("expires_at"):
        remaining = max(0, int(d["expires_at"] - now_real()))
    d["remaining_seconds"] = remaining
    d.pop("owner_id", None)
    return d


def expire_pending_orders(db):
    db.execute("""UPDATE orders SET payment_status='Closed', display_status='Closed'
               WHERE payment_status='Pending payment' AND expires_at IS NOT NULL
               AND expires_at < ?""", (now_real(),))


def next_order_number(db):
    base = "CTRIP20260719"
    for _ in range(50):
        candidate = base + str(random.randint(100, 999))
        if not db.execute("SELECT 1 FROM orders WHERE number=?", (candidate,)).fetchone():
            return candidate
    return base + str(int(now_real()))[-3:]


def dispatch(action, data, session_id, db):
    ensure_schema(db)
    user = current_user(db, session_id)

    if action == "health":
        return {"ok": True, "business_clock": BUSINESS_CLOCK}

    if action == "bootstrap":
        return {"user": user_public(user), "business_date": BUSINESS_DATE,
                "business_clock": BUSINESS_CLOCK}

    # ---------------- Account access ----------------
    if action == "auth.login_password":
        account = (data.get("account") or "").strip()
        password = data.get("password") or ""
        if not account:
            raise ValueError("Enter your account")
        if not password:
            raise ValueError("Enter your password")
        row = db.execute(
            "SELECT * FROM users WHERE email=? COLLATE NOCASE OR username=? OR mobile=?",
            (account, account, account)).fetchone()
        if not row or row["password"] != password:
            raise ValueError("Incorrect account or password")
        set_session(db, session_id, row["id"])
        return {"user": user_public(row)}

    if action == "auth.send_code":
        phone = (data.get("phone") or "").strip()
        purpose = data.get("purpose") or "login"
        if not phone:
            raise ValueError("Enter your mobile number")
        if purpose == "register" and db.execute(
                "SELECT 1 FROM users WHERE mobile=?", (phone,)).fetchone():
            raise ValueError("Mobile number is already registered")
        db.execute(
            "INSERT OR REPLACE INTO verify_codes(sid,phone,code,purpose,created_at) VALUES(?,?,?,?,?)",
            (session_id, phone, "123456", purpose, now_real()))
        return {"ok": True, "sent_to": phone}

    if action == "auth.check_code":
        phone = (data.get("phone") or "").strip()
        code = (data.get("code") or "").strip()
        purpose = data.get("purpose") or "register"
        if not phone:
            raise ValueError("Enter your mobile number")
        if not code:
            raise ValueError("Enter your verification code")
        row = db.execute(
            "SELECT * FROM verify_codes WHERE sid=? AND phone=? AND purpose=?",
            (session_id, phone, purpose)).fetchone()
        if not row:
            raise ValueError("Send a verification code first")
        if row["code"] != code:
            raise ValueError("Incorrect verification code")
        return {"ok": True}

    if action == "auth.login_sms":
        phone = (data.get("phone") or "").strip()
        code = (data.get("code") or "").strip()
        if not phone:
            raise ValueError("Enter your mobile number")
        if not code:
            raise ValueError("Enter your verification code")
        row = db.execute(
            "SELECT * FROM verify_codes WHERE sid=? AND phone=? AND purpose='login'",
            (session_id, phone)).fetchone()
        if not row:
            raise ValueError("Send a verification code first")
        if row["code"] != code:
            raise ValueError("Incorrect verification code")
        account = db.execute("SELECT * FROM users WHERE mobile=?", (phone,)).fetchone()
        if not account:
            raise ValueError("Incorrect verification code")
        set_session(db, session_id, account["id"])
        return {"user": user_public(account)}

    if action == "auth.register":
        mobile = (data.get("mobile") or "").strip()
        password = data.get("password") or ""
        if not mobile:
            raise ValueError("Enter your mobile number")
        if db.execute("SELECT 1 FROM users WHERE mobile=?", (mobile,)).fetchone():
            raise ValueError("Mobile number is already registered")
        row = db.execute(
            "SELECT * FROM verify_codes WHERE sid=? AND phone=? AND purpose='register'",
            (session_id, mobile)).fetchone()
        if not row:
            raise ValueError("Verify your mobile number first")
        cur = db.execute(
            "INSERT INTO users(email,username,mobile,password,nickname,created_at) VALUES(?,?,?,?,?,?)",
            (None, None, mobile, password, mobile, BUSINESS_DATE))
        return {"ok": True, "user": user_public(db.execute(
            "SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone())}

    if action == "auth.logout":
        db.execute("DELETE FROM sessions WHERE sid=?", (session_id,))
        return {"ok": True}

    # ---------------- Personal reusable information ----------------
    if action == "personal.list":
        row = require_user(db, session_id)
        return personal_payload(db, row["id"])

    if action.startswith("personal.add_"):
        row = require_user(db, session_id)
        owner = row["id"]
        kind = action[len("personal.add_"):]
        if kind == "traveler":
            name = (data.get("name") or "").strip()
            if not name:
                raise ValueError("Enter a full name")
            cur = db.execute("INSERT INTO travelers(owner_id,name,id_number) VALUES(?,?,?)",
                             (owner, name, (data.get("id_number") or "").strip()))
            return {"record": dict(db.execute("SELECT * FROM travelers WHERE id=?", (cur.lastrowid,)).fetchone())}
        if kind == "address":
            recipient = (data.get("recipient") or "").strip()
            if not recipient:
                raise ValueError("Enter a recipient")
            cur = db.execute(
                "INSERT INTO addresses(owner_id,recipient,city,district,street,mobile) VALUES(?,?,?,?,?,?)",
                (owner, recipient, (data.get("city") or "").strip(),
                 (data.get("district") or "").strip(), (data.get("street") or "").strip(),
                 (data.get("mobile") or "").strip()))
            return {"record": dict(db.execute("SELECT * FROM addresses WHERE id=?", (cur.lastrowid,)).fetchone())}
        if kind == "contact":
            name = (data.get("name") or "").strip()
            if not name:
                raise ValueError("Enter a contact name")
            cur = db.execute(
                "INSERT INTO contacts(owner_id,name,mobile,email,is_default) VALUES(?,?,?,?,?)",
                (owner, name, (data.get("mobile") or "").strip(),
                 (data.get("email") or "").strip(), 1 if data.get("is_default") else 0))
            return {"record": dict(db.execute("SELECT * FROM contacts WHERE id=?", (cur.lastrowid,)).fetchone())}
        if kind == "invoice":
            name = (data.get("name") or "").strip()
            taxpayer = (data.get("taxpayer_id") or "").strip()
            if not name:
                raise ValueError("Enter an invoice title")
            if (data.get("type") or "Company") == "Company" and not taxpayer:
                raise ValueError("Enter a taxpayer ID")
            cur = db.execute(
                """INSERT INTO invoice_titles(owner_id,type,name,taxpayer_id,special_vat,
                registered_address,registered_phone,bank_name,bank_account)
                VALUES(?,?,?,?,?,?,?,?,?)""",
                (owner, data.get("type") or "Company", name, taxpayer,
                 1 if data.get("special_vat") else 0,
                 data.get("registered_address") or "", data.get("registered_phone") or "",
                 data.get("bank_name") or "", data.get("bank_account") or ""))
            return {"record": dict(db.execute("SELECT * FROM invoice_titles WHERE id=?", (cur.lastrowid,)).fetchone())}
        raise ValueError("Unknown personal record type")

    if action == "personal.update_traveler":
        row = require_user(db, session_id)
        traveler_id = int(data.get("id"))
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("Enter a full name")
        existing = db.execute("SELECT * FROM travelers WHERE id=? AND owner_id=?",
                              (traveler_id, row["id"])).fetchone()
        if not existing:
            raise ValueError("Traveler not found")
        db.execute("UPDATE travelers SET name=?, id_number=? WHERE id=? AND owner_id=?",
                   (name, (data.get("id_number") or "").strip(), traveler_id, row["id"]))
        return {"record": dict(db.execute("SELECT * FROM travelers WHERE id=?", (traveler_id,)).fetchone())}

    if action in ("personal.delete_traveler", "personal.delete_travelers",
                  "personal.delete_address", "personal.delete_addresses",
                  "personal.delete_contact", "personal.delete_contacts",
                  "personal.delete_invoice", "personal.delete_invoices"):
        row = require_user(db, session_id)
        table = {"traveler": "travelers", "travelers": "travelers",
                 "address": "addresses", "addresses": "addresses",
                 "contact": "contacts", "contacts": "contacts",
                 "invoice": "invoice_titles", "invoices": "invoice_titles"}[action.split("_", 1)[1]]
        ids = data.get("ids")
        if ids is None:
            ids = [data.get("id")]
        ids = [int(i) for i in ids if i not in (None, "")]
        if not ids:
            raise ValueError("Select at least one record")
        marks = ",".join("?" for _ in ids)
        db.execute(f"DELETE FROM {table} WHERE owner_id=? AND id IN ({marks})",
                   [row["id"]] + ids)
        return {"ok": True, "deleted": ids}

    # ---------------- Orders ----------------
    if action == "orders.list":
        expire_pending_orders(db)
        if not user:
            return {"orders": []}
        rows = db.execute(
            "SELECT * FROM orders WHERE owner_id=? ORDER BY id DESC", (user["id"],)).fetchall()
        return {"orders": [serialize_order(r) for r in rows]}

    if action == "orders.get":
        expire_pending_orders(db)
        number = data.get("number") or ""
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        if not row or not can_access_order(row, user):
            raise ValueError("Order not found")
        return {"order": serialize_order(row)}

    if action == "orders.create":
        flight = data.get("flight") or {}
        passengers = data.get("passengers") or []
        services = data.get("services") or []
        fare = money(flight.get("fare"))
        taxes = money(flight.get("taxes"))
        count = max(1, int(data.get("passenger_count") or len(passengers) or 1))
        service_total = sum(money(s.get("amount")) for s in services)
        total = money(data.get("total")) or (fare + taxes) * count + service_total
        number = next_order_number(db)
        db.execute(
            """INSERT INTO orders(owner_id,number,flight,flight_date,origin,destination,airline,
            departure,fare,taxes,total,payment_status,display_status,booking_date,contact_mobile,
            passengers_json,services_json,itinerary_json,created_ts,expires_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user["id"] if user else None, number, flight.get("number"), flight.get("date"),
             flight.get("origin"), flight.get("destination"), flight.get("airline"),
             flight.get("departure"), fare, taxes, total, "Pending payment",
             "Pending payment", BUSINESS_DATE, data.get("contact_mobile"),
             json.dumps(passengers), json.dumps(services),
             json.dumps({"origin": flight.get("origin"),
                         "destination": flight.get("destination"),
                         "date": flight.get("date"), "number": flight.get("number")}),
             now_real(), now_real() + 1800))
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        return {"order": serialize_order(row)}

    if action == "orders.pay":
        number = data.get("number") or ""
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        if not row or not can_access_order(row, user):
            raise ValueError("Order not found")
        if row["payment_status"] != "Pending payment":
            raise ValueError("Order is not awaiting payment")
        db.execute("""UPDATE orders SET payment_status='Paid', display_status='Not traveled',
                   paid_at=?, payment_date=? WHERE number=?""",
                   (BUSINESS_DATE, BUSINESS_DATE, number))
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        return {"order": serialize_order(row), "payment_status": "Payment successful"}

    if action == "orders.cancel":
        number = data.get("number") or ""
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        if not row or not can_access_order(row, user):
            raise ValueError("Order not found")
        if row["payment_status"] not in ("Pending payment", "Closed"):
            raise ValueError("Only unpaid orders can be cancelled")
        db.execute("""UPDATE orders SET payment_status='Closed', display_status='Closed',
                   cancelled_at=? WHERE number=?""", (BUSINESS_DATE, number))
        row = db.execute("SELECT * FROM orders WHERE number=?", (number,)).fetchone()
        return {"order": serialize_order(row)}

    # ---------------- Profile and security ----------------
    if action == "profile.update":
        row = require_user(db, session_id)
        db.execute("""UPDATE users SET nickname=?, real_name=?, gender=?, birth_date=?
                   WHERE id=?""",
                   (data.get("nickname") or "", data.get("real_name") or "",
                    data.get("gender") or "", data.get("birth_date") or "", row["id"]))
        new_row = db.execute("SELECT * FROM users WHERE id=?", (row["id"],)).fetchone()
        return {"user": user_public(new_row)}

    if action == "security.check_password":
        row = require_user(db, session_id)
        ok = row["password"] == (data.get("password") or "")
        if not ok:
            raise ValueError("Incorrect password")
        return {"ok": True}

    if action == "security.change_password":
        row = require_user(db, session_id)
        if row["password"] != (data.get("current_password") or ""):
            raise ValueError("Current password is incorrect")
        new_password = data.get("new_password") or ""
        if not new_password:
            raise ValueError("Enter a new password")
        db.execute("UPDATE users SET password=? WHERE id=?", (new_password, row["id"]))
        db.execute("DELETE FROM sessions WHERE user_id=?", (row["id"],))
        return {"ok": True, "message": "Sign in again"}

    if action == "security.send_email_code":
        require_user(db, session_id)
        return {"ok": True, "code": "123456"}

    # ---------------- Flight status history ----------------
    if action == "status.history":
        if not user:
            return {"history": []}
        rows = db.execute(
            "SELECT * FROM status_history WHERE owner_id=? ORDER BY created_at DESC, id DESC",
            (user["id"],)).fetchall()
        return {"history": [dict(r) for r in rows]}

    if action == "status.record":
        if not user:
            return {"history": []}
        mode = data.get("mode") or "number"
        label = data.get("label") or ""
        existing = db.execute(
            "SELECT id FROM status_history WHERE owner_id=? AND mode=? AND label=? AND flight_date=?",
            (user["id"], mode, label, data.get("date") or "")).fetchone()
        if existing:
            db.execute("UPDATE status_history SET created_at=? WHERE id=?",
                       (now_real(), existing["id"]))
        else:
            db.execute("""INSERT INTO status_history(owner_id,mode,flight_number,origin,
                       destination,flight_date,label,created_at) VALUES(?,?,?,?,?,?,?,?)""",
                       (user["id"], mode, data.get("number") or "", data.get("origin") or "",
                        data.get("destination") or "", data.get("date") or "", label,
                        now_real()))
        rows = db.execute(
            "SELECT * FROM status_history WHERE owner_id=? ORDER BY created_at DESC, id DESC",
            (user["id"],)).fetchall()
        return {"history": [dict(r) for r in rows]}

    if action == "status.clear_history":
        row = require_user(db, session_id)
        db.execute("DELETE FROM status_history WHERE owner_id=?", (row["id"],))
        return {"history": []}

    # ---------------- Reimbursement vouchers ----------------
    if action == "vouchers.list":
        if not user:
            return {"pending": [], "pending_history": [], "in_progress": [], "completed": []}
        rows = db.execute("SELECT * FROM orders WHERE owner_id=? ORDER BY id DESC",
                          (user["id"],)).fetchall()
        business = datetime.strptime(BUSINESS_DATE, "%Y-%m-%d")
        year_ago = (business - timedelta(days=365)).strftime("%Y-%m-%d")
        recent_start = (business - timedelta(days=30)).strftime("%Y-%m-%d")
        pending, older, in_progress, completed = [], [], [], []
        for r in rows:
            if r["voucher_status"] is None:
                continue
            item = serialize_order(r)
            if r["voucher_status"] == "Completed":
                completed.append(item)
            elif r["voucher_status"] == "In progress":
                in_progress.append(item)
            elif r["payment_status"] == "Paid" and r["payment_date"]:
                if r["payment_date"] >= recent_start:
                    pending.append(item)
                elif r["payment_date"] >= year_ago:
                    older.append(item)
        return {"pending": pending, "pending_history": older,
                "in_progress": in_progress, "completed": completed}

    raise ValueError("Unknown action")
