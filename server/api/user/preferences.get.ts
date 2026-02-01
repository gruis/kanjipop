import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const db = getDb();
  const row = db
    .prepare("SELECT lastTaxonomy, lastLevel, lastDeckId, updatedAt FROM user_preferences WHERE userId = ?")
    .get(user.id);
  return { preferences: row || null };
});
