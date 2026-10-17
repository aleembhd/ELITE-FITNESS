#!/usr/bin/env python3
"""
ELITE FITNESS - engine test server for the eSSL F22 fingerprint machine.

What it does
  - Talks to the machine using its "Cloud Server" (ADMS / PUSH) mode.
  - Shows on a phone-friendly page everything the machine sends:
    connection, users, fingerprint copies, door punches.
  - Lets you add / delete / restore TEST users (IDs 9000-9999 only),
    so real members on the machine are never touched.

This is a throwaway test tool, not the real app.

Run on the server (needs only Python 3, nothing to install):
    python3 engine_test.py --port 8081 --key pick-a-secret

Open on your phone:
    http://<server-ip>:8081/panel?key=pick-a-secret

On the machine:
    COMM -> Cloud Server Setting -> Server Address = <server-ip>, Server Port = 8081
"""

import argparse
import base64
import binascii
import json
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, urlparse

TEST_PIN_MIN, TEST_PIN_MAX = 9000, 9999
IST = timezone(timedelta(hours=5, minutes=30))
TIME_FMT = "%Y-%m-%d %H:%M:%S"

# What a negative "Return=" code from the machine usually means (0 or more = worked).
RETURN_HINTS = {
    "-1": "rejected: wrong format or not supported",
    "-1002": "command not supported by this firmware",
    "-1004": "data table not supported by this firmware",
}

LOCK = threading.RLock()
STATE = {}
DATA_DIR = ""
PANEL_KEY = ""


# ----------------------------------------------------------------------------
# State (kept in memory and saved to engine_state.json after every request)
# ----------------------------------------------------------------------------

def fresh_state():
    return {
        "locked_sn": None,   # the first machine that connects; any other is refused
        "device": {},        # what we know about that machine
        "users": {},         # pin -> user record the machine uploaded
        "fingers": {},       # pin -> {finger_no: fingerprint template}
        "punches": [],       # recent door punches, newest last
        "commands": [],      # what we asked the machine to do, newest last
        "events": [],        # human-readable log, newest last
        "next_id": 1,
        "full_resync": False,
    }


def ist_now():
    return datetime.now(IST).strftime(TIME_FMT)


def state_path():
    return os.path.join(DATA_DIR, "engine_state.json")


def load_state():
    STATE.update(fresh_state())
    if os.path.exists(state_path()):
        with open(state_path()) as f:
            STATE.update(json.load(f))


def save_state():
    tmp = state_path() + ".tmp"
    with open(tmp, "w") as f:
        json.dump(STATE, f)
    os.replace(tmp, state_path())


def event(text):
    line = "[%s] %s" % (ist_now(), text)
    print(line, flush=True)
    STATE["events"].append(line)
    del STATE["events"][:-300]


def raw_log(text):
    with open(os.path.join(DATA_DIR, "engine_raw.log"), "a") as f:
        f.write("[%s] %s\n\n" % (ist_now(), text))


def is_test_pin(pin):
    return str(pin).isdigit() and TEST_PIN_MIN <= int(pin) <= TEST_PIN_MAX


