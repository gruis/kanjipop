import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_DIR = path.resolve("data/db");
const DB_PATH = path.join(DB_DIR, "kanji-cache.sqlite");

let db: Database.Database | null = null;

const hasColumn = (database: Database.Database, table: string, column: string) => {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
};

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
      userId TEXT,
      term TEXT NOT NULL,
      text TEXT NOT NULL,
      reading TEXT,
      source TEXT NOT NULL,
      visibility TEXT DEFAULT 'shared',
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS compounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      term TEXT NOT NULL,
      word TEXT NOT NULL,
      reading TEXT,
      meaning TEXT,
      source TEXT NOT NULL,
      visibility TEXT DEFAULT 'shared',
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
      userId TEXT NOT NULL,
      cardId TEXT NOT NULL,
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
      updatedAt INTEGER,
      PRIMARY KEY (userId, cardId)
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      reviewedAt INTEGER NOT NULL,
      grade TEXT NOT NULL,
      elapsed REAL,
      scheduled REAL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      passwordHash TEXT,
      pinHash TEXT,
      role TEXT NOT NULL,
      kind TEXT NOT NULL,
      displayName TEXT,
      disabled INTEGER DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      userId TEXT PRIMARY KEY,
      wanikaniToken TEXT,
      preferences TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS mnemonics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      term TEXT NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      source TEXT NOT NULL,
      visibility TEXT DEFAULT 'shared',
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
      userId TEXT,
      name TEXT NOT NULL,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS deck_items (
      deckId TEXT NOT NULL,
      userId TEXT,
      term TEXT NOT NULL,
      type TEXT NOT NULL,
      position INTEGER,
      createdAt INTEGER,
      PRIMARY KEY (deckId, term, type)
    );

    CREATE TABLE IF NOT EXISTS standard_deck_items (
      taxonomy TEXT NOT NULL,
      levelId TEXT NOT NULL,
      term TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (taxonomy, levelId, term)
    );
  `);

  if (!hasColumn(db, "review_states", "userId")) {
    db.exec(`
      DROP TABLE IF EXISTS review_states;
      DROP TABLE IF EXISTS review_logs;
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_states (
        userId TEXT NOT NULL,
        cardId TEXT NOT NULL,
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
        updatedAt INTEGER,
        PRIMARY KEY (userId, cardId)
      );

      CREATE TABLE IF NOT EXISTS review_logs (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        cardId TEXT NOT NULL,
        reviewedAt INTEGER NOT NULL,
        grade TEXT NOT NULL,
        elapsed REAL,
        scheduled REAL
      );
    `);
  }

  if (!hasColumn(db, "decks", "userId")) {
    db.exec(`
      ALTER TABLE decks ADD COLUMN userId TEXT;
    `);
  }

  if (!hasColumn(db, "decks", "entries")) {
    db.exec(`
      ALTER TABLE decks ADD COLUMN entries TEXT;
    `);
  }

  if (!hasColumn(db, "deck_items", "userId")) {
    db.exec(`
      ALTER TABLE deck_items ADD COLUMN userId TEXT;
    `);
  }

  if (!hasColumn(db, "deck_items", "position")) {
    db.exec(`
      ALTER TABLE deck_items ADD COLUMN position INTEGER;
    `);
  }

  if (!hasColumn(db, "examples", "userId")) {
    db.exec(`
      ALTER TABLE examples ADD COLUMN userId TEXT;
    `);
  }

  if (!hasColumn(db, "examples", "visibility")) {
    db.exec(`
      ALTER TABLE examples ADD COLUMN visibility TEXT DEFAULT 'shared';
    `);
  }

  if (!hasColumn(db, "compounds", "userId")) {
    db.exec(`
      ALTER TABLE compounds ADD COLUMN userId TEXT;
    `);
  }

  if (!hasColumn(db, "compounds", "visibility")) {
    db.exec(`
      ALTER TABLE compounds ADD COLUMN visibility TEXT DEFAULT 'shared';
    `);
  }

  if (!hasColumn(db, "mnemonics", "userId")) {
    db.exec(`
      ALTER TABLE mnemonics ADD COLUMN userId TEXT;
    `);
  }

  if (!hasColumn(db, "mnemonics", "visibility")) {
    db.exec(`
      ALTER TABLE mnemonics ADD COLUMN visibility TEXT DEFAULT 'shared';
    `);
  }

  return db;
};

export const getDb = () => ensureDb();
