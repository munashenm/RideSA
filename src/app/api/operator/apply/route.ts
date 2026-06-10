import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export { dynamic } from "@/lib/dynamic-api";

const operatorTypes = [USER_ROLES.BUS_OPERATOR, USER_ROLES.TAXI_OPERATOR] as const;

const applicationSchema = z.object({
  operatorType: z.enum(operatorTypes),
  companyName: z.string().min(2),
  registrationNumber: z.string().optional(),
  permitDocument: z.string().optional(),
  idDocument: z.string().optional(),
});

function statusField(operatorType: (typeof operatorTypes)[number]) {
  return operatorType === USER_ROLES.BUS_OPERATOR
    ? "busOperatorVerificationStatus"
    : "taxiOperatorVerificationStatus";
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operatorType = request.nextUrl.searchParams.get("type");
  if (!operatorType || !operatorTypes.includes(operatorType as (typeof operatorTypes)[number])) {
    return NextResponse.json({ error: "Invalid operator type" }, { status: 400 });
  }

  const verification = await prisma.operatorVerification.findUnique({
    where: {
      userId_operatorType: { userId: user.id, operatorType },
    },
  });

  const status =
    operatorType === USER_ROLES.BUS_OPERATOR
      ? user.busOperatorVerificationStatus
      : user.taxiOperatorVerificationStatus;

  return NextResponse.json({ verification, status });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = applicationSchema.parse(body);

    const currentStatus =
      data.operatorType === USER_ROLES.BUS_OPERATOR
        ? user.busOperatorVerificationStatus
        : user.taxiOperatorVerificationStatus;

    if (currentStatus === "approved") {
      return NextResponse.json({ error: "Already an approved operator" }, { status: 400 });
    }

    if (!data.idDocument || !data.permitDocument) {
      return NextResponse.json({ error: "Upload company ID and operating permit" }, { status: 400 });
    }

    const verification = await prisma.operatorVerification.upsert({
      where: {
        userId_operatorType: { userId: user.id, operatorType: data.operatorType },
      },
      update: {
        companyName: data.companyName,
        registrationNumber: data.registrationNumber,
        permitDocument: data.permitDocument,
        idDocument: data.idDocument,
        status: "pending",
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
      },
      create: {
        userId: user.id,
        operatorType: data.operatorType,
        companyName: data.companyName,
        registrationNumber: data.registrationNumber,
        permitDocument: data.permitDocument,
        idDocument: data.idDocument,
        status: "pending",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: data.operatorType,
        [statusField(data.operatorType)]: "pending",
      },
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Application failed" }, { status: 500 });
  }
}
