# MatchDesk Online

One server that hosts the MatchDesk web app **and** loads booking codes, so it works on any phone:
users open one link, paste a booking ID, tap **Load code**, and the slip is read and analyzed.

## What the app includes 
Dashboard · Bet Analyzer (inputs left, risk ratings & recommendations right; form, league position and head-to-head notes with a Football-Data key) ·
Live Scores (soccer, rugby, cricket, F1, plus any ESPN sport/league entered manually; track teams from a slip or booking code; goal alerts) ·
Live Video Feed (official, legal sources only) · History · Settings.
Currency for plan prices is detected from the device region/timezone (e.g. Rands in South Africa, Pounds in the UK, Dollars in the US) using live exchange rates.

## What's in this folder
- `web/` – the MatchDesk web app (installable on phones)
- `server.py` – serves the app + `/api/resolve` (loads codes) + `/api/ping`
- `resolver.py` – your desktop app's booking-code loader, extracted automatically from MatchDesk.py
- `Dockerfile`, `requirements.txt` – for deploying

## Option A – deploy to the internet (recommended)
Any host that runs a Docker container works (Fly.io, Railway, Render, Google Cloud Run, a VPS).
Give it **at least 1 GB RAM** (it runs a headless Chrome) and note it must provide **HTTPS** (all of these do).
1. Put this folder in a GitHub repository (or use the host's CLI).
2. Create a new service from the repository, choosing the **Dockerfile** build.
3. Open the web address the host gives you. Done – share that link; users can "Install app" from it.

## Option B – run it on your own computer first (to try it)
**Easiest:** double-click `start-windows.bat` (Mac/Linux: `start-mac-linux.sh`). It installs what is needed the first time, starts the server and opens the app.
Manual way:
```
pip install -r requirements.txt
playwright install chromium
python server.py
```
Then open http://localhost:8080

## Settings (optional environment variables)
| Name | Default | Meaning |
|---|---|---|
| `MD_RATE_PER_MIN` | 8 | code lookups per user per minute |
| `MD_CONCURRENCY` | 2 | lookups running at the same time |
| `MD_CACHE_SECS` | 300 | how long a loaded code is remembered |
| `MD_ORIGIN` | * | restrict which websites may call the API |
| `MD_GLOBAL_RATE_PER_MIN` | 40 | code lookups for ALL users together per minute (0 = off) |
| `MD_DAILY_CAP` | 3000 | code lookups for ALL users together per day, UTC (0 = off) |
| `MD_TRUSTED_PROXIES` | 0 | advanced: how many proxies sit in front of the server; only needed if `CF-Connecting-IP` is missing |

## Important to know
- Bookmaker sites may block requests from cloud servers (they often block data-centre addresses), or change their pages.
  Your desktop app runs from a home connection, so this has not been verified from a server. If a code fails here
  but works on the desktop app, that is the likely cause; the app then falls back to opening the bookmaker page.
- Loading a code reads a public share page for the user, as the desktop app does. Check each bookmaker's terms before offering this publicly.
- 10Bet has no public code page (paste the slip text), and Sportingbet needs the full Share My Bet link.

## If "Load code" does not work
If `MatchDesk.py` is in the same folder as `server.py`, the server automatically uses its code loader (the exact desktop logic).
Do not pin a Playwright version locally; `requirements.txt` leaves your existing one alone.
The server also has a diagnostics page at /api/selftest (checks Playwright, its browser and bookmaker access).

## Ads (Home screen)
Edit `web/config.js`: list sponsor/affiliate banners (images go in `web/ads/`), or add your Google AdSense client/slot once approved.
Open the app with `?ads=demo` on the end of the address to preview the layout. Ads are always labelled "Advertisement".
Check the advertising rules for gambling-related content in your country, and each ad network's policy, before going live.

## Plans & pricing
Prices follow your desktop app: Free, PayPal 30 Day Access ($4.99 USD) and 1 Year Access ($49.99 USD). They are shown in the device's local currency as an
estimate (live exchange rates, USD fallback) with PayPal as the authority on the amount charged. The PayPal links are in `web/app.js` (PAYPAL).
Licence keys are still issued by email after payment, as in the desktop app; in-app key entry (About -> Licence & Plans) and the Free-plan daily limit are built (see `licensing` in `web/config.js`).

## Push notifications (alerts even when the app is closed)
Turn on **About → Goal alerts → Push notifications**. The server watches the scores of everything people track and sends goal, kick-off and
full-time alerts. Needs `pywebpush` (in requirements.txt). The server creates its own VAPID keys and keeps subscriptions in the `data/` folder
(on a cloud host, give it a persistent disk for `data/`). Browsers only allow push on a secure address: `http://localhost` works on the computer
running the server; phones need MatchDesk hosted on HTTPS (and on iPhone it must be added to the Home Screen first).
F1 and cricket are not watched by push yet.

## Kelly stake sizing (Pro)
Each recommended combination has a **Stake sizing (Kelly)** section: the user enters a bankroll and their own win chance, picks full / half / quarter Kelly,
and sees the suggested share of bankroll and stake amount. Suggestions are capped at 10% of the bankroll. It is locked on the Free plan once the 7-day trial ends
(and only when `licensing.enforce` is true). It is informational only and carries a disclaimer.

## Licence keys
About → License & Plans has the key box. Keys use the desktop format (MD1…); the public key is in `web/config.js` (same as the desktop app).
Desktop keys that are locked to one computer cannot unlock the web app: ask the keygen for a key with no computer lock.
Free-plan limits (1 analysis a day, 5 saved slips) apply while `licensing.enforce` is `true` in `web/config.js` (currently on); Pro keys and the 7-day trial are never limited.
Support address shown in the app: Matchdesksupport@gmail.com.


## Security notes (added)

- Booking-code links: pasting a full URL only works for the bookmakers' own domains (anything else is refused). This stops the server being used to fetch arbitrary or internal addresses.
- Visitor IP for rate-limiting uses Cloudflare's `CF-Connecting-IP` header when present, so it cannot be faked with `X-Forwarded-For`.
- `/api/selftest` results are cached for 60 seconds. Point uptime pingers at `/api/ping`, not `/api/selftest`.
- Legal text (Terms, Privacy, Refund Policy, Responsible Gambling) lives in `web/app.js`. Fill in `LEGAL_REG` and `LEGAL_ADDR` at the top of that section to show your registration number and address in the Terms.

## Team form, league position and head-to-head (data sources)

- **ESPN** (public endpoints, called from the user's browser, no key) is the default for everyone. It covers the leagues in `ESPN_COMPS` in `web/app.js` (including the South African Premiership, `rsa.1`). To cover another league, add its ESPN code to that list.
- **Football-Data.org** (optional key in About -> Settings). When a user has saved a key AND both teams are in a league Football-Data covers (see `FD_OF` in `web/app.js`), Football-Data is used first because it also counts cup and European matches. For every other match ESPN is used. If the preferred source has nothing, the other one is tried.
- A rejected Football-Data key does not break anything: ESPN data is shown with a note.
- ESPN's endpoints are unofficial and could change; if form details stop appearing for everyone, check the ESPN calls in the browser's network tab first.
