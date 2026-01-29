import { getRouterParam, readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }

  const id = getRouterParam(event, "id") || "";
  const body = (await readBody(event)) as { disabled?: boolean };

  if (!id) {
    setResponseStatus(event, 400);
    return { error: "Missing id." };
  }

  const disabled = body?.disabled ? 1 : 0;
  const db = getDb();
  db.prepare("UPDATE users SET disabled = ?, updatedAt = ? WHERE id = ?").run(disabled, Date.now(), id);

  return { ok: true };
});
