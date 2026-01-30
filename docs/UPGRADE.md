# Upgrade Guide

## Steps
1) Pull latest code:
   - `git pull`
2) Rebuild image:
   - `docker compose build`
3) Restart:
   - `docker compose up -d`
4) Verify:
   - `docker compose ps`
   - open the site, ensure decks/cards load

## Notes
- SQLite lives in `data/db` on the host (volume).
- KanjiVG lives in `public/kanjisvg` on the host (bind mount).
