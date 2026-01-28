import type { Card, ReviewState } from "~/lib/db/schema";
import type { KanjiDb } from "~/lib/db/db";
import { seedKanjiIfEmpty } from "~/lib/seed/seedKanji";

export interface QueueItem {
  card: Card;
  reviewState: ReviewState | null;
  reason: "due" | "new";
}

const getDueReviewState = async (
  db: KanjiDb,
  now: number,
  levelTag?: string,
  allowedIds?: Set<string>
) => {
  const dueStates = await db.reviewStates
    .where("nextDue")
    .belowOrEqual(now)
    .sortBy("nextDue");

  for (const state of dueStates) {
    if (allowedIds && !allowedIds.has(state.cardId)) continue;
    const card = await db.cards.get(state.cardId);
    if (!card) continue;
    if (levelTag && !card.levels.includes(levelTag)) continue;
    return { card, state };
  }

  return null;
};

const getFirstNewCard = async (db: KanjiDb, levelTag?: string, allowedIds?: Set<string>) => {
  const reviewIds = new Set(await db.reviewStates.toCollection().primaryKeys());
  const candidate = await db.cards
    .filter((card) => {
      if (reviewIds.has(card.id)) return false;
      if (allowedIds && !allowedIds.has(card.id)) return false;
      if (levelTag && !card.levels.includes(levelTag)) return false;
      return true;
    })
    .first();

  return candidate ?? null;
};

export const getNextQueueItem = async (
  db: KanjiDb,
  now: number,
  levelTag?: string,
  allowedIds?: Set<string>
): Promise<QueueItem | null> => {
  await seedKanjiIfEmpty(db);

  const due = await getDueReviewState(db, now, levelTag, allowedIds);
  if (due) {
    return { card: due.card, reviewState: due.state, reason: "due" };
  }

  const newCard = await getFirstNewCard(db, levelTag, allowedIds);
  if (newCard) {
    return { card: newCard, reviewState: null, reason: "new" };
  }

  return null;
};
