# FSRS Notes (Behavior Summary)

This app uses the standard FSRS algorithm (via `ts-fsrs`). The button color matches the *review rating* you give (Again/Hard/Good/Easy), but the *SRS state* you land in depends on the card’s current state.

## SRS States
- **New**: never reviewed
- **Learning**: short-interval learning steps for new or recently failed items
- **Review**: long-term schedule (days → months)
- **Relearn**: lapsed review cards that re-enter short intervals

## Why the “Again” (red) button can result in **Learning** (yellow)
FSRS treats **Again** as a low rating, but for **new** cards that means you enter **Learning**, not Relearn.
Relearn only occurs when a card was already in **Review** and then you answered **Again** (a lapse).

### Example
- New → Again → **Learning** (yellow)
- Learning → Again → **Learning** (yellow)
- Review → Again → **Relearn** (red)

So if you keep pressing **Again** on a brand‑new card, it stays in Learning and will never show as Relearn until it first reaches Review and then fails.

## Notes
- We show **progress colors** based on the **current FSRS state**, not the last button you pressed.
- If you want the colors to reflect last response instead, that would be a different UI model (not FSRS state).
