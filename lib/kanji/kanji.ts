const KANJI_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

export const isKanji = (char: string) => KANJI_RE.test(char);

export const getKanjiChars = (term: string) => {
  return Array.from(term).filter((ch) => isKanji(ch));
};

export const kanjiToCodepointHex = (kanji: string) => {
  const cp = kanji.codePointAt(0);
  if (cp == null) return null;
  return cp.toString(16).padStart(5, "0");
};
