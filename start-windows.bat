@echo off
title MatchDesk server
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py
echo.
echo  MatchDesk - starting. Leave this window OPEN while you use the app.
echo.
if not exist ".installed-v2" (
  echo  First run: installing what MatchDesk needs. This can take a few minutes...
  %PY% -m pip install -r requirements.txt
  %PY% -m playwright install chromium
  echo done> .installed-v2
)
%PY% make_icons.py
set PORT=8080
start "" http://localhost:8080
echo  Opening http://localhost:8080  (the page should say "Connected to the MatchDesk server")
echo.
%PY% server.py
echo.
echo  The server stopped. If you see an error above, copy it and send it to me.
pause
