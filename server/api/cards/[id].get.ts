import { getRouterParam, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { seedCardsIfEmpty } from "~/server/seed/seedCards";
import { buildCard, cardToRow, rowToCard } from "~/server/utils/cards";

export default defineEventHandler((event) => {
  const rawId = getRouterParam(event, "id") || "";
  const id = decodeURIComponent(rawId);
  const db = getDb();
  seedCardsIfEmpty(db);

  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id);
  if (!row) {
    const [prefix, term] = id.split(":");
    if (!term || !["kanji", "vocab", "custom"].includes(prefix)) {
      setResponseStatus(event, 404);
      return { error: "Card not found." };
    }
    const now = Date.now();
    const card = buildCard(id, prefix as "kanji" | "vocab" | "custom", term, now);
    db.prepare(
      `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
       VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
    ).run(cardToRow(card));
    return { card };
  }

  return { card: rowToCard(row) };
});
