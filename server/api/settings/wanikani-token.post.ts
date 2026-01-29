import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = (await readBody(event)) as { token?: string };
  const token = (body?.token || "").trim();

  if (!token) {
    setResponseStatus(event, 400);
    return { error: "Missing token." };
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO user_settings (userId, wanikaniToken, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET wanikaniToken=excluded.wanikaniToken, updatedAt=excluded.updatedAt`
  ).run(user.id, token, now);

  return { ok: true, updatedAt: now };
});
