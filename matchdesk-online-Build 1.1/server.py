"""MatchDesk online server: serves the web app AND loads booking codes (/api/resolve) for any device."""
import os, re, json, time, hashlib, threading, pathlib, mimetypes, urllib.parse, requests
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

PORT = int(os.environ.get("PORT", "8080"))
WEB = pathlib.Path(__file__).parent.joinpath("web").resolve()
SEM = threading.Semaphore(int(os.environ.get("MD_CONCURRENCY", "2")))
RATE = int(os.environ.get("MD_RATE_PER_MIN", "8"))
CACHE_SECS = int(os.environ.get("MD_CACHE_SECS", "300"))
_hits, _cache, _lock = {}, {}, threading.Lock()
FD_OK = re.compile(r"^(competitions/[A-Z0-9]{2,5}/(teams|standings)|teams/\d{1,8}/matches)$")
_fdcache = {}

def allowed(ip):
    now = time.time()
    with _lock:
        h = [t for t in _hits.get(ip, []) if now - t < 60]
        if len(h) >= RATE:
            _hits[ip] = h
            return False
        h.append(now); _hits[ip] = h
    return True

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
        
        # --- FIX FOR ANDROID APK VERIFICATION ---
        if u.path == "/.well-known/assetlinks.json":
            try:
                fp = os.path.join(WEB, ".well-known", "assetlinks.json")
                with open(fp, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers(); self.wfile.write(content)
                return
            except FileNotFoundError:
                pass
        # ----------------------------------------

        if u.path == "/api/ping":
            return self._json(200, {"ok": True, "server": "matchdesk", "playwright": R.HAS_PLAYWRIGHT, "engine": ENGINE})
            
        if u.path.startswith("/api/fd/"):
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
        if u.path == "/api/resolve":
            code = (q.get("code") or [""])[0][:500]; bookie = (q.get("bookie") or ["Auto"])[0] or "Auto"
            ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
            key = (code.strip().lower(), bookie)
            with _lock:
                hit = _cache.get(key)
            if hit and time.time() - hit[0] < CACHE_SECS:
                return self._json(200, hit[1])
            if not allowed(ip):
                return self._json(429, {"ok": False, "text": "", "message": "Too many lookups – please wait a minute and try again."})
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
        
        rel = urllib.parse.unquote(u.path).lstrip("/") or "index.html"
        f = (WEB / rel).resolve()
        if not str(f).startswith(str(WEB)) or not f.is_file():
            if pathlib.PurePosixPath(rel).suffix:
                return self._json(404, {"message": "Not found"})
            f = WEB / "index.html"
        b = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", (mimetypes.guess_type(str(f))[0] or "application/octet-stream") + ("; charset=utf-8" if f.suffix in (".html", ".js", ".css", ".webmanifest") else ""))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path); ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
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