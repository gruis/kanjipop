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
  text: string;
  reading: string;
  source: string;
}

export interface KanjiCompound {
  word: string;
  reading: string;
  meaning: string;
  source: string;
}

export interface KanjiMnemonic {
  kind: string;
  text: string;
  source: string;
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

export const fetchKanjiExamples = async (term: string, refresh = false): Promise<KanjiExample[]> => {
  try {
    const res = await $fetch(`/api/kanji/examples?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}`) as { results?: KanjiExample[] };
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

export const fetchKanjiCompounds = async (term: string, refresh = false): Promise<KanjiCompound[]> => {
  try {
    const res = await $fetch(`/api/kanji/compounds?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}`) as { results?: KanjiCompound[] };
    return res?.results || [];
  } catch {
    return [];
  }
};

export const fetchKanjiMnemonics = async (term: string, refresh = false): Promise<KanjiMnemonic[]> => {
  try {
    const res = await $fetch(`/api/kanji/mnemonics?term=${encodeURIComponent(term)}${refresh ? "&refresh=1" : ""}`) as { results?: KanjiMnemonic[] };
    return res?.results || [];
  } catch {
    return [];
  }
};
