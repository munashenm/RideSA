import { cookies } from "next/headers";
import { prisma } from "./db";
import { isApprovedDriver } from "./user-permissions";

const SESSION_COOKIE = "ridesa_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
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
  createdAt: true,
} as const;

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user || user.isSuspended) return null;
  return user;
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
