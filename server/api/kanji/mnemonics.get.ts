import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

const WANIKANI_REVISION = "20170710";

const fetchWaniKani = async (token: string, term: string) => {
  const base = "https://api.wanikani.com/v2/subjects";
  const makeUrl = (param: string) => `${base}?types=kanji&${param}=${encodeURIComponent(term)}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Wanikani-Revision": WANIKANI_REVISION,
    Accept: "application/json",
    "User-Agent": "kanji-prompt (personal use)",
  } as const;

  const tryFetch = async (url: string) => {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as { data?: Array<{ data?: any }> };
  };

  const first = await tryFetch(makeUrl("slugs"));
  const data = first?.data && first.data.length ? first : await tryFetch(makeUrl("characters"));

  const subject = data?.data && data.data.length ? data.data[0]?.data : null;
  if (!subject) return [] as Array<{ kind: string; text: string }>;

  const results: Array<{ kind: string; text: string }> = [];
  if (subject.meaning_mnemonic) results.push({ kind: "meaning", text: subject.meaning_mnemonic });
  if (subject.reading_mnemonic) results.push({ kind: "reading", text: subject.reading_mnemonic });
  return results;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const term = typeof query.term === "string" ? query.term : "";
  const refresh = query.refresh === "1";

  if (!term) {
    setResponseStatus(event, 400);
    return { error: "Missing term." };
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT kind, text, source FROM mnemonics WHERE term = ? ORDER BY id ASC")
    .all(term) as Array<{ kind: string; text: string; source: string }>;

  if (rows.length && !refresh) {
    return { results: rows, cached: true };
  }

  const tokenRow = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("wanikani_token") as { value?: string } | undefined;
  const token = tokenRow?.value?.trim() || "";

  if (!token) {
    return { results: rows, cached: rows.length > 0, missingToken: true };
  }

  try {
    const mnemonics = await fetchWaniKani(token, term);
    const now = Date.now();

    const deleteStmt = db.prepare("DELETE FROM mnemonics WHERE term = ? AND source = ?");
    const insertStmt = db.prepare(
      "INSERT INTO mnemonics (term, kind, text, source, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const tx = db.transaction(() => {
      deleteStmt.run(term, "wanikani");
      for (const entry of mnemonics) {
        insertStmt.run(term, entry.kind, entry.text, "wanikani", now, now);
      }
    });

    tx();

    const merged = db
      .prepare("SELECT kind, text, source FROM mnemonics WHERE term = ? ORDER BY id ASC")
      .all(term) as Array<{ kind: string; text: string; source: string }>;

    return { results: merged, cached: false };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
