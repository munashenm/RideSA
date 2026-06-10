import type { Prisma } from "@prisma/client";

export function buildRideSearchWhere(params: {
  from?: string | null;
  to?: string | null;
  date?: string | null;
  passengers?: number;
  minRating?: number | null;
  maxPrice?: number | null;
  womenOnly?: boolean;
  femaleDriverOnly?: boolean;
  timeFrom?: string | null;
  timeTo?: string | null;
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

export function buildBusScheduleSearchWhere(params: {
  from?: string | null;
  to?: string | null;
  date?: string | null;
  passengers?: number;
  maxPrice?: number | null;
}): Prisma.BusScheduleWhereInput {
  const routeWhere: Prisma.BusRouteWhereInput = { status: "active" };
  if (params.from) routeWhere.originSlug = params.from;
  if (params.to) routeWhere.destinationSlug = params.to;
  if (params.maxPrice) routeWhere.pricePerSeat = { lte: params.maxPrice };

  const where: Prisma.BusScheduleWhereInput = {
    status: "active",
    route: routeWhere,
    departureDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  };

  if (params.passengers) where.seatsAvailable = { gte: params.passengers };

  if (params.date) {
    const day = new Date(params.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.departureDate = { gte: day, lt: next };
  }

  return where;
}

export function buildTaxiDepartureSearchWhere(params: {
  from?: string | null;
  to?: string | null;
  date?: string | null;
  passengers?: number;
  maxPrice?: number | null;
}): Prisma.TaxiDepartureWhereInput {
  const routeWhere: Prisma.TaxiRouteWhereInput = { status: "active" };
  if (params.from) routeWhere.originSlug = params.from;
  if (params.to) routeWhere.destinationSlug = params.to;
  if (params.maxPrice) routeWhere.pricePerSeat = { lte: params.maxPrice };

  const where: Prisma.TaxiDepartureWhereInput = {
    status: "active",
    route: routeWhere,
    departureDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  };

  if (params.passengers) where.seatsAvailable = { gte: params.passengers };

  if (params.date) {
    const day = new Date(params.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.departureDate = { gte: day, lt: next };
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

export const busScheduleInclude = {
  route: {
    include: {
      operator: { select: { id: true, name: true, rating: true } },
    },
  },
  bus: { select: { id: true, name: true, registrationNumber: true, seatCapacity: true } },
} as const;

export const taxiDepartureInclude = {
  route: {
    include: {
      operator: { select: { id: true, name: true, rating: true } },
    },
  },
} as const;
