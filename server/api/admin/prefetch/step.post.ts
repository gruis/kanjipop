import JishoAPI from "unofficial-jisho-api";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const jisho = new JishoAPI();

type PrefetchItem = { type: "kanji" | "vocab"; term: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureKanjiDetails = async (db: any, term: string) => {
  const row = db.prepare("SELECT term FROM kanji_details WHERE term = ?").get(term);
  if (row) return;
  const info = await jisho.searchForKanji(term);
  db.prepare(
    `INSERT INTO kanji_details (term, meaning, kunyomi, onyomi, jlptLevel, taughtIn, strokeCount, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(term) DO UPDATE SET
       meaning=excluded.meaning,
       kunyomi=excluded.kunyomi,
       onyomi=excluded.onyomi,
       jlptLevel=excluded.jlptLevel,
       taughtIn=excluded.taughtIn,
       strokeCount=excluded.strokeCount,
       updatedAt=excluded.updatedAt`
  ).run(
    term,
    info.meaning || "",
    JSON.stringify(info.kunyomi || []),
    JSON.stringify(info.onyomi || []),
    info.jlptLevel || null,
    info.taughtIn || null,
    info.strokeCount ?? null,
    Date.now()
  );
};

const ensureWordDetails = async (db: any, term: string) => {
  const row = db.prepare("SELECT term FROM word_details WHERE term = ?").get(term);
  if (row) return;
  const result = await jisho.searchForPhrase(term);
  const entry = result?.data?.[0];
  if (!entry) return;
  const reading = entry.japanese?.[0]?.reading || "";
  const meaning = entry.senses?.[0]?.english_definitions?.join("; ") || "";
  db.prepare(
    `INSERT INTO word_details (term, reading, meaning, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(term) DO UPDATE SET
       reading=excluded.reading,
       meaning=excluded.meaning,
       updatedAt=excluded.updatedAt`
  ).run(term, reading, meaning, Date.now());
};

const ensureExamples = async (db: any, term: string) => {
  const existing = db
    .prepare("SELECT id FROM examples WHERE term = ? AND source = 'jisho' AND userId IS NULL")
    .get(term);
  if (existing) return;
  const ex = await jisho.searchForExamples(term);
  const now = Date.now();
  for (const e of ex?.data || []) {
    db.prepare(
      "INSERT INTO examples (userId, term, text, reading, source, visibility, createdAt) VALUES (NULL, ?, ?, ?, 'jisho', 'shared', ?)"
    ).run(term, e.kanji || "", e.kana || "", now);
  }
};

const ensureCompounds = async (db: any, term: string) => {
  const existing = db
    .prepare("SELECT id FROM compounds WHERE term = ? AND source = 'jisho' AND userId IS NULL")
    .get(term);
  if (existing) return;
  const result = await jisho.searchForPhrase(term);
  const now = Date.now();
  for (const item of result?.data || []) {
    const word = item?.japanese?.[0]?.word || item?.japanese?.[0]?.reading || "";
    const reading = item?.japanese?.[0]?.reading || "";
    const meaning = item?.senses?.[0]?.english_definitions?.join("; ") || "";
    if (!word) continue;
    db.prepare(
      "INSERT INTO compounds (userId, term, word, reading, meaning, source, visibility, createdAt) VALUES (NULL, ?, ?, ?, ?, 'jisho', 'shared', ?)"
    ).run(term, word, reading, meaning, now);
  }
};

export default defineEventHandler(async (event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    return { error: "Forbidden." };
  }

  const body = await readBody(event);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  const batchSize = Math.min(Math.max(Number(body?.batchSize || 10), 1), 50);
  const delayMs = Math.min(Math.max(Number(body?.delayMs || 300), 0), 5000);
  const includeExamples = body?.includeExamples !== false;
  const includeCompounds = body?.includeCompounds !== false;

  if (!jobId) return { error: "Missing jobId." };

  const db = getDb();
  const job = db.prepare("SELECT * FROM prefetch_jobs WHERE id = ?").get(jobId) as any;
  if (!job) return { error: "Job not found." };

  let remaining: PrefetchItem[] = [];
  try {
    remaining = JSON.parse(job.remaining || "[]");
  } catch {
    remaining = [];
  }

  if (remaining.length === 0) {
    db.prepare("UPDATE prefetch_jobs SET status = 'done', updatedAt = ? WHERE id = ?").run(Date.now(), jobId);
    return { jobId, status: "done", processed: job.processed, failed: job.failed, remaining: 0 };
  }

  const now = Date.now();
  db.prepare("UPDATE prefetch_jobs SET status = 'running', updatedAt = ? WHERE id = ?").run(now, jobId);

  let processed = job.processed || 0;
  let failed = job.failed || 0;
  const batch = remaining.slice(0, batchSize);
  remaining = remaining.slice(batchSize);

  for (const item of batch) {
    try {
      if (item.type === "kanji") {
        await ensureKanjiDetails(db, item.term);
        if (includeExamples) await ensureExamples(db, item.term);
        if (includeCompounds) await ensureCompounds(db, item.term);
      } else if (item.type === "vocab") {
        await ensureWordDetails(db, item.term);
      }
    } catch (err) {
      failed += 1;
    } finally {
      processed += 1;
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  const updatedAt = Date.now();
  const status = remaining.length === 0 ? "done" : "running";
  db.prepare(
    "UPDATE prefetch_jobs SET status = ?, processed = ?, failed = ?, remaining = ?, updatedAt = ? WHERE id = ?"
  ).run(status, processed, failed, JSON.stringify(remaining), updatedAt, jobId);

  return { jobId, status, processed, failed, remaining: remaining.length };
});
