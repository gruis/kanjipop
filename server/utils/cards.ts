import type { Card } from "~/lib/db/schema";

export const serializeArray = (arr: string[]) => JSON.stringify(arr || []);

export const parseArray = (raw: string | null | undefined) => {
  if (!raw) return [] as string[];
  try {
    return JSON.parse(raw);
  } catch {
    return [] as string[];
  }
};

export const rowToCard = (row: any): Card => ({
  id: row.id,
  type: row.type,
  term: row.term,
  reading: parseArray(row.reading),
  meaning: parseArray(row.meaning),
  levels: parseArray(row.levels),
  sources: parseArray(row.sources),
  exampleIds: parseArray(row.exampleIds),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  version: row.version,
});

export const cardToRow = (card: Card) => ({
  id: card.id,
  type: card.type,
  term: card.term,
  reading: serializeArray(card.reading || []),
  meaning: serializeArray(card.meaning || []),
  levels: serializeArray(card.levels || []),
  sources: serializeArray(card.sources || []),
  exampleIds: serializeArray(card.exampleIds || []),
  createdAt: card.createdAt,
  updatedAt: card.updatedAt,
  version: card.version,
});

export const buildCard = (id: string, type: Card["type"], term: string, now: number): Card => ({
  id,
  type,
  term,
  reading: [],
  meaning: [],
  levels: [],
  sources: [type === "custom" ? "custom" : "manual"],
  exampleIds: [],
  createdAt: now,
  updatedAt: now,
  version: 1,
});
