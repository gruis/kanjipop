export type CardType = "kanji" | "vocab" | "custom";

export interface Card {
  id: string;
  type: CardType;
  term: string;
  reading: string[];
  meaning: string[];
  levels: string[];
  sources: string[];
  exampleIds: string[];
  readingHints?: {
    kunyomi: string[];
    onyomi: string[];
  };
  kanjiMeta?: {
    strokeCount: number | null;
    jlptLevel: string | null;
    taughtIn: string | null;
  };
  compounds?: Array<{ word: string; reading: string; meaning: string }>;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ReviewState {
  cardId: string;
  state: "new" | "learning" | "review" | "relearn";
  difficulty: number;
  stability: number;
  retrievability: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  lastReview: number | null;
  nextDue: number | null;
  lapses: number;
  reps: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  reviewedAt: number;
  grade: "again" | "hard" | "good" | "easy";
  elapsed: number;
  scheduled: number;
}

export interface Example {
  id: string;
  cardId: string;
  text: string;
  reading?: string;
  source: "jisho" | "wanikani" | "manual";
  createdAt: number;
  updatedAt: number;
}

export interface DeckView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
