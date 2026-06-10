import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireTaxiOperator } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const createRouteSchema = z.object({
  originCity: z.string(),
  originSlug: z.string(),
  destinationCity: z.string(),
  destinationSlug: z.string(),
  pricePerSeat: z.number().min(30).max(2000),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "taxi_operator" && !user.isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const routes = await prisma.taxiRoute.findMany({
    where: { operatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { departures: true } } },
  });

  return NextResponse.json({ routes });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireTaxiOperator();
    const body = await request.json();
    const data = createRouteSchema.parse(body);

    const route = await prisma.taxiRoute.create({
      data: { ...data, operatorId: user.id },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Taxi operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
  }
}
