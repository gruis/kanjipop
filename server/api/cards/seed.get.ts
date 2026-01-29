import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";

export default defineEventHandler(() => {
  const db = getDb();
  const count = seedCardsIfEmpty(db);
  return { count };
});
