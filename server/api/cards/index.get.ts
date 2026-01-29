import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { rowToCard, parseArray } from "~/server/utils/cards";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const type = typeof query.type === "string" ? query.type : "";
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const searchLower = search.toLowerCase();

  const db = getDb();
  seedCardsIfEmpty(db);

  const rows = type
    ? db.prepare("SELECT * FROM cards WHERE type = ? ORDER BY term ASC").all(type)
    : db.prepare("SELECT * FROM cards ORDER BY term ASC").all();

  let cards = rows.map(rowToCard);

  const kanjiStmt = db.prepare("SELECT meaning, kunyomi, onyomi FROM kanji_details WHERE term = ?");
  const wordStmt = db.prepare("SELECT reading, meaning FROM word_details WHERE term = ?");

  cards = cards.map((card) => {
    if (card.type === "kanji") {
      const row = kanjiStmt.get(card.term) as any;
      if (row) {
        const kunyomi = parseArray(row.kunyomi);
        const onyomi = parseArray(row.onyomi);
        const reading: string[] = [];
        if (kunyomi.length) reading.push(`訓: ${kunyomi.join(" / ")}`);
        if (onyomi.length) reading.push(`音: ${onyomi.join(" / ")}`);
        const meaning = (row.meaning || "")
          .split(/,\s*/g)
          .map((m: string) => m.trim())
          .filter(Boolean);
        return { ...card, reading, meaning };
      }
    } else if (card.type === "vocab") {
      const row = wordStmt.get(card.term) as any;
      if (row) {
        const reading = row.reading ? [`読み: ${row.reading}`] : [];
        const meaning = (row.meaning || "")
          .split(/,\s*/g)
          .map((m: string) => m.trim())
          .filter(Boolean);
        return { ...card, reading, meaning };
      }
    }
    return card;
  });

  if (search) {
    cards = cards.filter((card) => {
      if (card.term.includes(search)) return true;
      const reading = (card.reading || []).join(" ").toLowerCase();
      const meaning = (card.meaning || []).join(" ").toLowerCase();
      return reading.includes(searchLower) || meaning.includes(searchLower);
    });
  }

  return { cards };
});
