import crypto from "node:crypto";

const ITERATIONS = 120000;
const KEYLEN = 32;
const DIGEST = "sha256";

export const hashSecret = (secret: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
};

export const verifySecret = (secret: string, stored: string) => {
  const [algo, iterStr, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2") return false;
  const iterations = Number(iterStr);
  if (!iterations || !salt || !hash) return false;
  const derived = crypto.pbkdf2Sync(secret, salt, iterations, KEYLEN, DIGEST).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hash, "hex"));
};

export const makeSessionId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const requireUser = (event: { context: any }) => {
  const user = event.context.user;
  if (!user) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
  return user;
};
