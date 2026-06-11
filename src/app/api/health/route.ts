import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isPaystackConfigured,
  isResendConfigured,
  isTwilioConfigured,
  isUploadStorageConfigured,
} from "@/lib/app-config";
import { getProductionReadiness } from "@/lib/production-readiness";

export async function GET(request: NextRequest) {
  const detailed = request.nextUrl.searchParams.get("detailed") === "1";
  const checks: Record<string, string> = {
    databaseUrl: process.env.DATABASE_URL?.startsWith("postgres") ? "set" : "missing",
    storage: isUploadStorageConfigured() ? "cloud" : "local",
    email: isResendConfigured() ? "configured" : "demo",
    sms: isTwilioConfigured() ? "configured" : "demo",
    payments: isPaystackConfigured() ? "configured" : "demo",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database =
      error instanceof Error ? error.message : "connection failed";
    return NextResponse.json(
      {
        status: "error",
        checks,
        ...(detailed ? { readiness: getProductionReadiness() } : {}),
      },
      { status: 503 }
    );
  }

  const readiness = getProductionReadiness();
  const degraded =
    process.env.NODE_ENV === "production" &&
    readiness.items.some((item) => item.status === "error");

  return NextResponse.json(
    {
      status: degraded ? "degraded" : "ok",
      checks,
      ...(detailed ? { readiness } : {}),
    },
    { status: degraded ? 503 : 200 }
  );
}
