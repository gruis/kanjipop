import { getCookie } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, "kanji_session") || "";
  if (!sessionId) return;

  const db = getDb();
  const session = db
    .prepare("SELECT userId, expiresAt FROM sessions WHERE id = ?")
    .get(sessionId) as { userId: string; expiresAt: number } | undefined;

  if (!session || session.expiresAt < Date.now()) return;

  const user = db
    .prepare("SELECT id, email, role, kind, displayName, disabled FROM users WHERE id = ?")
    .get(session.userId) as any;

  if (!user || user.disabled) return;

  event.context.user = user;
});
