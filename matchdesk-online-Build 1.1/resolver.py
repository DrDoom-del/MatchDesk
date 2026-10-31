"""resolver.py - booking-code loader extracted from the MatchDesk desktop app.

The hosted PWA uses the same local Playwright/Chromium launch path as the
working desktop application. Keep the Playwright Python package version in
sync with the Chromium version supplied by the Docker base image.
"""
import re
import time, os, sys, json, hashlib, urllib.parse
import requests
try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except Exception:
    HAS_PLAYWRIGHT = False

# ---------- Browserless free-tier support (restored from the working build) ----------
# Put your token here via environment variable (recommended) or hard-code below.
BROWSERLESS_TOKEN = os.environ.get("BROWSERLESS_TOKEN", "").strip()
# Optional: hard-code for testing only (remove before sharing the file)
# BROWSERLESS_TOKEN = "2VVjAQbMVWKvdchd9666c40755335c43f60d045fea458f8e0"

BROWSERLESS_WS = (
    (os.environ.get("BROWSERLESS_URL", "").strip().replace("{token}", BROWSERLESS_TOKEN)
     or f"wss://production-sfo.browserless.io?token={BROWSERLESS_TOKEN}")
    if BROWSERLESS_TOKEN else None
)


def get_config_dir():
    if getattr(sys, "frozen", False):
        appdata = os.environ.get("APPDATA") or os.path.expanduser("~")
        path = os.path.join(appdata, "MatchDesk")
        legacy = os.path.join(appdata, "MatchDesk")
        if (not os.path.isdir(path)) and os.path.isdir(legacy):
            path = legacy  # keep existing user data
    else:
        path = os.path.dirname(os.path.abspath(__file__))
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        path = os.path.expanduser("~")
    return path

CONFIG_DIR = get_config_dir()

def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return default
    return default

def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError as e:
        print(f"[MatchDesk] Could not save {path}: {e}")

BOOKIE_LOOKUP_FILE = os.path.join(CONFIG_DIR, "bookie_lookup.json")

BOOKIE_SITES = {
    "Betway": "https://www.betway.co.za",
    "Hollywoodbets": "https://www.hollywoodbets.net",
    "10Bet": "https://www.10bet.co.za",
    "Supabets": "https://www.supabets.co.za",
    "Sportingbet": "https://www.sportingbet.co.za",
}

DEFAULT_BOOKIE_LOOKUP = {
    name: {"url": "", "headers": {}, "list_path": "",
           "selection": "selection", "market": "market",
           "match": "match", "odds": "odds"}
    for name in list(BOOKIE_SITES.keys()) + ["Other"]
}

DEFAULT_BOOKIE_LOOKUP["Betway"] = {
    "url": "https://www.betway.co.za/book-a-bet-results?bookingCode={code}",
    "headers": {},
    "list_path": "",
    "selection": "selection", "market": "market",
    "match": "match", "odds": "odds",
    "spa": True,
}

DEFAULT_BOOKIE_LOOKUP["10Bet"] = {
    "url": "",
    "headers": {},
    "list_path": "",
    "selection": "selection", "market": "market",
    "match": "match", "odds": "odds",
    "spa": False,
    "paste_only": True,
}

DEFAULT_BOOKIE_LOOKUP["Supabets"] = {
    "url": "https://old.supabets.co.za/Shared/{code}",
    "headers": {},
    "list_path": "",
    "selection": "selection", "market": "market",
    "match": "match", "odds": "odds",
    "spa": True,
    "alt_urls": [
        "https://new.supabets.co.za/Shared/{code}",
        "https://www.supabets.co.za/Shared/{code}",
    ],
}

DEFAULT_BOOKIE_LOOKUP["Hollywoodbets"] = {
    "url": "https://www.hollywoodbets.net/betting/{code}/code",
    "headers": {},
    "list_path": "",
    "selection": "selection", "market": "market",
    "match": "match", "odds": "odds",
    "spa": True,
    "alt_urls": [
        "https://www.hollywoodbets.net/betting/{code}/code",
        "https://new.hollywoodbets.net/betting/{code}/code",
        "https://www.hollywoodbets.net/betslip/share/{code}",
        "https://www.hollywoodbets.net/share/{code}",
        "https://m.hollywoodbets.net/betting/{code}/code",
    ],
}

DEFAULT_BOOKIE_LOOKUP["Sportingbet"] = {
    "url": "https://www.sportingbet.co.za/en/sports/share-my-bet/{code}",
    "headers": {},
    "list_path": "",
    "selection": "selection", "market": "market",
    "match": "match", "odds": "odds",
    "spa": True,
}

def load_bookie_lookup():
    """Merge on-disk bookie_lookup.json with built-in defaults.
    Empty / missing URLs in the saved file are filled from DEFAULT_BOOKIE_LOOKUP
    so upgrading MatchDesk picks up new share links without deleting settings.
    """
    cfg = load_json(BOOKIE_LOOKUP_FILE, None)
    if not isinstance(cfg, dict):
        cfg = {}
    changed = False
    for k, default in DEFAULT_BOOKIE_LOOKUP.items():
        d = json.loads(json.dumps(default))  # deep copy
        if k not in cfg or not isinstance(cfg.get(k), dict):
            cfg[k] = d
            changed = True
            continue
        cur = cfg[k]
        # Fill blank url from defaults (old installs had url: "")
        if not (cur.get("url") or "").strip() and (d.get("url") or "").strip():
            cur["url"] = d["url"]
            changed = True
        # Merge alt_urls / spa / paste_only flags from defaults
        for flag in ("spa", "paste_only"):
            if flag in d and flag not in cur:
                cur[flag] = d[flag]
                changed = True
        if d.get("alt_urls"):
            existing = list(cur.get("alt_urls") or [])
            for au in d["alt_urls"]:
                if au not in existing:
                    existing.append(au)
                    changed = True
            cur["alt_urls"] = existing
        for field in ("selection", "market", "match", "odds", "list_path"):
            cur.setdefault(field, d.get(field, field if field != "list_path" else ""))
    if changed:
        try:
            save_json(BOOKIE_LOOKUP_FILE, cfg)
        except Exception:
            pass
    return cfg

def _dig(obj, path):
    cur = obj
    for part in [p for p in (path or "").split(".") if p]:
        if isinstance(cur, dict):
            cur = cur.get(part)
        elif isinstance(cur, list):
            try:
                cur = cur[int(part)]
            except Exception:
                return None
        else:
            return None
    return cur

def _find_leg_list(obj, cfg):
    """Use the configured list_path, else search the JSON for a list of dicts
    that carry the configured odds field."""
    if cfg.get("list_path"):
        got = _dig(obj, cfg["list_path"])
        return got if isinstance(got, list) else []
    odds_key = cfg.get("odds", "odds")
    stack = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            if cur and all(isinstance(x, dict) for x in cur) and \
                    any(odds_key in x for x in cur):
                return cur
            stack.extend(cur)
        elif isinstance(cur, dict):
            stack.extend(cur.values())
    return []

def _json_to_slip_text(data, cfg):
    legs = _find_leg_list(data, cfg)
    out = []
    for leg in legs:
        try:
            odds = float(str(leg.get(cfg.get("odds", "odds"))).replace(",", "."))
        except Exception:
            continue
        if odds <= 1.0:
            continue
        sel = str(leg.get(cfg.get("selection", "selection")) or "Selection").strip()
        mkt = str(leg.get(cfg.get("market", "market")) or "").strip()
        mat = str(leg.get(cfg.get("match", "match")) or "").strip()
        block = [sel, f"{odds:.2f}"]
        if mkt:
            block.append(mkt)
        if mat:
            block.append(mat)
        out.append("\n".join(block))
    return "\n\n".join(out)

