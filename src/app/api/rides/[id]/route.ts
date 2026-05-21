import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          rating: true,
          tripCount: true,
          avatar: true,
          bio: true,
          phone: true,
        },
      },
      bookings: {
        include: {
          passenger: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });

  if (!ride) {
    return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  }

  return NextResponse.json({ ride });
}
