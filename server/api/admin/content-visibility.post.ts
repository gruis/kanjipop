import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

const tables: Record<string, string> = {
  examples: "examples",
  compounds: "compounds",
  mnemonics: "mnemonics",
};

export default defineEventHandler(async (event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }

  const body = (await readBody(event)) as { kind?: string; id?: number; visibility?: string };
  const kind = body?.kind || "";
  const id = Number(body?.id || 0);
  const visibility = body?.visibility || "shared";

  if (!tables[kind] || !id) {
    setResponseStatus(event, 400);
    return { error: "Invalid kind or id." };
  }

  if (!['shared', 'hidden', 'personal'].includes(visibility)) {
    setResponseStatus(event, 400);
    return { error: "Invalid visibility." };
  }

  const db = getDb();
  const table = tables[kind];
  db.prepare(`UPDATE ${table} SET visibility = ? WHERE id = ?`).run(visibility, id);

  return { ok: true };
});