def _html_to_text(html):
    import html as _html
    html = re.sub(r"(?is)<(script|style).*?</\1>", "", html)
    html = re.sub(r"(?i)<br\s?/?>|</(p|div|li|tr|h\d|span)>", "\n", html)
    html = re.sub(r"(?s)<[^>]+>", "", html)
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in _html.unescape(html).split("\n")]
    return "\n".join(l for l in lines if l)

def _extract_booking_code(raw, bookie="Auto"):
    """Pull a booking code or share URL out of free text. Returns (code, bookie_hint)."""
    raw = (raw or "").strip()
    if not raw:
        return "", bookie
    # Full URL with bookingCode=
    m = re.search(r"(?i)[?&#]bookingCode=([A-Za-z0-9_-]+)", raw)
    if m:
        return m.group(1).strip(), "Betway"
    m = re.search(r"(?i)[?&#]shareCode=([A-Za-z0-9_-]+)", raw)
    if m:
        return m.group(1).strip(), bookie if bookie != "Auto" else "Auto"
    # Betway SA share page
    m = re.search(r"(?i)betway.co.za/book-a-bet-results[^\s]*bookingCode=([A-Za-z0-9_-]+)", raw)
    if m:
        return m.group(1).strip(), "Betway"
    # Hollywoodbets: /betting/{code}/code
    m = re.search(r"(?i)hollywoodbets\.net/betting/([0-9A-Za-z_-]+)/code", raw)
    if m:
        return m.group(1).strip(), "Hollywoodbets"
    # Supabets Shared/{code}
    m = re.search(r"(?i)supabets\.co\.za/Shared/([0-9A-Za-z_-]+)", raw)
    if m:
        return m.group(1).strip(), "Supabets"
    # Sportingbet share-my-bet/{id}
    m = re.search(r"(?i)sportingbet\.co\.za/[^\s]*/share-my-bet/([0-9A-Za-z_-]+)", raw)
    if m:
        return m.group(1).strip(), "Sportingbet"
    # Bare Betway-style codes: BW + hex
    m = re.search(r"\b(BW[0-9A-Fa-f]{6,12})\b", raw)
    if m:
        return m.group(1).strip(), "Betway"
    # Long numeric Hollywoodbets-style codes (8–14 digits)
    m = re.search(r"\b(\d{8,14})\b", raw)
    if m:
        hint = bookie if bookie not in ("Auto", "", None) else "Hollywoodbets"
        return m.group(1).strip(), hint
    # Generic short alphanumeric booking code (standalone token)
    if re.fullmatch(r"[A-Za-z0-9_-]{5,20}", raw):
        return raw, bookie
    m = re.search(r"(?i)(?:booking\s*code|bet\s*code|code)\s*[:-]?\s*([A-Za-z0-9_-]{5,20})", raw)
    if m:
        return m.group(1).strip(), bookie
    return raw, bookie
    m = re.search(r"(?i)(?:booking\s*code|bet\s*code|code)\s*[:-]?\s*([A-Za-z0-9_-]{5,20})", raw)
    if m:
        return m.group(1).strip(), bookie
    return raw, bookie

_SLIP_HEAD_RE = re.compile(
    r"(?i)^(?:booking\s*code|booked\s*bet|book\s*a\s*bet|bet\s*slip|betslip|"
    r"your\s*(?:bet|selections?)|selections?|\d+\s*(?:selections?|legs?))\b")

_SLIP_END_RE = re.compile(
    r"(?i)^(?:total\s*odds|multi\s*bet|multibet|total\s*stake|stake\b|"
    r"potential|place\s*bet|possible\s*(?:win|return)|payout)")

_SLIP_ODDS_RE = re.compile(r"^\d{1,4}\.\d{2}$")

_SLIP_JUNK = ("cookie", "privacy", "responsible", "licence", "license",
              "sign in", "log in", "register", "download the app", "18+")

def _count_anchor_legs(chunk):
    """How many 'name / odds' pairs a block of lines contains."""
    n = 0
    for i, l in enumerate(chunk):
        if i and _SLIP_ODDS_RE.match(l) and not _SLIP_ODDS_RE.match(chunk[i - 1]):
            try:
                if float(l) > 1.0:
                    n += 1
            except ValueError:
                pass
    return n

def _isolate_slip_lines(lines):
    """Pick the booked-slip block out of a whole bookmaker page.
    Returns (text, isolated_bool). Looks for  heading ... legs ... footer
    (Total Odds / Stake / Place Bet) and, when the page states the number of
    selections, prefers the block that has exactly that many legs."""
    lines = [l for l in lines
             if not any(j in l.lower() for j in _SLIP_JUNK)]
    declared = None
    for l in lines:
        m = re.match(r"(?i)^(\d{1,2})\s*(?:selections?|legs?)\b", l)
        if m:
            declared = int(m.group(1))
            break

    heads = [i for i, l in enumerate(lines) if len(l) < 40 and _SLIP_HEAD_RE.match(l)]
    ends = [i for i, l in enumerate(lines) if len(l) < 60 and _SLIP_END_RE.match(l)]

    cands = []
    for e in ends:
        prior = [h for h in heads if h < e]
        start = (prior[-1] + 1) if prior else 0
        # don't swallow an earlier block that was already closed by a footer
        earlier_ends = [x for x in ends if x < e]
        if earlier_ends:
            start = max(start, earlier_ends[-1] + 1)
        chunk = lines[start:e]
        n = _count_anchor_legs(chunk)
        if n:
            cands.append((n, chunk))

    if cands:
        if declared:
            for n, chunk in cands:
                if n == declared:
                    return "\n".join(chunk), True
        # otherwise the block with the fewest stray legs that is still non-empty
        # is almost always the slip itself; take the first one on the page
        return "\n".join(cands[0][1]), True

    # No footer structure found: if the page says how many legs there are,
    # take just that many name/odds pairs starting at the first one.
    if declared:
        out, seen = [], 0
        for i, l in enumerate(lines):
            if i and _SLIP_ODDS_RE.match(l) and not _SLIP_ODDS_RE.match(lines[i - 1]):
                seen += 1
                if seen > declared:
                    break
            out.append(l)
        first = next((i for i, l in enumerate(out)
                      if i and _SLIP_ODDS_RE.match(l)), 1)
        return "\n".join(out[max(0, first - 1):]), True

    return "\n".join(lines), False

_HWB_HEAD_RE = re.compile(
    r"(?i)^(?:full\s*time(?:\s*result)?|match\s*result|match\s*winner|1x2|"
    r"double\s*chance|draw\s*no\s*bet|dnb|total(?:\s*goals|\s*corners)?|"
    r"btts|both\s*teams(?:\s*to\s*score)?|handicap|asian\s*handicap|"
    r"correct\s*score|half\s*time|1st\s*half|2nd\s*half|win\s*to\s*nil|"
    r"clean\s*sheet|to\s*score|odd/?even|exact\s*goals|"
    r"which\s*team\s*to\s*score)"
    r"(?:\s*[-–—:~|].*)?$"
)

