import { getQuery } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    return { error: "Forbidden." };
  }

  const query = getQuery(event);
  const jobId = typeof query.id === "string" ? query.id : "";
  const db = getDb();

  const row = jobId
    ? db.prepare("SELECT * FROM prefetch_jobs WHERE id = ?").get(jobId)
    : db.prepare("SELECT * FROM prefetch_jobs ORDER BY createdAt DESC LIMIT 1").get();

  if (!row) return { job: null };

  return {
    job: {
      id: row.id,
      status: row.status,
      scope: row.scope,
      total: row.total,
      processed: row.processed,
      failed: row.failed,
      error: row.error || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
});
