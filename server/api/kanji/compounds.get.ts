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
    db.prepare("DELETE FROM compounds WHERE term = ? AND source = 'jisho'").run(term);
  }

  const existing = db
    .prepare("SELECT word, reading, meaning, source FROM compounds WHERE term = ? ORDER BY id ASC")
    .all(term) as Array<{ word: string; reading: string; meaning: string; source: string }>;

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
      "INSERT INTO compounds (term, word, reading, meaning, source, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof data) => {
      for (const row of rows) {
        insert.run(term, row.word, row.reading, row.meaning, row.source, now);
      }
    });

    insertMany(data);

    const allRows = db
      .prepare("SELECT word, reading, meaning, source FROM compounds WHERE term = ? ORDER BY id ASC")
      .all(term) as Array<{ word: string; reading: string; meaning: string; source: string }>;

    return { results: allRows };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