def _isolate_hwb_slip(lines):
    """Keep every Hollywoodbets market heading through to the slip footer.

    Accepts both 'Market - Pick' and stacked 'Market' / 'Pick' layouts so
    multi-leg tickets are not truncated when OCR or the share page omits
    separators.
    """
    heads = [i for i, l in enumerate(lines) if _HWB_HEAD_RE.match(l)]
    if len(heads) < 1:
        return None
    start = heads[0]
    end = len(lines)
    for i, l in enumerate(lines):
        if i > start and len(l) < 60 and _SLIP_END_RE.match(l):
            end = i
            break
    chunk = lines[start:end]
    # Keep the block whenever we have at least one market heading and either
    # multiple heads, multiple price anchors, or any price at all (single-leg).
    if len(heads) >= 1 and (
        len(heads) >= 2
        or _count_anchor_legs(chunk) >= 1
        or any(re.search(r"(?<!\d)\d{1,3}[.,]\d{2}(?!\d)", ln) for ln in chunk)
    ):
        return "\n".join(chunk)
    return None

def _page_slip_text(page, body):
    """Collect slip text from every matching container, not just the first."""
    chunks = [body] if body else []
    selectors = (
        "[class*='betslip']", "[class*='BetSlip']", "[class*='bet-slip']",
        "[class*='BetCode']", "[class*='bet-code']", "[class*='ticket']",
        "[class*='booking']", "[class*='share']", "[id*='betslip']",
        "[class*='selection']", "[class*='Selection']",
        "[data-testid*='betslip']", "[data-testid*='selection']",
        "[class*='leg']", "[class*='Leg']",
        "main", "[role='main']",
    )
    try:
        for sel in selectors:
            try:
                loc = page.locator(sel)
                n = loc.count()
            except Exception:
                continue
            for i in range(min(n, 24)):
                try:
                    chunk = loc.nth(i).inner_text(timeout=1500) or ""
                except Exception:
                    continue
                if len(re.findall(r"(?<!\d)\d{1,3}\.\d{2}(?!\d)", chunk)) >= 1:
                    chunks.append(chunk)
    except Exception:
        pass
    scored = []
    for c in chunks:
        n = len(re.findall(r"(?<!\d)\d{1,3}\.\d{2}(?!\d)", c))
        scored.append((n, len(c), c))
    if not scored:
        return body
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best_n, _, best = scored[0]
    cards = []
    seen = set()
    for n, ln, c in scored:
        if n < 1 or ln > 1200:
            continue
        key = re.sub(r"\s+", " ", c).strip().lower()
        if key in seen:
            continue
        seen.add(key)
        if _HWB_HEAD_RE.search(c) or re.search(r"(?i)\s(?:vs\.?|v\.?)\s", c):
            cards.append(c.strip())
    if best_n <= 1 and len(cards) >= 2:
        return "\n\n".join(cards)
    hwb = _isolate_hwb_slip(
        [re.sub(r"[ \t]+", " ", ln).strip() for ln in best.splitlines() if ln.strip()]
    )
    return hwb or best


class _SecurityCheckBlock(Exception):
    """The bookmaker answered with a bot-check page (Cloudflare 'Just a moment')."""


def _rlog(msg):
    """Timing breadcrumbs for the server log (Render > Logs)."""
    try:
        print("[loader] " + str(msg), flush=True)
    except Exception:
        pass

def _bl_candidates():
    """Browserless addresses to try, best first. Stealth mode first (it hides the
    automation flags bookmakers' bot checks look for); the plain address second."""
    if not BROWSERLESS_TOKEN:
        return []
    custom = os.environ.get("BROWSERLESS_URL", "").strip()
    if custom:
        return [("Browserless (custom address)", custom.replace("{token}", BROWSERLESS_TOKEN))]
    return [
        ("Browserless stealth", "wss://production-sfo.browserless.io/stealth?token=%s" % BROWSERLESS_TOKEN),
        ("Browserless", "wss://production-sfo.browserless.io?token=%s" % BROWSERLESS_TOKEN),
    ]


def _connect_browserless(p):
    """Connect to Browserless, falling back from stealth to the plain address."""
    errs = []
    for label, ws in _bl_candidates():
        try:
            return p.chromium.connect_over_cdp(ws), label
        except Exception as e:
            errs.append("%s: %s" % (label, type(e).__name__))
            _rlog("Browserless connect failed - " + errs[-1])
    raise RuntimeError("Browserless connection failed (" + "; ".join(errs) + ")")


def _browserless_unblock(url, timeout_s=35):
    """Ask Browserless to open the page itself through a South African residential
    proxy and solve the bot check, then give us its browser endpoint.
    Returns (ws_endpoint_or_None, short_note_for_the_diagnostic_line)."""
    if not BROWSERLESS_TOKEN:
        return None, "no BROWSERLESS_TOKEN"
    try:
        r = requests.post(
            "https://production-sfo.browserless.io/unblock",
            params={"token": BROWSERLESS_TOKEN, "proxy": "residential",
                    "proxyCountry": "za", "proxySticky": "true"},
            json={"url": url, "browserWSEndpoint": True, "ttl": 60000},
            timeout=timeout_s,
        )
    except Exception as e:
        return None, "request failed (%s)" % type(e).__name__
    if r.status_code != 200:
        return None, "HTTP %s %s" % (r.status_code, re.sub(r"\s+", " ", r.text or "")[:90])
    try:
        ws = (r.json() or {}).get("browserWSEndpoint")
    except Exception:
        ws = None
    if not ws:
        return None, "no browser endpoint returned"
    if "token=" not in ws:
        ws += ("&" if "?" in ws else "?") + "token=" + BROWSERLESS_TOKEN
    return ws, "ok"


