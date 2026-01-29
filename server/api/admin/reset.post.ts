import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { cardToRow } from "~/server/utils/cards";

export default defineEventHandler(() => {
  const db = getDb();

  const deckItems = db
    .prepare("SELECT deckId, term, type, createdAt FROM deck_items")
    .all() as Array<{ deckId: string; term: string; type: "kanji" | "vocab"; createdAt: number }>;

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM review_logs").run();
    db.prepare("DELETE FROM review_states").run();
    db.prepare("DELETE FROM cards").run();
  });

  tx();

  const now = Date.now();
  seedCardsIfEmpty(db);

  if (deckItems.length > 0) {
    const insertCard = db.prepare(
      `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
       VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
    );

    const tx2 = db.transaction(() => {
      for (const item of deckItems) {
        const cardId = `${item.type}:${item.term}`;
        insertCard.run(
          cardToRow({
            id: cardId,
            type: item.type,
            term: item.term,
            reading: [],
            meaning: [],
            levels: [],
            sources: ["custom"],
            exampleIds: [],
            createdAt: now,
            updatedAt: now,
            version: 1,
          })
        );
      }
    });

    tx2();
  }

  return { ok: true };
});
