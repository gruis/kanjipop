import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(() => {
  const db = getDb();
  const row = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  return { hasAdmin: Boolean(row) };
});
