import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { buildCard, cardToRow, rowToCard } from "~/server/utils/cards";
import { rowToReviewState } from "~/server/utils/review";

const getAllowedIdsForDeck = (db: any, deckId: string) => {
  const items = db
    .prepare("SELECT term, type FROM deck_items WHERE deckId = ?")
    .all(deckId) as Array<{ term: string; type: "kanji" | "vocab" }>;
  const ids = new Set(items.map((item) => `${item.type}:${item.term}`));

  if (items.length > 0) {
    const insertCard = db.prepare(
      `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
       VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
    );
    const now = Date.now();
    const tx = db.transaction(() => {
      for (const item of items) {
        const id = `${item.type}:${item.term}`;
        insertCard.run(cardToRow(buildCard(id, item.type, item.term, now)));
      }
    });
    tx();
  }

  return ids;
};

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const taxonomy = typeof query.taxonomy === "string" ? query.taxonomy : "";
  const level = typeof query.level === "string" ? query.level : "";
  const deckId = typeof query.deckId === "string" ? query.deckId : "";

  const db = getDb();
  seedCardsIfEmpty(db);

  let allowedIds: Set<string> | null = null;
  let levelTag: string | null = null;

  if (taxonomy === "custom") {
    if (!deckId) return { card: null };
    allowedIds = getAllowedIdsForDeck(db, deckId);
  } else if (taxonomy && level) {
    levelTag = `${taxonomy}:${level}`;
  }

  const now = Date.now();
  const dueRows = db
    .prepare("SELECT * FROM review_states WHERE nextDue IS NOT NULL AND nextDue <= ? ORDER BY nextDue ASC")
    .all(now) as any[];

  for (const stateRow of dueRows) {
    if (allowedIds && !allowedIds.has(stateRow.cardId)) continue;
    const cardRow = db.prepare("SELECT * FROM cards WHERE id = ?").get(stateRow.cardId);
    if (!cardRow) continue;
    const card = rowToCard(cardRow);
    if (levelTag && !card.levels.includes(levelTag)) continue;
    return { card, reviewState: rowToReviewState(stateRow), reason: "due" };
  }

  const reviewed = new Set(
    db.prepare("SELECT cardId FROM review_states").all().map((r: any) => r.cardId)
  );

  const cardRows = db.prepare("SELECT * FROM cards ORDER BY term ASC").all();
  for (const row of cardRows) {
    const card = rowToCard(row);
    if (reviewed.has(card.id)) continue;
    if (allowedIds && !allowedIds.has(card.id)) continue;
    if (levelTag && !card.levels.includes(levelTag)) continue;
    return { card, reviewState: null, reason: "new" };
  }

  return { card: null };
});
