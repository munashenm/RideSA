import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const createBookingSchema = z.object({
  scheduleId: z.string(),
  seats: z.number().min(1).max(10).default(1),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [passengerBookings, operatorBookings] = await Promise.all([
    prisma.busBooking.findMany({
      where: { passengerId: user.id },
      include: {
        schedule: {
          include: {
            route: true,
            bus: { select: { name: true, registrationNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    user.role === "bus_operator" || user.isAdmin
      ? prisma.busBooking.findMany({
          where: { schedule: { route: { operatorId: user.id } } },
          include: {
            passenger: { select: { name: true, email: true, phone: true } },
            schedule: { include: { route: true, bus: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ passengerBookings, operatorBookings });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createBookingSchema.parse(body);

    const schedule = await prisma.busSchedule.findUnique({
      where: { id: data.scheduleId },
      include: { route: true },
    });

    if (!schedule || schedule.status !== "active") {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    if (schedule.seatsAvailable < data.seats) {
      return NextResponse.json({ error: "Not enough seats available" }, { status: 400 });
    }

    const totalPrice = schedule.route.pricePerSeat * data.seats;

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.busBooking.create({
        data: {
          scheduleId: data.scheduleId,
          passengerId: user.id,
          seats: data.seats,
          totalPrice,
          status: "accepted",
        },
        include: {
          schedule: { include: { route: true, bus: true } },
        },
      });

      await tx.busSchedule.update({
        where: { id: data.scheduleId },
        data: { seatsAvailable: { decrement: data.seats } },
      });

      return created;
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status } = await request.json();
    const booking = await prisma.busBooking.findUnique({
      where: { id },
      include: { schedule: { include: { route: true } } },
    });

    if (!booking || booking.schedule.route.operatorId !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updated = await prisma.busBooking.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ booking: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
