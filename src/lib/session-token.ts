import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return secret ?? "dev-only-insecure-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAtStr, signature] = parts;
  const payload = `${userId}.${expiresAtStr}`;
  const expected = sign(payload);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const expiresAt = Number(expiresAtStr);
  if (!userId || !expiresAt || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return userId;
}

/** Legacy cookies stored raw user id before signed sessions. */
export function parseLegacySession(value: string): string | null {
  if (value.includes(".")) return null;
  if (/^c[a-z0-9]{20,}$/i.test(value)) return value;
  return null;
}

export { SESSION_MAX_AGE };
