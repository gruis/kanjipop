import { getRouterParam, readBody, setResponseStatus } from "h3";
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
  const id = getRouterParam(event, "id") || "";
  const body = (await readBody(event)) as { name?: string; entries?: string };

  const name = body?.name?.trim() || "";
  const entries = body?.entries?.trim() || "";

  if (!name && !entries) {
    setResponseStatus(event, 400);
    return { error: "No updates provided." };
  }

  const db = getDb();
  const deck = db
    .prepare("SELECT id, userId, name FROM decks WHERE id = ?")
    .get(id) as { id: string; userId: string | null; name: string } | undefined;

  if (!deck) {
    setResponseStatus(event, 404);
    return { error: "Deck not found." };
  }

  const isAdmin = user.role === "admin";
  const isOwner = deck.userId && deck.userId === user.id;
  const isShared = deck.userId === null;
  if (!(isOwner || (isAdmin && isShared))) {
    setResponseStatus(event, 403);
    return { error: "Not allowed." };
  }

  const now = Date.now();
  const updateDeck = db.prepare("UPDATE decks SET name = ?, entries = ? WHERE id = ?");
  const deleteItems = db.prepare("DELETE FROM deck_items WHERE deckId = ?");
  const insertItem = db.prepare(
    "INSERT OR IGNORE INTO deck_items (deckId, userId, term, type, position, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertCard = db.prepare(
    `INSERT OR IGNORE INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
     VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
  );

  const tx = db.transaction(() => {
    if (name || entries) updateDeck.run(name || deck.name, entries || null, id);
    if (entries) {
      const terms = splitTerms(entries);
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
      deleteItems.run(id);
      const ownerId = deck.userId ?? null;
      orderedItems.forEach((item, index) => {
        insertItem.run(id, ownerId, item.term, item.type, index, now);
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
      return { count: orderedItems.length };
    }
    return { count: null };
  });

  const result = tx();
  return { ok: true, updated: !!name, count: result.count };
});
