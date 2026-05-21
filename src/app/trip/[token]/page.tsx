import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, Shield, Share2, Clock, Car, Package } from "lucide-react";

interface TripSharePageProps {
  params: Promise<{ token: string }>;
}

const STATUS_STEPS = ["scheduled", "in_transit", "completed"] as const;

export default async function TripSharePage({ params }: TripSharePageProps) {
  const { token } = await params;

  const ride = await prisma.ride.findUnique({
    where: { shareToken: token },
    include: {
      driver: {
        select: {
          name: true,
          rating: true,
          phone: true,
          identityVerified: true,
          isDriver: true,
          driverVerificationStatus: true,
        },
      },
      bookings: {
        where: { status: { in: ["accepted", "paid"] } },
        select: { seats: true },
      },
      parcelBookings: {
        where: { status: { in: ["accepted", "collected", "in_transit", "delivered"] } },
        select: { id: true },
      },
    },
  });

  if (!ride) notFound();

  const passengers = ride.bookings.reduce((s, b) => s + b.seats, 0);
  const currentStep = STATUS_STEPS.indexOf(ride.tripStatus as (typeof STATUS_STEPS)[number]);

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Share2 className="w-10 h-10 text-brand-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Live trip tracker</h1>
        <p className="text-muted text-sm mt-2">Shared via RideSA — refreshes on reload</p>
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-5">
        <div className="flex justify-between items-center">
          <StatusBadge status={ride.tripStatus} />
          <span className="text-sm text-muted">{formatDate(ride.departureDate)} · {formatTime(ride.departureTime)}</span>
        </div>

        <div className="flex justify-between items-center px-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  i <= currentStep ? "bg-brand-600" : "bg-gray-200"
                }`}
              />
              <span className="text-[10px] text-muted mt-1 capitalize">{step.replace("_", " ")}</span>
            </div>
          ))}
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
          {ride.pickupPoint && (
            <p className="text-xs text-muted mt-2">Pickup: {ride.pickupPoint}</p>
          )}
          {ride.dropoffPoint && (
            <p className="text-xs text-muted">Drop-off: {ride.dropoffPoint}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <Clock className="w-4 h-4 text-brand-600 mb-1" />
            <p className="font-medium">{formatTime(ride.departureTime)}</p>
            <p className="text-xs text-muted">Departure</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <Car className="w-4 h-4 text-brand-600 mb-1" />
            <p className="font-medium">{ride.carModel || "Vehicle"}</p>
            <p className="text-xs text-muted">{ride.carColor}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted">Driver</p>
          <p className="font-medium">{ride.driver.name}</p>
          <p className="text-sm text-muted">Rating: {ride.driver.rating.toFixed(1)} · {passengers} passenger(s)</p>
          {ride.parcelBookings.length > 0 && (
            <p className="text-xs text-accent-600 flex items-center gap-1 mt-1">
              <Package className="w-3 h-3" /> {ride.parcelBookings.length} parcel(s) on board
            </p>
          )}
          {ride.driver.isDriver && ride.driver.driverVerificationStatus === "approved" && (
            <p className="text-xs text-brand-600 flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3" /> Verified driver
            </p>
          )}
        </div>

        {ride.womenOnly && (
          <p className="text-xs text-pink-700 bg-pink-50 rounded-lg p-3">Women-only trip</p>
        )}

        <p className="text-xs text-muted bg-amber-50 border border-amber-100 rounded-lg p-3">
          If someone on this trip is in danger, call <strong>10111</strong> (SAPS) or <strong>112</strong> immediately.
        </p>
      </div>
    </div>
  );
}
