"""12306 railway travel: state, business rules and dispatch.

All timestamps use Asia/Shanghai (UTC+8).  The business clock starts at
2026-07-21T00:00:00+08:00 when the application is first initialised and then
advances with real elapsed time.  It is persisted so reloads never restart it.
"""
import hashlib
import math
import re
import secrets
import time
from datetime import datetime, timedelta, timezone

TZ = timezone(timedelta(hours=8))
CLOCK_START = datetime(2026, 7, 21, 0, 0, 0, tzinfo=TZ)
SALE_START = "2026-07-21"
SALE_END = "2026-08-04"
DEFAULT_FROM = "Beijing"
DEFAULT_TO = "Shanghai"
DEFAULT_DATE = "2026-07-21"

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MOBILE_RE = re.compile(r"^1\d{10}$")
KEYWORD_RE = re.compile(r"^[A-Za-z0-9\u4e00-\u9fff\s\-]*$")

CITIES = {
    "Shanghai": {"cn": "上海", "pinyin": ["shang", "shanghai", "上海"], "group": "PQRST"},
    "Beijing": {"cn": "北京", "pinyin": ["bei", "beijing", "北京"], "group": "ABCDE"},
    "Yancheng": {"cn": "盐城", "pinyin": ["yan", "yancheng", "盐城"], "group": "UVWXYZ"},
    "Lhasa": {"cn": "拉萨", "pinyin": ["lhasa", "lasa", "拉萨"], "group": "KLMNO"},
}

CLASS_LABELS = {
    "business": "business-class seat",
    "first": "first-class seat",
    "second": "second-class seat",
    "standing": "standing ticket",
}
CLASS_OPTIONS = {
    "business": "Business-class seat",
    "first": "First-class seat",
    "second": "Second-class seat",
    "standing": "Standing ticket",
}

TRAIN_SPECS = {
    "G1001": {
        "from_city": "Shanghai", "to_city": "Beijing",
        "from_station": "Shanghai Hongqiao", "to_station": "Beijing South",
        "departure": "08:00", "arrival": "13:00", "duration": 300,
        "prices": {"business": 1870.0, "first": 967.0, "second": 576.0, "standing": 576.0},
        "discounts": {"business": "32% off", "first": "24% off", "second": "27% off", "standing": "27% off"},
        "base": {"business": 1, "first": 0, "second": 0, "standing": "Enough"},
    },
    "G1002": {
        "from_city": "Shanghai", "to_city": "Beijing",
        "from_station": "Shanghai", "to_station": "Beijing",
        "departure": "13:00", "arrival": "19:00", "duration": 360,
        "prices": {"business": 1900.0, "first": 1000.0, "second": 600.0, "standing": 600.0},
        "discounts": {"business": "30% off", "first": "25% off", "second": "27% off", "standing": "27% off"},
        "base": {"business": 0, "first": 0, "second": "Enough", "standing": "Enough"},
    },
    "K1003": {
        "from_city": "Shanghai", "to_city": "Beijing",
        "from_station": "Shanghai", "to_station": "Beijing South",
        "departure": "00:30", "arrival": "15:30", "duration": 900,
        "prices": {"business": 800.0, "first": 400.0, "second": 200.0, "standing": 200.0},
        "discounts": {"business": "20% off", "first": "20% off", "second": "20% off", "standing": "20% off"},
        "base": {"business": 0, "first": 0, "second": "Enough", "standing": "Enough"},
    },
    "G2002": {
        "from_city": "Shanghai", "to_city": "Beijing",
        "from_station": "Shanghai", "to_station": "Beijing",
        "departure": "10:00", "arrival": "15:00", "duration": 300,
        "prices": {"business": 1870.0, "first": 967.0, "second": 576.0, "standing": 576.0},
        "discounts": {"business": "32% off", "first": "24% off", "second": "27% off", "standing": "27% off"},
        "base": {"business": 1, "first": 0, "second": 0, "standing": "Enough"},
    },
    "G3001": {
        "from_city": "Beijing", "to_city": "Shanghai",
        "from_station": "Beijing South", "to_station": "Shanghai Hongqiao",
        "departure": "08:00", "arrival": "13:00", "duration": 300,
        "prices": {"business": 1900.0, "first": 1000.0, "second": 600.0, "standing": 600.0},
        "discounts": {"business": "30% off", "first": "25% off", "second": "27% off", "standing": "27% off"},
        "base": {"business": 0, "first": 0, "second": "Enough", "standing": "Enough"},
    },
}

PUBLISHED = {
    ("Shanghai", "Beijing", "2026-07-21"): ["G1001", "G1002", "K1003"],
    ("Shanghai", "Beijing", "2026-07-22"): ["G1001", "G1002", "K1003", "G2002"],
    ("Beijing", "Shanghai", "2026-07-21"): ["G3001"],
    ("Yancheng", "Lhasa", "2026-07-21"): [],
    ("Shanghai", "Lhasa", "2026-07-21"): [],
}

TRANSFER_PLANS = [
    {
        "first": "D2002", "second": "Z22", "via": "Xian",
        "departure": "06:00", "arrival": "16:00", "wait": 120, "wait_text": "2h 0m",
        "total": 2040, "first_price": 180, "second_price": 420,
        "first_segment": "Yancheng-Xian 2026-07-21 06:00-10:00; 240 minutes",
        "second_segment": "Xian-Lhasa 2026-07-21 12:00 to 2026-07-22 16:00; 1680 minutes",
        "first_route": "Yancheng - Xian", "second_route": "Xian - Lhasa",
        "first_times": "06:00 - 10:00", "second_times": "12:00 - 16:00 (next day)",
        "first_minutes": 240, "second_minutes": 1680,
    },
    {
        "first": "D2001", "second": "Z21", "via": "Beijing",
        "departure": "08:00", "arrival": "19:00", "wait": 60, "wait_text": "1h 0m",
        "total": 2100, "first_price": 200, "second_price": 400,
        "first_segment": "Yancheng-Beijing 2026-07-21 08:00-12:00; 240 minutes",
        "second_segment": "Beijing-Lhasa 2026-07-21 13:00 to 2026-07-22 19:00; 1800 minutes",
        "first_route": "Yancheng - Beijing", "second_route": "Beijing - Lhasa",
        "first_times": "08:00 - 12:00", "second_times": "13:00 - 19:00 (next day)",
        "first_minutes": 240, "second_minutes": 1800,
    },
]

