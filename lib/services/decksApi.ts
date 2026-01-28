export interface DeckSummary {
  id: string;
  name: string;
  createdAt: number;
}

export interface DeckItem {
  term: string;
  type: "kanji" | "vocab";
}

export const fetchDecks = async (): Promise<DeckSummary[]> => {
  const res = await $fetch<{ decks: DeckSummary[] }>("/api/decks");
  return res.decks || [];
};

export const createDeck = async (name: string, entries: string) => {
  return await $fetch<{ id: string; count: number }>("/api/decks", {
    method: "POST",
    body: { name, entries },
  });
};

export const fetchDeckItems = async (id: string): Promise<DeckItem[]> => {
  const res = await $fetch<{ items: DeckItem[] }>(`/api/decks/${encodeURIComponent(id)}`);
  return res.items || [];
};
