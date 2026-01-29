export interface KanjiDetails {
  term: string;
  meaning: string;
  kunyomi: string[];
  onyomi: string[];
  jlptLevel: string | null;
  taughtIn: string | null;
  strokeCount: number | null;
}

export interface WordDetails {
  term: string;
  reading: string;
  meaning: string;
}

export interface KanjiExample {
  id: number;
  text: string;
  reading: string;
  source: string;
  visibility?: string;
  userId?: string | null;
}

export interface KanjiCompound {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  source: string;
  visibility?: string;
  userId?: string | null;
}

export interface KanjiMnemonic {
  id: number;
  kind: string;
  text: string;
  source: string;
  visibility?: string;
  userId?: string | null;
}

export const fetchKanjiDetails = async (term: string, refresh = false): Promise<KanjiDetails | null> => {
  try {
    return await $fetch(`/api/kanji/details?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}`);
  } catch {
    return null;
  }
};

export const fetchWordDetails = async (term: string, refresh = false): Promise<WordDetails | null> => {
  try {
    return await $fetch(`/api/word/details?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}`);
  } catch {
    return null;
  }
};

export const fetchKanjiExamples = async (
  term: string,
  refresh = false,
  includeHidden = false
): Promise<KanjiExample[]> => {
  try {
    const hiddenParam = includeHidden ? "&includeHidden=1" : "";
    const res = await $fetch(`/api/kanji/examples?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}${hiddenParam}`) as { results?: KanjiExample[] };
    return res?.results || [];
  } catch {
    return [];
  }
};

export const addManualExample = async (term: string, text: string, reading = "") => {
  await $fetch(`/api/kanji/examples`, {
    method: "POST",
    body: { term, text, reading },
  });
};

export const addManualCompound = async (
  term: string,
  word: string,
  reading = "",
  meaning = ""
) => {
  await $fetch(`/api/kanji/compounds`, {
    method: "POST",
    body: { term, word, reading, meaning },
  });
};

export const addManualMnemonic = async (term: string, kind: string, text: string) => {
  await $fetch(`/api/kanji/mnemonics`, {
    method: "POST",
    body: { term, kind, text },
  });
};

export const fetchKanjiCompounds = async (
  term: string,
  refresh = false,
  includeHidden = false
): Promise<KanjiCompound[]> => {
  try {
    const hiddenParam = includeHidden ? "&includeHidden=1" : "";
    const res = await $fetch(`/api/kanji/compounds?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}${hiddenParam}`) as { results?: KanjiCompound[] };
    return res?.results || [];
  } catch {
    return [];
  }
};

export const fetchKanjiMnemonics = async (
  term: string,
  refresh = false,
  type?: "kanji" | "vocab",
  includeHidden = false
): Promise<KanjiMnemonic[]> => {
  try {
    const typeParam = type ? `&type=${type}` : "";
    const hiddenParam = includeHidden ? "&includeHidden=1" : "";
    const res = await $fetch(
      `/api/kanji/mnemonics?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}${typeParam}${hiddenParam}`
    ) as { results?: KanjiMnemonic[] };
    return res?.results || [];
  } catch {
    return [];
  }
};