def _scrape_slip_with_playwright(url, timeout_ms=55000, engine="auto"):
    """Open a bookmaker share/results page headlessly and pull visible slip text.
    Returns (slip_text_or_None, message). Never raises."""
    if not HAS_PLAYWRIGHT:
        return None, (
            "Need Playwright for auto code load. "
            "Run once in a terminal:  pip install playwright  &&  playwright install chromium  "
            "— then restart MatchDesk. Or paste the full slip text below and click Analyze."
        )
    body = ""
    _t0 = time.time()
    _info = {}

    def _dg():
        """Short 'what did the bookmaker actually send us' note appended to failures."""
        bits = []
        try:
            bits.append(urllib.parse.urlparse(url).netloc)
        except Exception:
            pass
        if _info.get("status") is not None:
            bits.append("HTTP %s" % _info["status"])
        if _info.get("title"):
            bits.append("title \"%s\"" % _info["title"][:60])
        bits.append("browser: " + (_info.get("engine") or ("Browserless" if BROWSERLESS_WS else "this server's own browser (no BROWSERLESS_TOKEN set)")))
        if _info.get("unblock_note"):
            bits.append("unblock: " + _info["unblock_note"][:120])
        bits.append("%.0fs" % (time.time() - _t0))
        if _info.get("peek"):
            bits.append("page began: \"%s\"" % _info["peek"][:110])
        return " [diagnostic: " + " | ".join(bits) + "]"

    try:
        with sync_playwright() as p:
            _remote = False
            if BROWSERLESS_TOKEN:
                _remote = True
                browser = None
                if engine == "unblock":
                    # Browserless 'unblock': their own browser + South African residential proxy
                    # passes the bookmaker's bot check, then hands the live page back to us.
                    _ws, _note = _browserless_unblock(url)
                    _info["unblock_note"] = _note
                    if _ws:
                        try:
                            browser = p.chromium.connect_over_cdp(_ws)
                            _info["engine"] = "Browserless unblock (ZA residential)"
                        except Exception as _e:
                            _info["unblock_note"] = "connect failed: %s" % type(_e).__name__
                    if browser is None:
                        # Unblock was asked for but is not available (plan / network): say so
                        # and stop, instead of silently repeating the attempt that was blocked.
                        _info["engine"] = "Browserless unblock (not available)"
                        raise _SecurityCheckBlock()
                if browser is None:
                    browser, _info["engine"] = _connect_browserless(p)
            else:
                # Local Playwright (desktop / own machine)
                _launch_kw = {}
                if os.environ.get("MD_PROXY_SERVER", "").strip():
                    # Optional: route the browser through a proxy (e.g. a South African
                    # residential/ISP proxy) so cloud-host IPs are not challenged.
                    _launch_kw["proxy"] = {"server": os.environ["MD_PROXY_SERVER"].strip()}
                    if os.environ.get("MD_PROXY_USER", "").strip():
                        _launch_kw["proxy"]["username"] = os.environ["MD_PROXY_USER"].strip()
                        _launch_kw["proxy"]["password"] = os.environ.get("MD_PROXY_PASS", "")
                browser = p.chromium.launch(
                    **_launch_kw,
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--disable-dev-shm-usage",
                        "--no-sandbox",
                    ],
                )
                _info["engine"] = "this server's own browser (no BROWSERLESS_TOKEN set)"
            try:
                # When using connect_over_cdp the default context already exists
                if _remote and browser.contexts:
                    context = browser.contexts[0]
                else:
                    context = browser.new_context(
                        user_agent=(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/124.0.0.0 Safari/537.36"
                        ),
                        locale="en-ZA",
                        viewport={"width": 1280, "height": 1100},
                        extra_http_headers={"Accept-Language": "en-ZA,en;q=0.9"},
                    )
                if engine == "unblock" and _remote and context.pages:
                    page = context.pages[0]
                else:
                    page = context.new_page()
                _rlog("opening %s" % url)
                _resp = None
                _cur = ""
                try:
                    _cur = page.url or ""
                except Exception:
                    pass
                if engine == "unblock" and "hollywoodbets" in _cur.lower():
                    pass   # the unblock call already loaded the page past the check
                else:
                    _resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                try:
                    _info["status"] = _resp.status if _resp is not None else None
                except Exception:
                    pass
                _rlog("page opened after %.1fs" % (time.time() - _t0))
                # Hollywoodbets: stop waiting the moment the slip is on the page
                # (its page never goes network-idle, so the fixed waits below
                # were burning ~30 s even when the slip appeared in 2 s).
                _ready = False
                if re.search(r"(?i)hollywoodbets", url or ""):
                    _t_end = time.time() + min(30, timeout_ms / 1000.0)
                    _chal0 = None
                    while time.time() < _t_end:
                        try:
                            _b = page.inner_text("body") or ""
                        except Exception:
                            _b = ""
                        # Cloudflare / bot-check wall: give it a few seconds to clear on its
                        # own, then stop instead of waiting a full minute for nothing.
                        if re.search(r"(?i)performing security verification|just a moment|"
                                     r"verify you are human|checking your browser", _b[:700]):
                            if _chal0 is None:
                                _chal0 = time.time()
                            elif time.time() - _chal0 > 15:
                                try:
                                    _info["title"] = (page.title() or "").strip()
                                    _info["peek"] = re.sub(r"\s+", " ", _b).strip()
                                except Exception:
                                    pass
                                raise _SecurityCheckBlock()
                            page.wait_for_timeout(500)
                            continue
                        _tail = _b.rsplit("Betslip", 1)[-1] if "Betslip" in _b else ""
                        if re.search(r"(?<!\d)\d{1,3}\.\d{2}(?!\d)", _tail) and \
                                re.search(r"(?i)\bvs\.?\b|\s-\s", _tail):
                            page.wait_for_timeout(1000)   # let the last leg render
                            _ready = True
                            break
                        page.wait_for_timeout(500)
                _rlog("slip %s after %.1fs" % ("visible" if _ready else "NOT seen yet", time.time() - _t0))
                if not _ready:
                    # Wait for SPA to populate odds / selections
                    try:
                        page.wait_for_load_state("networkidle", timeout=min(25000, timeout_ms))
                    except Exception:
                        pass
                    page.wait_for_timeout(3000)
                body = page.inner_text("body") or ""
                try:
                    _info["title"] = (page.title() or "").strip()
                    _info["peek"] = re.sub(r"\s+", " ", body).strip()
                except Exception:
                    pass
                if not _ready:
                    # Cookie / age / region banners
                    for label in (
                        "Accept", "Accept all", "Accept All", "I agree", "Got it", "OK",
                        "Allow all", "Agree", "Continue", "I am 18", "Yes, I am",
                    ):
                        try:
                            btn = page.get_by_role("button", name=re.compile(label, re.I))
                            if btn.count() > 0:
                                btn.first.click(timeout=1500)
                                page.wait_for_timeout(1000)
                                body = page.inner_text("body") or body
                                break
                        except Exception:
                            pass
                    # Hollywoodbets / Supabets often lazy-render the booked slip —
                    # scroll and wait for an odds-looking number to appear.
                    try:
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/3)")
                        page.wait_for_timeout(800)
                        page.evaluate("window.scrollTo(0, 0)")
                    except Exception:
                        pass
                    try:
                        page.wait_for_function(
                            r"""() => {
                                const t = document.body ? document.body.innerText : '';
                                return /\d{1,3}\.\d{2}/.test(t) || t.length > 400;
                            }""",
                            timeout=12000,
                        )
                    except Exception:
                        pass
                    page.wait_for_timeout(1500)
                    body = page.inner_text("body") or body
                    # Prefer denser slip containers when present
                    for sel in (
                        "[class*='betslip']", "[class*='BetSlip']", "[class*='bet-slip']",
                        "[class*='booking']", "[class*='share']", "[id*='betslip']",
                        "main", "[role='main']",
                    ):
                        try:
                            loc = page.locator(sel)
                            if loc.count() > 0:
                                chunk = loc.first.inner_text(timeout=2000) or ""
                                if len(re.findall(r"(?<!\d)\d{1,3}\.\d{2}(?!\d)", chunk)) >= 1:
                                    body = chunk
                                    break
                        except Exception:
                            pass
            finally:
                _rlog("done in %.1fs" % (time.time() - _t0))
                try:
                    browser.close()
                except Exception:
                    pass
    except _SecurityCheckBlock:
        return None, (
            "Hollywoodbets is showing a security check (Cloudflare) to this server, so the slip "
            "cannot be read automatically from here. This happens with cloud hosts like Render, "
            "not on a home connection. Open the slip on Hollywoodbets and paste it instead."
            + ("" if BROWSERLESS_WS else
               " Free fix: add your free Browserless token as the BROWSERLESS_TOKEN setting "
               "(browserless.io) and the page is loaded from a different network.")
        ) + _dg()
    except Exception as e:
        _e1 = (str(e).strip().splitlines() or [""])[0][:160]
        return None, f"Browser load failed ({type(e).__name__}: {_e1})." + _dg()

    if not body or len(body.strip()) < 20:
        return None, (
            "Page opened but no slip text was visible (code may be expired, "
            "geo-blocked, or the share link needs you to be logged in). "
            "Open the link in your browser and paste the slip text instead."
        ) + _dg()

    # Turn page text into something the existing slip parser understands
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in body.splitlines()]
    lines = [ln for ln in lines if ln]

    # Keep a copy of exactly what the browser saw, so a layout change on the
    # bookie site can be diagnosed (Settings folder / last_booking_scrape.txt).
    try:
        with open(os.path.join(CONFIG_DIR, "last_booking_scrape.txt"), "w",
                  encoding="utf-8") as _f:
            _f.write(body)
    except Exception:
        pass

    # Cut the page down to ONLY the booked slip (the page also carries other
    # matches, promos, menus ... which used to be read as extra legs).
    # Hollywoodbets prints profit-style odds (0.20 = 1.20), which the generic
    # isolator ignores, so cut its pages down with the Hollywoodbets-aware isolator first.
    text, isolated = None, False
    if re.search(r"(?i)hollywoodbets", url or ""):
        _h = _isolate_hwb_slip(lines)
        if _h:
            text, isolated = _h, True
    if text is None:
        text, isolated = _isolate_slip_lines(lines)

    # Require at least one decimal odds-looking number
    if len(re.findall(r"(?<!\d)\d{1,3}\.\d{2}(?!\d)", text)) < 1:
        return None, (
            "Opened the share page but could not find selection odds. "
            "The code may be expired, live-only, or the page layout changed. "
            "Open the link on the bookie site and paste the slip text instead."
        ) + _dg()
    if isolated:
        return text, "Loaded via browser — check the legs, then Analyze runs automatically."
    return text, ("Loaded via browser, but the slip could not be separated from the rest "
                  "of the page — extra matches may appear. Delete anything that is not "
                  "your slip, then click Analyze.")


