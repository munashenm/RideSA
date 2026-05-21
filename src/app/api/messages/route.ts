import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const messageSchema = z.object({
  bookingId: z.string().optional(),
  parcelBookingId: z.string().optional(),
  content: z.string().min(1).max(1000),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const bookingId = searchParams.get("bookingId");
  const parcelBookingId = searchParams.get("parcelBookingId");

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });
    if (!booking || !booking.chatEnabled) {
      return NextResponse.json({ error: "Chat not available" }, { status: 403 });
    }
    const isParticipant =
      booking.passengerId === user.id || booking.ride.driverId === user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (parcelBookingId) {
    const parcel = await prisma.parcelBooking.findUnique({
      where: { id: parcelBookingId },
      include: { ride: true },
    });
    if (!parcel || !parcel.chatEnabled) {
      return NextResponse.json({ error: "Chat not available" }, { status: 403 });
    }
    const isParticipant =
      parcel.senderId === user.id || parcel.ride.driverId === user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const messages = await prisma.message.findMany({
    where: {
      ...(bookingId ? { bookingId } : {}),
      ...(parcelBookingId ? { parcelBookingId } : {}),
    },
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

    if (!data.bookingId && !data.parcelBookingId) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { ride: true },
      });
      if (!booking?.chatEnabled) {
        return NextResponse.json({ error: "Chat not enabled. Pay first." }, { status: 403 });
      }
    }

    if (data.parcelBookingId) {
      const parcel = await prisma.parcelBooking.findUnique({
        where: { id: data.parcelBookingId },
      });
      if (!parcel?.chatEnabled) {
        return NextResponse.json({ error: "Chat not enabled. Pay first." }, { status: 403 });
      }
    }

    const message = await prisma.message.create({
      data: {
        bookingId: data.bookingId,
        parcelBookingId: data.parcelBookingId,
        senderId: user.id,
        content: data.content,
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
