import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const idsParam = typeof query.ids === "string" ? query.ids.trim() : "";
  const ids = idsParam ? idsParam.split(",").map((id) => id.trim()).filter(Boolean) : [];

  const db = getDb();
  if (ids.length === 0) return { states: {} };

  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT cardId, state FROM review_states WHERE cardId IN (${placeholders})`)
    .all(...ids) as Array<{ cardId: string; state: string }>;

  const states: Record<string, string> = {};
  for (const row of rows) {
    states[row.cardId] = row.state;
  }

  return { states };
});
