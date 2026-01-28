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
  const row = db
    .prepare("SELECT * FROM word_details WHERE term = ?")
    .get(term) as any;

  if (row && !refresh) {
    return {
      term: row.term,
      reading: row.reading || "",
      meaning: row.meaning || "",
      cached: true,
    };
  }

  try {
    const result = await jisho.searchForPhrase(term);
    const entry = result?.data?.[0];
    const jp = entry?.japanese?.[0] || {};
    const meaning = entry?.senses?.[0]?.english_definitions?.join("; ") || "";

    const payload = {
      term,
      reading: jp.reading || "",
      meaning,
      updatedAt: Date.now(),
    };

    db.prepare(
      `INSERT INTO word_details (term, reading, meaning, updatedAt)
       VALUES (@term, @reading, @meaning, @updatedAt)
       ON CONFLICT(term) DO UPDATE SET
         reading=excluded.reading,
         meaning=excluded.meaning,
         updatedAt=excluded.updatedAt
      `
    ).run(payload);

    return {
      term,
      reading: jp.reading || "",
      meaning,
      cached: false,
    };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
