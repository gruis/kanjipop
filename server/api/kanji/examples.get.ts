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
    db.prepare("DELETE FROM examples WHERE term = ? AND source = 'jisho' AND userId IS NULL").run(term);
  }

  const visibilityClause = includeHidden ? "" : "AND visibility != 'hidden'";
  const existing = db
    .prepare(
      `SELECT id, text, reading, source, visibility, userId FROM examples
       WHERE term = ?
         ${visibilityClause}
         AND (userId IS NULL OR userId = ?)
       ORDER BY id ASC`
    )
    .all(term, user.id) as Array<{ id: number; text: string; reading: string; source: string; visibility: string; userId: string | null }>;

  if (existing.length > 0 && !refresh) {
    return { results: existing };
  }

  try {
    const ex = await jisho.searchForExamples(term);
    const results = (ex?.results || []).slice(0, 3).map((e) => ({
      text: e.kanji || "",
      reading: e.kana || "",
      source: "jisho",
    }));

    const now = Date.now();
    const insert = db.prepare(
      "INSERT INTO examples (term, text, reading, source, visibility, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof results) => {
      for (const row of rows) {
        insert.run(term, row.text, row.reading, row.source, "shared", now);
      }
    });

    insertMany(results);

    const allRows = db
      .prepare(
        `SELECT id, text, reading, source, visibility, userId FROM examples
         WHERE term = ?
           ${visibilityClause}
           AND (userId IS NULL OR userId = ?)
         ORDER BY id ASC`
      )
      .all(term, user.id) as Array<{ id: number; text: string; reading: string; source: string; visibility: string; userId: string | null }>;

    return { results: allRows };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
