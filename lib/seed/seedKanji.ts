import type { Card } from "~/lib/db/schema";
import { allLevelLists } from "~/lib/data/kanjiLists";

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

export const seedKanjiIfEmpty = async (db: { cards: { count: () => Promise<number>; bulkPut: (cards: Card[]) => Promise<void> } }) => {
  const count = await db.cards.count();
  if (count > 0) return;
  const cards = buildKanjiCards();
  if (cards.length === 0) return;
  await db.cards.bulkPut(cards);
};

export const getSeedStats = () => {
  return allLevelLists.map((list) => ({
    taxonomy: list.taxonomy,
    levels: list.levels.map((lvl) => ({
      id: lvl.id,
      count: lvl.kanji.length,
    })),
  }));
};
