import JishoAPI from "unofficial-jisho-api";
import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

const jisho = new JishoAPI();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const term = typeof query.term === "string" ? query.term : "";
  const refresh = query.refresh === "1";

  if (!term) {
    setResponseStatus(event, 400);
    return { error: "Missing term." };
  }

  const db = getDb();

  if (refresh) {
    db.prepare("DELETE FROM examples WHERE term = ? AND source = 'jisho'").run(term);
  }

  const existing = db
    .prepare("SELECT text, reading, source FROM examples WHERE term = ? ORDER BY id ASC")
    .all(term) as Array<{ text: string; reading: string; source: string }>;

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
      "INSERT INTO examples (term, text, reading, source, createdAt) VALUES (?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof results) => {
      for (const row of rows) {
        insert.run(term, row.text, row.reading, row.source, now);
      }
    });

    insertMany(results);

    const allRows = db
      .prepare("SELECT text, reading, source FROM examples WHERE term = ? ORDER BY id ASC")
      .all(term) as Array<{ text: string; reading: string; source: string }>;

    return { results: allRows };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
