import Dexie, { type Table } from "dexie";
import type { Card, DeckView, Example, ReviewLog, ReviewState } from "./schema";

export class KanjiDb extends Dexie {
  cards!: Table<Card, string>;
  reviewStates!: Table<ReviewState, string>;
  reviewLogs!: Table<ReviewLog, string>;
  examples!: Table<Example, string>;
  deckViews!: Table<DeckView, string>;

  constructor() {
    super("kanji-srs-db");
    this.version(1).stores({
      cards: "id, type, term, updatedAt",
      reviewStates: "cardId, nextDue, updatedAt",
      reviewLogs: "id, cardId, reviewedAt",
      examples: "id, cardId, updatedAt",
      deckViews: "id, name, updatedAt",
    });

    this.version(2).stores({
      cards: "id, type, term, updatedAt",
      reviewStates: "cardId, nextDue, updatedAt",
      reviewLogs: "id, cardId, reviewedAt",
      examples: "id, cardId, updatedAt",
      deckViews: "id, name, updatedAt",
    });
  }
}

export const createDb = () => new KanjiDb();
