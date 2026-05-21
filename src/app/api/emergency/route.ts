import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notifySOS } from "@/lib/notifications";

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

    let rideLabel = "unknown trip";
    if (data.rideId) {
      const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
      if (ride) {
        rideLabel = `${ride.originCity} → ${ride.destinationCity}`;
      }
    }

    await notifySOS({
      userId: user.id,
      userName: user.name,
      phone: user.phone,
      rideLabel,
      emergencyContact: user.emergencyContact,
      adminEmail: process.env.ADMIN_ALERT_EMAIL,
    });

    return NextResponse.json(
      { alert, message: "Emergency alert sent to support and your emergency contact." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Alert failed" }, { status: 500 });
  }
}