def _hwb_odds(val):
    """Decimal odds; Hollywoodbets often prints profit (0.45 => 1.45)."""
    if val is None or val == "":
        return 0.0
    if isinstance(val, dict):
        # A nested odds object can carry both current and stale/boosted prices.
        # Return the first valid value in a deliberate priority order.
        for k in ("decimalOdds", "decimalPrice", "currentOdds",
                  "currentPrice", "selectionOdds", "price", "odds",
                  "decimal", "value", "current", "display", "win"):
            if k in val:
                o = _hwb_odds(val[k])
                if o > 1.0:
                    return o
        for k, v in val.items():
            kl = str(k).lower()
            if any(x in kl for x in ("old", "previous", "original", "boost",
                                     "american", "fraction", "opening")):
                continue
            if isinstance(v, (dict, list, int, float, str)):
                o = _hwb_odds(v)
                if o > 1.0:
                    return o
        return 0.0
    if isinstance(val, list):
        best = 0.0
        for v in val:
            o = _hwb_odds(v)
            if o > best:
                best = o
        return best
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        v = float(val)
    else:
        s = str(val).strip().replace(",", ".").replace("x", "").replace("X", "").replace("×", "")
        s = re.sub(r"[^0-9.]+", "", s)
        try:
            v = float(s)
        except Exception:
            return 0.0
    if v <= 0 or v > 500:
        return 0.0
    if v <= 1.0:
        v = v + 1.0
    return round(v, 2)

def _hwb_str(*vals):
    for v in vals:
        if v is None:
            continue
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            continue
        s = str(v).strip()
        if s and s.lower() not in ("none", "null", "undefined"):
            return s
    return ""

def _hwb_looks_like_leg(d):
    if not isinstance(d, dict):
        return False
    keys = {str(k).lower() for k in d.keys()}
    has_odds = bool(keys & {
        "odds", "price", "decimalodds", "decimal_odds", "decimalprice",
        "pricevalue", "oddvalue", "fixedodds", "winodds", "selectionodds",
        "currentodds", "displayodds", "priceamerican", "decimal",
    })
    if not has_odds:
        for k, v in d.items():
            lk = str(k).lower()
            if "odd" in lk or lk in ("price", "decimal"):
                if _hwb_odds(v) > 1.0:
                    has_odds = True
                    break
    has_sel = bool(keys & {
        "selection", "selectionname", "selectiontext", "outcome", "outcomename",
        "pick", "betname", "choice", "competitor", "playername",
    })
    has_mkt = bool(keys & {
        "market", "marketname", "markettype", "bettype", "markettext",
    })
    has_ev = bool(keys & {
        "event", "eventname", "match", "matchname", "fixture", "fixturename",
        "eventdescription", "game", "meeting",
    })
    return has_odds and (has_sel or has_mkt or has_ev)

def _hwb_leg_from_dict(d):
    if not isinstance(d, dict):
        return None
    low = {str(k).lower(): v for k, v in d.items()}

    def grab(*names):
        for n in names:
            if n in low and low[n] not in (None, ""):
                return low[n]
        for n in names:
            for k, v in low.items():
                if n in k and v not in (None, ""):
                    return v
        return None

    # Do not take the maximum across every odds-like field. Share-page JSON can
    # contain current, original, boosted, display and historical prices together;
    # max() silently attaches the wrong price to an otherwise-correct selection.
    odds = 0.0
    preferred = (
        "decimalodds", "decimalprice", "currentodds", "currentprice",
        "selectionodds", "selectionprice", "odds", "price", "decimal",
    )
    for key in preferred:
        if key in low:
            odds = _hwb_odds(low[key])
            if odds > 1.0:
                break
    if odds <= 1.0:
        candidates = []
        for key, val in low.items():
            if not any(x in key for x in ("odd", "price", "decimal")):
                continue
            if any(x in key for x in (
                "american", "fraction", "boost", "old", "previous",
                "original", "opening", "starting", "was", "max",
            )):
                continue
            value = _hwb_odds(val)
            if value > 1.0:
                candidates.append((key, value))
        # Prefer current/live/selection fields, then the first stable source key.
        candidates.sort(key=lambda item: (
            0 if any(x in item[0] for x in ("current", "selection", "decimal")) else 1,
            item[0],
        ))
        odds = candidates[0][1] if candidates else 0.0
    if odds <= 1.0:
        return None
    home = _hwb_str(grab("hometeam", "home", "teamhome", "homecompetitor"))
    away = _hwb_str(grab("awayteam", "away", "teamaway", "awaycompetitor"))
    match = _hwb_str(
        grab("eventname", "event", "matchname", "match", "fixture",
             "fixturename", "eventdescription", "game")
    )
    if home and away:
        match = f"{home} - {away}"
    elif match:
        match = re.sub(r"\s+vs\.?\s+", " - ", match, flags=re.I)
        match = re.sub(r"\s+v\.?\s+", " - ", match, flags=re.I)
    sel = _hwb_str(
        grab("selectionname", "selection", "outcomename", "outcome",
             "pick", "betname", "choice", "selectiontext")
    )
    mkt = _hwb_str(
        grab("marketname", "market", "bettype", "markettype", "markettext")
    )
    if not sel and mkt:
        sel = mkt
    if not sel:
        sel = "Selection"
    if not match:
        match = "Unknown"
    return {
        "selection": sel, "odds": odds,
        "market": mkt or "1X2", "match": match, "kickoff": "",
        "sub_legs": [], "is_build_a_bet": False,
        "bookmaker": "Hollywoodbets",
    }

def _hwb_collect_legs(obj, seen=None):
    if seen is None:
        seen = set()
    legs = []
    if id(obj) in seen:
        return legs
    try:
        seen.add(id(obj))
    except Exception:
        pass
    if isinstance(obj, dict):
        if _hwb_looks_like_leg(obj):
            leg = _hwb_leg_from_dict(obj)
            if leg:
                legs.append(leg)
        for v in obj.values():
            if isinstance(v, (dict, list)):
                legs.extend(_hwb_collect_legs(v, seen))
    elif isinstance(obj, list):
        dicts = [x for x in obj if isinstance(x, dict)]
        if dicts and sum(1 for x in dicts if _hwb_looks_like_leg(x)) >= 2:
            for x in dicts:
                leg = _hwb_leg_from_dict(x)
                if leg:
                    legs.append(leg)
        else:
            for x in obj:
                if isinstance(x, (dict, list)):
                    legs.extend(_hwb_collect_legs(x, seen))
    return legs