SEED_PASSWORDS = "Password123!"

# (username, email, mobile, passport)
SEED_ACCOUNTS = [
    ("registered_user", "registered_user@example.com", "13800000010", "P20260010"),
    ("personal_center_user", "personal_center_user@example.com", "13800000020", "P20261020"),
    ("reset_user", "reset_user@example.com", "13900000011", "P20260011"),
    ("reset_mismatch_user", "reset_mismatch_user@example.com", "13900000012", "P20260012"),
    ("profile_user", "profile_user@example.com", "13800000030", "P20260030"),
    ("profile_essential_user", "profile_essential_user@example.com", "13900000031", "P20260031"),
    ("profile_invalid_password_user", "profile_invalid_password_user@example.com", "13900000032", "P20260032"),
    ("profile_contact_user", "profile_contact_user@example.com", "13900000033", "P20260033"),
    ("profile_additional_user", "profile_additional_user@example.com", "13900000034", "P20260034"),
    ("security_password_user", "security_password_user@example.com", "13900000035", "P20260035"),
    ("security_password_change_user", "security_password_change_user@example.com", "13900000036", "P20260036"),
    ("profile_mailbox_update_user", "profile_mailbox_update_user@example.com", "13900000037", "P20260037"),
    ("profile_mobile_update_user", "profile_mobile_update_user@example.com", "13800000032", "P20260038"),
    ("passenger_manager_user", "passenger_manager_user@example.com", "13900000039", "P20260039"),
    ("orders_unpaid_user", "orders_unpaid_user@example.com", "13900000040", "P20260040"),
    ("orders_upcoming_user", "orders_upcoming_user@example.com", "13900000041", "P20260041"),
    ("orders_history_user", "orders_history_user@example.com", "13900000042", "P20260042"),
    ("orders_empty_user", "orders_empty_user@example.com", "13900000043", "P20260043"),
    ("bookable_user", "bookable_user@example.com", "13900000044", "P20261144"),
    ("booking_submit_user", "booking_submit_user@example.com", "13900000045", "P20261145"),
    ("booking_confirm_user", "booking_confirm_user@example.com", "13900000046", "P20261146"),
    ("booking_edit_user", "booking_edit_user@example.com", "13900000047", "P20261147"),
    ("booking_payment_user", "booking_payment_user@example.com", "13900000048", "P20261148"),
    ("booking_cancel_user", "booking_cancel_user@example.com", "13900000049", "P20261149"),
    ("booking_paid_user", "booking_paid_user@example.com", "13900000050", "P20261150"),
    ("booking_unpaid_user", "booking_unpaid_user@example.com", "13900000051", "P20261151"),
    ("booking_upcoming_user", "booking_upcoming_user@example.com", "13900000052", "P20261152"),
    ("booking_cancelled_user", "booking_cancelled_user@example.com", "13900000053", "P20261153"),
    ("orders_refund_user", "orders_refund_user@example.com", "13900000054", "P20261154"),
    ("orders_cancel_center_user", "orders_cancel_center_user@example.com", "13900000055", "P20261155"),
    ("orders_unpaid_dismiss_user", "orders_unpaid_dismiss_user@example.com", "13900000056", "P20261156"),
    ("orders_cancelled_user", "orders_cancelled_user@example.com", "13900000057", "P20261157"),
]

