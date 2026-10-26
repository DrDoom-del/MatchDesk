"""MatchDesk push alerts: keeps push subscriptions and sends goal / kick-off / full-time notifications
to everyone tracking the teams involved - even when the app is closed. Needs: pip install pywebpush."""
import base64, json, os, pathlib, threading, time, concurrent.futures
import requests
try:
    from pywebpush import webpush, WebPushException
    HAVE_WEBPUSH = True
except Exception:
    HAVE_WEBPUSH = False

DATA = pathlib.Path(os.environ.get("MD_DATA", str(pathlib.Path(__file__).parent / "data"))); DATA.mkdir(parents=True, exist_ok=True)
SUBS_FILE, VAPID_PEM, VAPID_PUB = DATA / "push_subs.json", DATA / "vapid_private.pem", DATA / "vapid_public.txt"
SUBJECT = os.environ.get("MD_PUSH_SUBJECT", "mailto:Matchdesksupport@gmail.com")
INTERVAL = int(os.environ.get("MD_PUSH_INTERVAL", "45"))
MAX_SUBS, MAX_TRACK = 5000, 20
MAJOR = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "ned.1", "por.1", "rsa.1", "uefa.champions", "uefa.europa", "uefa.europa.conf", "caf.champions", "caf.confed"]
PATHS = {"soccer": "soccer", "rugby": "rugby"}      # others are used as typed (ESPN sport path)
GOAL = {"soccer": ("⚽", "GOAL!"), "rugby": ("🏉", "SCORE!")}
SPECIAL = {"f1", "cricket"}                         # not watched by the push monitor
_lock = threading.Lock(); STATE = {}                # event id -> (state, home score, away score)

def vapid_public():
    """Public VAPID key (base64url) for the browser; creates the key pair on first use."""
    if not HAVE_WEBPUSH: return None
    if not (VAPID_PEM.exists() and VAPID_PUB.exists()):
        from py_vapid import Vapid
        from cryptography.hazmat.primitives import serialization as ser
        v = Vapid(); v.generate_keys(); v.save_key(str(VAPID_PEM))
        raw = v.public_key.public_bytes(ser.Encoding.X962, ser.PublicFormat.UncompressedPoint)
        VAPID_PUB.write_text(base64.urlsafe_b64encode(raw).rstrip(b"=").decode())
    return VAPID_PUB.read_text().strip()

def load_subs():
    try: return json.loads(SUBS_FILE.read_text())
    except Exception: return {}
def save_subs(d):
    tmp = SUBS_FILE.with_suffix(".tmp"); tmp.write_text(json.dumps(d)); tmp.replace(SUBS_FILE)

def clean_tracked(lst):
    out = []
    for e in (lst or [])[:MAX_TRACK]:
        if isinstance(e, dict) and isinstance(e.get("team"), str):
            out.append({"team": e["team"][:80], "sport": str(e.get("sport", "soccer"))[:30].lower(), "league": str(e.get("league") or "")[:40]})
    return out

def subscribe(sub, tracked):
    ep = (sub or {}).get("endpoint", ""); k = (sub or {}).get("keys") or {}
    if not (isinstance(ep, str) and ep.startswith("https://") and len(ep) < 1000 and k.get("p256dh") and k.get("auth")):
        return False, "Invalid subscription"
    with _lock:
        d = load_subs()
        if ep not in d and len(d) >= MAX_SUBS: return False, "Server is full"
        d[ep] = {"sub": {"endpoint": ep, "keys": {"p256dh": k["p256dh"], "auth": k["auth"]}}, "tracked": clean_tracked(tracked), "ts": time.time()}
        save_subs(d)
    return True, "ok"
def unsubscribe(ep):
    with _lock:
        d = load_subs()
        if d.pop(ep, None) is not None: save_subs(d)

def pairs_for(e):
    sport, lg = e.get("sport", "soccer"), e.get("league", "")
    if sport in SPECIAL: return set()
    if lg: return {(sport, lg)}
    return {("soccer", l) for l in MAJOR} if sport == "soccer" else set()

