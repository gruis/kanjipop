import { allLevelLists } from "~/lib/data/kanjiLists";

export interface LevelMetaEntry {
  taxonomy: "jlpt" | "grade";
  id: string;
  kanji: string[];
}

export const flattenLevels = (): LevelMetaEntry[] => {
  const entries: LevelMetaEntry[] = [];
  for (const list of allLevelLists) {
    for (const level of list.levels) {
      entries.push({
        taxonomy: list.taxonomy,
        id: level.id,
        kanji: level.kanji,
      });
    }
  }
  return entries;
};

const gradeLabelMap: Record<string, string> = {
  "1": "一年生",
  "2": "二年生",
  "3": "三年生",
  "4": "四年生",
  "5": "五年生",
  "6": "六年生",
};

export const formatLevelLabel = (taxonomy: LevelMetaEntry["taxonomy"], id: string) => {
  if (taxonomy === "grade") return gradeLabelMap[id] || `${id}年生`;
  return id;
};
