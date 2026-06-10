import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusOperator } from "@/lib/auth";
import { buildBusScheduleSearchWhere, busScheduleInclude } from "@/lib/search-filters";

export { dynamic } from "@/lib/dynamic-api";

const createScheduleSchema = z.object({
  routeId: z.string(),
  busId: z.string(),
  departureDate: z.string(),
  departureTime: z.string(),
});

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

  const schedules = await prisma.busSchedule.findMany({
    where,
    include: busScheduleInclude,
    orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
  });

  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBusOperator();
    const body = await request.json();
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
