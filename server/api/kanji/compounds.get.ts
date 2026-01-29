import JishoAPI from "unofficial-jisho-api";
import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const jisho = new JishoAPI();

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const query = getQuery(event);
  const term = typeof query.term === "string" ? query.term : "";
  const refresh = query.refresh === "1";
  const includeHidden = query.includeHidden === "1" && user.role === "admin";

  if (!term) {
    setResponseStatus(event, 400);
    return { error: "Missing term." };
  }

  const db = getDb();

  if (refresh) {
    db.prepare("DELETE FROM compounds WHERE term = ? AND source = 'jisho' AND userId IS NULL").run(term);
  }

  const visibilityClause = includeHidden ? "" : "AND visibility != 'hidden'";
  const existing = db
    .prepare(
      `SELECT id, word, reading, meaning, source, visibility, userId FROM compounds
       WHERE term = ?
         ${visibilityClause}
         AND (userId IS NULL OR userId = ?)
       ORDER BY id ASC`
    )
    .all(term, user.id) as Array<{ id: number; word: string; reading: string; meaning: string; source: string; visibility: string; userId: string | null }>;

  if (existing.length > 0 && !refresh) {
    return { results: existing };
  }

  try {
    const result = await jisho.searchForPhrase(term);
    const data = (result?.data || []).slice(0, 5).map((entry) => {
      const jp = entry.japanese?.[0] || {};
      const meaning = entry.senses?.[0]?.english_definitions?.join("; ") || "";
      return {
        word: jp.word || "",
        reading: jp.reading || "",
        meaning,
        source: "jisho",
      };
    });

    const now = Date.now();
    const insert = db.prepare(
      "INSERT INTO compounds (term, word, reading, meaning, source, visibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof data) => {
      for (const row of rows) {
        insert.run(term, row.word, row.reading, row.meaning, row.source, "shared", now);
      }
    });

    insertMany(data);

    const allRows = db
      .prepare(
        `SELECT id, word, reading, meaning, source, visibility, userId FROM compounds
         WHERE term = ?
           ${visibilityClause}
           AND (userId IS NULL OR userId = ?)
         ORDER BY id ASC`
      )
      .all(term, user.id) as Array<{ id: number; word: string; reading: string; meaning: string; source: string; visibility: string; userId: string | null }>;

    return { results: allRows };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
