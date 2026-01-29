import { allLevelLists } from "~/lib/data/kanjiLists";
import type { Card } from "~/lib/db/schema";
import { cardToRow } from "~/server/utils/cards";

const now = () => Date.now();
const makeCardId = (term: string) => `kanji:${term}`;

const buildKanjiCards = (): Card[] => {
  const levelTagByKanji = new Map<string, Set<string>>();

  for (const list of allLevelLists) {
    for (const level of list.levels) {
      const tag = `${list.taxonomy}:${level.id}`;
      for (const k of level.kanji) {
        if (!levelTagByKanji.has(k)) {
          levelTagByKanji.set(k, new Set());
        }
        levelTagByKanji.get(k)?.add(tag);
      }
    }
  }

  const cards: Card[] = [];
  for (const [kanji, tags] of levelTagByKanji.entries()) {
    cards.push({
      id: makeCardId(kanji),
      type: "kanji",
      term: kanji,
      reading: [],
      meaning: [],
      levels: Array.from(tags),
      sources: ["seed"],
      exampleIds: [],
      createdAt: now(),
      updatedAt: now(),
      version: 1,
    });
  }

  return cards;
};

export const seedCardsIfEmpty = (db: any) => {
  const row = db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number };
  if (row.count > 0) return row.count;
  const cards = buildKanjiCards();
  if (cards.length === 0) return 0;

  const insert = db.prepare(
    `INSERT INTO cards (id, type, term, reading, meaning, levels, sources, exampleIds, createdAt, updatedAt, version)
     VALUES (@id, @type, @term, @reading, @meaning, @levels, @sources, @exampleIds, @createdAt, @updatedAt, @version)`
  );

  const tx = db.transaction((rows: Card[]) => {
    for (const card of rows) {
      insert.run(cardToRow(card));
    }
  });

  tx(cards);
  return cards.length;
};
