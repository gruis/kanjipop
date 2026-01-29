import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { cardToRow } from "~/server/utils/cards";
import { requireUser } from "~/server/utils/auth";

const splitTerms = (input: string) => {
  return input
    .split(/\s|,|、|\n|\r/)
    .map((t) => t.trim())
    .filter(Boolean);
};

const isKanji = (char: string) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(char);

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const body = (await readBody(event)) as {
    name?: string;
    entries?: string;
  };

  const name = body?.name?.trim();
  const entries = body?.entries || "";

  if (!name || !entries.trim()) {
    setResponseStatus(event, 400);
    return { error: "Missing name or entries." };
  }

  const terms = splitTerms(entries);
  const deckId = globalThis.crypto?.randomUUID?.() || `deck_${Date.now()}`;
  const now = Date.now();

  const items = new Map<string, "kanji" | "vocab">();
  const orderedItems: Array<{ term: string; type: "kanji" | "vocab" }> = [];

  for (const term of terms) {
    const chars = Array.from(term).filter(isKanji);
    if (chars.length === 0) continue;

    if (term.length > 1) {
      if (!items.has(term)) {
        items.set(term, "vocab");
        orderedItems.push({ term, type: "vocab" });
      }
      for (const ch of chars) {
        if (!items.has(ch)) {
          items.set(ch, "kanji");
          orderedItems.push({ term: ch, type: "kanji" });
        }
      }
    } else {
      if (!items.has(term)) {
        items.set(term, "kanji");
        orderedItems.push({ term, type: "kanji" });
      }
    }
  }

  const db = getDb();
  const insertDeck = db.prepare("INSERT INTO decks (id, userId, name, createdAt, entries) VALUES (?, ?, ?, ?, ?)");
  const insertItem = db.prepare(
    "INSERT OR IGNORE INTO deck_items (deckId, userId, term, type, position, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertCard = db.prepare(
    `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
     VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
  );

  const tx = db.transaction(() => {
    const ownerId = user.role === "admin" ? null : user.id;
    insertDeck.run(deckId, ownerId, name, now, entries);
    orderedItems.forEach((item, index) => {
      insertItem.run(deckId, ownerId, item.term, item.type, index, now);
      const cardId = `${item.type}:${item.term}`;
      insertCard.run(
        cardToRow({
          id: cardId,
          type: item.type,
          term: item.term,
          reading: [],
          meaning: [],
          levels: [],
          sources: ["custom"],
          exampleIds: [],
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
      );
    });
  });

  tx();

  return { id: deckId, count: orderedItems.length };
});
