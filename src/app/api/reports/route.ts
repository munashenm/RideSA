import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const reportSchema = z.object({
  reportedUserId: z.string(),
  rideId: z.string().optional(),
  reason: z.string().min(3),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = reportSchema.parse(body);

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId: data.reportedUserId,
        rideId: data.rideId,
        reason: data.reason,
        description: data.description,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }
}