def parse_event(raw, sport, league):
    try:
        comps = (raw.get("competitions") or [{}])[0].get("competitors") or []
        h = next((c for c in comps if c.get("homeAway") == "home"), comps[0]); a = next((c for c in comps if c.get("homeAway") == "away"), comps[1])
        return {"id": f"{sport}:{raw['id']}", "sport": sport, "league": league, "state": (raw.get("status") or {}).get("type", {}).get("state", "pre"),
                "home": (h.get("team") or {}).get("displayName", "?"), "away": (a.get("team") or {}).get("displayName", "?"),
                "hs": int(h.get("score") or 0), "as": int(a.get("score") or 0)}
    except Exception:
        return None

def matches(entry, ev):
    team = (entry.get("team") or "").lower().strip()
    if team.startswith("🌐"): return entry.get("sport") == ev["sport"] and entry.get("league") == ev["league"]
    return bool(team) and entry.get("sport", "soccer") == ev["sport"] and (team in ev["home"].lower() or team in ev["away"].lower())

def diff_events(events, prev):
    """Compare with the last look; return [(event, payload)]. The first sighting of an event is a silent baseline."""
    notes = []
    for ev in events:
        cur = (ev["state"], ev["hs"], ev["as"]); old = prev.get(ev["id"]); prev[ev["id"]] = cur
        if old is None: continue
        icon, word = GOAL.get(ev["sport"], ("⚡", "SCORE!")); score = f'{ev["home"]} {ev["hs"]} - {ev["as"]} {ev["away"]}'
        if old[0] == "pre" and cur[0] == "in": p = ("▶ Kick-off", f'{ev["home"]} v {ev["away"]}', "ko")
        elif old[0] == "in" and cur[0] == "post": p = ("🏁 Full time", score, "ft")
        elif cur[0] == "in" and old[1:] != cur[1:]: p = (f"{icon} {word}", score, "sc")
        else: continue
        notes.append((ev, {"title": p[0], "body": p[1], "tag": f'{ev["id"]}:{p[2]}:{ev["hs"]}-{ev["as"]}', "url": "./#scores"}))
    return notes

def send_push(sub, payload):
    """Returns None on success, or the HTTP status on failure (404/410 = subscription gone)."""
    try:
        webpush(subscription_info=sub, data=json.dumps(payload), vapid_private_key=str(VAPID_PEM), vapid_claims={"sub": SUBJECT}, ttl=3600)
        return None
    except WebPushException as e:
        return getattr(getattr(e, "response", None), "status_code", 0) or 0
    except Exception:
        return 0

def fetch_events(sport, league):
    r = requests.get(f"https://site.api.espn.com/apis/site/v2/sports/{PATHS.get(sport, sport)}/{league}/scoreboard", timeout=8)
    r.raise_for_status()
    return [e for e in (parse_event(x, sport, league) for x in r.json().get("events", [])) if e]

def poll_once(fetch=fetch_events, send=send_push, state=STATE):
    subs = load_subs()
    if not subs: return 0
    pairs = set()
    for s in subs.values():
        for e in s["tracked"]: pairs |= pairs_for(e)
    events = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for res in ex.map(lambda p: _safe(fetch, p), pairs): events += res
    sent, dead = 0, []
    for ev, payload in diff_events(events, state):
        for ep, s in subs.items():
            if any(matches(e, ev) for e in s["tracked"]):
                code = send(s["sub"], payload); sent += code is None
                if code in (404, 410): dead.append(ep)
    for ep in set(dead): unsubscribe(ep)
    return sent
def _safe(fetch, p):
    try: return fetch(*p)
    except Exception: return []

def start_monitor():
    if not HAVE_WEBPUSH: return None
    vapid_public()
    def loop():
        while True:
            try: poll_once()
            except Exception: pass
            time.sleep(INTERVAL)
    t = threading.Thread(target=loop, daemon=True); t.start(); return t
