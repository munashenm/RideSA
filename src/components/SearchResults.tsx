import { prisma } from "@/lib/db";
import { RideCard } from "@/components/RideCard";
import { Search } from "lucide-react";
import { buildRideSearchWhere, rideInclude } from "@/lib/search-filters";

interface SearchResultsProps {
  from?: string;
  to?: string;
  date?: string;
  passengers: string;
  minRating?: string;
  maxPrice?: string;
  womenOnly?: string;
  femaleDriverOnly?: string;
  timeFrom?: string;
  timeTo?: string;
}

export async function SearchResults({
  from,
  to,
  date,
  passengers,
  minRating,
  maxPrice,
  womenOnly,
  femaleDriverOnly,
  timeFrom,
  timeTo,
}: SearchResultsProps) {
  const where = buildRideSearchWhere({
    from,
    to,
    date,
    passengers: parseInt(passengers) || 1,
    minRating: parseFloat(minRating || "0") || null,
    maxPrice: maxPrice ? parseInt(maxPrice) : null,
    womenOnly: womenOnly === "true",
    femaleDriverOnly: femaleDriverOnly === "true",
    timeFrom,
    timeTo,
  });

  const rides = await prisma.ride.findMany({
    where,
    include: rideInclude,
    orderBy: [{ departureDate: "asc" }, { pricePerSeat: "asc" }],
  });

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
                womenOnly: ride.womenOnly,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
