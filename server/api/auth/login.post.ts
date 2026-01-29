import { readBody, setCookie, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { verifySecret, makeSessionId } from "~/server/utils/auth";

const SESSION_DAYS = 30;

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    type?: "adult" | "kid";
    email?: string;
    password?: string;
    pin?: string;
  };

  const type = body?.type;
  const db = getDb();

  if (type === "adult") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      setResponseStatus(event, 400);
      return { error: "Missing email or password." };
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ? AND kind = 'adult' AND disabled = 0")
      .get(email) as any;

    if (!user || !user.passwordHash || !verifySecret(password, user.passwordHash)) {
      setResponseStatus(event, 401);
      return { error: "Invalid credentials." };
    }

    const sessionId = makeSessionId();
    const now = Date.now();
    const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

    db.prepare(
      "INSERT INTO sessions (id, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)"
    ).run(sessionId, user.id, expiresAt, now);

    setCookie(event, "kanji_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        kind: user.kind,
        displayName: user.displayName || null,
      },
    };
  }

  if (type === "kid") {
    const pin = (body.pin || "").trim();
    if (!pin) {
      setResponseStatus(event, 400);
      return { error: "Missing PIN." };
    }

    const users = db
      .prepare("SELECT * FROM users WHERE kind = 'kid' AND disabled = 0")
      .all() as any[];

    const matched = users.find((user) => user.pinHash && verifySecret(pin, user.pinHash));
    if (!matched) {
      setResponseStatus(event, 401);
      return { error: "Invalid PIN." };
    }

    const sessionId = makeSessionId();
    const now = Date.now();
    const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

    db.prepare(
      "INSERT INTO sessions (id, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)"
    ).run(sessionId, matched.id, expiresAt, now);

    setCookie(event, "kanji_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return {
      user: {
        id: matched.id,
        email: matched.email,
        role: matched.role,
        kind: matched.kind,
        displayName: matched.displayName || null,
      },
    };
  }

  setResponseStatus(event, 400);
  return { error: "Invalid login type." };
});
