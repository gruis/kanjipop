import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = (await readBody(event)) as { term?: string; word?: string; reading?: string; meaning?: string };

  const term = (body.term || "").trim();
  const word = (body.word || "").trim();
  const reading = (body.reading || "").trim();
  const meaning = (body.meaning || "").trim();

  if (!term || !word) {
    setResponseStatus(event, 400);
    return { error: "Missing term or word." };
  }

  const db = getDb();
  const now = Date.now();
  const userId = user.role === "admin" ? null : user.id;
  const visibility = user.role === "admin" ? "shared" : "personal";

  db.prepare(
    "INSERT INTO compounds (userId, term, word, reading, meaning, source, visibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, term, word, reading, meaning, user.role === "admin" ? "admin" : "manual", visibility, now);

  return { ok: true };
});
