"""MatchDesk online server: serves the web app AND loads booking codes (/api/resolve) for any device."""
import os, re, json, time, hashlib, threading, pathlib, mimetypes, urllib.parse, ipaddress, requests
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import resolver as R
import push as P

# Prefer the user's own MatchDesk.py (the exact desktop logic) when it sits next to this file.
RESOLVE, ENGINE = R.resolve_booking_code, "built-in"
if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "MatchDesk.py")) and os.environ.get("MD_USE_DESKTOP", "1") == "1":
    try:
        import MatchDesk as _MD
        RESOLVE, ENGINE = _MD.resolve_booking_code, "your MatchDesk.py"
    except Exception as _e:
        ENGINE = f"built-in (MatchDesk.py found but could not be imported: {type(_e).__name__})"

def selftest():
    steps, fix = [], ""
    steps.append({"name": "Playwright is installed", "ok": bool(R.HAS_PLAYWRIGHT), "detail": "" if R.HAS_PLAYWRIGHT else "not found"})
    if not R.HAS_PLAYWRIGHT:
        fix = "pip install playwright   then   playwright install chromium"
    else:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                b = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
                pg = b.new_page(); pg.goto("about:blank"); b.close()
            steps.append({"name": "Browser engine starts", "ok": True, "detail": ""})
        except Exception as e:
            full = str(e); steps.append({"name": "Browser engine starts", "ok": False, "detail": full.strip().splitlines()[0][:200]})
            if "playwright install" in full or "Executable doesn't exist" in full: fix = "playwright install chromium"
    try:
        r = requests.get("https://www.betway.co.za/", timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        steps.append({"name": "Bookmaker website reachable", "ok": r.status_code < 500, "detail": f"HTTP {r.status_code}" + (" – the site may be blocking this computer/server" if r.status_code in (403, 429) else "")})
    except Exception as e:
        steps.append({"name": "Bookmaker website reachable", "ok": False, "detail": type(e).__name__})
    return {"ok": all(x["ok"] for x in steps), "steps": steps, "fix": fix, "engine": ENGINE}

PORT = int(os.environ.get("PORT", "8080"))
WEB = pathlib.Path(__file__).parent.joinpath("web").resolve()
SEM = threading.Semaphore(int(os.environ.get("MD_CONCURRENCY", "2")))   # max simultaneous browser lookups
RATE = int(os.environ.get("MD_RATE_PER_MIN", "8"))                      # lookups per IP per minute
CACHE_SECS = int(os.environ.get("MD_CACHE_SECS", "300"))
_hits, _cache, _lock = {}, {}, threading.Lock()
FD_OK = re.compile(r"^(competitions/[A-Z0-9]{2,5}/(teams|standings)|teams/\d{1,8}/matches)$")   # only the calls the app needs
_fdcache = {}

GLOBAL_RATE = int(os.environ.get("MD_GLOBAL_RATE_PER_MIN", "40"))       # all users together, per minute (0 = off)
DAILY_CAP = int(os.environ.get("MD_DAILY_CAP", "3000"))                 # all users together, per day (0 = off)
TRUSTED_PROXIES = int(os.environ.get("MD_TRUSTED_PROXIES", "0"))        # see client_ip()
_g_hits, _day = [], {"d": "", "n": 0}

def client_ip(h):
    """Best-effort real visitor IP.
    1) Cloudflare's CF-Connecting-IP (Render sits behind Cloudflare, which overwrites this header, so visitors cannot fake it).
    2) If MD_TRUSTED_PROXIES=N is set, the Nth address from the right of X-Forwarded-For (the one our own proxies added).
    3) Otherwise the old behaviour: first X-Forwarded-For entry, else the socket address.
    Anything that is not a valid IP address is ignored."""
    peer = h.client_address[0]
    cand = (h.headers.get("CF-Connecting-IP") or "").strip()
    if not cand:
        parts = [x.strip() for x in (h.headers.get("X-Forwarded-For") or "").split(",") if x.strip()]
        if parts:
            cand = parts[-TRUSTED_PROXIES] if 0 < TRUSTED_PROXIES <= len(parts) else parts[0]
    try:
        return str(ipaddress.ip_address(cand))
    except ValueError:
        return peer

def allowed(ip):
    now = time.time()
    with _lock:
        if len(_hits) > 5000:                                   # keep memory bounded
            for k in [k for k, v in _hits.items() if not v or now - v[-1] >= 60]:
                _hits.pop(k, None)
        h = [t for t in _hits.get(ip, []) if now - t < 60]
        if len(h) >= RATE:
            _hits[ip] = h
            return False
        h.append(now); _hits[ip] = h
    return True

def global_ok():
    """Server-wide safety valve: returns None if OK, otherwise a message for the user."""
    now = time.time(); day = time.strftime("%Y-%m-%d", time.gmtime(now))
    with _lock:
        _g_hits[:] = [t for t in _g_hits if now - t < 60]
        if GLOBAL_RATE and len(_g_hits) >= GLOBAL_RATE:
            return "MatchDesk is very busy right now – please try again in a few minutes."
        if _day["d"] != day:
            _day["d"], _day["n"] = day, 0
        if DAILY_CAP and _day["n"] >= DAILY_CAP:
            return "The daily code-loading limit has been reached. Please paste the slip text instead, or try again tomorrow."
        _g_hits.append(now); _day["n"] += 1
    return None

class H(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", os.environ.get("MD_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in (("Access-Control-Allow-Origin", os.environ.get("MD_ORIGIN", "*")), ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
                     ("Access-Control-Allow-Headers", "*"), ("Access-Control-Allow-Private-Network", "true")):
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == "/.well-known/assetlinks.json":
            return self._json(200, {"ok": True, "server": "matchdesk", "playwright": R.HAS_PLAYWRIGHT, "engine": ENGINE})
        if u.path.startswith("/api/fd/"):                      # Football-Data proxy (the user's own key, passed through)
            path = u.path[8:]; key = self.headers.get("X-Auth-Token", "")
            if not FD_OK.match(path) or not key:
                return self._json(404 if key else 401, {"message": "Not allowed"})
            ck = (hashlib.sha256(key.encode()).hexdigest(), path, u.query)
            with _lock: hit = _fdcache.get(ck)
            if hit and time.time() - hit[0] < 600:
                code, body, ra = hit[1]
            else:
                try:
                    r = requests.get("https://api.football-data.org/v4/" + path + ("?" + u.query if u.query else ""), headers={"X-Auth-Token": key}, timeout=15)
                    code, body, ra = r.status_code, r.content, r.headers.get("Retry-After")
                except Exception:
                    return self._json(502, {"message": "Football-Data unreachable"})
                if code == 200:
                    with _lock: _fdcache[ck] = (time.time(), (code, body, ra))
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", os.environ.get("MD_ORIGIN", "*"))
            if ra: self.send_header("Retry-After", ra)
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        if u.path == "/api/push/key":
            if not P.HAVE_WEBPUSH: return self._json(200, {"enabled": False, "reason": "the server needs: pip install pywebpush"})
            return self._json(200, {"enabled": True, "publicKey": P.vapid_public()})
        if u.path == "/api/rates":
            with _lock: hit = _cache.get("fx")
            if not (hit and time.time() - hit[0] < 12 * 3600):
                try:
                    j = requests.get("https://open.er-api.com/v6/latest/USD", timeout=6).json()
                    if j.get("result") == "success":
                        hit = (time.time(), {"result": "success", "rates": j.get("rates", {})})
                        with _lock: _cache["fx"] = hit
                except Exception:
                    pass
            return self._json(200 if hit else 502, hit[1] if hit else {"result": "error"})
        if u.path == "/api/selftest":
            ip = client_ip(self)
            with _lock: st_hit = _cache.get("selftest")
            if st_hit and time.time() - st_hit[0] < 60:
                return self._json(200, st_hit[1])
            if not allowed(ip): return self._json(429, {"ok": False, "steps": [], "fix": "", "engine": ENGINE})
            if global_ok(): return self._json(429, {"ok": False, "steps": [], "fix": "", "engine": ENGINE})
            if not SEM.acquire(timeout=30): return self._json(503, {"ok": False, "steps": [], "fix": "", "engine": ENGINE})
            try:
                st_res = selftest()
                with _lock: _cache["selftest"] = (time.time(), st_res)
                return self._json(200, st_res)
            finally: SEM.release()
        if u.path == "/api/resolve":
            code = (q.get("code") or [""])[0][:500]; bookie = (q.get("bookie") or ["Auto"])[0] or "Auto"
            ip = client_ip(self)
            key = (code.strip().lower(), bookie)
            with _lock:
                hit = _cache.get(key)
            if hit and time.time() - hit[0] < CACHE_SECS:
                return self._json(200, hit[1])
            c_ = code.strip()
            try:
                if re.match(r"(?i)^https?://", c_) and not R._url_allowed(c_, R.load_bookie_lookup()):
                    return self._json(200, {"ok": False, "text": "", "message": "That link is not from a supported bookmaker. Paste the booking code itself, or paste the slip text and click Analyze."})
            except Exception:
                pass
            if not allowed(ip):
                return self._json(429, {"ok": False, "text": "", "message": "Too many lookups – please wait a minute and try again."})
            busy = global_ok()
            if busy:
                return self._json(429, {"ok": False, "text": "", "message": busy})
            if not SEM.acquire(timeout=60):
                return self._json(503, {"ok": False, "text": "", "message": "The server is busy – try again in a moment."})
            try:
                text, msg = RESOLVE(code, bookie)
                res = {"ok": bool(text), "text": text or "", "message": msg or ""}
            except Exception as e:
                res = {"ok": False, "text": "", "message": f"Server error: {type(e).__name__}"}
            finally:
                SEM.release()
            if res["ok"]:
                with _lock: _cache[key] = (time.time(), res)
            return self._json(200, res)
        # static files (the web app)
        rel = urllib.parse.unquote(u.path).lstrip("/") or "index.html"
        f = (WEB / rel).resolve()
        if not str(f).startswith(str(WEB)) or not f.is_file():
            if pathlib.PurePosixPath(rel).suffix:                  # a missing file (image, script…) is a real 404
                return self._json(404, {"message": "Not found"})
            f = WEB / "index.html"
        b = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", (mimetypes.guess_type(str(f))[0] or "application/octet-stream") + ("; charset=utf-8" if f.suffix in (".html", ".js", ".css", ".webmanifest") else ""))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path); ip = client_ip(self)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 20000: return self._json(413, {"ok": False})
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"ok": False, "message": "Bad request"})
        if not u.path.startswith("/api/push/"): return self._json(404, {"ok": False})
        if not P.HAVE_WEBPUSH: return self._json(200, {"ok": False, "message": "Push is not enabled on this server"})
        if not allowed(ip): return self._json(429, {"ok": False, "message": "Too many requests"})
        if u.path == "/api/push/subscribe":
            ok, msg = P.subscribe(body.get("subscription"), body.get("tracked")); return self._json(200 if ok else 400, {"ok": ok, "message": msg})
        if u.path == "/api/push/unsubscribe":
            P.unsubscribe(str(body.get("endpoint", ""))); return self._json(200, {"ok": True})
        if u.path == "/api/push/test":
            sub = (P.load_subs().get(str(body.get("endpoint", ""))) or {}).get("sub")
            if not sub: return self._json(404, {"ok": False, "message": "Subscribe first"})
            code = P.send_push(sub, {"title": "✅ MatchDesk alerts are working", "body": "You will get goal, kick-off and full-time alerts for the teams you track.", "tag": "md-test", "url": "./#scores"})
            return self._json(200, {"ok": code is None, "message": "Test sent" if code is None else f"The push service refused it (status {code})"})
        return self._json(404, {"ok": False})

    def log_message(self, *a): pass

if __name__ == "__main__":
    P.start_monitor()
    print(f"MatchDesk online on port {PORT} (Playwright: {R.HAS_PLAYWRIGHT}; code loader: {ENGINE})")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
