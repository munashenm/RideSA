import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const emergencySchema = z.object({
  rideId: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = emergencySchema.parse(body);

    const alert = await prisma.emergencyAlert.create({
      data: {
        userId: user.id,
        rideId: data.rideId,
        message: data.message,
      },
    });

    return NextResponse.json({ alert, message: "Emergency alert logged. Support notified." }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Alert failed" }, { status: 500 });
  }
}
