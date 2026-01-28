import { getRouterParam } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || "";
  const db = getDb();
  const items = db
    .prepare("SELECT term, type FROM deck_items WHERE deckId = ? ORDER BY term ASC")
    .all(id) as Array<{ term: string; type: "kanji" | "vocab" }>;
  return { items };
});
