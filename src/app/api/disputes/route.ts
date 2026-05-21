import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const disputeSchema = z.object({
  bookingId: z.string().optional(),
  parcelBookingId: z.string().optional(),
  description: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = disputeSchema.parse(body);

    const dispute = await prisma.dispute.create({
      data: {
        userId: user.id,
        bookingId: data.bookingId,
        parcelBookingId: data.parcelBookingId,
        description: data.description,
      },
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Dispute failed" }, { status: 500 });
  }
}