SEED_BOOKING_PASSENGERS = {
    "bookable_user": ("Passenger Example", "P20269997"),
    "booking_submit_user": ("Passenger Example", "P20269998"),
    "booking_confirm_user": ("Passenger Example", "P20269991"),
    "booking_edit_user": ("Passenger Example", "P20269992"),
    "booking_payment_user": ("Passenger Example", "P20269993"),
    "booking_cancel_user": ("Passenger Example", "P20269994"),
    "booking_paid_user": ("Passenger Example", "P20269995"),
    "booking_unpaid_user": ("Passenger Example", "P20269990"),
    "booking_upcoming_user": ("Passenger Example", "P20269989"),
    "booking_cancelled_user": ("Passenger Example", "P20269988"),
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  mobile TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'China',
  id_type TEXT NOT NULL DEFAULT 'Foreign passport',
  passport TEXT NOT NULL UNIQUE,
  passport_expiry TEXT,
  dob TEXT,
  gender TEXT,
  passenger_type TEXT NOT NULL DEFAULT 'Adult',
  verified INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS passengers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'China',
  passport TEXT NOT NULL UNIQUE,
  passport_expiry TEXT,
  dob TEXT,
  gender TEXT,
  email TEXT,
  mobile TEXT,
  passenger_type TEXT NOT NULL DEFAULT 'Adult',
  holder INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  train_number TEXT NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_station TEXT NOT NULL,
  to_station TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  total REAL NOT NULL,
  payment_deadline TEXT,
  refund_deadline TEXT
);
CREATE TABLE IF NOT EXISTS order_passengers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  passenger_id INTEGER,
  name TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  nationality TEXT,
  ticket_class TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  price REAL NOT NULL,
  coach TEXT,
  seat TEXT,
  seat_berth TEXT
);
CREATE TABLE IF NOT EXISTS sessions(
  sid TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
"""


def password_hash(password):
    return hashlib.sha256(("12306::" + password).encode("utf-8")).hexdigest()


def now_dt(db):
    row = db.execute("SELECT value FROM kv WHERE key='clock.anchor'").fetchone()
    if row is None:
        anchor = time.time()
        db.execute("INSERT INTO kv(key,value) VALUES('clock.anchor',?)", (str(anchor),))
    else:
        anchor = float(row["value"])
    return CLOCK_START + timedelta(seconds=max(0.0, time.time() - anchor))


def iso(dt):
    return dt.isoformat()


def now_iso(db):
    return iso(now_dt(db))


def parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def city_label(city):
    info = CITIES.get(city)
    return f"{city} ({info['cn']})" if info else city


def canonical_city(value):
    raw = (value or "").strip()
    if not raw:
        return None
    for city, info in CITIES.items():
        if raw.lower() == city.lower() or raw == info["cn"] or raw.lower() == info["cn"]:
            return city
        if raw.lower() in [p.lower() for p in info["pinyin"]]:
            return city
    return None


def money(value):
    return f"{float(value):.2f}"


def price_int(value):
    value = float(value)
    return str(int(value)) if value.is_integer() else f"{value:g}"


def user_json(row):
    if row is None:
        return None
    return {
        "username": row["username"],
        "email": row["email"] or "",
        "mobile": row["mobile"] or "",
        "name": row["name"],
        "nationality": row["nationality"],
        "id_type": row["id_type"],
        "id_number": row["passport"],
        "passport": row["passport"],
        "gender": row["gender"],
        "passenger_type": row["passenger_type"],
        "verified": bool(row["verified"]),
        "passport_expiry": row["passport_expiry"],
        "dob": row["dob"],
    }


def current_user(db, sid):
    if not sid:
        return None
    return db.execute(
        "SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.sid=?", (sid,)
    ).fetchone()


def require_user(db, sid):
    row = current_user(db, sid)
    if row is None:
        raise ValueError("Please log in to continue.")
    return row


def ensure_initialised(db):
    for statement in SCHEMA.split(";"):
        if statement.strip():
            db.execute(statement)
    now_dt(db)
    seeded = db.execute("SELECT value FROM kv WHERE key='seed.v1'").fetchone()
    if seeded:
        return
    created = iso(now_dt(db))
    for username, email, mobile, passport in SEED_ACCOUNTS:
        cur = db.execute(
            "INSERT INTO accounts(username,email,mobile,password_hash,name,nationality,id_type,passport,"
            "passport_expiry,dob,gender,passenger_type,verified,created_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (username, email, mobile, password_hash(SEED_PASSWORDS), username, "China",
             "Foreign passport", passport, "2030-12-31", "1995-01-01", "Male", "Adult", 1, created),
        )
        user_id = cur.lastrowid
        db.execute(
            "INSERT INTO passengers(user_id,name,nationality,passport,passport_expiry,dob,gender,email,mobile,"
            "passenger_type,holder) VALUES(?,?,?,?,?,?,?,?,?,?,1)",
            (user_id, username, "China", passport, "2030-12-31", "1995-01-01", "Male", email, mobile, "Adult"),
        )
        if username in SEED_BOOKING_PASSENGERS:
            pname, ppassport = SEED_BOOKING_PASSENGERS[username]
            db.execute(
                "INSERT INTO passengers(user_id,name,nationality,passport,passport_expiry,dob,gender,email,mobile,"
                "passenger_type,holder) VALUES(?,?,?,?,?,?,?,?,?,?,0)",
                (user_id, pname, "China", ppassport, "2027-12-31", "2000-01-15", "Female",
                 "passenger@example.com", "13800000040", "Adult"),
            )
    # Historical completed order for orders_history_user.  The historical
    # passenger is an order snapshot, not a current frequent passenger.
    hist = db.execute("SELECT id FROM accounts WHERE username='orders_history_user'").fetchone()
    hist_id = hist["id"]
    order_created = "2026-07-18T10:00:00+08:00"
    cur = db.execute(
        "INSERT INTO orders(order_no,user_id,train_number,from_city,to_city,from_station,to_station,"
        "departure_date,departure_time,arrival_time,duration,status,created_at,total,payment_deadline,"
        "refund_deadline) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ("E202607180001", hist_id, "G1001", "Shanghai", "Beijing", "Shanghai Hongqiao",
         "Beijing South", "2026-07-19", "08:00", "13:00", 300, "completed", order_created,
         1870.0, "2026-07-18T10:20:00+08:00", "2026-07-19T00:00:00+08:00"),
    )
    db.execute(
        "INSERT INTO order_passengers(order_id,passenger_id,name,id_type,id_number,nationality,"
        "ticket_class,ticket_type,price,coach,seat,seat_berth) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        (cur.lastrowid, None, "Historical Passenger", "Foreign passport", "P20269980", "China",
         "business", "Adult", 1870.0, "01", "01A", "Window"),
    )
    db.execute("INSERT INTO kv(key,value) VALUES('seed.v1','1')")


def seat_locks(db, user_id, train_number, date, cls):
    if not user_id:
        return 0
    row = db.execute(
        "SELECT COUNT(*) AS c FROM order_passengers op JOIN orders o ON o.id=op.order_id "
        "WHERE o.user_id=? AND o.train_number=? AND o.departure_date=? "
        "AND o.status IN ('unpaid','paid') AND op.ticket_class=?",
        (user_id, train_number, date, cls),
    ).fetchone()
    return row["c"] if row else 0


def availability(db, spec, train_number, date, cls, user_id):
    base = spec["base"][cls]
    if base == "Enough":
        return "Enough"
    return max(0, int(base) - seat_locks(db, user_id, train_number, date, cls))


def available_text(value):
    if value == "Enough":
        return "Enough left"
    if value <= 0:
        return "None left"
    return f"{value} left"


def fare_info(db, train_number, date, user_id):
    spec = TRAIN_SPECS[train_number]
    fares = {}
    for cls in ("business", "first", "second", "standing"):
        avail = availability(db, spec, train_number, date, cls, user_id)
        fares[cls] = {
            "label": CLASS_LABELS[cls],
            "option_label": CLASS_OPTIONS[cls],
            "price": spec["prices"][cls],
            "discount": spec["discounts"][cls],
            "available": avail,
            "available_text": available_text(avail),
            "display": f"{CLASS_LABELS[cls]} ( ￥{spec['prices'][cls]:.1f} ) {spec['discounts'][cls]} {available_text(avail)}",
        }
    return fares


def train_json(db, train_number, date, user_id):
    spec = TRAIN_SPECS[train_number]
    fares = fare_info(db, train_number, date, user_id)
    any_available = any(v == "Enough" or (isinstance(v, int) and v > 0)
                        for v in (f["available"] for f in fares.values()))
    return {
        "number": train_number,
        "from_city": spec["from_city"], "to_city": spec["to_city"],
        "from_station": spec["from_station"], "to_station": spec["to_station"],
        "from_label": city_label(spec["from_city"]), "to_label": city_label(spec["to_city"]),
        "departure": spec["departure"], "arrival": spec["arrival"],
        "duration": spec["duration"], "second_price": spec["prices"]["second"],
        "second_price_text": f"CNY {price_int(spec['prices']['second'])}",
        "fares": fares, "any_available": any_available,
        "refund_deadline": refund_deadline_for(train_number, date),
    }


def refund_deadline_for(train_number, date):
    if date == "2026-07-22" and train_number in ("G1001", "G2002"):
        return "2026-07-22T00:00:00+08:00"
    try:
        dep = datetime.fromisoformat(f"{date}T{TRAIN_SPECS[train_number]['departure']}:00+08:00")
        return iso(dep)
    except Exception:
        return None


def passenger_json(row):
    return {
        "id": row["id"], "name": row["name"], "nationality": row["nationality"],
        "passport": row["passport"], "id_number": row["passport"],
        "id_type": "Foreign passport", "email": row["email"] or "",
        "mobile": row["mobile"] or "", "passenger_type": row["passenger_type"],
        "gender": row["gender"], "holder": bool(row["holder"]),
        "passport_expiry": row["passport_expiry"], "dob": row["dob"],
    }


def order_json(db, row, with_passengers=True):
    passenger_rows = []
    if with_passengers:
        for p in db.execute("SELECT * FROM order_passengers WHERE order_id=? ORDER BY id", (row["id"],)):
            passenger_rows.append({
                "name": p["name"], "id_type": p["id_type"], "id_number": p["id_number"],
                "passport": p["id_number"], "nationality": p["nationality"],
                "ticket_class": p["ticket_class"],
                "ticket_class_label": CLASS_OPTIONS.get(p["ticket_class"], p["ticket_class"]),
                "ticket_type": p["ticket_type"], "price": p["price"],
                "price_text": "￥" + money(p["price"]),
                "coach": p["coach"], "seat": p["seat"], "seat_berth": p["seat_berth"],
            })
    now = now_dt(db)
    deadline = parse_dt(row["payment_deadline"])
    remaining = 0
    if deadline:
        remaining = max(0, int(math.ceil((deadline - now).total_seconds())))
    refund_dl = parse_dt(row["refund_deadline"])
    status = row["status"]
    labels = {"unpaid": "Unpaid", "paid": "Paid", "cancelled": "Cancelled",
              "refunded": "Refunded", "completed": "Completed"}
    return {
        "id": row["id"], "order_no": row["order_no"], "train_number": row["train_number"],
        "from_city": row["from_city"], "to_city": row["to_city"],
        "from_station": row["from_station"], "to_station": row["to_station"],
        "departure_date": row["departure_date"], "departure_time": row["departure_time"],
        "arrival_time": row["arrival_time"], "duration": row["duration"],
        "status": status, "status_label": labels.get(status, status.title()),
        "created_at": row["created_at"], "booking_date": row["created_at"][:10],
        "total": row["total"], "total_text": "￥" + money(row["total"]),
        "payment_deadline": row["payment_deadline"],
        "refund_deadline": row["refund_deadline"],
        "remaining_seconds": remaining,
        "refundable": bool(status == "paid" and refund_dl and now < refund_dl),
        "passengers": passenger_rows,
    }


def query_orders(db, user_id, tab, date_type, start_date, end_date, keyword):
    now = now_dt(db)
    rows = list(db.execute("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC", (user_id,)))
    result = []
    for row in rows:
        status = row["status"]
        if tab == "uncompleted" and status not in ("unpaid", "cancelled"):
            continue
        if tab == "upcoming":
            if status != "paid":
                continue
            try:
                dep = datetime.fromisoformat(f"{row['departure_date']}T{row['departure_time']}:00+08:00")
            except ValueError:
                continue
            if dep <= now:
                continue
        if tab == "history" and status not in ("completed", "refunded"):
            continue
        item = order_json(db, row)
        if date_type == "booking":
            sort_date = row["created_at"][:10]
        else:
            sort_date = row["departure_date"]
        if start_date and sort_date < start_date:
            continue
        if end_date and sort_date > end_date:
            continue
        if keyword:
            hay = " ".join([row["order_no"], row["train_number"]] +
                           [p["name"] for p in item["passengers"]]).lower()
            if keyword.lower() not in hay:
                continue
        result.append(item)
    if tab == "upcoming":
        result.sort(key=lambda o: (o["departure_date"], o["departure_time"]))
    elif tab == "history":
        result.sort(key=lambda o: (o["departure_date"], o["departure_time"]), reverse=True)
    return result


def validate_email(email):
    return bool(EMAIL_RE.match((email or "").strip()))


def validate_mobile(mobile):
    return bool(MOBILE_RE.match((mobile or "").strip()))


def passport_in_use(db, passport, ignore_passenger_id=None):
    row = db.execute("SELECT id FROM accounts WHERE passport=?", (passport,)).fetchone()
    if row:
        return True
    row = db.execute("SELECT id FROM passengers WHERE passport=?", (passport,)).fetchone()
    if row and row["id"] != ignore_passenger_id:
        return True
    return False


def _search(db, data, user_id):
    from_city = canonical_city(data.get("from"))
    to_city = canonical_city(data.get("to"))
    date = (data.get("date") or "").strip()
    if not from_city:
        raise ValueError("Please enter a valid departure place.")
    if not to_city:
        raise ValueError("Please enter a valid arrival place.")
    if not date or date < SALE_START or date > SALE_END:
        raise ValueError("Please choose a departure date from 2026-07-21 through 2026-08-04.")
    numbers = PUBLISHED.get((from_city, to_city, date), [])
    trains = [train_json(db, n, date, user_id) for n in numbers]
    transfers = []
    if (from_city, to_city, date) == ("Yancheng", "Lhasa", "2026-07-21"):
        transfers = [dict(p) for p in TRANSFER_PLANS]
    return {
        "from": from_city, "to": to_city, "date": date,
        "from_label": city_label(from_city), "to_label": city_label(to_city),
        "trains": trains, "count": len(trains), "transfers": transfers,
    }


def _register(db, data):
    required = ["nationality", "name", "passport", "passport_expiry", "dob", "gender",
                "username", "password", "confirm", "email"]
    if any(not str(data.get(k, "")).strip() for k in required):
        raise ValueError("Please fill in all required fields.")
    if data.get("password") != data.get("confirm"):
        raise ValueError("Passwords do not match.")
    email = data.get("email", "").strip()
    if not validate_email(email):
        raise ValueError("Invalid email address format.")
    passport = data.get("passport", "").strip()
    username = data.get("username", "").strip()
    if passport_in_use(db, passport):
        raise ValueError("Passport number already exists.")
    if db.execute("SELECT id FROM accounts WHERE lower(username)=lower(?)", (username,)).fetchone():
        raise ValueError("Username already exists.")
    if not data.get("agree"):
        raise ValueError("Please agree to the Terms of Service and Privacy Policy.")
    now = iso(now_dt(db))
    cur = db.execute(
        "INSERT INTO accounts(username,email,mobile,password_hash,name,nationality,id_type,passport,"
        "passport_expiry,dob,gender,passenger_type,verified,created_at) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (username, email, None, password_hash(data.get("password")), data.get("name", "").strip(),
         data.get("nationality"), "Foreign passport", passport, data.get("passport_expiry"),
         data.get("dob"), data.get("gender"), "Adult", 1, now),
    )
    db.execute(
        "INSERT INTO passengers(user_id,name,nationality,passport,passport_expiry,dob,gender,email,mobile,"
        "passenger_type,holder) VALUES(?,?,?,?,?,?,?,?,?,?,1)",
        (cur.lastrowid, data.get("name", "").strip(), data.get("nationality"), passport,
         data.get("passport_expiry"), data.get("dob"), data.get("gender"), email, None, "Adult"),
    )
    return {"message": "Registration successful.", "username": username}


def _login(db, data, sid):
    ident = (data.get("identifier") or "").strip()
    password = data.get("password") or ""
    if not ident or not password:
        raise ValueError("Please enter your username/email/phone number and password.")
    row = db.execute(
        "SELECT * FROM accounts WHERE lower(username)=lower(?) OR lower(email)=lower(?) OR mobile=?",
        (ident, ident, ident),
    ).fetchone()
    if row is None:
        raise ValueError("User not found.")
    if row["password_hash"] != password_hash(password):
        raise ValueError("Incorrect password.")
    db.execute("DELETE FROM sessions WHERE sid=?", (sid,))
    db.execute("INSERT INTO sessions(sid,user_id,created_at) VALUES(?,?,?)",
               (sid, row["id"], iso(now_dt(db))))
    return {"user": user_json(row), "message": "Login successful."}


def _recover_verify(db, data):
    email = (data.get("email") or "").strip()
    id_number = (data.get("id_number") or "").strip()
    if not email or not id_number:
        raise ValueError("Please enter your email and ID number.")
    row = db.execute(
        "SELECT id FROM accounts WHERE lower(email)=lower(?) AND passport=?", (email, id_number)
    ).fetchone()
    if row is None:
        raise ValueError("Email address and ID number do not match.")
    return {"verified": True}


def _recover_reset(db, data):
    email = (data.get("email") or "").strip()
    id_number = (data.get("id_number") or "").strip()
    new_password = data.get("new_password") or ""
    confirm = data.get("confirm") or ""
    if not email or not id_number:
        raise ValueError("Please enter your email and ID number.")
    if not new_password or not confirm:
        raise ValueError("Please fill in all required fields.")
    if new_password != confirm:
        raise ValueError("Passwords do not match.")
    row = db.execute(
        "SELECT id FROM accounts WHERE lower(email)=lower(?) AND passport=?", (email, id_number)
    ).fetchone()
    if row is None:
        raise ValueError("Email address and ID number do not match.")
    db.execute("UPDATE accounts SET password_hash=? WHERE id=?", (password_hash(new_password), row["id"]))
    return {"message": "Password reset successful."}


def _booking(db, data, user):
    train_number = data.get("train") or ""
    date = data.get("date") or ""
    if train_number not in TRAIN_SPECS:
        raise ValueError("Train not found.")
    from_city = canonical_city(data.get("from")) or TRAIN_SPECS[train_number]["from_city"]
    to_city = canonical_city(data.get("to")) or TRAIN_SPECS[train_number]["to_city"]
    if train_number not in PUBLISHED.get((from_city, to_city, date), []):
        raise ValueError("This train is not available for the selected journey.")
    spec = TRAIN_SPECS[train_number]
    passengers = [passenger_json(p) for p in db.execute(
        "SELECT * FROM passengers WHERE user_id=? ORDER BY holder DESC, id", (user["id"],))]
    return {
        "train": train_json(db, train_number, date, user["id"]),
        "date": date, "from": from_city, "to": to_city,
        "from_label": city_label(from_city), "to_label": city_label(to_city),
        "from_station": spec["from_station"], "to_station": spec["to_station"],
        "passengers": passengers,
    }


def _create_order(db, data, user):
    train_number = data.get("train") or ""
    date = data.get("date") or ""
    selections = data.get("passengers") or []
    if not selections:
        raise ValueError("Please select at least one passenger.")
    if train_number not in TRAIN_SPECS:
        raise ValueError("Train not found.")
    from_city = canonical_city(data.get("from")) or TRAIN_SPECS[train_number]["from_city"]
    to_city = canonical_city(data.get("to")) or TRAIN_SPECS[train_number]["to_city"]
    if train_number not in PUBLISHED.get((from_city, to_city, date), []):
        raise ValueError("This train is not available for the selected journey.")
    spec = TRAIN_SPECS[train_number]
    chosen = []
    seen = set()
    class_counts = {}
    for sel in selections:
        pid = sel.get("passenger_id")
        if pid in seen:
            continue
        seen.add(pid)
        row = db.execute("SELECT * FROM passengers WHERE id=? AND user_id=?", (pid, user["id"])).fetchone()
        if row is None:
            raise ValueError("Passenger not found.")
        cls = sel.get("ticket_class") or "second"
        if cls not in CLASS_OPTIONS:
            raise ValueError("Please select a valid ticket class.")
        ticket_type = sel.get("ticket_type") or "Adult"
        if ticket_type not in ("Adult", "Child"):
            ticket_type = "Adult"
        class_counts[cls] = class_counts.get(cls, 0) + 1
        chosen.append((row, cls, ticket_type))
    if not chosen:
        raise ValueError("Please select at least one passenger.")
    for cls, count in class_counts.items():
        avail = availability(db, spec, train_number, date, cls, user["id"])
        if avail != "Enough" and count > avail:
            raise ValueError("Sorry, there are no tickets available for the selected ticket class.")
    now = now_dt(db)
    payment_deadline = iso(now + timedelta(minutes=20))
    refund_deadline = refund_deadline_for(train_number, date)
    order_no = "E" + now.strftime("%Y%m%d%H%M%S") + secrets.token_hex(2).upper()
    total = sum(spec["prices"][cls] for _, cls, _ in chosen)
    coach_map = {"business": "01", "first": "02", "second": "03", "standing": "04"}
    seat_letter = {"business": "A", "first": "A", "second": "A", "standing": "Standing"}
    cur = db.execute(
        "INSERT INTO orders(order_no,user_id,train_number,from_city,to_city,from_station,to_station,"
        "departure_date,departure_time,arrival_time,duration,status,created_at,total,payment_deadline,"
        "refund_deadline) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (order_no, user["id"], train_number, from_city, to_city, spec["from_station"],
         spec["to_station"], date, spec["departure"], spec["arrival"], spec["duration"],
         "unpaid", iso(now), total, payment_deadline, refund_deadline),
    )
    order_id = cur.lastrowid
    for row, cls, ticket_type in chosen:
        db.execute(
            "INSERT INTO order_passengers(order_id,passenger_id,name,id_type,id_number,nationality,"
            "ticket_class,ticket_type,price,coach,seat,seat_berth) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (order_id, row["id"], row["name"], "Foreign passport", row["passport"],
             row["nationality"], cls, ticket_type, spec["prices"][cls],
             coach_map[cls], coach_map[cls] + seat_letter[cls], "Window"),
        )
    order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    return {"order": order_json(db, order), "message": "Order submitted successfully."}


def _get_order(db, data, user):
    order_id = data.get("id")
    row = db.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (order_id, user["id"])).fetchone()
    if row is None:
        raise ValueError("Order not found.")
    return {"order": order_json(db, row)}


def _pay(db, data, user):
    row = db.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (data.get("id"), user["id"])).fetchone()
    if row is None:
        raise ValueError("Order not found.")
    if row["status"] == "unpaid":
        db.execute("UPDATE orders SET status='paid' WHERE id=?", (row["id"],))
    elif row["status"] != "paid":
        raise ValueError("This order cannot be paid.")
    updated = db.execute("SELECT * FROM orders WHERE id=?", (row["id"],)).fetchone()
    return {"order": order_json(db, updated), "message": "Payment successful."}


def _cancel(db, data, user):
    row = db.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (data.get("id"), user["id"])).fetchone()
    if row is None:
        raise ValueError("Order not found.")
    if row["status"] == "unpaid":
        db.execute("UPDATE orders SET status='cancelled' WHERE id=?", (row["id"],))
    elif row["status"] != "cancelled":
        raise ValueError("This order cannot be cancelled.")
    updated = db.execute("SELECT * FROM orders WHERE id=?", (row["id"],)).fetchone()
    return {"order": order_json(db, updated), "message": "Order cancelled successfully."}


def _refund(db, data, user):
    row = db.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (data.get("id"), user["id"])).fetchone()
    if row is None:
        raise ValueError("Order not found.")
    if row["status"] != "paid":
        raise ValueError("This order cannot be refunded.")
    deadline = parse_dt(row["refund_deadline"])
    if deadline and now_dt(db) >= deadline:
        raise ValueError("The refund deadline has passed.")
    db.execute("UPDATE orders SET status='refunded' WHERE id=?", (row["id"],))
    updated = db.execute("SELECT * FROM orders WHERE id=?", (row["id"],)).fetchone()
    return {"order": order_json(db, updated), "message": "Refund successful",
            "refund_amount": row["total"], "refund_amount_text": "￥" + money(row["total"])}


def _orders(db, data, user):
    tab = data.get("tab") or "uncompleted"
    if tab not in ("uncompleted", "upcoming", "history"):
        tab = "uncompleted"
    keyword = (data.get("keyword") or "").strip()
    if keyword and not KEYWORD_RE.match(keyword):
        raise ValueError("Please enter a valid search condition.")
    date_type = data.get("date_type") or "booking"
    start_date = (data.get("start_date") or "").strip()
    end_date = (data.get("end_date") or "").strip()
    orders = query_orders(db, user["id"], tab, date_type, start_date, end_date, keyword)
    return {"orders": orders, "tab": tab}


def _passengers(db, user):
    rows = list(db.execute("SELECT * FROM passengers WHERE user_id=? ORDER BY holder DESC, id", (user["id"],)))
    return {"passengers": [passenger_json(r) for r in rows]}


def _passenger_add(db, data, user):
    required = ["nationality", "name", "passport", "passport_expiry", "dob", "gender"]
    if any(not str(data.get(k, "")).strip() for k in required):
        raise ValueError("Please fill in all required fields.")
    name = data.get("name", "").strip()
    passport = data.get("passport", "").strip()
    email = (data.get("email") or "").strip()
    mobile = (data.get("mobile") or "").strip()
    if email and not validate_email(email):
        raise ValueError("Invalid email address format.")
    if mobile and not validate_mobile(mobile):
        raise ValueError("Invalid mobile number format.")
    existing = db.execute("SELECT * FROM passengers WHERE passport=?", (passport,)).fetchone()
    same_name = db.execute(
        "SELECT * FROM passengers WHERE user_id=? AND holder=0 AND lower(name)=lower(?)",
        (user["id"], name),
    ).fetchone()
    if existing is not None:
        if existing["user_id"] == user["id"] and not existing["holder"] and existing["name"].lower() == name.lower():
            db.execute(
                "UPDATE passengers SET nationality=?,passport_expiry=?,dob=?,gender=?,email=?,mobile=?,"
                "passenger_type=? WHERE id=?",
                (data.get("nationality"), data.get("passport_expiry"), data.get("dob"),
                 data.get("gender"), email, mobile, data.get("passenger_type") or "Adult",
                 existing["id"]),
            )
            return {"message": "Passenger added successfully.", "id": existing["id"]}
        raise ValueError("Passport number already exists.")
    if passport_in_use(db, passport):
        raise ValueError("Passport number already exists.")
    # A repeated non-holder name is an identity update rather than a duplicate
    # visible identity; this keeps one record per named traveller.
    if same_name is not None:
        db.execute(
            "UPDATE passengers SET nationality=?,passport=?,passport_expiry=?,dob=?,gender=?,email=?,"
            "mobile=?,passenger_type=? WHERE id=?",
            (data.get("nationality"), passport, data.get("passport_expiry"), data.get("dob"),
             data.get("gender"), email, mobile, data.get("passenger_type") or "Adult",
             same_name["id"]),
        )
        return {"message": "Passenger added successfully.", "id": same_name["id"]}
    cur = db.execute(
        "INSERT INTO passengers(user_id,name,nationality,passport,passport_expiry,dob,gender,email,mobile,"
        "passenger_type,holder) VALUES(?,?,?,?,?,?,?,?,?,?,0)",
        (user["id"], name, data.get("nationality"), passport, data.get("passport_expiry"),
         data.get("dob"), data.get("gender"), email, mobile,
         data.get("passenger_type") or "Adult"),
    )
    return {"message": "Passenger added successfully.", "id": cur.lastrowid}


def _passenger_delete(db, data, user):
    row = db.execute("SELECT * FROM passengers WHERE id=? AND user_id=?", (data.get("id"), user["id"])).fetchone()
    if row is None:
        raise ValueError("Passenger not found.")
    if row["holder"]:
        raise ValueError("The account holder passenger cannot be deleted.")
    db.execute("DELETE FROM passengers WHERE id=?", (row["id"],))
    return {"message": "Passenger deleted successfully."}


def _passenger_batch_delete(db, data, user):
    ids = data.get("ids") or []
    if not ids:
        raise ValueError("Please select at least one passenger.")
    deleted = 0
    for pid in ids:
        row = db.execute("SELECT * FROM passengers WHERE id=? AND user_id=?", (pid, user["id"])).fetchone()
        if row and not row["holder"]:
            db.execute("DELETE FROM passengers WHERE id=?", (row["id"],))
            deleted += 1
    if not deleted:
        raise ValueError("Please select at least one passenger.")
    return {"message": "Passengers deleted successfully.", "deleted": deleted}


def _save_essential(db, data, user):
    password = data.get("password") or ""
    if len(password) < 6:
        raise ValueError("Please enter a valid password.")
    gender = data.get("gender") or user["gender"]
    if gender not in ("Male", "Female"):
        raise ValueError("Please select a valid gender.")
    db.execute("UPDATE accounts SET gender=? WHERE id=?", (gender, user["id"]))
    db.execute("UPDATE passengers SET gender=? WHERE user_id=? AND holder=1", (gender, user["id"]))
    row = db.execute("SELECT * FROM accounts WHERE id=?", (user["id"],)).fetchone()
    return {"user": user_json(row)}


def _save_contact(db, data, user):
    email = (data.get("email") or "").strip()
    if not validate_email(email):
        raise ValueError("Invalid email address format.")
    db.execute("UPDATE accounts SET email=? WHERE id=?", (email, user["id"]))
    db.execute("UPDATE passengers SET email=? WHERE user_id=? AND holder=1", (email, user["id"]))
    row = db.execute("SELECT * FROM accounts WHERE id=?", (user["id"],)).fetchone()
    return {"user": user_json(row), "message": "Contact information updated successfully."}


def _save_additional(db, data, user):
    ptype = data.get("passenger_type") or ""
    if ptype not in ("Adult", "Child"):
        raise ValueError("Please select a valid passenger type.")
    db.execute("UPDATE accounts SET passenger_type=? WHERE id=?", (ptype, user["id"]))
    db.execute("UPDATE passengers SET passenger_type=? WHERE user_id=? AND holder=1", (ptype, user["id"]))
    row = db.execute("SELECT * FROM accounts WHERE id=?", (user["id"],)).fetchone()
    return {"user": user_json(row), "message": "Additional information updated successfully."}


def _change_password(db, data, user):
    current = data.get("current") or ""
    new = data.get("new") or ""
    confirm = data.get("confirm") or ""
    if not current or not new or not confirm:
        raise ValueError("Please fill in all password fields.")
    if user["password_hash"] != password_hash(current):
        raise ValueError("Incorrect current password.")
    if new != confirm:
        raise ValueError("New passwords do not match.")
    db.execute("UPDATE accounts SET password_hash=? WHERE id=?", (password_hash(new), user["id"]))
    return {"message": "Password changed successfully."}


def _update_email(db, data, user):
    new_email = (data.get("new_email") or "").strip()
    password = data.get("password") or ""
    if not new_email or not password:
        raise ValueError("Please fill in the new email and password.")
    if user["password_hash"] != password_hash(password):
        raise ValueError("Incorrect password.")
    if not validate_email(new_email):
        raise ValueError("Invalid email address format.")
    db.execute("UPDATE accounts SET email=? WHERE id=?", (new_email, user["id"]))
    db.execute("UPDATE passengers SET email=? WHERE user_id=? AND holder=1", (new_email, user["id"]))
    row = db.execute("SELECT * FROM accounts WHERE id=?", (user["id"],)).fetchone()
    return {"user": user_json(row), "message": "Security mailbox updated successfully."}


def _update_mobile(db, data, user):
    new_mobile = (data.get("new_mobile") or "").strip()
    password = data.get("password") or ""
    if not new_mobile or not password:
        raise ValueError("Please fill in the new mobile number and password.")
    if user["password_hash"] != password_hash(password):
        raise ValueError("Incorrect password.")
    if not validate_mobile(new_mobile):
        raise ValueError("Invalid mobile number format.")
    db.execute("UPDATE accounts SET mobile=? WHERE id=?", (new_mobile, user["id"]))
    db.execute("UPDATE passengers SET mobile=? WHERE user_id=? AND holder=1", (new_mobile, user["id"]))
    row = db.execute("SELECT * FROM accounts WHERE id=?", (user["id"],)).fetchone()
    return {"user": user_json(row), "message": "Mobile number updated successfully."}


def route_action(db, action, data, sid):
    if action == "health":
        return {"ok": True}
    if action == "bootstrap":
        user = current_user(db, sid)
        return {
            "user": user_json(user) if user else None,
            "defaults": {"from": DEFAULT_FROM, "to": DEFAULT_TO, "date": DEFAULT_DATE},
            "stations": [{"city": c, "label": city_label(c), "cn": info["cn"],
                          "pinyin": info["pinyin"], "group": info["group"]}
                         for c, info in CITIES.items()],
            "sale_start": SALE_START, "sale_end": SALE_END,
        }
    if action == "me":
        user = current_user(db, sid)
        return {"user": user_json(user) if user else None}
    if action == "register":
        return _register(db, data)
    if action == "login":
        return _login(db, data, sid)
    if action == "logout":
        db.execute("DELETE FROM sessions WHERE sid=?", (sid,))
        return {"user": None, "message": "Logout successful."}
    if action == "recover_verify":
        return _recover_verify(db, data)
    if action == "recover_reset":
        return _recover_reset(db, data)
    if action == "search":
        user = current_user(db, sid)
        return _search(db, data, user["id"] if user else None)
    if action == "booking":
        user = require_user(db, sid)
        return _booking(db, data, user)
    if action == "create_order":
        user = require_user(db, sid)
        return _create_order(db, data, user)
    if action == "get_order":
        user = require_user(db, sid)
        return _get_order(db, data, user)
    if action == "pay_order":
        user = require_user(db, sid)
        return _pay(db, data, user)
    if action == "cancel_order":
        user = require_user(db, sid)
        return _cancel(db, data, user)
    if action == "refund_order":
        user = require_user(db, sid)
        return _refund(db, data, user)
    if action == "orders":
        user = require_user(db, sid)
        return _orders(db, data, user)
    if action == "passengers":
        user = require_user(db, sid)
        return _passengers(db, user)
    if action == "passenger_add":
        user = require_user(db, sid)
        return _passenger_add(db, data, user)
    if action == "passenger_delete":
        user = require_user(db, sid)
        return _passenger_delete(db, data, user)
    if action == "passenger_batch_delete":
        user = require_user(db, sid)
        return _passenger_batch_delete(db, data, user)
    if action == "save_essential":
        user = require_user(db, sid)
        return _save_essential(db, data, user)
    if action == "save_contact":
        user = require_user(db, sid)
        return _save_contact(db, data, user)
    if action == "save_additional":
        user = require_user(db, sid)
        return _save_additional(db, data, user)
    if action == "change_password":
        user = require_user(db, sid)
        return _change_password(db, data, user)
    if action == "update_email":
        user = require_user(db, sid)
        return _update_email(db, data, user)
    if action == "update_mobile":
        user = require_user(db, sid)
        return _update_mobile(db, data, user)
    raise ValueError("Unknown action")


def dispatch(action, data, session_id, db):
    ensure_initialised(db)
    result = route_action(db, action, data or {}, session_id)
    if isinstance(result, dict):
        result.setdefault("now", now_iso(db))
    return result
