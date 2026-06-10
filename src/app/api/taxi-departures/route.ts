import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireTaxiOperator } from "@/lib/auth";
import { buildTaxiDepartureSearchWhere, taxiDepartureInclude } from "@/lib/search-filters";
import { cancelTaxiDeparture } from "@/lib/transport-bookings";

export { dynamic } from "@/lib/dynamic-api";

const createDepartureSchema = z.object({
  routeId: z.string(),
  departureDate: z.string(),
  departureTime: z.string(),
  seatsTotal: z.number().min(4).max(16).default(14),
});

const bulkDepartureSchema = z.object({
  bulk: z.literal(true),
  routeId: z.string(),
  departureTime: z.string(),
  seatsTotal: z.number().min(4).max(16).default(14),
  startDate: z.string(),
  endDate: z.string(),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1),
});

function sortDepartures<T extends { route: { pricePerSeat: number }; departureDate: Date; departureTime: string }>(
  departures: T[],
  sortBy: string | null,
  sortOrder: string | null
): T[] {
  const order = sortOrder === "desc" ? -1 : 1;
  return [...departures].sort((a, b) => {
    if (sortBy === "price") {
      return (a.route.pricePerSeat - b.route.pricePerSeat) * order;
    }
    const dateCompare = new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    if (dateCompare !== 0) return dateCompare * order;
    return a.departureTime.localeCompare(b.departureTime) * order;
  });
}

function datesInRange(start: string, end: string, daysOfWeek: number[]): string[] {
  const results: string[] = [];
  const cursor = new Date(start);
  const last = new Date(end);
  while (cursor <= last) {
    if (daysOfWeek.includes(cursor.getDay())) {
      results.push(cursor.toISOString().split("T")[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const operatorMode = searchParams.get("operator") === "true";
  const user = await getSessionUser();

  if (operatorMode) {
    if (!user || (user.role !== "taxi_operator" && !user.isAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const departures = await prisma.taxiDeparture.findMany({
      where: { route: { operatorId: user.id } },
      include: taxiDepartureInclude,
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
      take: 50,
    });
    return NextResponse.json({ departures });
  }

  const where = buildTaxiDepartureSearchWhere({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    date: searchParams.get("date"),
    passengers: parseInt(searchParams.get("passengers") || "1"),
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : null,
  });

  const departures = sortDepartures(
    await prisma.taxiDeparture.findMany({
      where,
      include: taxiDepartureInclude,
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
    }),
    searchParams.get("sortBy"),
    searchParams.get("sortOrder")
  );

  return NextResponse.json({ departures });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireTaxiOperator();
    const body = await request.json();

    if (body?.bulk) {
      const data = bulkDepartureSchema.parse(body);
      const route = await prisma.taxiRoute.findFirst({
        where: { id: data.routeId, operatorId: user.id },
      });
      if (!route) {
        return NextResponse.json({ error: "Route not found" }, { status: 404 });
      }

      const dates = datesInRange(data.startDate, data.endDate, data.daysOfWeek);
      const departures = await prisma.$transaction(
        dates.map((departureDate) =>
          prisma.taxiDeparture.create({
            data: {
              routeId: data.routeId,
              departureDate: new Date(departureDate),
              departureTime: data.departureTime,
              seatsTotal: data.seatsTotal,
              seatsAvailable: data.seatsTotal,
            },
          })
        )
      );

      return NextResponse.json({ departures, count: departures.length }, { status: 201 });
    }

    const data = createDepartureSchema.parse(body);

    const route = await prisma.taxiRoute.findFirst({
      where: { id: data.routeId, operatorId: user.id },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const departure = await prisma.taxiDeparture.create({
      data: {
        routeId: data.routeId,
        departureDate: new Date(data.departureDate),
        departureTime: data.departureTime,
        seatsTotal: data.seatsTotal,
        seatsAvailable: data.seatsTotal,
      },
      include: taxiDepartureInclude,
    });

    return NextResponse.json({ departure }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Taxi operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create departure" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireTaxiOperator();
    const { id, seatsAvailable, status } = await request.json();

    if (status === "cancelled") {
      const result = await cancelTaxiDeparture(id, user.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const departure = await prisma.taxiDeparture.findFirst({
      where: { id, route: { operatorId: user.id } },
    });

    if (!departure) {
      return NextResponse.json({ error: "Departure not found" }, { status: 404 });
    }

    const updated = await prisma.taxiDeparture.update({
      where: { id },
      data: {
        ...(seatsAvailable !== undefined ? { seatsAvailable } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ departure: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Taxi operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update departure" }, { status: 500 });
  }
}