def _hwb_dedupe_legs(legs):
    out, seen = [], set()
    for leg in legs:
        key = (
            (leg.get("match") or "").lower(),
            (leg.get("selection") or "").lower(),
            round(float(leg.get("odds") or 0), 2),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(leg)
    return out

def _hwb_legs_to_text(legs):
    lines = ["Hollywoodbets"]
    for leg in legs:
        mkt = (leg.get("market") or "1X2").strip()
        sel = (leg.get("selection") or "Selection").strip()
        if mkt and sel and not sel.lower().startswith(mkt.lower()):
            lines.append(f"{mkt} - {sel}")
        else:
            lines.append(sel)
        if leg.get("odds", 0) > 1.0:
            lines.append(f"{leg['odds']:.2f}")
        lines.append(leg.get("match") or "Unknown")
        lines.append("")
    return "\n".join(lines).strip()

def fetch_hollywoodbets_booking(code, timeout_ms=45000):
    """Load a Hollywoodbets Bet ID internally.

    Intercepts JSON from the share page so every selection is kept, then
    falls back to collecting every on-page slip card. Never opens a tab.
    Returns (legs, slip_text, message). legs == [] on failure.
    """
    if not HAS_PLAYWRIGHT:
        return [], None, (
            "Hollywoodbets Bet IDs need Playwright on the MatchDesk server. "
            "Run: pip install playwright && playwright install chromium — "
            "then restart. Or paste the full slip text and click Analyze."
        )
    code = (code or "").strip()
    if not code:
        return [], None, "No Hollywoodbets Bet ID."
    urls = [
        f"https://www.hollywoodbets.net/betting/{urllib.parse.quote(code)}/code",
        f"https://new.hollywoodbets.net/betting/{urllib.parse.quote(code)}/code",
        f"https://www.hollywoodbets.net/betslip/share/{urllib.parse.quote(code)}",
        f"https://m.hollywoodbets.net/betting/{urllib.parse.quote(code)}/code",
    ]
    captured = []
    last_status = None
    last_err = ""
    body = ""

    def on_response(resp):
        try:
            st = resp.status
            url = resp.url or ""
            ct = (resp.headers.get("content-type") or "").lower()
            if st == 403:
                captured.append({"_blocked": True, "url": url})
                return
            if st != 200:
                return
            interesting = (
                "json" in ct
                or any(k in url.lower() for k in (
                    "betcode", "bet-code", "bet_code", "booking", "share",
                    "coupon", "ticket", "betslip", "bet-slip", "/code",
                    "selection", "loadbet", "load-bet", "getbet",
                ))
            )
            if not interesting:
                return
            try:
                data = resp.json()
            except Exception:
                return
            if isinstance(data, (dict, list)):
                captured.append(data)
        except Exception:
            pass

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ],
            )
            try:
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    locale="en-ZA",
                    viewport={"width": 1280, "height": 1100},
                    extra_http_headers={"Accept-Language": "en-ZA,en;q=0.9"},
                )
                page = context.new_page()
                page.on("response", on_response)
                opened = False
                for url in urls:
                    try:
                        resp = page.goto(url, wait_until="domcontentloaded",
                                         timeout=timeout_ms)
                        last_status = resp.status if resp else None
                        if last_status and last_status >= 400 and last_status != 403:
                            last_err = f"Hollywoodbets replied HTTP {last_status}."
                            continue
                        opened = True
                        page.wait_for_timeout(1800)
                        for label in (
                            "Accept", "Accept all", "Accept All", "I agree",
                            "Got it", "OK", "Allow all", "Agree", "Continue",
                            "I am 18", "Yes, I am",
                        ):
                            try:
                                btn = page.get_by_role(
                                    "button", name=re.compile(label, re.I))
                                if btn.count() > 0:
                                    btn.first.click(timeout=1500)
                                    page.wait_for_timeout(800)
                                    break
                            except Exception:
                                pass
                        try:
                            page.evaluate(
                                "window.scrollTo(0, document.body.scrollHeight/2)")
                            page.wait_for_timeout(600)
                            page.evaluate("window.scrollTo(0, 0)")
                        except Exception:
                            pass
                        try:
                            page.wait_for_function(
                                r"""() => {
                                    const t = document.body ? document.body.innerText : '';
                                    return (t.match(/\d{1,3}[.,]\d{2}/g)||[]).length>=2
                                        || /double\s*chance|full\s*time|vs\.?/i.test(t);
                                }""",
                                timeout=8000,
                            )
                        except Exception:
                            pass
                        page.wait_for_timeout(700)
                        body = page.inner_text("body") or body
                        body = _page_slip_text(page, body) or body
                        if body and len(re.findall(
                                r"(?<!\d)\d{1,3}[.,]\d{2}(?!\d)", body)) >= 1:
                            break
                    except Exception as e:
                        last_err = f"Could not open Hollywoodbets ({type(e).__name__})."
                        continue
                if not opened and not body:
                    last_err = last_err or "Could not open the Hollywoodbets share page."
            finally:
                try:
                    browser.close()
                except Exception:
                    pass
    except Exception as e:
        return [], None, f"Hollywoodbets lookup failed ({type(e).__name__}: {e})."

    if any(isinstance(x, dict) and x.get("_blocked") for x in captured) and not body:
        return [], None, (
            "Hollywoodbets blocked the server request (HTTP 403). "
            "This is common from cloud hosts. Copy the slip text from the "
            "Hollywoodbets app or site and use Paste from Clipboard."
        )

    json_legs = []
    for data in captured:
        if isinstance(data, dict) and data.get("_blocked"):
            continue
        json_legs.extend(_hwb_collect_legs(data))
    json_legs = _hwb_dedupe_legs(json_legs)
    if len(json_legs) >= 1:
        text = _hwb_legs_to_text(json_legs)
        _cache_resolved_legs(text, json_legs)
        n = len(json_legs)
        return json_legs, text, (
            f"Loaded {n} Hollywoodbets selection{'s' if n != 1 else ''} from Bet ID {code}."
        )

    if not body or len(body.strip()) < 20:
        if last_status == 404:
            return [], None, (
                f"Hollywoodbets Bet ID {code} was not found (expired or invalid). "
                "Confirm the code on Hollywoodbets, or paste the slip text instead."
            )
        if last_status == 403:
            return [], None, (
                "Hollywoodbets blocked the server request (HTTP 403). "
                "Copy the slip text from the Hollywoodbets app or site and paste it."
            )
        return [], None, last_err or (
            f"Could not retrieve Hollywoodbets Bet ID {code}. "
            "The code may be expired, geo-blocked, or the share page changed. "
            "Paste the slip text instead."
        )

    try:
        with open(os.path.join(CONFIG_DIR, "last_booking_scrape.txt"), "w",
                  encoding="utf-8") as _f:
            _f.write(body)
    except Exception:
        pass

    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in body.splitlines() if ln.strip()]
    hwb = _isolate_hwb_slip(lines)
    text = hwb or _isolate_slip_lines(lines)[0]
    prices = re.findall(r"(?<!\d)\d{1,3}[.,]\d{2}(?!\d)", text or "")
    if len(prices) < 1:
        return [], None, (
            f"Opened Hollywoodbets Bet ID {code} but found no selection odds. "
            "The code may be expired or the page layout changed. "
            "Paste the slip text instead."
        )
    return [], text, (
        f"Loaded Hollywoodbets Bet ID {code} via the share page — "
        "check every match, then Analyze runs automatically."
    )

