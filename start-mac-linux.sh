#!/bin/sh
cd "$(dirname "$0")"
if [ ! -f .installed-v2 ]; then
  echo "First run: installing what MatchDesk needs..."
  python3 -m pip install -r requirements.txt && python3 -m playwright install chromium && echo done > .installed-v2
fi
( sleep 2; (command -v xdg-open >/dev/null && xdg-open http://localhost:8080) || (command -v open >/dev/null && open http://localhost:8080) ) &
python3 make_icons.py
PORT=8080 python3 server.py
