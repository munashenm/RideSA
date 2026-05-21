import { cookies } from "next/headers";
import { prisma } from "./db";
import { isApprovedDriver } from "./user-permissions";
import {
  createSessionToken,
  verifySessionToken,
  parseLegacySession,
  SESSION_MAX_AGE,
} from "./session-token";

const SESSION_COOKIE = "ridesa_session";

export async function createSession(userId: string) {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  bio: true,
  rating: true,
  tripCount: true,
  isAdmin: true,
  isDriver: true,
  driverVerificationStatus: true,
  defaultStartAction: true,
  emailVerified: true,
  phoneVerified: true,
  identityVerified: true,
  isSuspended: true,
  emergencyContact: true,
  emergencyContactName: true,
  bankAccountName: true,
  bankAccountNumber: true,
  bankName: true,
  referralCode: true,
  createdAt: true,
} as const;

function resolveUserId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  return verifySessionToken(cookieValue) ?? parseLegacySession(cookieValue);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = resolveUserId(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user || user.isSuspended) return null;
    return user;
  } catch (error) {
    console.error("getSessionUser failed:", error);
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("Forbidden");
  return user;
}

export async function requireApprovedDriver(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isApprovedDriver(user)) {
    throw new Error("Driver not approved");
  }
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
