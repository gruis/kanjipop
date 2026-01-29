import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { allLevelLists } from "~/lib/data/kanjiLists";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const query = getQuery(event);
  const taxonomy = typeof query.taxonomy === "string" ? query.taxonomy : "";

  const db = getDb();
  seedCardsIfEmpty(db);

  const reviewRows = db
    .prepare("SELECT cardId, state FROM review_states WHERE userId = ?")
    .all(user.id) as Array<{ cardId: string; state: string }>;
  const stateByCard = new Map(reviewRows.map((row) => [row.cardId, row.state]));

  const stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> = {};

  for (const list of allLevelLists) {
    if (taxonomy && list.taxonomy !== taxonomy) continue;
    for (const level of list.levels) {
      const key = `${list.taxonomy}:${level.id}`;
      let total = 0;
      let newCount = 0;
      let learning = 0;
      let review = 0;
      let relearn = 0;

      for (const k of level.kanji) {
        total += 1;
        const state = stateByCard.get(`kanji:${k}`);
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

      stats[key] = { total, new: newCount, learning, review, relearn };
    }
  }

  return { stats };
});
