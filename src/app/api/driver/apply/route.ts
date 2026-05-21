import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DRIVER_VERIFICATION_STATUS } from "@/lib/constants";
import { isApprovedDriver } from "@/lib/user-permissions";

export { dynamic } from "@/lib/dynamic-api";

const applicationSchema = z.object({
  idDocument: z.string().optional(),
  driverLicense: z.string().optional(),
  vehicleRegistration: z.string().optional(),
  vehiclePhotos: z.array(z.string()).optional(),
  selfiePhoto: z.string().optional(),
  vehicleModel: z.string().min(1),
  vehicleColor: z.string().min(1),
  vehicleYear: z.number().optional(),
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

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isApprovedDriver(user)) {
    return NextResponse.json({ error: "Already an approved driver" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const data = applicationSchema.parse(body);

    const verification = await prisma.driverVerification.upsert({
      where: { userId: user.id },
      update: {
        ...data,
        vehiclePhotos: data.vehiclePhotos ? JSON.stringify(data.vehiclePhotos) : undefined,
        status: "pending",
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
      },
      create: {
        userId: user.id,
        ...data,
        vehiclePhotos: data.vehiclePhotos ? JSON.stringify(data.vehiclePhotos) : null,
        status: "pending",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { driverVerificationStatus: DRIVER_VERIFICATION_STATUS.PENDING },
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Application failed" }, { status: 500 });
  }
}
