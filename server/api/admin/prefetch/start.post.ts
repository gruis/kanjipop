import { randomUUID } from "node:crypto";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";
import { listStandardDecks } from "~/server/utils/standardDecks";

type PrefetchItem = { type: "kanji" | "vocab"; term: string };

const collectPrefetchItems = (db: any): PrefetchItem[] => {
  const items = new Map<string, PrefetchItem>();

  for (const list of listStandardDecks(db)) {
    for (const level of list.levels) {
      for (const k of level.kanji) {
        items.set(`kanji:${k}`, { type: "kanji", term: k });
      }
    }
  }

  const deckItems = db
    .prepare("SELECT term, type FROM deck_items")
    .all() as Array<{ term: string; type: "kanji" | "vocab" }>;
  for (const item of deckItems) {
    if (item.type === "kanji" || item.type === "vocab") {
      items.set(`${item.type}:${item.term}`, { type: item.type, term: item.term });
    }
  }

  return Array.from(items.values());
};

export default defineEventHandler(async (event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    return { error: "Forbidden." };
  }

  const db = getDb();
  const items = collectPrefetchItems(db);
  const jobId = randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO prefetch_jobs (id, status, scope, total, processed, failed, options, remaining, createdAt, updatedAt)
     VALUES (?, 'pending', ?, ?, 0, 0, ?, ?, ?, ?)`
  ).run(jobId, "all", items.length, JSON.stringify({ includeExamples: true, includeCompounds: true }), JSON.stringify(items), now, now);

  return { jobId, total: items.length };
});
