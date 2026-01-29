import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const allowedKinds = new Set(["examples", "compounds", "mnemonics"]);

export default defineEventHandler((event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }

  const query = getQuery(event);
  const kind = typeof query.kind === "string" ? query.kind : "examples";
  const term = typeof query.term === "string" ? query.term.trim() : "";
  const visibility = typeof query.visibility === "string" ? query.visibility : "";
  const source = typeof query.source === "string" ? query.source : "";
  const limit = Math.min(Number(query.limit || 50), 200);
  const offset = Math.max(Number(query.offset || 0), 0);

  if (!allowedKinds.has(kind)) {
    return { items: [], total: 0 };
  }

  const table = kind;
  const filters: string[] = [];
  const params: any[] = [];

  if (term) {
    filters.push("term = ?");
    params.push(term);
  }
  if (visibility) {
    filters.push("visibility = ?");
    params.push(visibility);
  }
  if (source) {
    filters.push("source = ?");
    params.push(source);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const db = getDb();
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} ${whereClause}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM ${table} ${whereClause}
       ORDER BY createdAt DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return { items: rows, total: countRow?.count || 0 };
});
