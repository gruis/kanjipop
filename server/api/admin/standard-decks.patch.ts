import { getQuery, readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";
import { getDefaultStandardDeck } from "~/server/utils/standardDecks";

const splitTerms = (input: string) => {
  return input
    .split(/\s|,|、|\n|\r/)
    .map((t) => t.trim())
    .filter(Boolean);
};

const isKanji = (char: string) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(char);

const normalizeEntries = (entries: string) => {
  const terms = splitTerms(entries);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const term of terms) {
    const chars = Array.from(term).filter(isKanji);
    for (const ch of chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        ordered.push(ch);
      }
    }
  }
  return ordered;
};

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  if (user.role !== "admin") {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  const query = getQuery(event);
  const taxonomy = typeof query.taxonomy === "string" ? query.taxonomy : "";
  const level = typeof query.level === "string" ? query.level : "";
  if ((taxonomy !== "jlpt" && taxonomy !== "grade") || !level) {
    setResponseStatus(event, 400);
    return { error: "Missing taxonomy or level." };
  }

  const body = (await readBody(event)) as { entries?: string };
  const entries = body?.entries?.trim() || "";
  if (!entries) {
    setResponseStatus(event, 400);
    return { error: "Entries are required." };
  }

  const ordered = normalizeEntries(entries);
  if (ordered.length === 0) {
    setResponseStatus(event, 400);
    return { error: "No kanji found in entries." };
  }

  const defaultSet = new Set(getDefaultStandardDeck(taxonomy, level));
  const invalid = ordered.find((term) => !defaultSet.has(term));
  if (invalid) {
    setResponseStatus(event, 400);
    return { error: `Invalid kanji for this level: ${invalid}` };
  }
  if (ordered.length !== defaultSet.size) {
    setResponseStatus(event, 400);
    return { error: "Entries must include every kanji from the default list." };
  }

  const db = getDb();
  const deleteRows = db.prepare("DELETE FROM standard_deck_items WHERE taxonomy = ? AND levelId = ?");
  const insertRow = db.prepare(
    "INSERT OR REPLACE INTO standard_deck_items (taxonomy, levelId, term, position) VALUES (?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    deleteRows.run(taxonomy, level);
    ordered.forEach((term, index) => {
      insertRow.run(taxonomy, level, term, index);
    });
  });
  tx();

  return { ok: true, count: ordered.length };
});
