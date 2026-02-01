# KanjiPop

KanjiPop is a local-first Kanji study web app with SRS, decks, and offline stroke-order diagrams (KanjiVG).

## Quick Start (Dev)
```bash
npm install
npm run dev
```

## Deployment (Fly.io)
This app is deployed on Fly.io with a single machine and a persistent volume.

Quick start:
```bash
flyctl volumes create kanjipop_data --size 2 --region nrt --app kanjipop
flyctl deploy
```

Key env vars (see `fly.toml`):
- `NITRO_HOST=0.0.0.0`
- `NITRO_PORT=3000`
- `COOKIE_SECURE=true`
- `FORCE_HTTPS=true`

More details in `docs/DEPLOYMENT.md`.

## Local self-hosting (Docker Compose)
```bash
docker compose up -d --build
```

Notes:
- App listens on `http://localhost:3000`.
- SQLite persists under `./data/db`.
- KanjiVG SVGs are mounted read-only from `./public/kanjisvg`.

## KanjiVG SVGs (Required for Stroke Order)
KanjiPop expects KanjiVG SVGs at:
```
public/kanjisvg/kanji/
```

Download and unpack:
```bash
mkdir -p public
curl -L -o /tmp/kanjivg.zip https://github.com/KanjiVG/kanjivg/releases/latest/download/kanjivg.zip
unzip -q /tmp/kanjivg.zip -d /tmp/kanjivg
rm -rf public/kanjisvg
mkdir -p public/kanjisvg
cp -R /tmp/kanjivg/kanjivg/kanji public/kanjisvg/kanji
```

Sanity check:
- `public/kanjisvg/kanji/08a9e.svg` should exist for 語.
