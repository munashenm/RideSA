import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  cancelTaxiBooking,
  checkInTaxiBooking,
  completeTaxiBooking,
} from "@/lib/transport-bookings";

export { dynamic } from "@/lib/dynamic-api";

const createBookingSchema = z.object({
  departureId: z.string(),
  seats: z.number().min(1).max(10).default(1),
});

const patchSchema = z.object({
  id: z.string(),
  action: z.enum(["cancel", "check_in", "complete"]),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [passengerBookings, operatorBookings] = await Promise.all([
    prisma.taxiBooking.findMany({
      where: { passengerId: user.id },
      include: {
        departure: {
          include: {
            route: { include: { operator: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    user.role === "taxi_operator" || user.isAdmin
      ? prisma.taxiBooking.findMany({
          where: { departure: { route: { operatorId: user.id } } },
          include: {
            passenger: { select: { name: true, email: true, phone: true } },
            departure: { include: { route: true } },
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

    const departure = await prisma.taxiDeparture.findUnique({
      where: { id: data.departureId },
      include: { route: true },
    });

    if (!departure || departure.status !== "active") {
      return NextResponse.json({ error: "Departure not found" }, { status: 404 });
    }
    if (departure.seatsAvailable < data.seats) {
      return NextResponse.json({ error: "Not enough seats available" }, { status: 400 });
    }

    const totalPrice = departure.route.pricePerSeat * data.seats;

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.taxiBooking.create({
        data: {
          departureId: data.departureId,
          passengerId: user.id,
          seats: data.seats,
          totalPrice,
          status: "accepted",
        },
        include: {
          departure: { include: { route: true } },
        },
      });

      await tx.taxiDeparture.update({
        where: { id: data.departureId },
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
    const body = patchSchema.parse(await request.json());
    const asOperator = user.role === "taxi_operator" || user.isAdmin;

    if (body.action === "cancel") {
      const result = await cancelTaxiBooking({
        bookingId: body.id,
        userId: user.id,
        asOperator,
      });
      if ("error" in result) {
        const status = result.error === "Forbidden" ? 403 : 400;
        return NextResponse.json({ error: result.error }, { status });
      }
      return NextResponse.json({ booking: result.booking });
    }

    if (!asOperator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result =
      body.action === "check_in"
        ? await checkInTaxiBooking(body.id, user.id)
        : await completeTaxiBooking(body.id, user.id);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ booking: result.booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
