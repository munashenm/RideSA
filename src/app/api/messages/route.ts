import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const messageSchema = z.object({
  bookingId: z.string().optional(),
  content: z.string().min(1).max(1000),
  imageUrl: z.string().optional(),
});

async function assertParticipant(userId: string, bookingId?: string | null) {
  if (!bookingId) {
    return { ok: false as const, error: "Missing reference" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true },
  });
  if (!booking?.chatEnabled) return { ok: false as const, error: "Chat not available" };
  const ok = booking.passengerId === userId || booking.ride.driverId === userId;
  if (!ok) return { ok: false as const, error: "Forbidden" };
  return {
    ok: true as const,
    otherUserId: booking.passengerId === userId ? booking.ride.driverId : booking.passengerId,
  };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = request.nextUrl.searchParams.get("bookingId");
  const access = await assertParticipant(user.id, bookingId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: access.otherUserId },
        { blockerId: access.otherUserId, blockedId: user.id },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "Messaging blocked" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: bookingId ?? undefined },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = messageSchema.parse(body);

    const access = await assertParticipant(user.id, data.bookingId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        bookingId: data.bookingId,
        senderId: user.id,
        content: data.content,
        imageUrl: data.imageUrl,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
