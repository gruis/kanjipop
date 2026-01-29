import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = (await readBody(event)) as { term?: string; kind?: string; text?: string };

  const term = (body.term || "").trim();
  const kind = (body.kind || "").trim() || "meaning";
  const text = (body.text || "").trim();

  if (!term || !text) {
    setResponseStatus(event, 400);
    return { error: "Missing term or text." };
  }

  const db = getDb();
  const now = Date.now();
  const userId = user.role === "admin" ? null : user.id;
  const visibility = user.role === "admin" ? "shared" : "personal";

  db.prepare(
    "INSERT INTO mnemonics (userId, term, kind, text, source, visibility, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, term, kind, text, user.role === "admin" ? "admin" : "manual", visibility, now, now);

  return { ok: true };
});
