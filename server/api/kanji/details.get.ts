import JishoAPI from "unofficial-jisho-api";
import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

const jisho = new JishoAPI();

const serializeArray = (arr: string[]) => JSON.stringify(arr || []);
const parseArray = (raw: string | null) => {
  if (!raw) return [] as string[];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

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
    .prepare("SELECT * FROM kanji_details WHERE term = ?")
    .get(term) as any;

  if (row && !refresh) {
    return {
      term: row.term,
      meaning: row.meaning || "",
      kunyomi: parseArray(row.kunyomi),
      onyomi: parseArray(row.onyomi),
      jlptLevel: row.jlptLevel || null,
      taughtIn: row.taughtIn || null,
      strokeCount: row.strokeCount ?? null,
      cached: true,
    };
  }

  try {
    const info = await jisho.searchForKanji(term);
    const payload = {
      term,
      meaning: info.meaning || "",
      kunyomi: serializeArray(info.kunyomi || []),
      onyomi: serializeArray(info.onyomi || []),
      jlptLevel: info.jlptLevel || null,
      taughtIn: info.taughtIn || null,
      strokeCount: info.strokeCount ?? null,
      updatedAt: Date.now(),
    };

    db.prepare(
      `INSERT INTO kanji_details (term, meaning, kunyomi, onyomi, jlptLevel, taughtIn, strokeCount, updatedAt)
       VALUES (@term, @meaning, @kunyomi, @onyomi, @jlptLevel, @taughtIn, @strokeCount, @updatedAt)
       ON CONFLICT(term) DO UPDATE SET
         meaning=excluded.meaning,
         kunyomi=excluded.kunyomi,
         onyomi=excluded.onyomi,
         jlptLevel=excluded.jlptLevel,
         taughtIn=excluded.taughtIn,
         strokeCount=excluded.strokeCount,
         updatedAt=excluded.updatedAt
      `
    ).run(payload);

    return {
      term,
      meaning: info.meaning || "",
      kunyomi: info.kunyomi || [],
      onyomi: info.onyomi || [],
      jlptLevel: info.jlptLevel || null,
      taughtIn: info.taughtIn || null,
      strokeCount: info.strokeCount ?? null,
      cached: false,
    };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
