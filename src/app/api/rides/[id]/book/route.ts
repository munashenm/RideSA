import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const bookSchema = z.object({
  seats: z.number().min(1).max(8),
  femaleDriverPreferred: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to book" }, { status: 401 });
  }

  const { id: rideId } = await params;

  try {
    const body = await request.json();
    const { seats, femaleDriverPreferred } = bookSchema.parse(body);

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: { select: { gender: true } } },
    });
    if (!ride) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (ride.driverId === user.id) {
      return NextResponse.json({ error: "You cannot book your own trip" }, { status: 400 });
    }
    if (ride.seatsAvailable < seats) {
      return NextResponse.json({ error: "Not enough seats available" }, { status: 400 });
    }

    if (ride.womenOnly && user.gender !== "female") {
      return NextResponse.json(
        {
          error:
            "This is a women-only trip. Set your gender to Female on your profile to book, or choose another trip.",
        },
        { status: 403 }
      );
    }

    const preferFemale = !!femaleDriverPreferred;

    const existing = await prisma.booking.findUnique({
      where: { rideId_passengerId: { rideId, passengerId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a booking for this trip" }, { status: 400 });
    }

    const totalPrice = ride.pricePerSeat * seats;

    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          rideId,
          passengerId: user.id,
          seats,
          totalPrice,
          status: "pending",
          paymentStatus: "unpaid",
          femaleDriverPreferred: preferFemale,
        },
      }),
      prisma.ride.update({
        where: { id: rideId },
        data: { seatsAvailable: { decrement: seats } },
      }),
    ]);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rideId } = await params;
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.driverId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { tripStatus } = body;

  if (!["scheduled", "in_transit", "completed", "cancelled"].includes(tripStatus)) {
    return NextResponse.json({ error: "Invalid trip status" }, { status: 400 });
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { tripStatus, status: tripStatus === "cancelled" ? "cancelled" : ride.status },
  });

  const { notifyTripStatus } = await import("@/lib/notifications");
  const bookings = await prisma.booking.findMany({
    where: { rideId, status: { in: ["accepted", "paid"] } },
    include: { passenger: { select: { id: true, email: true, phone: true } } },
  });
  const label = `${ride.originCity} → ${ride.destinationCity}`;
  for (const b of bookings) {
    await notifyTripStatus({
      userId: b.passenger.id,
      email: b.passenger.email,
      phone: b.passenger.phone,
      tripLabel: label,
      status: tripStatus,
    });
  }

  return NextResponse.json({ ride: updated });
}
