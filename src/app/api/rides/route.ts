import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireApprovedDriver } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const createRideSchema = z.object({
  originCity: z.string(),
  originSlug: z.string(),
  destinationCity: z.string(),
  destinationSlug: z.string(),
  departureDate: z.string(),
  departureTime: z.string(),
  pricePerSeat: z.number().min(50).max(5000),
  seatsTotal: z.number().min(1).max(8),
  description: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  smokingAllowed: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  luggageSize: z.enum(["small", "medium", "large"]).default("medium"),
  parcelSpaceTotal: z.number().min(0).max(10).default(0),
  parcelPrice: z.number().min(0).max(5000).default(0),
  maxParcelWeight: z.number().optional(),
  maxParcelSize: z.enum(["small", "medium", "large"]).optional(),
  pickupPoint: z.string().optional(),
  dropoffPoint: z.string().optional(),
  womenOnly: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const date = searchParams.get("date");
  const passengers = parseInt(searchParams.get("passengers") || "1");
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const maxPrice = searchParams.get("maxPrice");
  const parcelOnly = searchParams.get("parcelOnly") === "true";

  const where: Record<string, unknown> = {
    status: "active",
    tripStatus: { in: ["scheduled", "in_transit"] },
  };

  if (parcelOnly) {
    where.parcelSpaceAvailable = { gt: 0 };
  } else {
    where.seatsAvailable = { gte: passengers };
  }

  if (from) where.originSlug = from;
  if (to) where.destinationSlug = to;
  if (maxPrice) where.pricePerSeat = { lte: parseInt(maxPrice) };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.departureDate = { gte: start, lte: end };
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.departureDate = { gte: today };
  }

  const rides = await prisma.ride.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          rating: true,
          tripCount: true,
          avatar: true,
          identityVerified: true,
          isDriver: true,
          driverVerificationStatus: true,
        },
      },
    },
    orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
  });

  const filtered = minRating > 0
    ? rides.filter((r) => r.driver.rating >= minRating)
    : rides;

  return NextResponse.json({ rides: filtered });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to post a trip" }, { status: 401 });
  }

  try {
    await requireApprovedDriver(user.id);
    const body = await request.json();
    const data = createRideSchema.parse(body);

    const ride = await prisma.ride.create({
      data: {
        ...data,
        departureDate: new Date(data.departureDate),
        driverId: user.id,
        seatsAvailable: data.seatsTotal,
        parcelSpaceAvailable: data.parcelSpaceTotal,
      },
      include: {
        driver: { select: { id: true, name: true, rating: true } },
      },
    });

    return NextResponse.json({ ride }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Driver not approved") {
      return NextResponse.json({ error: "You must be an approved driver to post trips. Apply in your profile." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
