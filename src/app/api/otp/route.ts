import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createOtp, sendOtpSms } from "@/lib/otp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export { dynamic } from "@/lib/dynamic-api";

const schema = z.object({ phone: z.string().min(9) });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { ok } = rateLimit(`otp:${ip}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many OTP requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { phone } = schema.parse(body);
    const { code } = await createOtp(phone);
    await sendOtpSms(phone, code);

    const response: Record<string, string> = { message: "OTP sent" };
    if (process.env.NODE_ENV !== "production") {
      response.demoCode = code;
    }
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phone, code } = z.object({ phone: z.string(), code: z.string().length(6) }).parse(body);
    const { verifyOtp, normalizePhone } = await import("@/lib/otp");
    const { prisma } = await import("@/lib/db");

    const valid = await verifyOtp(phone, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phone: normalizePhone(phone), phoneVerified: true },
    });

    return NextResponse.json({ message: "Phone verified" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
