import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEmailVerificationToken } from "@/lib/email-verify";
import { getAppUrl } from "@/lib/site-url";

export { dynamic } from "@/lib/dynamic-api";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = getAppUrl();

  if (!token) {
    return NextResponse.redirect(`${base}/profile?email=invalid`);
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(`${base}/profile?email=expired`);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.email !== payload.email) {
    return NextResponse.redirect(`${base}/profile?email=invalid`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  return NextResponse.redirect(`${base}/profile?email=verified`);
}
