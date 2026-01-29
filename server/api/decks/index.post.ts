import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { cardToRow } from "~/server/utils/cards";

const splitTerms = (input: string) => {
  return input
    .split(/\s|,|、|\n|\r/)
    .map((t) => t.trim())
    .filter(Boolean);
};

const isKanji = (char: string) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(char);

export default defineEventHandler(async (event) => {
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

  for (const term of terms) {
    const chars = Array.from(term).filter(isKanji);
    if (chars.length === 0) continue;

    if (term.length > 1) {
      items.set(term, "vocab");
      for (const ch of chars) items.set(ch, "kanji");
    } else {
      items.set(term, "kanji");
    }
  }

  const db = getDb();
  const insertDeck = db.prepare("INSERT INTO decks (id, name, createdAt) VALUES (?, ?, ?)");
  const insertItem = db.prepare(
    "INSERT OR IGNORE INTO deck_items (deckId, term, type, createdAt) VALUES (?, ?, ?, ?)"
  );
  const insertCard = db.prepare(
    `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
     VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
  );

  const tx = db.transaction(() => {
    insertDeck.run(deckId, name, now);
    for (const [term, type] of items.entries()) {
      insertItem.run(deckId, term, type, now);
      const cardId = `${type}:${term}`;
      insertCard.run(
        cardToRow({
          id: cardId,
          type,
          term,
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
    }
  });

  tx();

  return { id: deckId, count: items.size };
});
