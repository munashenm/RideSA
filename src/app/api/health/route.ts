import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {
    databaseUrl: process.env.DATABASE_URL ? "set" : "missing",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    checks.database =
      error instanceof Error ? error.message : "connection failed";
    return NextResponse.json(
      { status: "error", checks },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "ok", checks });
}
