import jlpt from "~/data/kanji-lists/jlpt.json";
import grade from "~/data/kanji-lists/grade.json";

export interface LevelList {
  taxonomy: "jlpt" | "grade";
  levels: Array<{ id: string; kanji: string[] }>;
}

export const jlptLevels = jlpt as LevelList;
export const gradeLevels = grade as LevelList;

export const allLevelLists = [jlptLevels, gradeLevels];
