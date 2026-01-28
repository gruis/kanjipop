import type { KanjiDb } from "~/lib/db/db";
import { seedKanjiIfEmpty } from "~/lib/seed/seedKanji";

export const resetDatabase = async (db: KanjiDb) => {
  await db.transaction("rw", db.cards, db.reviewStates, db.reviewLogs, db.examples, db.deckViews, async () => {
    await db.reviewLogs.clear();
    await db.reviewStates.clear();
    await db.examples.clear();
    await db.deckViews.clear();
    await db.cards.clear();
  });

  await seedKanjiIfEmpty(db);
};
