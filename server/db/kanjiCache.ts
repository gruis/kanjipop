import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_DIR = path.resolve("data/db");
const DB_PATH = path.join(DB_DIR, "kanji-cache.sqlite");

let db: Database.Database | null = null;

const ensureDb = () => {
  if (db) return db;

  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS kanji_details (
      term TEXT PRIMARY KEY,
      meaning TEXT,
      kunyomi TEXT,
      onyomi TEXT,
      jlptLevel TEXT,
      taughtIn TEXT,
      strokeCount INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS word_details (
      term TEXT PRIMARY KEY,
      reading TEXT,
      meaning TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      text TEXT NOT NULL,
      reading TEXT,
      source TEXT NOT NULL,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS compounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      word TEXT NOT NULL,
      reading TEXT,
      meaning TEXT,
      source TEXT NOT NULL,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      term TEXT NOT NULL,
      reading TEXT,
      meaning TEXT,
      levels TEXT,
      sources TEXT,
      exampleIds TEXT,
      createdAt INTEGER,
      updatedAt INTEGER,
      version INTEGER
    );

    CREATE TABLE IF NOT EXISTS review_states (
      cardId TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      difficulty REAL,
      stability REAL,
      retrievability REAL,
      elapsedDays REAL,
      scheduledDays REAL,
      learningSteps INTEGER,
      lastReview INTEGER,
      nextDue INTEGER,
      lapses INTEGER,
      reps INTEGER,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      reviewedAt INTEGER NOT NULL,
      grade TEXT NOT NULL,
      elapsed REAL,
      scheduled REAL
    );

    CREATE TABLE IF NOT EXISTS mnemonics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      source TEXT NOT NULL,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS deck_items (
      deckId TEXT NOT NULL,
      term TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt INTEGER,
      PRIMARY KEY (deckId, term, type)
    );
  `);

  return db;
};

export const getDb = () => ensureDb();
