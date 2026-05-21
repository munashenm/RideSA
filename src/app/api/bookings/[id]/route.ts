import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isApprovedDriver } from "@/lib/user-permissions";

export { dynamic } from "@/lib/dynamic-api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { ride: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.ride.driverId !== user.id || !isApprovedDriver(user)) {
    return NextResponse.json({ error: "Only verified drivers can accept or reject bookings" }, { status: 403 });
  }

  const { status } = await request.json();

  if (!["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Booking already processed" }, { status: 400 });
  }

  if (status === "accepted") {
    await prisma.booking.update({
      where: { id },
      data: { status: "accepted" },
    });
  } else {
    await prisma.booking.update({
      where: { id },
      data: { status: "rejected" },
    });
    await prisma.ride.update({
      where: { id: booking.rideId },
      data: { seatsAvailable: { increment: booking.seats } },
    });
  }

  const updated = await prisma.booking.findUnique({ where: { id } });
  return NextResponse.json({ booking: updated });
}
