import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { buildCard, cardToRow, rowToCard } from "~/server/utils/cards";
import { rowToReviewState } from "~/server/utils/review";
import { requireUser } from "~/server/utils/auth";
import { getOrderedStandardDeck } from "~/server/utils/standardDecks";

const getDeckItemsForDeck = (db: any, deckId: string, userId: string) => {
  const deck = db.prepare("SELECT id, userId FROM decks WHERE id = ?").get(deckId) as { id: string; userId: string | null } | undefined;
  if (!deck || (deck.userId && deck.userId !== userId)) return new Set<string>();

  const items = db
    .prepare(
      "SELECT term, type FROM deck_items WHERE deckId = ? AND (userId = ? OR userId IS NULL) ORDER BY COALESCE(position, 999999), term ASC"
    )
    .all(deckId, userId) as Array<{ term: string; type: "kanji" | "vocab" }>;
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
  const user = requireUser(event);
  const query = getQuery(event);
  const taxonomy = typeof query.taxonomy === "string" ? query.taxonomy : "";
  const level = typeof query.level === "string" ? query.level : "";
  const deckId = typeof query.deckId === "string" ? query.deckId : "";

  const db = getDb();
  seedCardsIfEmpty(db);

  let allowedIds: Set<string> | null = null;
  let orderedIds: string[] | null = null;
  let levelTag: string | null = null;

  if (taxonomy === "custom") {
    if (!deckId) return { card: null };
    const items = db
      .prepare(
        "SELECT term, type FROM deck_items WHERE deckId = ? AND (userId = ? OR userId IS NULL) ORDER BY COALESCE(position, 999999), term ASC"
      )
      .all(deckId, user.id) as Array<{ term: string; type: "kanji" | "vocab" }>;
    allowedIds = getDeckItemsForDeck(db, deckId, user.id);
    orderedIds = items.map((item) => `${item.type}:${item.term}`);
  } else if (taxonomy && level) {
    levelTag = `${taxonomy}:${level}`;
    if (taxonomy === "jlpt" || taxonomy === "grade") {
      const ordered = getOrderedStandardDeck(db, taxonomy, level);
      orderedIds = ordered.kanji.map((term) => `kanji:${term}`);
    }
  }

  const now = Date.now();
  const dueRows = db
    .prepare("SELECT * FROM review_states WHERE userId = ? AND nextDue IS NOT NULL AND nextDue <= ? ORDER BY nextDue ASC")
    .all(user.id, now) as any[];

  for (const stateRow of dueRows) {
    if (allowedIds && !allowedIds.has(stateRow.cardId)) continue;
    const cardRow = db.prepare("SELECT * FROM cards WHERE id = ?").get(stateRow.cardId);
    if (!cardRow) continue;
    const card = rowToCard(cardRow);
    if (levelTag && !card.levels.includes(levelTag)) continue;
    return { card, reviewState: rowToReviewState(stateRow), reason: "due" };
  }

  const reviewed = new Set(
    db.prepare("SELECT cardId FROM review_states WHERE userId = ?").all(user.id).map((r: any) => r.cardId)
  );

  if (orderedIds && orderedIds.length > 0) {
    for (const id of orderedIds) {
      if (reviewed.has(id)) continue;
      if (allowedIds && !allowedIds.has(id)) continue;
      const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);
      if (!row) continue;
      const card = rowToCard(row);
      if (levelTag && !card.levels.includes(levelTag)) continue;
      return { card, reviewState: null, reason: "new" };
    }
  } else {
    const cardRows = db.prepare("SELECT * FROM cards ORDER BY term ASC").all();
    for (const row of cardRows) {
      const card = rowToCard(row);
      if (reviewed.has(card.id)) continue;
      if (allowedIds && !allowedIds.has(card.id)) continue;
      if (levelTag && !card.levels.includes(levelTag)) continue;
      return { card, reviewState: null, reason: "new" };
    }
  }

  return { card: null };
});
