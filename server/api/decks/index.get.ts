import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(() => {
  const db = getDb();
  const rows = db.prepare("SELECT id, name, createdAt FROM decks ORDER BY createdAt DESC").all();
  return { decks: rows };
});
