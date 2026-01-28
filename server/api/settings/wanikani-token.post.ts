import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { token?: string };
  const token = (body?.token || "").trim();

  if (!token) {
    setResponseStatus(event, 400);
    return { error: "Missing token." };
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO settings (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt`
  ).run("wanikani_token", token, now);

  return { ok: true, updatedAt: now };
});
