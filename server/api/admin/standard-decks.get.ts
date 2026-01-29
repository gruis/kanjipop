import { getQuery, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";
import { getDefaultStandardDeck, getOrderedStandardDeck } from "~/server/utils/standardDecks";

export default defineEventHandler((event) => {
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

  const db = getDb();
  const ordered = getOrderedStandardDeck(db, taxonomy, level);
  const defaultKanji = getDefaultStandardDeck(taxonomy, level);

  return {
    taxonomy,
    levelId: level,
    current: ordered.kanji,
    default: defaultKanji,
    source: ordered.source,
  };
});
