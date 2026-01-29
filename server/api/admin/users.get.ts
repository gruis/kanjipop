import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  if (user.role !== "admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT id, email, role, kind, displayName, disabled, createdAt FROM users ORDER BY createdAt ASC")
    .all() as any[];

  return { users: rows };
});
