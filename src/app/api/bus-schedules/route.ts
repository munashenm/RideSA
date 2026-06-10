import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusOperator } from "@/lib/auth";
import { buildBusScheduleSearchWhere, busScheduleInclude } from "@/lib/search-filters";
import { cancelBusSchedule } from "@/lib/transport-bookings";

export { dynamic } from "@/lib/dynamic-api";

const createScheduleSchema = z.object({
  routeId: z.string(),
  busId: z.string(),
  departureDate: z.string(),
  departureTime: z.string(),
});

const bulkScheduleSchema = z.object({
  bulk: z.literal(true),
  routeId: z.string(),
  busId: z.string(),
  departureTime: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1),
});

function sortSchedules<T extends { route: { pricePerSeat: number }; departureDate: Date; departureTime: string }>(
  schedules: T[],
  sortBy: string | null,
  sortOrder: string | null
): T[] {
  const order = sortOrder === "desc" ? -1 : 1;
  return [...schedules].sort((a, b) => {
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
    if (!user || (user.role !== "bus_operator" && !user.isAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const schedules = await prisma.busSchedule.findMany({
      where: { route: { operatorId: user.id } },
      include: busScheduleInclude,
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
      take: 50,
    });
    return NextResponse.json({ schedules });
  }

  const where = buildBusScheduleSearchWhere({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    date: searchParams.get("date"),
    passengers: parseInt(searchParams.get("passengers") || "1"),
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : null,
  });

  const schedules = sortSchedules(
    await prisma.busSchedule.findMany({
      where,
      include: busScheduleInclude,
      orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
    }),
    searchParams.get("sortBy"),
    searchParams.get("sortOrder")
  );

  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBusOperator();
    const body = await request.json();

    if (body?.bulk) {
      const data = bulkScheduleSchema.parse(body);
      const [route, bus] = await Promise.all([
        prisma.busRoute.findFirst({ where: { id: data.routeId, operatorId: user.id } }),
        prisma.bus.findFirst({ where: { id: data.busId, operatorId: user.id } }),
      ]);
      if (!route || !bus) {
        return NextResponse.json({ error: "Route or bus not found" }, { status: 404 });
      }

      const dates = datesInRange(data.startDate, data.endDate, data.daysOfWeek);
      const schedules = await prisma.$transaction(
        dates.map((departureDate) =>
          prisma.busSchedule.create({
            data: {
              routeId: data.routeId,
              busId: data.busId,
              departureDate: new Date(departureDate),
              departureTime: data.departureTime,
              seatsAvailable: bus.seatCapacity,
            },
          })
        )
      );

      return NextResponse.json({ schedules, count: schedules.length }, { status: 201 });
    }

    const data = createScheduleSchema.parse(body);

    const [route, bus] = await Promise.all([
      prisma.busRoute.findFirst({ where: { id: data.routeId, operatorId: user.id } }),
      prisma.bus.findFirst({ where: { id: data.busId, operatorId: user.id } }),
    ]);

    if (!route || !bus) {
      return NextResponse.json({ error: "Route or bus not found" }, { status: 404 });
    }

    const schedule = await prisma.busSchedule.create({
      data: {
        routeId: data.routeId,
        busId: data.busId,
        departureDate: new Date(data.departureDate),
        departureTime: data.departureTime,
        seatsAvailable: bus.seatCapacity,
      },
      include: busScheduleInclude,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Bus operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireBusOperator();
    const { id, status } = await request.json();

    if (status === "cancelled") {
      const result = await cancelBusSchedule(id, user.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Bus operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
