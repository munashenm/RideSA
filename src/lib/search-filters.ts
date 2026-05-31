import type { Prisma } from "@prisma/client";

export function buildRideSearchWhere(params: {
  from?: string | null;
  to?: string | null;
  date?: string | null;
  passengers?: number;
  minRating?: number | null;
  maxPrice?: number | null;
  parcelOnly?: boolean;
  womenOnly?: boolean;
  femaleDriverOnly?: boolean;
  timeFrom?: string | null;
  timeTo?: string | null;
  parcelSpace?: boolean;
}): Prisma.RideWhereInput {
  const where: Prisma.RideWhereInput = {
    status: "active",
    tripStatus: { in: ["scheduled", "in_transit"] },
    departureDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  };

  if (params.from) where.originSlug = params.from;
  if (params.to) where.destinationSlug = params.to;
  if (params.passengers) where.seatsAvailable = { gte: params.passengers };
  if (params.maxPrice) where.pricePerSeat = { lte: params.maxPrice };
  if (params.parcelOnly || params.parcelSpace) where.parcelSpaceAvailable = { gt: 0 };
  if (params.womenOnly) where.womenOnly = true;

  const driverWhere: Prisma.UserWhereInput = {};
  if (params.femaleDriverOnly) driverWhere.gender = "female";
  if (params.minRating) driverWhere.rating = { gte: params.minRating };
  if (Object.keys(driverWhere).length > 0) where.driver = driverWhere;

  if (params.date) {
    const day = new Date(params.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.departureDate = { gte: day, lt: next };
  }

  if (params.timeFrom || params.timeTo) {
    const from = params.timeFrom ?? "00:00";
    const to = params.timeTo ?? "23:59";
    where.departureTime = { gte: from, lte: to };
  }

  return where;
}

export const rideInclude = {
  driver: {
    select: {
      id: true,
      name: true,
      rating: true,
      tripCount: true,
      identityVerified: true,
      isDriver: true,
      driverVerificationStatus: true,
      gender: true,
    },
  },
} as const;
