import { setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";

export default defineEventHandler(() => {
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    return { ok: true, ts: Date.now() };
  } catch (error) {
    console.error("[nitro] /api/healthz failed", error);
    setResponseStatus(500);
    return { ok: false, ts: Date.now() };
  }
});
