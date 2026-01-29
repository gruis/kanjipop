import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { hashSecret } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { email?: string; password?: string; displayName?: string };
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  const displayName = (body?.displayName || "").trim();

  if (!email || !password) {
    setResponseStatus(event, 400);
    return { error: "Missing email or password." };
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) {
    setResponseStatus(event, 409);
    return { error: "Admin already exists." };
  }

  const now = Date.now();
  const id = globalThis.crypto?.randomUUID?.() || `user_${now}`;
  const passwordHash = hashSecret(password);

  db.prepare(
    `INSERT INTO users (id, email, passwordHash, role, kind, displayName, disabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 'admin', 'adult', ?, 0, ?, ?)`
  ).run(id, email, passwordHash, displayName || null, now, now);

  return { ok: true, id };
});
