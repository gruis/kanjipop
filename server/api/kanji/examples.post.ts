import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    term?: string;
    text?: string;
    reading?: string;
  };

  const term = body?.term?.trim();
  const text = body?.text?.trim();
  const reading = body?.reading?.trim() || "";

  if (!term || !text) {
    setResponseStatus(event, 400);
    return { error: "Missing term or text." };
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    "INSERT INTO examples (term, text, reading, source, createdAt) VALUES (?, ?, ?, 'manual', ?)"
  ).run(term, text, reading, now);

  return { ok: true };
});
