import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, Shield, Share2 } from "lucide-react";

interface TripSharePageProps {
  params: Promise<{ token: string }>;
}

export default async function TripSharePage({ params }: TripSharePageProps) {
  const { token } = await params;

  const ride = await prisma.ride.findUnique({
    where: { shareToken: token },
    include: {
      driver: {
        select: { name: true, rating: true, identityVerified: true, isDriver: true, driverVerificationStatus: true },
      },
    },
  });

  if (!ride) notFound();

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Share2 className="w-10 h-10 text-brand-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Trip shared with you</h1>
        <p className="text-muted text-sm mt-2">Live trip status from RideSA</p>
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <StatusBadge status={ride.tripStatus} />
          <span className="text-sm text-muted">{formatDate(ride.departureDate)} · {formatTime(ride.departureTime)}</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-brand-500" />
            <span className="font-semibold">{ride.originCity}</span>
          </div>
          <div className="ml-2 border-l-2 border-dashed h-4 my-1" />
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-500" />
            <span className="font-semibold">{ride.destinationCity}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted">Driver</p>
          <p className="font-medium">{ride.driver.name}</p>
          <p className="text-sm text-muted">Rating: {ride.driver.rating.toFixed(1)}</p>
          {ride.driver.isDriver && ride.driver.driverVerificationStatus === "approved" && (
            <p className="text-xs text-brand-600 flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3" /> Verified driver
            </p>
          )}
        </div>

        <p className="text-xs text-muted bg-gray-50 rounded-lg p-3">
          This link lets trusted contacts track trip progress. In an emergency, call 10111 or 112.
        </p>
      </div>
    </div>
  );
}
