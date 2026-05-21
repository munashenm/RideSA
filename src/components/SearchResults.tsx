import { prisma } from "@/lib/db";
import { RideCard } from "@/components/RideCard";
import { Search } from "lucide-react";

interface SearchResultsProps {
  from?: string;
  to?: string;
  date?: string;
  passengers: string;
  minRating?: string;
  maxPrice?: string;
}

export async function SearchResults({
  from,
  to,
  date,
  passengers,
  minRating,
  maxPrice,
}: SearchResultsProps) {
  const passengerCount = parseInt(passengers) || 1;
  const ratingMin = parseFloat(minRating || "0");

  const where: Record<string, unknown> = {
    status: "active",
    tripStatus: { in: ["scheduled", "in_transit"] },
    seatsAvailable: { gte: passengerCount },
  };

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

  let rides = await prisma.ride.findMany({
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
    orderBy: [{ departureDate: "asc" }, { pricePerSeat: "asc" }],
  });

  if (ratingMin > 0) {
    rides = rides.filter((r) => r.driver.rating >= ratingMin);
  }

  const fromCity = from ? await prisma.city.findUnique({ where: { slug: from } }) : null;
  const toCity = to ? await prisma.city.findUnique({ where: { slug: to } }) : null;

  const routeLabel = [fromCity?.name || "Anywhere", "→", toCity?.name || "Anywhere"].join(" ");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted">
          <span className="font-semibold text-gray-900">{rides.length}</span> trip
          {rides.length !== 1 ? "s" : ""} found
          {(from || to) && (
            <span>
              {" "}for <span className="font-medium text-gray-700">{routeLabel}</span>
            </span>
          )}
        </p>
      </div>

      {rides.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips found</h3>
          <p className="text-muted text-sm max-w-md mx-auto">
            Try different dates, nearby cities, or lower your price/rating filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={{
                ...ride,
                departureDate: ride.departureDate.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
