# v33 team-display regression

Root cause fixed in `web/app.js`: `renderLegs()` calls `teamsOf(l)` with a leg object. When the parser did not provide explicit `home_team`/`away_team` fields, the old fallback converted the whole object to `"[object Object]"` instead of reading `l.match`, so the `Teams: home vs away` line was omitted. The fallback now reads `m.match` (or `m.fixture`) for objects.

Manual regression cases:
- `{match: 'TOTTENHAM vs COVENTRY'}` -> Tottenham / Coventry
- `{match: 'MAN CITY vs BRIGHTON'}` -> Man City / Brighton
- `{match: 'SUNDOWNS vs DURBAN CITY FC'}` -> Sundowns / Durban City FC
- `{home_team: 'SUNDOWNS', away_team: 'DURBAN CITY FC', match: 'SUNDOWNS vs DURBAN CITY FC'}` -> explicit fields take precedence
