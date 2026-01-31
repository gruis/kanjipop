# Deployment (Fly.io)

This project is deployed on Fly.io using a single machine and a persistent volume for SQLite.

## Overview
- Build via `Dockerfile` and `fly.toml`
- Single instance only (SQLite)
- Persistent volume mounted at `/app/data`
- HTTPS enforced by Fly + app-level redirect

## Requirements
- `flyctl` CLI
- Fly.io account + app created

## Initial setup
1) Create the app in Fly (Web UI or CLI).
2) Create the volume:
```
flyctl volumes create kanjipop_data --size 2 --region nrt --app kanjipop
```
3) Deploy:
```
flyctl deploy
```

## Environment variables
Configured in `fly.toml` (or Fly UI):
- `NITRO_HOST=0.0.0.0`
- `NITRO_PORT=3000`
- `COOKIE_SECURE=true`
- `FORCE_HTTPS=true`

Optional:
- `NUXT_ALLOWED_HOSTS=your-domain`

## Data and assets
- SQLite lives under `/app/data/db` (volume)
- KanjiVG SVGs live under `/app/data/kanjisvg` (volume)
- A startup script symlinks `/app/public/kanjisvg` → `/app/data/kanjisvg`

## Migration (SQLite dump)
On the source machine:
```
sqlite3 /path/to/kanji-cache.sqlite ".output /tmp/kanji-export.sql" ".dump"
```
Upload the dump to Fly and import locally, then upload the DB:
```
sqlite3 /tmp/kanji-cache.sqlite < /path/to/kanji-export.sql
flyctl ssh sftp put -a kanjipop /tmp/kanji-cache.sqlite /app/data/db/kanji-cache.sqlite
flyctl machine restart -a kanjipop
```

## Health check
- `GET /api/healthz` returns `{ ok: true }` when DB is reachable.

## Notes
- Keep one machine running (`min_machines_running = 1`).
- Back up `/app/data` periodically.
