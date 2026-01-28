import { kanjiToCodepointHex } from "~/lib/kanji/kanji";

const BASE = "/kanjisvg";

export const getKanjiVgUrls = (kanji: string) => {
  const hex = kanjiToCodepointHex(kanji);
  if (!hex) return [];

  const fileNames = [`${hex}.svg`, `${hex}-Kaisho.svg`];
  return fileNames.map((file) => `${BASE}/${file}`);
};
