import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const db = getDb();
  const row = db
    .prepare("SELECT wanikaniToken, updatedAt FROM user_settings WHERE userId = ?")
    .get(user.id) as { wanikaniToken?: string; updatedAt?: number } | undefined;

  const token = row?.wanikaniToken || "";
  return {
    hasToken: Boolean(token),
    updatedAt: row?.updatedAt || null,
  };
});
