import { allLevelLists } from "~/lib/data/kanjiLists";

export const getDefaultStandardDeck = (taxonomy: "jlpt" | "grade", levelId: string) => {
  const list = allLevelLists.find((lvl) => lvl.taxonomy === taxonomy);
  const level = list?.levels.find((lvl) => String(lvl.id) === String(levelId));
  return level?.kanji || [];
};

export const getOrderedStandardDeck = (
  db: any,
  taxonomy: "jlpt" | "grade",
  levelId: string
): { kanji: string[]; source: "default" | "override" } => {
  const rows = db
    .prepare("SELECT term FROM standard_deck_items WHERE taxonomy = ? AND levelId = ? ORDER BY position ASC")
    .all(taxonomy, levelId) as Array<{ term: string }>;
  if (rows.length > 0) {
    return { kanji: rows.map((row) => row.term), source: "override" };
  }
  return { kanji: getDefaultStandardDeck(taxonomy, levelId), source: "default" };
};

export const listStandardDecks = (db: any, taxonomy?: "jlpt" | "grade") => {
  const lists = taxonomy ? allLevelLists.filter((lvl) => lvl.taxonomy === taxonomy) : allLevelLists;
  return lists.map((list) => ({
    taxonomy: list.taxonomy,
    levels: list.levels.map((level) => {
      const ordered = getOrderedStandardDeck(db, list.taxonomy, String(level.id));
      return {
        id: String(level.id),
        kanji: ordered.kanji,
        source: ordered.source,
      };
    }),
  }));
};