_BETWAY_BRAND_ID = "bd66ebe1-080b-4455-9094-bf0464d4adbf"

_BETWAY_FIND_URL = "/appsynapse/bet-api-sr/v2/Betting/FindBookABet"

_BETWAY_ORIGIN = "https://www.betway.co.za/book-a-bet-results"

_RESOLVED_LEGS_CACHE = {}

_RESOLVED_LEGS_CACHE_MAX = 64

def _slip_text_key(text):
    try:
        return hashlib.md5((text or "").strip().encode("utf-8", "ignore")).hexdigest()
    except Exception:
        return ""

def _cache_resolved_legs(text, legs):
    """Remember API-fetched legs against the slip text we show the user."""
    key = _slip_text_key(text)
    if not key or not legs:
        return
    try:
        _RESOLVED_LEGS_CACHE[key] = [dict(l) for l in legs]
        if len(_RESOLVED_LEGS_CACHE) > _RESOLVED_LEGS_CACHE_MAX:
            for k in list(_RESOLVED_LEGS_CACHE.keys())[:-_RESOLVED_LEGS_CACHE_MAX]:
                _RESOLVED_LEGS_CACHE.pop(k, None)
    except Exception:
        pass

def _betway_json_to_legs(data):
    """Turn a Betway FindBookABet payload into MatchDesk legs.

    A normal multi carries one price per selection. A Build-a-Bet is several
    markets on ONE event priced as a single combined bet, so every selection
    reports the SAME combined price — we group those into one leg with the
    individual markets kept as sub-legs."""
    if not isinstance(data, dict):
        return []
    sels = data.get("selections") or []
    if not sels:
        return []
    is_bab = bool(data.get("isBuildABet"))
    legs = []
    if is_bab:
        groups = {}
        order = []
        for s in sels:
            ev = (s.get("eventName")
                  or (s.get("sportEvent") or {}).get("name") or "Build a Bet")
            if ev not in groups:
                groups[ev] = []
                order.append(ev)
            groups[ev].append(s)
        for ev in order:
            grp = groups[ev]
            odds = 0.0
            for s in grp:
                try:
                    odds = max(odds, float(s.get("priceDecimal") or 0))
                except Exception:
                    pass
            subs = []
            for s in grp:
                mk = (s.get("marketName")
                      or (s.get("market") or {}).get("displayName") or "")
                oc = (s.get("outcomeName") or "").strip()
                label = f"{mk}: {oc}".strip(": ").strip()
                if label:
                    subs.append(label)
            legs.append({
                "selection": ev, "odds": round(odds, 2),
                "market": "Build a Bet", "match": ev, "kickoff": "",
                "sub_legs": subs, "is_build_a_bet": True,
                "bookmaker": "Betway",
                "_sport_id": (grp[0].get("sportId") or "").lower(),
            })
    else:
        for s in sels:
            ev = s.get("sportEvent") or {}
            home = ev.get("homeTeam")
            away = ev.get("awayTeam")
            match = (f"{home} - {away}" if home and away
                     else (s.get("eventName") or "Unknown"))
            mk = (s.get("marketName")
                  or (s.get("market") or {}).get("displayName") or "")
            oc = (s.get("outcomeName") or "").strip()
            try:
                odds = round(float(s.get("priceDecimal") or 0), 2)
            except Exception:
                odds = 0.0
            legs.append({
                "selection": oc, "odds": odds,
                "market": mk or "1X2", "match": match, "kickoff": "",
                "sub_legs": [], "is_build_a_bet": False,
                "bookmaker": "Betway",
                "_sport_id": (s.get("sportId") or "").lower(),
            })
    return legs

def _betway_legs_to_text(legs):
    """Render API legs as the 'name / ODDS / details' slip the app displays."""
    lines = ["Betway"]
    for leg in legs:
        if leg.get("is_build_a_bet"):
            lines.append(leg.get("match") or "Build a Bet")
            if leg.get("odds", 0) > 1.0:
                lines.append(f"{leg['odds']:.2f}")
            lines.extend(leg.get("sub_legs") or [])
            lines.append("Build a Bet")
        else:
            lines.append(leg.get("selection") or "")
            if leg.get("odds", 0) > 0:
                lines.append(f"{leg['odds']:.2f}")
            lines.append(leg.get("match") or "Unknown")
            lines.append(leg.get("market") or "")
        lines.append("")
    return "\n".join(lines).strip()

