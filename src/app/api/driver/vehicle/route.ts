import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isApprovedDriver } from "@/lib/user-permissions";

export { dynamic } from "@/lib/dynamic-api";

const updateSchema = z.object({
  vehicleModel: z.string().min(1),
  vehicleColor: z.string().min(1),
  vehicleYear: z.number().min(1990).max(new Date().getFullYear() + 1),
  vehiclePhotos: z.array(z.string()).optional(),
  vehicleRegistration: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verification = await prisma.driverVerification.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ verification, status: user.driverVerificationStatus });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApprovedDriver(user)) {
    return NextResponse.json({ error: "Approved drivers only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const verification = await prisma.driverVerification.update({
      where: { userId: user.id },
      data: {
        vehicleModel: data.vehicleModel,
        vehicleColor: data.vehicleColor,
        vehicleYear: data.vehicleYear,
        vehiclePhotos: data.vehiclePhotos ? JSON.stringify(data.vehiclePhotos) : undefined,
        vehicleRegistration: data.vehicleRegistration,
      },
    });

    return NextResponse.json({ verification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
