import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { listStandardDecks } from "~/server/utils/standardDecks";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requireUser(event);
  const query = getQuery(event);
  const taxonomy = typeof query.taxonomy === "string" ? query.taxonomy : "";
  const db = getDb();
  if (taxonomy === "jlpt" || taxonomy === "grade") {
    return { lists: listStandardDecks(db, taxonomy) };
  }
  return { lists: listStandardDecks(db) };
});
