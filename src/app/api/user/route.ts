import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyContactName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      driverVerification: true,
      _count: {
        select: { rides: true, bookings: true, busBookings: true, taxiBookings: true },
      },
    },
  });

  return NextResponse.json({ user: fullUser });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  if (action === "verify_email") {
    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    const {
      createEmailVerificationToken,
      buildEmailVerificationLink,
    } = await import("@/lib/email-verify");

    const token = createEmailVerificationToken(user.id, user.email);
    const link = buildEmailVerificationLink(token);

    const { notifyUser } = await import("@/lib/notifications");
    await notifyUser({
      userId: user.id,
      email: user.email,
      subject: "Verify your VayaSA email",
      body: `Click to verify your email: <a href="${link}">${link}</a>. Link expires in 24 hours.`,
    });

    const demo = !process.env.RESEND_API_KEY;
    return NextResponse.json({
      message: demo
        ? "Verification link logged to server console (set RESEND_API_KEY for real email)"
        : "Verification email sent — check your inbox",
      ...(demo && process.env.NODE_ENV !== "production" ? { demoLink: link } : {}),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
