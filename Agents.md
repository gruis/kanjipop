# Agent.md — Kanji Prompt Builder (Node → Offline HTML)

## Purpose
Build a small, reliable workflow for kanji handwriting practice from a user-supplied list of kanji (or pasted Japanese text), generating an **offline HTML page** with:
- readings + meaning (prompt)
- “Reveal” section showing the kanji
- stroke order diagram (SVG) using **KanjiVG** (offline, deterministic)
- a few example sentences pulled via `unofficial-jisho-api`

Primary goal: **prompt → write with pencil/stylus on paper/tablet → reveal → self-check**.

Secondary goal: keep the toolchain **local-first**, reproducible, and easy to extend.

---

## Working Agreement / Style
- Prefer deterministic, offline assets (KanjiVG) over scraping where possible.
- When relying on scraped sources, treat failures as non-fatal.
- No “patch instructions” in responses: provide full-file outputs when asked.
- Keep code readable; add small helper functions rather than clever one-liners.
- Use ESM (`.mjs`) and Node 18+ assumptions (global `fetch`).

---

## Repo Layout (target)
```
kanji-prompt/
  Agent.md
  package.json
  build-kanji-html.mjs
  data/
    kanjivg/                 # from KanjiVG release zip
      kanji/
        08a9e.svg
  out/
    kanji-cards.html
    assets/
      語_kanjivg.svg
```

---

## Environment Requirements
- Node.js >= 18 (Node 20 OK)
- npm
- macOS/Linux ok

Dependencies:
- `unofficial-jisho-api`
- `cheerio@1.0.0-rc.12` (pinned to avoid ESM default-export mismatch)

---

## One-time Setup (commands)
Run these exactly:

```bash
npm init -y
npm i unofficial-jisho-api
npm i cheerio@1.0.0-rc.12

mkdir -p data
cd data
curl -L -o kanjivg.zip https://github.com/KanjiVG/kanjivg/releases/latest/download/kanjivg.zip
unzip kanjivg.zip
cd ..
```

Sanity check:
- confirm `data/kanjivg/kanji/08a9e.svg` exists for 語.

---

## Typical Usage
Generate from explicit kanji list:
```bash
node build-kanji-html.mjs 語 学 読
open out/kanji-cards.html
```

Generate from pasted Japanese text:
```bash
node build-kanji-html.mjs --from-text "（paste text here）"
open out/kanji-cards.html
```

---

## Definition of Done (DoD)
A run is “done” when:
1. `out/kanji-cards.html` is created
2. For each kanji:
   - readings + meaning shown on the card
   - Reveal shows the kanji
   - Stroke SVG shows if KanjiVG has it
   - Example sentences appear when available
3. Failures (missing examples, missing kanji) do not crash the run; they show an error block per kanji.

---

## Current Known Issues / Constraints
- `unofficial-jisho-api` is not an official API and may break if Jisho changes.
- Example sentence results can be sparse for single-kanji queries.
- KanjiVG covers kanji well, but not all non-kanji characters.
- We do not do handwriting evaluation (that’s a separate future project).

---

## Roadmap (next improvements)
### UX / Study Flow
- Add “quiz mode” toggle:
  - hide meaning until reveal
  - show only reading prompt
  - optional “example hint” hidden behind a second toggle

### Data / Quality
- Allow manual override file for example sentences
- Add furigana rendering support
- Cache Jisho responses locally to reduce repeat scraping

### Output Formats
- Per-kanji individual card pages
- Dark mode stylesheet

---

## Agent Behavior Guidelines
When acting as a coding agent in this repo:

1. Maintain offline-first stroke order using KanjiVG.
2. Treat Jisho lookups as best-effort; never make the script crash if they fail.
