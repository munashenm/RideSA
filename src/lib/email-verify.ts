import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "./site-url";

const EMAIL_VERIFY_TTL = 60 * 60 * 24; // 24 hours

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

export function createEmailVerificationToken(userId: string, email: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + EMAIL_VERIFY_TTL;
  const payload = `${userId}.${email}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyEmailVerificationToken(
  token: string
): { userId: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [userId, email, expiresAtStr, signature] = parts;
  const payload = `${userId}.${email}.${expiresAtStr}`;
  const expected = sign(payload);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const expiresAt = Number(expiresAtStr);
  if (!userId || !email || !expiresAt || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { userId, email };
}

export function buildEmailVerificationLink(token: string): string {
  return `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}
