import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireApprovedDriver } from "@/lib/auth";
import { isApprovedDriver } from "@/lib/user-permissions";

export { dynamic } from "@/lib/dynamic-api";

const parcelSchema = z.object({
  rideId: z.string(),
  itemType: z.string(),
  itemSize: z.enum(["small", "medium", "large"]),
  itemWeight: z.number().min(0.1).max(100),
  pickupCity: z.string(),
  destinationCity: z.string(),
  pickupContactName: z.string(),
  pickupContactPhone: z.string(),
  receivingContactName: z.string(),
  receivingContactPhone: z.string(),
  itemPhotos: z.array(z.string()).optional(),
  pickupPoint: z.string().optional(),
  dropoffPoint: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {
    status: "active",
    parcelSpaceAvailable: { gt: 0 },
    tripStatus: "scheduled",
    departureDate: { gte: new Date() },
  };

  if (from) where.originSlug = from;
  if (to) where.destinationSlug = to;

  const rides = await prisma.ride.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          rating: true,
          tripCount: true,
          identityVerified: true,
          isDriver: true,
          driverVerificationStatus: true,
        },
      },
    },
    orderBy: { departureDate: "asc" },
  });

  if (user) {
    const myParcels = await prisma.parcelBooking.findMany({
      where: { senderId: user.id },
      include: {
        ride: {
          include: { driver: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ rides, myParcels });
  }

  return NextResponse.json({ rides });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = parcelSchema.parse(body);

    const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
    if (!ride || ride.parcelSpaceAvailable < 1) {
      return NextResponse.json({ error: "No parcel space available" }, { status: 400 });
    }
    if (ride.maxParcelWeight && data.itemWeight > ride.maxParcelWeight) {
      return NextResponse.json({ error: `Max weight is ${ride.maxParcelWeight}kg` }, { status: 400 });
    }

    const parcel = await prisma.parcelBooking.create({
      data: {
        rideId: data.rideId,
        senderId: user.id,
        itemType: data.itemType,
        itemSize: data.itemSize,
        itemWeight: data.itemWeight,
        pickupCity: data.pickupCity,
        destinationCity: data.destinationCity,
        pickupContactName: data.pickupContactName,
        pickupContactPhone: data.pickupContactPhone,
        receivingContactName: data.receivingContactName,
        receivingContactPhone: data.receivingContactPhone,
        itemPhotos: data.itemPhotos ? JSON.stringify(data.itemPhotos) : null,
        pickupPoint: data.pickupPoint ?? ride.pickupPoint,
        dropoffPoint: data.dropoffPoint ?? ride.dropoffPoint,
        totalPrice: ride.parcelPrice,
        status: "requested",
        paymentStatus: "unpaid",
      },
    });

    return NextResponse.json({ parcel }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Parcel request failed" }, { status: 500 });
  }
}
