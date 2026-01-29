import { deleteCookie, getCookie } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, "kanji_session") || "";
  if (sessionId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
  deleteCookie(event, "kanji_session", { path: "/" });
  return { ok: true };
});