def fetch_betway_booking(code, timeout_ms=45000):
    """Fetch a Betway booking code via the FindBookABet JSON API.

    Returns (legs, slip_text, message). legs == [] on any failure so the caller
    can fall back to the legacy browser scrape."""
    if not HAS_PLAYWRIGHT:
        return [], None, "Playwright not available."
    code = (code or "").strip().upper()
    if not code:
        return [], None, "No booking code."
    payload = {"countryCode": "ZA", "bookingCode": code, "cultureCode": "en-US"}
    js = """
    async (args) => {
        try {
            const r = await fetch(args.url, {
                method: 'POST',
                headers: {'content-type': 'application/json',
                          'x-brand-id': args.brand},
                body: JSON.stringify(args.payload)
            });
            return {status: r.status, text: await r.text()};
        } catch (e) { return {status: -1, text: String(e)}; }
    }
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"])
            try:
                context = browser.new_context(
                    user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/124.0.0.0 Safari/537.36"),
                    locale="en-ZA", viewport={"width": 1280, "height": 900})
                page = context.new_page()
                page.goto(_BETWAY_ORIGIN, wait_until="domcontentloaded",
                          timeout=timeout_ms)
                page.wait_for_timeout(2500)
                res = page.evaluate(js, {"url": _BETWAY_FIND_URL,
                                         "brand": _BETWAY_BRAND_ID,
                                         "payload": payload})
            finally:
                try:
                    browser.close()
                except Exception:
                    pass
    except Exception as e:
        return [], None, f"Browser load failed ({type(e).__name__})."
    if not isinstance(res, dict) or res.get("status") != 200:
        st = res.get("status") if isinstance(res, dict) else "?"
        return [], None, f"Betway API replied {st}."
    try:
        data = json.loads(res.get("text") or "{}")
    except Exception:
        return [], None, "Betway API returned unreadable data."
    legs = _betway_json_to_legs(data)
    if not legs:
        return [], None, ("That booking code has no selections "
                          "(it may be expired or invalid).")
    return legs, _betway_legs_to_text(legs), "Loaded from Betway."

# ---- Security: only fetch pages from the bookmakers we know about (stops server-side request forgery) ----
def _base_domain(host):
    parts = [p for p in (host or "").lower().strip(".").split(".") if p]
    if len(parts) >= 3 and len(parts[-1]) == 2 and parts[-2] in ("co", "com", "org", "net", "gov", "ac"):
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts) >= 2 else ".".join(parts)

def _allowed_bookie_domains(cfg_all=None):
    urls = list(BOOKIE_SITES.values())
    for c in (cfg_all or {}).values():
        if isinstance(c, dict):
            urls.append(c.get("url") or "")
            urls.extend(c.get("alt_urls") or [])
    doms = set()
    for u in urls:
        try:
            h = urllib.parse.urlparse(str(u).replace("{code}", "x")).hostname
        except Exception:
            h = None
        if h:
            doms.add(_base_domain(h))
    return doms

def _url_allowed(url, cfg_all=None):
    try:
        p = urllib.parse.urlparse(str(url).strip())
        host = (p.hostname or "").lower()
        if p.scheme not in ("http", "https") or not host:
            return False
        if p.port not in (None, 80, 443):
            return False
        for d in _allowed_bookie_domains(cfg_all):
            if host == d or host.endswith("." + d):
                return True
    except Exception:
        pass
    return False


def resolve_booking_code(code, bookie):
    """Returns (slip_text_or_None, message). Never raises.
    Flow:
       1. Normalise code / extract from URL
       2. HTTP JSON/HTML lookup when a configured URL exists
       3. Playwright SPA scrape for Betway (and other spa=True bookies)
    """
    raw_in = (code or "").strip()
    if not raw_in:
        return None, "Type or paste a booking code / Bet ID first."
    code, bookie_hint = _extract_booking_code(raw_in, bookie)
    if bookie in (None, "", "Auto") and bookie_hint and bookie_hint != "Auto":
        bookie = bookie_hint
    code = (code or "").strip()
    if not code:
        return None, "Could not read a booking code from that text."

    # --- Betway: use the structured FindBookABet JSON API first ------------
    # This returns the EXACT slip (sport, teams, market, outcome, odds and the
    # Build-a-Bet flag) instead of the generic listing the share page renders.
    if re.match(r"(?i)^BW[0-9A-Z]{4,}$", code) and \
            bookie in (None, "", "Auto", "Betway"):
        legs, btext, bmsg = fetch_betway_booking(code)
        if legs and btext:
            _cache_resolved_legs(btext, legs)
            return btext, ("Loaded from Betway — check the legs; "
                           "Analyze runs automatically.")

    cfg_all = load_bookie_lookup()
    headers_base = {"User-Agent": "Mozilla/5.0 MatchDesk"}
    tries = []

    if re.match(r"(?i)^https?://", code):
        if not _url_allowed(code, cfg_all):
            return None, (
                "That link is not from a supported bookmaker. "
                "Paste the booking code itself, or paste the slip text and click Analyze."
            )
        tries.append((code, {}, {"odds": "odds", "spa": True}))
    else:
        # Prefer the selected bookie, else any with a URL
        names = [bookie] if bookie in cfg_all and bookie not in ("Auto",) else \
            [n for n in cfg_all if (cfg_all[n] or {}).get("url")]
        if bookie == "Auto" or not names:
            # Always try Betway for BW* codes
            if re.match(r"(?i)^BW[0-9A-F]", code) and "Betway" not in names:
                names = ["Betway"] + names
            if not names:
                names = [n for n in cfg_all if (cfg_all[n] or {}).get("url")]
        for n in names:
            c = cfg_all.get(n, {}) or {}
            urls = []
            if c.get("url"):
                urls.append(c["url"])
            for au in (c.get("alt_urls") or []):
                if au and au not in urls:
                    urls.append(au)
            for u in urls:
                url = u.replace("{code}", urllib.parse.quote(code))
                tries.append((url, c.get("headers") or {}, c))

    # Ensure Betway results URL is always attempted for BW codes
    if re.match(r"(?i)^BW[0-9A-F]", code):
        bw_url = f"https://www.betway.co.za/book-a-bet-results?bookingCode={urllib.parse.quote(code)}"
        if not any(u == bw_url for u, _, _ in tries):
            tries.insert(0, (bw_url, {}, {"odds": "odds", "spa": True}))

    if not tries:
        site = BOOKIE_SITES.get(bookie, "")
        cfg_one = (cfg_all.get(bookie) or {}) if bookie in cfg_all else {}
        if cfg_one.get("paste_only") or bookie == "10Bet":
            return None, (
                "10Bet has no public booking-code page. "
                "Paste the full slip text into the box below and click Analyze."
            )
        if bookie == "Sportingbet":
            return None, (
                "Sportingbet uses a Share My Bet link (not a short code). "
                "Paste the full share link here if you have one, or paste the slip text below and Analyze."
            )
        if site:
            return None, (
                f"Direct booking-code lookup is not configured for {bookie}. "
                f"Use Open Site to open {site}, load the slip there, then paste "
                "the slip into MatchDesk — or install Playwright for automatic browser load "
                "(pip install playwright && playwright install chromium)."
            )
        return None, (
            "Direct booking-code lookup is not available for this bookmaker. "
            "Paste the slip text, or install Playwright for automatic browser load."
        )

    last_err = ""
    spa_urls = []
    for url, hdr, c in tries:
        # Skip pure SPA targets on plain HTTP — they return empty shells
        if c.get("spa"):
            spa_urls.append(url)
            continue
        try:
            h = dict(headers_base)
            h.update(hdr)
            r = requests.get(url, headers=h, timeout=15)
            if not _url_allowed(r.url, cfg_all):
                last_err = "The bookmaker redirected somewhere unexpected."
                continue
            if r.status_code != 200:
                last_err = f"Server replied {r.status_code}."
                continue
            text = ""
            try:
                text = _json_to_slip_text(r.json(), c)
            except ValueError:
                text = ""
            if not text:
                page = _html_to_text(r.text)
                if len(re.findall(r"(?m)^\d{1,3}\.\d{2}$", page)) >= 1:
                    text = page
            if text:
                return text, "Loaded — check the legs; Analyze will run automatically."
            last_err = "Reply received but no selections with odds were found."
        except Exception as e:
            last_err = f"Could not connect ({type(e).__name__})."

    # Playwright path for SPA share pages (Betway etc.)
    # Hard time budget: the old loop tried every alternate address one after another
    # (up to 55 s each), which could run for minutes and look like a freeze.
    _deadline = time.time() + 92       # stay under the host's ~100 s request limit
    _tried_hosts = set()
    _attempts = 0
    _stop = False
    for url in spa_urls:
        _host = urllib.parse.urlparse(url).netloc.lower()
        if _host in _tried_hosts:
            continue
        _tried_hosts.add(_host)
        _engines = ["auto"]
        for _eng in _engines:           # may gain an 'unblock' step below
            _left = _deadline - time.time()
            if _attempts >= 3 or _left < 20 or (_attempts >= 1 and _eng == "auto" and _left < 30):
                _stop = True
                break
            _attempts += 1
            text, msg = _scrape_slip_with_playwright(
                url, timeout_ms=int(max(15000, min(55000, _left * 1000 * 0.6))), engine=_eng)
            if text:
                return text, msg
            last_err = msg or last_err
            if "security check" in (msg or "").lower():
                if BROWSERLESS_TOKEN and _eng == "auto":
                    _engines.append("unblock")      # one escalation: residential ZA proxy
                    continue
                _stop = True                        # nothing more to try on this server
                break
        if _stop:
            break
    if spa_urls and not last_err:
        last_err = "The bookmaker page did not show a slip for that code."

    # Last resort: try Playwright on any remaining HTTP URL that looked empty
    if not spa_urls and tries and HAS_PLAYWRIGHT:
        for url, _, _ in tries[:2]:
            text, msg = _scrape_slip_with_playwright(url)
            if text:
                return text, msg
            last_err = msg or last_err

    if not HAS_PLAYWRIGHT and spa_urls:
        return None, (
            "This share page needs Playwright. "
            "Run once:  pip install playwright  &&  playwright install chromium  "
            "— restart MatchDesk, then Load again. "
            "Or paste the full slip text in the box below and click Analyze."
        )
    return None, last_err or "Could not load that code."
