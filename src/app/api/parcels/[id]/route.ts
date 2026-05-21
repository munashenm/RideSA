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
  const parcel = await prisma.parcelBooking.findUnique({
    where: { id },
    include: { ride: true },
  });

  if (!parcel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, proofOfDelivery } = body;

  const isDriver = parcel.ride.driverId === user.id && isApprovedDriver(user);
  const isSender = parcel.senderId === user.id;

  if (!isDriver && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driverStatuses = ["accepted", "rejected", "collected", "in_transit", "delivered"];
  const validTransitions: Record<string, string[]> = {
    requested: ["accepted", "rejected"],
    accepted: ["collected"],
    collected: ["in_transit"],
    in_transit: ["delivered"],
  };

  if (status) {
    if (!driverStatuses.includes(status) || !isDriver) {
      if (!isDriver) {
        return NextResponse.json({ error: "Only driver can update status" }, { status: 403 });
      }
    }

    const allowed = validTransitions[parcel.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${parcel.status} to ${status}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "accepted") {
      await prisma.ride.update({
        where: { id: parcel.rideId },
        data: { parcelSpaceAvailable: { decrement: 1 } },
      });
    }

    if (status === "delivered" && proofOfDelivery) {
      updateData.proofOfDelivery = proofOfDelivery;
    }

    const updated = await prisma.parcelBooking.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ parcel: updated });
  }

  return NextResponse.json({ error: "No update provided" }, { status: 400 });
}
