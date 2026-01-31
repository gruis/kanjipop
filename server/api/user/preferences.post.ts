import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

type Taxonomy = "jlpt" | "grade" | "custom";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = (await readBody(event)) as {
    lastTaxonomy?: Taxonomy | null;
    lastLevel?: string | null;
    lastDeckId?: string | null;
  };

  const lastTaxonomy = body?.lastTaxonomy ?? null;
  const lastLevel = body?.lastLevel ?? null;
  const lastDeckId = body?.lastDeckId ?? null;
  const allowed = new Set<Taxonomy>(["jlpt", "grade", "custom"]);

  if (lastTaxonomy && !allowed.has(lastTaxonomy)) {
    setResponseStatus(event, 400);
    return { error: "Invalid taxonomy." };
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO user_preferences (userId, lastTaxonomy, lastLevel, lastDeckId, updatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
      lastTaxonomy=excluded.lastTaxonomy,
      lastLevel=excluded.lastLevel,
      lastDeckId=excluded.lastDeckId,
      updatedAt=excluded.updatedAt`
  ).run(user.id, lastTaxonomy, lastLevel, lastDeckId, now);

  return { ok: true };
});
