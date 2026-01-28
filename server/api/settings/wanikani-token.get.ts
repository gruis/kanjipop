import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(() => {
  const db = getDb();
  const row = db
    .prepare("SELECT value, updatedAt FROM settings WHERE key = ?")
    .get("wanikani_token") as { value?: string; updatedAt?: number } | undefined;

  const token = row?.value || "";
  return {
    hasToken: Boolean(token),
    updatedAt: row?.updatedAt || null,
  };
});
