# High-Level Plan (Saved)

## Product Direction
- Web app only (Nuxt 3).
- Local-first: browser stores SRS/progress; device-local server DB caches content (kanji details, examples, mnemonics).
- Sync-later ready (stable IDs, timestamps, event log style updates).

## Core Requirements
1) SRS Engine (FSRS)
- Global scheduling across all decks.
- Card states: new, learning, review, relearn.
- Daily queue with session limits and stats.

2) Decks / Levels
- Built-in level taxonomies: JLPT (N5→N1) and Japanese school grades.
- Decks are filtered views of a global card pool.
- Unlock rules by mastery threshold per level.

3) Cards
- Kanji cards: readings, meaning, stroke order, examples.
- Vocabulary cards: separate SRS state from kanji.
- Multi-kanji words stay as a single card.

4) Vocabulary Sources (Multi-source)
- Jisho (best-effort, optional).
- WaniKani (user API token).
- Manual input via UI and/or CSV/JSON import.
- De-dup by term+reading, keep provenance.

5) Examples
- User can add their own example sentences.
- Prefer personal examples option.

6) Mnemonics
- Optional WaniKani mnemonics (user token, personal use only).
- Stored in device-local DB and displayed on card backs.

7) Kanji Wall
- Grid of kanji with color by level or SRS progress.
- Filters for deck, level, due/new/mature.

## Additional Useful Features
- Furigana toggle.
- Quiz modes (reading-only, meaning-only, writing-only).
- Search and dictionary view.
- Export/backup (JSON/CSV).
- Basic stats and retention metrics.
