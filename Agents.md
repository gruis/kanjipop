# Agent.md — KanjiPop (Nuxt + SQLite + SRS)

## Purpose
Build a local-first Kanji study web app with spaced repetition, decks, and offline stroke order (KanjiVG), with:
- front/back card flow for handwriting practice
- readings/meanings/examples on front
- stroke order + compounds + mnemonics on back
- per-user progress (multi-user)
- admin-managed shared content

Primary goal: **prompt → write → reveal → self-check** with SRS scheduling.
Secondary goals: local-first data, reproducible installs, Fly.io-friendly deployment.

---

## Working Agreement / Style
- Prefer deterministic, offline assets (KanjiVG) over scraping.
- Jisho/WaniKani lookups are best-effort; failures must not crash runs.
- Keep code readable; use small helper functions instead of clever one-liners.
- Use ESM where applicable and Node 18+ assumptions.
- Server-side data is the source of truth (SQLite under `data/db`).

---

## Repo Layout (current)
```
kanjipop/
  Agents.md
  nuxt.config.ts
  package.json
  server/
    api/
    db/
  pages/
  lib/
  public/
    kanjisvg/
  fly.toml
  scripts/
    start.sh
  data/
    db/                # SQLite (server-side)
```

---

## Environment Requirements
- Node.js >= 18 (Node 20 OK)
- npm
- macOS/Linux for dev; Fly.io for deployment

Dependencies (important):
- `unofficial-jisho-api`
- `cheerio@1.0.0-rc.12`
- `better-sqlite3`

---

## Typical Usage (Dev)
```
npm install
npm run dev
```

## Typical Usage (Fly.io deploy)
```
flyctl deploy
```

---

## Definition of Done (DoD)
A run is “done” when:
1. The app boots and shows decks/cards.
2. SRS review works per user.
3. Cards show readings/meaning/examples on front.
4. Back shows stroke order, compounds, mnemonics.
5. Missing data is non-fatal (error block per card).

---

## Current Constraints
- `unofficial-jisho-api` can break if Jisho changes.
- Example sentence results can be sparse.
- KanjiVG covers kanji, not all non-kanji characters.
- Multi-user sync across devices is not implemented yet.

---

## Agent Behavior Guidelines
When acting as a coding agent in this repo:

1. Keep data server-side in SQLite; avoid browser storage.
2. Maintain offline-first stroke order using KanjiVG.
3. Treat Jisho/WaniKani lookups as best-effort.
4. Avoid god functions; keep modules small and maintainable.
5. When asked for code updates, return full-file outputs only if explicitly requested.
