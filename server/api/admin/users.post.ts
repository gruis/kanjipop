import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { hashSecret, requireUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const admin = requireUser(event);
  if (admin.role !== "admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }

  const body = (await readBody(event)) as {
    kind?: "adult" | "kid";
    email?: string;
    password?: string;
    pin?: string;
    displayName?: string;
  };

  const kind = body?.kind;
  if (!kind) {
    setResponseStatus(event, 400);
    return { error: "Missing kind." };
  }

  const db = getDb();
  const now = Date.now();
  const id = globalThis.crypto?.randomUUID?.() || `user_${now}`;

  if (kind === "adult") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      setResponseStatus(event, 400);
      return { error: "Missing email or password." };
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      setResponseStatus(event, 409);
      return { error: "Email already exists." };
    }

    const passwordHash = hashSecret(password);
    db.prepare(
      `INSERT INTO users (id, email, passwordHash, role, kind, displayName, disabled, createdAt, updatedAt)
       VALUES (?, ?, ?, 'user', 'adult', ?, 0, ?, ?)`
    ).run(id, email, passwordHash, body.displayName || null, now, now);

    return { ok: true, id };
  }

  if (kind === "kid") {
    const pin = (body.pin || "").trim();
    if (!pin) {
      setResponseStatus(event, 400);
      return { error: "Missing PIN." };
    }
    const pinHash = hashSecret(pin);
    db.prepare(
      `INSERT INTO users (id, pinHash, role, kind, displayName, disabled, createdAt, updatedAt)
       VALUES (?, ?, 'user', 'kid', ?, 0, ?, ?)`
    ).run(id, pinHash, body.displayName || "Kid", now, now);

    return { ok: true, id };
  }

  setResponseStatus(event, 400);
  return { error: "Invalid kind." };
});
