import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const db = getDb();

  const deckRows = db
    .prepare("SELECT id FROM decks WHERE userId = ? OR userId IS NULL")
    .all(user.id) as Array<{ id: string }>;
  const stateRows = db
    .prepare("SELECT cardId, state FROM review_states WHERE userId = ?")
    .all(user.id) as Array<{ cardId: string; state: string }>;
  const stateByCard = new Map(stateRows.map((row) => [row.cardId, row.state]));

  const stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> = {};

  for (const deck of deckRows) {
    const items = db
      .prepare(
        "SELECT term, type FROM deck_items WHERE deckId = ? AND (userId = ? OR userId IS NULL) ORDER BY COALESCE(position, 999999), term ASC"
      )
      .all(deck.id, user.id) as Array<{ term: string; type: "kanji" | "vocab" }>;

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
