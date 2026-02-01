import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const db = getDb();
  const now = Date.now();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueToday = db
    .prepare("SELECT COUNT(*) as count FROM review_states WHERE userId = ? AND nextDue IS NOT NULL AND nextDue <= ?")
    .get(user.id, endOfToday.getTime()).count as number;

  const totalCards = db.prepare("SELECT COUNT(*) as count FROM cards").get().count as number;
  const reviewedCards = db.prepare("SELECT COUNT(*) as count FROM review_states WHERE userId = ?").get(user.id)
    .count as number;
  const newCards = Math.max(totalCards - reviewedCards, 0);

  const buckets = db
    .prepare(
      "SELECT state, COUNT(*) as count FROM review_states WHERE userId = ? GROUP BY state"
    )
    .all(user.id) as Array<{ state: string; count: number }>;
  const bucketMap = { new: newCards, learning: 0, review: 0, relearn: 0 };
  for (const row of buckets) {
    if (row.state === "learning") bucketMap.learning = row.count;
    if (row.state === "review") bucketMap.review = row.count;
    if (row.state === "relearn") bucketMap.relearn = row.count;
  }

  const upcoming = { h1: 0, h6: 0, h24: 0, d3: 0, d7: 0 };
  const horizons = [
    { key: "h1", ms: 1 * 60 * 60 * 1000 },
    { key: "h6", ms: 6 * 60 * 60 * 1000 },
    { key: "h24", ms: 24 * 60 * 60 * 1000 },
    { key: "d3", ms: 3 * 24 * 60 * 60 * 1000 },
    { key: "d7", ms: 7 * 24 * 60 * 60 * 1000 },
  ] as const;

  for (const horizon of horizons) {
    const count = db
      .prepare(
        "SELECT COUNT(*) as count FROM review_states WHERE userId = ? AND nextDue IS NOT NULL AND nextDue <= ?"
      )
      .get(user.id, now + horizon.ms).count as number;
    upcoming[horizon.key] = count;
  }

  const logs = db
    .prepare("SELECT reviewedAt FROM review_logs WHERE userId = ? ORDER BY reviewedAt DESC LIMIT 365")
    .all(user.id) as Array<{ reviewedAt: number }>;
  const days = new Set(logs.map((row) => dayKey(row.reviewedAt)));
  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const key = dayKey(cursor.getTime());
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    dueToday,
    newCards,
    streak,
    buckets: bucketMap,
    upcoming,
  };
});