def int_or0(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def b64_len(tmp):
    try:
        return len(base64.b64decode(tmp + "=" * (-len(tmp) % 4)))
    except (binascii.Error, ValueError):
        return 0


# ----------------------------------------------------------------------------
# Reading what the machine uploads
# ----------------------------------------------------------------------------

def parse_fields(text):
    """'PIN=1<TAB>Name=Rahul K<TAB>Pri=0' -> {'pin': '1', 'name': 'Rahul K', 'pri': '0'}.

    Fields are tab-separated; some firmware uses spaces instead (a name with a
    space then gets cut short, which is fine for a test). Keys are lowercased
    because firmware mixes PIN/Pin/pin.
    """
    parts = text.split("\t") if "\t" in text else text.split()
    fields = {}
    for part in parts:
        key, sep, value = part.partition("=")
        if sep:
            fields[key.strip().lower()] = value.strip()
    return fields


def split_record(line):
    """'USER PIN=1<TAB>Name=..' -> ('USER', {...}); (None, {}) if not a record line."""
    m = re.match(r"\s*([A-Za-z_]+)\s+(.*)", line, re.S)
    if not m:
        return None, {}
    return m.group(1).upper(), parse_fields(m.group(2))


def store_record(kind, f):
    """Store one uploaded record. Returns 'user', 'finger' or None."""
    if kind in ("USER", "USERINFO", "ENROLL_USER"):
        pin = f.get("pin")
        if not pin:
            return None
        STATE["users"][pin] = {
            "name": f.get("name", ""),
            "card": f.get("card") or f.get("cardno") or "",
            "passwd": f.get("passwd") or f.get("password") or "",
            "seen_at": ist_now(),
        }
        return "user"
    if kind == "FP":  # classic fingerprint record
        pin, tmp = f.get("pin"), f.get("tmp")
        if not pin or not tmp:
            return None
        no = f.get("fid", "0")
        STATE["fingers"].setdefault(pin, {})[no] = {
            "format": "classic", "no": no, "size": f.get("size", ""),
            "valid": f.get("valid", "1"), "tmp": tmp, "received_at": ist_now(),
        }
        return "finger"
    if kind == "BIODATA":  # newer firmware: one record type for every biometric
        pin, tmp = f.get("pin"), f.get("tmp")
        if not pin or not tmp or f.get("type", "1") != "1":  # type 1 = fingerprint
            return None
        no = f.get("no", "0")
        STATE["fingers"].setdefault(pin, {})[no] = {
            "format": "unified", "no": no, "index": f.get("index", "0"),
            "valid": f.get("valid", "1"), "duress": f.get("duress", "0"),
            "majorver": f.get("majorver", "0"), "minorver": f.get("minorver", "0"),
            "fmt": f.get("format", "0"), "size": f.get("size", ""), "tmp": tmp,
            "received_at": ist_now(),
        }
        return "finger"
    return None


def store_records(body, source):
    users, fingers, other = 0, [], 0
    for line in body.splitlines():
        if not line.strip():
            continue
        kind, f = split_record(line)
        what = store_record(kind, f) if kind else None
        if what == "user":
            users += 1
        elif what == "finger":
            fingers.append(f.get("pin"))
        else:
            other += 1
    parts = []
    if users:
        parts.append("%d user record(s)" % users)
    if fingers:
        parts.append("%d fingerprint(s)" % len(fingers))
    if other:
        parts.append("%d other log line(s)" % other)
    if parts:
        event("📥 Machine sent %s [%s]" % (", ".join(parts), source))
    if fingers:
        pins = sorted(set(fingers))
        event("👆 FINGERPRINT COPY SAVED on the server for ID %s%s"
              % (", ".join(pins[:10]), " …" if len(pins) > 10 else ""))
    return users + len(fingers) + other


def verify_label(code):
    return "fingerprint" if code == "1" else ("method code %s" % code if code else "unknown method")


def add_punch(pin, when, verify):
    STATE["punches"].append({
        "pin": pin, "name": STATE["users"].get(pin, {}).get("name", ""),
        "time": when, "verify": verify, "method": verify_label(verify),
        "received_at": ist_now(),
    })
    del STATE["punches"][:-100]


def check_clock(when):
    """Compare a live punch time (machine clock) with India time."""
    try:
        machine = datetime.strptime(when, TIME_FMT)
    except ValueError:
        return
    india = datetime.now(IST).replace(tzinfo=None)
    STATE["device"]["clock_offset_min"] = int(round((machine - india).total_seconds() / 60))


def handle_attlog(body):
    """Attendance lines: PIN<TAB>TIME<TAB>STATUS<TAB>VERIFY<TAB>..."""
    lines = [l for l in body.splitlines() if l.strip()]
    for line in lines:
        cols = line.split("\t")
        if len(cols) < 2:
            continue
        add_punch(cols[0].strip(), cols[1].strip(), cols[3].strip() if len(cols) > 3 else "")
    if 0 < len(lines) <= 5:  # live punches
        for p in STATE["punches"][-len(lines):]:
            event("🚪 PUNCH: ID %s %s at %s (%s)" % (p["pin"], p["name"], p["time"], p["method"]))
        check_clock(STATE["punches"][-1]["time"])
    elif lines:
        event("📥 Machine uploaded %d older attendance records" % len(lines))
    return len(lines)


def handle_rtlog(body):
    """Real-time event (access-control firmware): time=..<TAB>pin=..<TAB>verifytype=.."""
    f = parse_fields(body.strip())
    if f.get("pin") and f.get("time"):
        add_punch(f["pin"], f["time"], f.get("verifytype", ""))
        p = STATE["punches"][-1]
        event("🚪 PUNCH: ID %s %s at %s (%s)" % (p["pin"], p["name"], p["time"], p["method"]))


# ----------------------------------------------------------------------------
# Commands we send to the machine
# ----------------------------------------------------------------------------

def queue(action, pin, label, cmds):
    group = {"action": action, "pin": pin, "label": label, "status": "waiting",
             "queued_at": ist_now(), "sent_at": None, "done_at": None,
             "lines": [], "details": []}
    for cmd in cmds:
        group["lines"].append({"id": STATE["next_id"], "cmd": cmd, "ret": None})
        STATE["next_id"] += 1
    STATE["commands"].append(group)
    del STATE["commands"][:-50]
    event("🕐 Queued: %s (the machine picks it up within ~10 seconds)" % label)


def next_commands():
    """Called when the machine asks 'anything for me?'. Sends one command group."""
    for group in STATE["commands"]:
        if group["status"] == "waiting":
            group["status"] = "sent"
            group["sent_at"] = ist_now()
            event("📤 Sent to machine: %s" % group["label"])
            return "".join("C:%d:%s\n" % (l["id"], l["cmd"]) for l in group["lines"])
    return None


def is_ok(ret):
    try:
        return int(ret) >= 0
    except (TypeError, ValueError):
        return False


def settle(group):
    rets = [l["ret"] for l in group["lines"]]
    if any(r is None for r in rets):
        return
    ok = [r for r in rets if is_ok(r)]
    # A fingerprint fetch asks several tables; some are unsupported on any firmware.
    worked = bool(ok) if group["action"] == "fetch" else len(ok) == len(rets)
    group["status"] = "worked" if worked else "failed"
    group["done_at"] = ist_now()
    if worked:
        event("✅ Machine confirmed: %s" % group["label"])
    else:
        bad = sorted(set(r for r in rets if not is_ok(r)))
        event("❌ Machine refused: %s (code %s)" % (group["label"], ", ".join(
            "%s = %s" % (r, RETURN_HINTS.get(r, "unknown")) for r in bad)))


def handle_results(body):
    """Results look like 'ID=3&Return=0&CMD=DATA'; INFO adds extra lines after it."""
    current = None
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("ID=") or "&Return=" in line:
            q = parse_qs(line)
            cid, ret = (q.get("ID") or [""])[0], (q.get("Return") or [""])[0]
            current = None
            for group in STATE["commands"]:
                for l in group["lines"]:
                    if str(l["id"]) == cid:
                        l["ret"] = ret
                        current = group
            if current:
                settle(current)
        elif current is not None:
            current["details"].append(line[:200])
            del current["details"][:-40]


def userinfo_cmd(pin, name, passwd, card):
    return "DATA UPDATE USERINFO\tPIN=%s\tName=%s\tPri=0\tPasswd=%s\tCard=%s" % (pin, name, passwd, card)


def finger_cmd(pin, t):
    """Send a saved fingerprint back in the same format the machine gave it to us."""
    if t["format"] == "unified" and int_or0(t.get("majorver")) >= 10:
        return ("DATA UPDATE BIODATA\tPin=%s\tNo=%s\tIndex=%s\tValid=%s\tDuress=%s\tType=1"
                "\tMajorVer=%s\tMinorVer=%s\tFormat=%s\tTmp=%s"
                % (pin, t["no"], t.get("index", "0"), t.get("valid", "1"), t.get("duress", "0"),
                   t.get("majorver", "0"), t.get("minorver", "0"), t.get("fmt", "0"), t["tmp"]))
    size = t.get("size") or ""
    if not size.isdigit() or size == "0":
        size = str(b64_len(t["tmp"]))
    return ("DATA UPDATE FINGERTMP\tPIN=%s\tFID=%s\tSize=%s\tValid=%s\tTMP=%s"
            % (pin, t["no"], size, t.get("valid", "1"), t["tmp"]))


def options_text():
    """Settings we give the machine at handshake. Stamps = 'send me what's new since X'."""
    d = STATE["device"]
    if STATE["full_resync"]:
        att = oper = "0"
        STATE["full_resync"] = False
    else:
        att, oper = d.get("attlog_stamp", "0"), d.get("operlog_stamp", "0")
    return ("ATTLOGStamp=%s\nOPERLOGStamp=%s\nATTPHOTOStamp=None\n"
            "ErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\n"
            "TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic\n"
            "MultiBioDataSupport=0:1:0:0:0:0:0:0:0:0\nRealtime=1\nEncrypt=None\n" % (att, oper))


def save_stamp(field, stamp):
    stamp = (stamp or "").strip()
    if not stamp or stamp in ("0", "9999"):  # "send everything" / "send nothing" markers
        return
    current = STATE["device"].get(field)
    if current and current.isdigit() and stamp.isdigit() and int(stamp) <= int(current):
        return
    STATE["device"][field] = stamp


# ----------------------------------------------------------------------------
# The machine's side of the conversation (/iclock/...)
# ----------------------------------------------------------------------------

def check_device(sn, ip):
    """Remember the machine and refuse any other serial number."""
    if not sn:
        return False
    if STATE["locked_sn"] is None:
        STATE["locked_sn"] = sn
        event("🟢 MACHINE CONNECTED for the first time: serial %s, from %s" % (sn, ip))
        event("🔒 Server is now locked to this machine; other serial numbers are refused")
    if sn != STATE["locked_sn"]:
        return False
    d = STATE["device"]
    d.update(sn=sn, ip=ip, last_seen=ist_now(), last_seen_ts=time.time())
    return True


def handle_machine(method, path, q, body, ip):
    sn = q.get("SN") or q.get("sn") or ""
    if any(p in path for p in ("/ping", "/rtdata", "/exchange", "/edata", "/file")):
        check_device(sn, ip)
        return 200, "OK"
    if not check_device(sn, ip):
        return 400, "ERROR: unknown device"
    d = STATE["device"]

    if "/cdata" in path and method == "GET":  # handshake
        d["handshake_at"] = ist_now()
        d["handshake_params"] = {k: v for k, v in q.items() if k.upper() != "SN"}
        event("🤝 Machine handshake (asked for its settings)")
        return 200, "GET OPTION FROM: %s\n%s" % (sn, options_text())

    if "/cdata" in path:  # uploads
        table = (q.get("table") or "").upper()
        stamp = q.get("Stamp") or q.get("stamp")
        if table == "ATTLOG":
            n = handle_attlog(body)
            save_stamp("attlog_stamp", stamp)
            return 200, "OK: %d" % n
        if table in ("OPERLOG", "USERINFO", "BIODATA", "FINGERTMP"):
            n = store_records(body, table)
            if table == "OPERLOG":
                save_stamp("operlog_stamp", stamp)
            return 200, "OK: %d" % n
        if table == "RTLOG":
            handle_rtlog(body)
            return 200, "OK"
        if table == "OPTIONS":
            d["options"] = body[:3000]
            event("ℹ️ Machine sent its capabilities")
            return 200, "OK"
        if table == "TABLEDATA":
            tablename = (q.get("tablename") or "").lower()
            n = store_records(body, "tabledata " + tablename)
            return 200, ("biophoto=%d" if tablename == "biodata" else tablename + "=%d") % n
        return 200, "OK"

    if "/getrequest" in path:  # "anything for me?"
        if q.get("INFO"):
            d["info"] = q["INFO"][:300]
        return 200, next_commands() or "OK"

    if "/devicecmd" in path:  # command results
        handle_results(body)
        return 200, "OK"

    if "/registry" in path:  # newer protocol registration
        d["registry"] = body[:3000]
        event("🤝 Machine registered (newer protocol)")
        return 200, "RegistryCode=0"

    if "/push" in path:
        return 200, options_text()

    if "/querydata" in path:  # answers to DATA QUERY commands on some firmware
        table = (q.get("tablename") or q.get("type") or "").lower()
        if table == "attlog":
            return 200, "OK: %d" % handle_attlog(body)
        n = store_records(body, "querydata " + table)
        if table == "biodata":
            return 200, "biophoto=%d" % n
        return 200, ("%s=%d" % (table, n)) if table else "OK"

    return 200, "OK"


# ----------------------------------------------------------------------------
# The phone panel (/panel?key=...)
# ----------------------------------------------------------------------------

def panel_action(req):
    action = req.get("action")
    if action == "info":
        queue("info", None, "Ask the machine for its info", ["INFO"])
        return True, "Asked the machine for its info"
    if action == "backup":
        STATE["full_resync"] = True
        queue("backup", None, "Ask the machine to re-send all users and fingerprints", ["CHECK"])
        return True, "Asked the machine to re-send everything"

    pin = str(req.get("pin") or "").strip()
    if not is_test_pin(pin):
        return False, "Use a test ID between %d and %d (real members are protected)" % (TEST_PIN_MIN, TEST_PIN_MAX)
    pin = str(int(pin))
    known = STATE["users"].get(pin)
    if known and not known["name"].upper().startswith("TEST"):
        return False, "ID %s is '%s' on the machine. Pick another test ID" % (pin, known["name"])

    if action == "add":
        name = re.sub(r"[^A-Za-z0-9 .-]", "", str(req.get("name") or ""))[:18].strip()
        if not name.upper().startswith("TEST"):
            name = ("TEST " + name).strip()
        queue("add", pin, "Add test user %s (%s) to the machine" % (pin, name),
              [userinfo_cmd(pin, name, "", "0")])
        return True, "Queued: add %s. Then enroll a finger for ID %s on the machine" % (pin, pin)

    if action == "delete":
        queue("delete", pin, "Delete test user %s from the machine (blocks the door)" % pin,
              ["DATA DELETE USERINFO PIN=%s" % pin])
        return True, "Queued: delete %s" % pin

    if action == "restore":
        fingers = STATE["fingers"].get(pin, {})
        user = STATE["users"].get(pin, {})
        card = user.get("card", "")
        cmds = [userinfo_cmd(pin, user.get("name") or "TEST", user.get("passwd", ""),
                             card if card.isdigit() else "0")]
        cmds += [finger_cmd(pin, t) for t in fingers.values()]
        queue("restore", pin, "Restore test user %s with %d saved fingerprint(s)" % (pin, len(fingers)), cmds)
        if not fingers:
            return True, "No fingerprint saved for %s yet, so only the user is re-added" % pin
        return True, "Queued: restore %s with %d fingerprint(s)" % (pin, len(fingers))

    if action == "fetch":
        cmds = ["DATA QUERY USERINFO PIN=%s" % pin]
        cmds += ["DATA QUERY FINGERTMP PIN=%s\tFID=%d" % (pin, i) for i in range(10)]
        cmds += ["DATA QUERY BIODATA Type=1\tPIN=%s" % pin]
        queue("fetch", pin, "Ask the machine for the fingerprints of %s" % pin, cmds)
        return True, "Queued: fetch fingerprints of %s" % pin

    return False, "Unknown action"


def panel_state():
    d = STATE["device"]
    cmds = STATE["commands"]
    punches = STATE["punches"]

    def worked(action):
        return [c for c in cmds if c["action"] == action and c["status"] == "worked"]

    restore_punch = any(
        is_test_pin(p["pin"]) and p["pin"] == c["pin"] and p["received_at"] >= c["done_at"]
        for c in worked("restore") for p in punches)
    tests = [
        ("Machine connects to this server", bool(STATE["locked_sn"])),
        ("Machine follows commands from the server", any(c["status"] == "worked" for c in cmds)),
        ("Server adds a user to the machine", bool(worked("add"))),
        ("Fingerprint copy arrives on the server", any(is_test_pin(p) for p in STATE["fingers"])),
        ("Finger punches show up live", any(is_test_pin(p["pin"]) for p in punches)),
        ("Server deletes (blocks) a user", bool(worked("delete"))),
        ("Restored user's finger works again", restore_punch),
    ]

    def codes(c):
        rets = [l["ret"] for l in c["lines"] if l["ret"] is not None]
        bad = sorted(set(r for r in rets if not is_ok(r)))
        if not bad:
            return ""
        return "; ".join("code %s: %s" % (r, RETURN_HINTS.get(r, "unknown")) for r in bad)

    users = sorted(STATE["users"].items(), key=lambda kv: (len(kv[0]), kv[0]))
    return {
        "now": ist_now(),
        "sn": STATE["locked_sn"],
        "online": time.time() - d.get("last_seen_ts", 0) < 60,
        "device": {k: v for k, v in d.items() if k != "last_seen_ts"},
        "tests": [{"name": n, "ok": ok} for n, ok in tests],
        "commands": [{"label": c["label"], "status": c["status"], "queued_at": c["queued_at"],
                      "codes": codes(c), "details": c["details"]} for c in reversed(cmds[-20:])],
        "fingers": [{"pin": pin, "no": t["no"], "format": t["format"],
                     "size": t.get("size") or b64_len(t["tmp"]), "received_at": t["received_at"]}
                    for pin, fs in sorted(STATE["fingers"].items()) for t in fs.values()],
        "users_count": len(users),
        "users": [{"pin": pin, "name": u["name"], "card": bool(u["card"] and u["card"] != "0")}
                  for pin, u in users[:500]],
        "punches": list(reversed(punches[-30:])),
        "events": list(reversed(STATE["events"][-120:])),
    }


PANEL_HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Engine test</title>
<style>
 body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f3f4f6;color:#1f2328}
 main{max-width:760px;margin:0 auto;padding:16px}
 h1{font-size:20px;margin:4px 0 12px} h2{font-size:15px;margin:0 0 10px}
 .card{background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
 .status{font-weight:600;font-size:16px}
 .ok{color:#137333}.bad{color:#b3261e}.wait{color:#8a6100}.muted{color:#6b7280;font-size:13px}
 ul{padding:0;margin:0} li{list-style:none;margin:6px 0} ol{margin:0 0 12px;padding-left:20px;font-size:14px}
 label{font-size:13px;color:#555}
 input{font-size:16px;padding:8px;border:1px solid #ccc;border-radius:8px;width:100%;box-sizing:border-box}
 .row{display:flex;gap:8px;margin-bottom:10px}.row>div{flex:1}
 .btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 button{font-size:14px;padding:12px 8px;border:0;border-radius:10px;background:#1f6feb;color:#fff}
 button.red{background:#c5221f} button.green{background:#137333} button.grey{background:#5f6368}
 table{width:100%;border-collapse:collapse;font-size:13px}
 td,th{text-align:left;padding:6px 4px;border-bottom:1px solid #eee;vertical-align:top;word-break:break-word}
 pre{white-space:pre-wrap;word-break:break-all;font-size:12px;max-height:340px;overflow:auto;background:#f6f7f9;padding:8px;border-radius:8px;margin:6px 0 0}
 #toast{position:fixed;left:16px;right:16px;bottom:16px;max-width:728px;margin:0 auto;padding:12px;border-radius:10px;background:#1f2328;color:#fff;display:none}
</style></head><body><main>
<h1>ELITE FITNESS &middot; engine test</h1>
<div class="card"><div id="conn" class="status wait">Loading&hellip;</div><div id="devinfo" class="muted"></div><div id="clock"></div></div>
<div class="card"><h2>The 7 checks</h2><ul id="tests"></ul></div>
<div class="card"><h2>Test controls <span class="muted">(only IDs 9000&ndash;9999)</span></h2>
 <ol>
  <li>Tap <b>Add user</b>, then on the machine enroll a finger for that ID (3 presses).</li>
  <li>Press that finger: the door opens and a punch shows below.</li>
  <li>Tap <b>Delete</b>: the finger must NOT open the door.</li>
  <li>Tap <b>Restore</b>: the same finger opens the door again, no re-enroll.</li>
 </ol>
 <div class="row"><div><label>Test ID</label><input id="pin" inputmode="numeric" value="9998"></div>
  <div><label>Name</label><input id="name" value="TEST2"></div></div>
 <div class="btns">
  <button onclick="act('add')">Add user to machine</button>
  <button class="red" onclick="act('delete')">Delete user (block)</button>
  <button class="green" onclick="act('restore')">Restore with saved fingerprint</button>
  <button class="grey" onclick="act('fetch')">Fetch fingerprint from machine</button>
  <button class="grey" onclick="act('info')">Ask machine for its info</button>
  <button class="grey" onclick="act('backup')">Re-send all users + fingerprints</button>
 </div></div>
<div class="card"><h2>Commands</h2><table id="cmds"></table></div>
<div class="card"><h2>Fingerprint copies saved on the server</h2><table id="fps"></table></div>
<div class="card"><h2>Door punches (latest first)</h2><table id="punches"></table></div>
<div class="card"><h2>Users the machine has sent <span id="ucount" class="muted"></span></h2>
 <details><summary class="muted">Show list</summary><table id="users"></table></details></div>
<div class="card"><h2>Live log</h2><pre id="log"></pre></div>
</main><div id="toast"></div>
<script>
var KEY = new URLSearchParams(location.search).get('key') || '';
var STATUS = {waiting:'⏳ waiting for machine', sent:'📤 sent, waiting for answer', worked:'✅ worked', failed:'❌ failed'};
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function toast(msg){ var t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(function(){ t.style.display = 'none'; }, 5000); }
function rows(id, head, list, fn){
  $(id).innerHTML = '<tr>' + head.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr>' +
    (list.length ? list.map(fn).join('') : '<tr><td colspan="' + head.length + '" class="muted">nothing yet</td></tr>');
}
function act(action){
  if (action === 'delete' && !confirm('Delete test user ' + $('pin').value + ' from the machine?')) return;
  fetch('/panel/action?key=' + encodeURIComponent(KEY), {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action:action, pin:$('pin').value, name:$('name').value})})
    .then(function(r){ return r.json(); })
    .then(function(j){ toast((j.ok ? '✓ ' : '✗ ') + j.message); refresh(); })
    .catch(function(){ toast('✗ Could not reach the server'); });
}
function refresh(){
  fetch('/panel/state?key=' + encodeURIComponent(KEY)).then(function(r){ return r.json(); }).then(function(s){
    var c = $('conn'), d = s.device;
    if (!s.sn) { c.className = 'status wait'; c.textContent = '⏳ Waiting for the machine to connect…'; }
    else if (s.online) { c.className = 'status ok'; c.textContent = '🟢 Machine online · serial ' + s.sn; }
    else { c.className = 'status bad'; c.textContent = '🔴 Machine offline · last contact ' + (d.last_seen || '?'); }
    $('devinfo').textContent = s.sn ? ('Last contact ' + d.last_seen + ' · from ' + d.ip + (d.info ? ' · ' + d.info : '')) : 'Server time (India): ' + s.now;
    var off = d.clock_offset_min;
    $('clock').innerHTML = (off != null && Math.abs(off) > 3) ? '<p class="bad">⚠ Machine clock is ' + off + ' min off India time</p>' : '';
    $('tests').innerHTML = s.tests.map(function(t, i){ return '<li>' + (t.ok ? '✅' : '⬜') + ' ' + (i + 1) + '. ' + esc(t.name) + '</li>'; }).join('');
    rows('cmds', ['Time', 'What', 'Result'], s.commands, function(c){
      return '<tr><td>' + esc(c.queued_at.slice(11)) + '</td><td>' + esc(c.label) +
        (c.details.length ? '<pre>' + esc(c.details.join('\n')) + '</pre>' : '') + '</td><td>' +
        esc(STATUS[c.status] || c.status) + (c.codes ? '<div class="muted">' + esc(c.codes) + '</div>' : '') + '</td></tr>';
    });
    rows('fps', ['ID', 'Finger', 'Format', 'Size', 'Received'], s.fingers, function(f){
      return '<tr><td>' + esc(f.pin) + '</td><td>' + esc(f.no) + '</td><td>' + esc(f.format) + '</td><td>' + esc(f.size) + '</td><td>' + esc(f.received_at) + '</td></tr>';
    });
    rows('punches', ['Machine time', 'ID', 'Name', 'Method'], s.punches, function(p){
      return '<tr><td>' + esc(p.time) + '</td><td>' + esc(p.pin) + '</td><td>' + esc(p.name) + '</td><td>' + esc(p.method) + '</td></tr>';
    });
    $('ucount').textContent = '(' + s.users_count + ')';
    rows('users', ['ID', 'Name', 'Card'], s.users, function(u){
      return '<tr><td>' + esc(u.pin) + '</td><td>' + esc(u.name) + '</td><td>' + (u.card ? 'yes' : '') + '</td></tr>';
    });
    $('log').textContent = s.events.join('\n');
  }).catch(function(){ $('conn').className = 'status bad'; $('conn').textContent = 'Cannot reach the server (check the key in the URL)'; });
}
refresh(); setInterval(refresh, 3000);
</script></body></html>
"""


# ----------------------------------------------------------------------------
# HTTP server
# ----------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "EngineTest/1.0"

    def log_message(self, fmt, *args):
        pass  # we keep our own logs

    def parse_request(self):
        # Some machines put raw spaces in the URL (e.g. INFO=Ver 6.60 ...). Encode them.
        line = str(self.raw_requestline, "iso-8859-1").rstrip("\r\n")
        words = line.split(" ")
        if len(words) > 3 and words[-1].startswith("HTTP/"):
            raw_log("RAW-SPACES-IN-URL: %s" % line[:200])
            line = "%s %s %s\r\n" % (words[0], "%20".join(words[1:-1]), words[-1])
            self.raw_requestline = line.encode("iso-8859-1")
        return super().parse_request()

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def read_body(self):
        if "chunked" in (self.headers.get("Transfer-Encoding") or "").lower():
            chunks = []
            while True:
                size = int(self.rfile.readline().split(b";")[0].strip() or b"0", 16)
                if size == 0:
                    while self.rfile.readline().strip():
                        pass
                    return b"".join(chunks)
                chunks.append(self.rfile.read(size))
                self.rfile.readline()
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length > 0 else b""

    def reply(self, status, text, ctype="text/plain"):
        data = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def route(self, method):
        url = urlparse(self.path)
        path = url.path.rstrip("/").lower()
        query = {k: v[0] for k, v in parse_qs(url.query, keep_blank_values=True).items()}
        body = self.read_body() if method == "POST" else b""
        if path.startswith("/panel"):
            return self.panel(path, query, body)
        if not path.startswith("/iclock"):
            return self.reply(404, "Not found")
        ip = self.client_address[0]
        text = body.decode("utf-8", "replace")
        with LOCK:
            raw_log("%s %s %s\n%s" % (ip, method, self.path, text))
            status, answer = handle_machine(method, path, query, text, ip)
            raw_log("-> %d %s" % (status, answer[:500]))
            save_state()
        self.reply(status, answer)

    def panel(self, path, query, body):
        if not secrets.compare_digest(query.get("key", ""), PANEL_KEY):
            return self.reply(403, "Wrong or missing key. Open /panel?key=YOUR-KEY")
        if path == "/panel":
            return self.reply(200, PANEL_HTML, "text/html")
        if path == "/panel/state":
            with LOCK:
                data = json.dumps(panel_state())
            return self.reply(200, data, "application/json")
        if path == "/panel/action":
            try:
                req = json.loads(body.decode("utf-8") or "{}")
            except ValueError:
                req = {}
            with LOCK:
                ok, msg = panel_action(req)
                save_state()
            return self.reply(200, json.dumps({"ok": ok, "message": msg}), "application/json")
        return self.reply(404, "Not found")


class ThreadingServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    global DATA_DIR, PANEL_KEY
    ap = argparse.ArgumentParser(description="Engine test server for the eSSL F22 (Cloud Server / ADMS mode)")
    ap.add_argument("--port", type=int, default=8081)
    ap.add_argument("--key", default="", help="secret for the phone panel (random if empty)")
    ap.add_argument("--data-dir", default=os.path.dirname(os.path.abspath(__file__)))
    args = ap.parse_args()
    DATA_DIR = args.data_dir
    PANEL_KEY = args.key or secrets.token_urlsafe(9)
    load_state()
    server = ThreadingServer(("0.0.0.0", args.port), Handler)
    print("=" * 66)
    print(" Engine test server is running on port %d" % args.port)
    print(" Phone panel : http://YOUR-SERVER-IP:%d/panel?key=%s" % (args.port, PANEL_KEY))
    print(" On machine  : COMM > Cloud Server Setting")
    print("               Server Address = YOUR-SERVER-IP, Server Port = %d" % args.port)
    print(" Stop with Ctrl+C. Data: engine_state.json and engine_raw.log")
    print("=" * 66, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopped.")


if __name__ == "__main__":
    main()
