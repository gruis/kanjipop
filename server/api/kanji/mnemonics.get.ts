import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const WANIKANI_REVISION = "20170710";

const fetchWaniKani = async (token: string, term: string, type: "kanji" | "vocabulary") => {
  const base = "https://api.wanikani.com/v2/subjects";
  const makeUrl = (param: string) =>
    `${base}?types=${type}&${param}=${encodeURIComponent(term)}`;

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
  const user = requireUser(event);
  const query = getQuery(event);
  const term = typeof query.term === "string" ? query.term : "";
  const refresh = query.refresh === "1";
  const includeHidden = query.includeHidden === "1" && user.role === "admin";
  const requestedType = query.type === "vocab" ? "vocabulary" : query.type === "kanji" ? "kanji" : null;

  if (!term) {
    setResponseStatus(event, 400);
    return { error: "Missing term." };
  }

  const db = getDb();
  const visibilityClause = includeHidden ? "" : "AND visibility != 'hidden'";
  const rows = db
    .prepare(
      `SELECT id, kind, text, source, visibility, userId FROM mnemonics
       WHERE term = ?
         ${visibilityClause}
         AND (userId IS NULL OR userId = ?)
       ORDER BY id ASC`
    )
    .all(term, user.id) as Array<{ id: number; kind: string; text: string; source: string; visibility: string; userId: string | null }>;

  if (rows.length && !refresh) {
    return { results: rows, cached: true };
  }

  const tokenRow = db
    .prepare("SELECT wanikaniToken FROM user_settings WHERE userId = ?")
    .get(user.id) as { wanikaniToken?: string } | undefined;
  const token = tokenRow?.wanikaniToken?.trim() || "";

  if (!token) {
    return { results: rows, cached: rows.length > 0, missingToken: true };
  }

  try {
    const isMultiChar = Array.from(term).length > 1;
    const typeOrder: Array<"kanji" | "vocabulary"> = requestedType
      ? [requestedType]
      : isMultiChar
        ? ["vocabulary", "kanji"]
        : ["kanji", "vocabulary"];

    let mnemonics: Array<{ kind: string; text: string }> = [];
    for (const type of typeOrder) {
      mnemonics = await fetchWaniKani(token, term, type);
      if (mnemonics.length > 0) break;
    }
    const now = Date.now();

    const deleteStmt = db.prepare("DELETE FROM mnemonics WHERE term = ? AND source = 'wanikani' AND userId = ?");
    const insertStmt = db.prepare(
      "INSERT INTO mnemonics (userId, term, kind, text, source, visibility, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    const tx = db.transaction(() => {
      deleteStmt.run(term, user.id);
      for (const entry of mnemonics) {
        insertStmt.run(user.id, term, entry.kind, entry.text, "wanikani", "personal", now, now);
      }
    });

    tx();

    const merged = db
      .prepare(
        `SELECT id, kind, text, source, visibility, userId FROM mnemonics
         WHERE term = ?
           ${visibilityClause}
           AND (userId IS NULL OR userId = ?)
         ORDER BY id ASC`
      )
      .all(term, user.id) as Array<{ id: number; kind: string; text: string; source: string; visibility: string; userId: string | null }>;

    return { results: merged, cached: false };
  } catch (err) {
    setResponseStatus(event, 502);
    return { error: String(err) };
  }
});
