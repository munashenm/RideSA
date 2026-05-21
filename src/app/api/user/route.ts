import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
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
        select: { rides: true, bookings: true, parcelBookings: true },
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
      data: {
        name: data.name,
        phone: data.phone,
        bio: data.bio,
      },
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
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    return NextResponse.json({ message: "Email verification placeholder — verified for demo" });
  }

  if (action === "verify_phone") {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });
    return NextResponse.json({ message: "Phone verification placeholder — verified for demo" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
