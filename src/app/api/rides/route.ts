import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildRideSearchWhere, rideInclude } from "@/lib/search-filters";
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
  pickupPoint: z.string().optional(),
  dropoffPoint: z.string().optional(),
  womenOnly: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const where = buildRideSearchWhere({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    date: searchParams.get("date"),
    passengers: parseInt(searchParams.get("passengers") || "1"),
    minRating: parseFloat(searchParams.get("minRating") || "0") || null,
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : null,
    womenOnly: searchParams.get("womenOnly") === "true",
    femaleDriverOnly: searchParams.get("femaleDriverOnly") === "true",
    timeFrom: searchParams.get("timeFrom"),
    timeTo: searchParams.get("timeTo"),
  });

  const rides = await prisma.ride.findMany({
    where,
    include: rideInclude,
    orderBy: [{ departureDate: "asc" }, { departureTime: "asc" }],
  });

  return NextResponse.json({ rides });
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
