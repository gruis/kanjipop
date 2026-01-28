# Detailed Tech Plan and Implementation Plan

## Goals
- Build a Nuxt 3 web app for kanji study with FSRS scheduling, decks/levels, and offline-first usage.
- Support multiple vocab sources (Jisho, WaniKani, manual) with a unified data model.
- Keep progress global across decks while allowing filtered views per level/taxonomy.
- Make sync feasible later without rewriting the data model.
- Use an established UI framework (Bootstrap) for consistent UX.
- Support WaniKani mnemonics for personal use, cached locally.

## Non-Goals (Initial)
- Real-time multi-device sync.
- Server-hosted accounts.
- Automated handwriting evaluation.

---

## Tech Stack
- Frontend: Nuxt 3 (SPA/SSG), Vue 3, Vue Router via Nuxt pages.
- UI: Bootstrap (via Nuxt module or direct install).
- Storage:
  - Browser: IndexedDB (Dexie or idb wrapper) for SRS/progress.
  - Device-local server DB (SQLite) for content cache (details/examples/mnemonics).
- SRS: FSRS (library or in-repo implementation).
- Offline assets: KanjiVG SVGs bundled or cached on demand.
- Data import: client-side fetch + parsing for Jisho/WaniKani, plus manual CSV/JSON.

---

## Data Model (High-Level)

### Core Entities (Browser)
- `Card`
  - `id` (UUID)
  - `type` ("kanji" | "vocab" | "custom")
  - `term` (string)
  - `reading` (string[])
  - `meaning` (string[])
  - `levels` (array of taxonomy tags, e.g., "jlpt:N4", "grade:3")
  - `sources` (array, e.g., "jisho", "wanikani", "manual")
  - `examples` (array of example IDs)
  - `createdAt`, `updatedAt`, `version`

- `ReviewState`
  - `cardId` (FK)
  - `fsrs` params (difficulty, stability, retrievability, lastReview, nextDue)
  - `state` (new/learning/review/relearn)
  - `lapses`, `reps`
  - `createdAt`, `updatedAt`

- `ReviewLog`
  - `id` (UUID)
  - `cardId`
  - `reviewedAt`, `grade`, `elapsed`, `scheduled`

### Content Cache (Server SQLite)
- `kanji_details`: Jisho kanji info.
- `word_details`: Jisho vocab info.
- `examples`: example sentences with source and timestamps.
- `compounds`: kanji compounds with source and timestamps.
- `mnemonics`: WaniKani/Manual mnemonics by term.
- `settings`: key/value store for WaniKani token and config.
- `decks` / `deck_items`: custom deck definitions.

### Sync-Later Readiness
- Stable UUIDs across all records.
- `updatedAt` timestamps and `version` counters for merge resolution.
- Append-only `ReviewLog` as event stream.

---

## Modules / Features

### 1) FSRS Engine
- Inputs: current `ReviewState`, grade (again/hard/good/easy).
- Output: updated `ReviewState` and `ReviewLog` entry.
- Scheduler uses global review queue, filtered by deck view on demand.

### 2) Decks and Levels
- Decks are filters over global cards (no duplicated cards).
- Level progression uses mastery thresholds (e.g., 80% mature to unlock next level).
- Level tags on cards derived from official JLPT/grade lists.
- Custom decks (user-defined) stored server-side.

### 3) Vocabulary Ingestion (Multi-source)
- **Manual**: UI form + CSV/JSON import.
- **Jisho**: best-effort scrape/search for term/reading/meaning + examples.
- **WaniKani**: user API token; import vocab with readings/meaning/examples if available.
- De-dup rules: same `term + reading[]` merges, preserving multiple sources.
- Level tagging: vocab tagged by the highest/lowest level of its component kanji based on selected taxonomy.

### 4) Mnemonics (WaniKani)
- Fetch kanji mnemonics via WaniKani API (token stored locally).
- Cache to server DB; never share externally.
- UI: show on card backs above compounds.
- Optional manual override entries stored locally.

### 5) Kanji Wall
- Grid of all kanji with color by level or SRS status.
- Filter and legend for progress categories (new/learning/review/mature).

### 6) Examples
- Store multiple examples per card, allow user overrides.
- UI toggles to prioritize user examples.

---

## UI / Routes (Nuxt)
- Use Nuxt pages and layouts for idiomatic routing.
- `/` Dashboard (today’s due count, quick start)
- `/review` Review session
- `/decks` Decks and level settings + custom deck creation
- `/cards` Card browser and editor
- `/kanji-wall` Progress wall
- `/import` Vocab import + API tokens
- `/settings` SRS settings, WaniKani token, storage, export/backup

---

## Offline & Performance
- Cache KanjiVG SVGs on demand in IndexedDB or static assets.
- Queue review creation is client-only, no server dependency.
- Throttle Jisho/WaniKani requests and retry on failure.

---

## Maintainability Guidelines
- No god functions: prefer small, composable utilities and domain modules.
- Separate data access, domain logic, and UI.
- Use typed interfaces and unit tests for SRS and import logic.
- Keep feature flags and config in a single settings module.

---

## Implementation Plan (Phased)

### Phase 0 — Project Setup
- Scaffold Nuxt 3 project.
- Add Bootstrap and base layout.
- Add IndexedDB wrapper and base schema.

Deliverable: Running Nuxt app with empty DB and seeded level taxonomies.

### Phase 1 — Kanji Data + Deck Views
- Import JLPT and grade kanji lists as static JSON.
- Build deck view definitions and browser UI.
- Create card records for all kanji.

Deliverable: Deck browser and kanji list view with level tags.

### Phase 2 — FSRS + Review Flow
- Implement FSRS engine and review queue.
- Review screen with grade buttons.
- Store ReviewLog and update ReviewState.

Deliverable: Fully functional SRS for kanji cards.

### Phase 3 — Vocab Pipeline
- Manual import UI and CSV/JSON parser.
- Jisho fetch adapter (best-effort, optional).
- WaniKani importer via API token.
- De-dup and merge logic.

Deliverable: Vocab cards appear and can be reviewed separately.

### Phase 4 — Examples + Mnemonics
- Example editor for each card.
- WaniKani mnemonic fetch + cache.
- “Prefer personal examples” toggle.

Deliverable: Mnemonics and user examples stored and displayed.

### Phase 5 — Kanji Wall + Progress UI
- Kanji wall grid with progress coloring.
- Filters by level/deck and SRS status.
- Summary stats and progress indicators.

Deliverable: Visual progress wall and basic stats dashboard.

### Phase 6 — Polish & Export
- Export/backup to JSON/CSV.
- Import/restore from backup.
- UX refinements and performance pass.

Deliverable: Stable local-first app ready for daily use.

---

## Risks & Mitigations
- Jisho scraping can break: treat as optional, never block review.
- WaniKani content is copyrighted: only fetch for user-owned token; do not redistribute.
- IndexedDB limits: keep media assets small; allow cache cleanup.
- FSRS complexity: use a trusted implementation or test heavily with fixtures.

---

## Next Step Proposal
- Implement WaniKani mnemonic cache + UI.
- Add custom deck creation UI.
- Wire search boxes.
