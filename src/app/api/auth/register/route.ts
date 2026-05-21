import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { getStartActionRedirect, START_ACTIONS } from "@/lib/constants";

export { dynamic } from "@/lib/dynamic-api";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  defaultStartAction: z.enum([START_ACTIONS.RIDE, START_ACTIONS.PARCEL, START_ACTIONS.DRIVER]).default(START_ACTIONS.RIDE),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        phone: data.phone,
        defaultStartAction: data.defaultStartAction,
        isAdmin: false,
        isDriver: false,
        driverVerificationStatus: "none",
      },
    });

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultStartAction: user.defaultStartAction,
      },
      redirectTo: getStartActionRedirect(user.defaultStartAction),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
