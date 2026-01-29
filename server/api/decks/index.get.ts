import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, createdAt, userId, entries FROM decks WHERE userId = ? OR userId IS NULL ORDER BY createdAt DESC"
    )
    .all(user.id);
  return { decks: rows };
});
