import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(() => {
  const db = getDb();

  const deckRows = db.prepare("SELECT id FROM decks").all() as Array<{ id: string }>;
  const stateRows = db.prepare("SELECT cardId, state FROM review_states").all() as Array<{ cardId: string; state: string }>;
  const stateByCard = new Map(stateRows.map((row) => [row.cardId, row.state]));

  const stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> = {};

  for (const deck of deckRows) {
    const items = db
      .prepare("SELECT term, type FROM deck_items WHERE deckId = ?")
      .all(deck.id) as Array<{ term: string; type: "kanji" | "vocab" }>;

    let total = 0;
    let newCount = 0;
    let learning = 0;
    let review = 0;
    let relearn = 0;

    for (const item of items) {
      total += 1;
      const cardId = `${item.type}:${item.term}`;
      const state = stateByCard.get(cardId);
      if (!state) {
        newCount += 1;
      } else if (state === "learning") {
        learning += 1;
      } else if (state === "review") {
        review += 1;
      } else if (state === "relearn") {
        relearn += 1;
      }
    }

    stats[deck.id] = { total, new: newCount, learning, review, relearn };
  }

  return { stats };
});
