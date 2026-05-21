import Link from "next/link";
import { Star, Clock, Users, Car, ArrowRight, Package, MapPin, BadgeCheck } from "lucide-react";
import { formatPrice, formatDate, formatTime } from "@/lib/utils";
import { driverIsVerified } from "@/lib/user-permissions";
import { StatusBadge } from "@/components/StatusBadge";

interface RideCardProps {
  ride: {
    id: string;
    originCity: string;
    destinationCity: string;
    departureDate: string;
    departureTime: string;
    pricePerSeat: number;
    seatsAvailable: number;
    parcelSpaceAvailable?: number;
    parcelPrice?: number;
    tripStatus?: string;
    womenOnly?: boolean;
    carModel?: string | null;
    pickupPoint?: string | null;
    driver: {
      id: string;
      name: string;
      rating: number;
      tripCount: number;
      identityVerified?: boolean;
      isDriver?: boolean;
      driverVerificationStatus?: string;
    };
  };
  showParcel?: boolean;
}

export function RideCard({ ride, showParcel }: RideCardProps) {
  const driverApproved = driverIsVerified({
    isDriver: ride.driver.isDriver ?? false,
    driverVerificationStatus: ride.driver.driverVerificationStatus ?? "none",
  });

  return (
    <Link
      href={`/rides/${ride.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-brand-200 transition-all group"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[60px]">
              <p className="text-lg font-bold text-gray-900 flex items-center gap-1 justify-center">
                <Clock className="w-3.5 h-3.5 text-muted" />
                {formatTime(ride.departureTime)}
              </p>
              <p className="text-xs text-muted">{formatDate(ride.departureDate)}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span className="font-semibold text-gray-900">{ride.originCity}</span>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-gray-300 h-4" />
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-accent-500" />
                <span className="font-semibold text-gray-900">{ride.destinationCity}</span>
              </div>
            </div>
            {ride.womenOnly && (
              <span className="text-xs font-semibold text-pink-700 bg-pink-50 px-2 py-1 rounded-full">
                Women only
              </span>
            )}
            {ride.tripStatus && ride.tripStatus !== "scheduled" && (
              <StatusBadge status={ride.tripStatus} />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""}
            </span>
            {(showParcel || (ride.parcelSpaceAvailable ?? 0) > 0) && (
              <span className="flex items-center gap-1 text-accent-600">
                <Package className="w-3.5 h-3.5" />
                {ride.parcelSpaceAvailable} parcel slot{ride.parcelSpaceAvailable !== 1 ? "s" : ""}
                {ride.parcelPrice ? ` · ${formatPrice(ride.parcelPrice)}` : ""}
              </span>
            )}
            {ride.carModel && (
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                {ride.carModel}
              </span>
            )}
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:min-w-[180px] md:border-l md:border-gray-100 md:pl-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm relative">
              {ride.driver.name.charAt(0)}
              {driverApproved && (
                <BadgeCheck className="w-4 h-4 text-brand-600 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{ride.driver.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Star className="w-3 h-3 fill-accent-400 text-accent-400" />
                {ride.driver.rating.toFixed(1)} · {ride.driver.tripCount} trips
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-gray-900">{formatPrice(ride.pricePerSeat)}</p>
            <ArrowRight className="w-5 h-5 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
          </div>
        </div>
      </div>
    </Link>
  );
}
