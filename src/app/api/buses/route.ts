import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusOperator } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const createBusSchema = z.object({
  name: z.string().min(1),
  registrationNumber: z.string().min(1),
  seatCapacity: z.number().min(8).max(80),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "bus_operator" && !user.isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buses = await prisma.bus.findMany({
    where: { operatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { schedules: true } } },
  });

  return NextResponse.json({ buses });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireBusOperator();
    const body = await request.json();
    const data = createBusSchema.parse(body);

    const bus = await prisma.bus.create({
      data: { ...data, operatorId: user.id },
    });

    return NextResponse.json({ bus }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Bus operator access required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create bus" }, { status: 500 });
  }
}
