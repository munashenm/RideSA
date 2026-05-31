import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatPrice, formatDate, formatTime } from "@/lib/utils";
import { BookingForm } from "@/components/BookingForm";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ChatPanel } from "@/components/ChatPanel";
import { SOSButton } from "@/components/SOSButton";
import { ReviewForm } from "@/components/ReviewForm";
import { DriverTripControls } from "@/components/DriverTripControls";
import { ShareWhatsApp } from "@/components/ShareWhatsApp";
import { WomenOnlyTripBadge, FemaleDriverBadge } from "@/components/SafetyRideBadges";
import { isFemaleGender } from "@/lib/gender";
import { driverIsVerified } from "@/lib/user-permissions";
import {
  Star,
  Car,
  Users,
  Cigarette,
  PawPrint,
  Luggage,
  ArrowLeft,
  Package,
  MapPin,
  Scale,
} from "lucide-react";

interface RidePageProps {
  params: Promise<{ id: string }>;
}

export default async function RidePage({ params }: RidePageProps) {
  const { id } = await params;
  const user = await getSessionUser();

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          rating: true,
          tripCount: true,
          bio: true,
          phone: true,
          identityVerified: true,
          emailVerified: true,
          phoneVerified: true,
          isDriver: true,
          driverVerificationStatus: true,
          gender: true,
        },
      },
      bookings: user
        ? { where: { passengerId: user.id }, take: 1 }
        : false,
    },
  });

  if (!ride) notFound();

  const isOwnRide = user?.id === ride.driverId;
  const existingBooking = user && ride.bookings && Array.isArray(ride.bookings) ? ride.bookings[0] : null;
  const driverApproved = driverIsVerified(ride.driver);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to search
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={ride.tripStatus} />
                {ride.womenOnly && <WomenOnlyTripBadge />}
                {isFemaleGender(ride.driver.gender) && <FemaleDriverBadge />}
              </div>
              {ride.parcelSpaceAvailable > 0 && (
                <Link
                  href={`/parcel?rideId=${ride.id}`}
                  className="text-sm text-accent-600 font-medium hover:underline flex items-center gap-1"
                >
                  <Package className="w-4 h-4" />
                  Send parcel on this trip
                </Link>
              )}
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="text-center min-w-[70px]">
                <p className="text-2xl font-bold">{formatTime(ride.departureTime)}</p>
                <p className="text-sm text-muted">{formatDate(ride.departureDate)}</p>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  <span className="text-lg font-semibold">{ride.originCity}</span>
                </div>
                {ride.pickupPoint && (
                  <p className="text-xs text-muted ml-6 mb-2">{ride.pickupPoint}</p>
                )}
                <div className="ml-2 border-l-2 border-dashed border-gray-300 h-4 my-1" />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent-500" />
                  <span className="text-lg font-semibold">{ride.destinationCity}</span>
                </div>
                {ride.dropoffPoint && (
                  <p className="text-xs text-muted ml-6 mt-1">{ride.dropoffPoint}</p>
                )}
              </div>
            </div>

            {ride.description && (
              <p className="text-gray-600 text-sm leading-relaxed border-t pt-4">
                {ride.description}
              </p>
            )}

            <div className="border-t pt-4 mt-4">
              <ShareWhatsApp
                title="Share this trip"
                text={`VayaSA trip: ${ride.originCity} → ${ride.destinationCity} on ${formatDate(ride.departureDate)} at ${formatTime(ride.departureTime)}`}
                url={`/trip/${ride.shareToken}`}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Trip details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {ride.carModel && (
                <Detail icon={<Car className="w-4 h-4" />} label="Vehicle" value={`${ride.carModel}${ride.carColor ? ` (${ride.carColor})` : ""}`} />
              )}
              <Detail icon={<Users className="w-4 h-4" />} label="Seats available" value={`${ride.seatsAvailable} of ${ride.seatsTotal}`} />
              <Detail icon={<Luggage className="w-4 h-4" />} label="Luggage" value={ride.luggageSize.charAt(0).toUpperCase() + ride.luggageSize.slice(1)} />
              <Detail icon={<Cigarette className="w-4 h-4" />} label="Smoking" value={ride.smokingAllowed ? "Allowed" : "Not allowed"} />
              <Detail icon={<PawPrint className="w-4 h-4" />} label="Pets" value={ride.petsAllowed ? "Welcome" : "Not allowed"} />
              {ride.parcelSpaceTotal > 0 && (
                <>
                  <Detail icon={<Package className="w-4 h-4" />} label="Parcel slots" value={`${ride.parcelSpaceAvailable} of ${ride.parcelSpaceTotal}`} />
                  <Detail icon={<Scale className="w-4 h-4" />} label="Max parcel weight" value={ride.maxParcelWeight ? `${ride.maxParcelWeight} kg` : "Not specified"} />
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">About the driver</h3>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold shrink-0">
                {ride.driver.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{ride.driver.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-accent-400 text-accent-400" />
                  {ride.driver.rating.toFixed(1)} · {ride.driver.tripCount} trips
                </p>
                <VerifiedBadge
                  className="mt-2"
                  driverApproved={driverApproved}
                  identityVerified={ride.driver.identityVerified}
                  emailVerified={ride.driver.emailVerified}
                  phoneVerified={ride.driver.phoneVerified}
                />
                {ride.driver.bio && (
                  <p className="text-sm text-gray-600 mt-2">{ride.driver.bio}</p>
                )}
              </div>
            </div>
          </div>

          {existingBooking?.chatEnabled && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Chat</h3>
              <ChatPanel bookingId={existingBooking.id} enabled={existingBooking.chatEnabled} />
            </div>
          )}

          {existingBooking?.paymentStatus === "paid" && ride.tripStatus === "completed" && !existingBooking.reviewed && (
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Rate your driver</h3>
              <ReviewForm
                revieweeId={ride.driverId}
                bookingId={existingBooking.id}
                rideId={ride.id}
              />
            </div>
          )}

          {user && !isOwnRide && (
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Safety</h3>
              <SOSButton rideId={ride.id} shareToken={ride.shareToken} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-6 sticky top-24">
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {formatPrice(ride.pricePerSeat)}
            </p>
            <p className="text-sm text-muted mb-6">per seat</p>

            {ride.parcelPrice > 0 && (
              <p className="text-sm text-accent-600 mb-4 flex items-center gap-1">
                <Package className="w-4 h-4" />
                Parcels from {formatPrice(ride.parcelPrice)}
              </p>
            )}

            {ride.seatsAvailable === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-700">Fully booked</p>
              </div>
            ) : isOwnRide ? (
              <DriverTripControls rideId={ride.id} tripStatus={ride.tripStatus} />
            ) : (
              <BookingForm
                rideId={ride.id}
                pricePerSeat={ride.pricePerSeat}
                maxSeats={ride.seatsAvailable}
                isLoggedIn={!!user}
                rideWomenOnly={ride.womenOnly}
                driverGender={ride.driver.gender}
                passengerGender={user?.gender}
                existingBooking={
                  existingBooking
                    ? {
                        id: existingBooking.id,
                        status: existingBooking.status,
                        paymentStatus: existingBooking.paymentStatus,
                        totalPrice: existingBooking.totalPrice,
                        seats: existingBooking.seats,
                        femaleDriverPreferred: existingBooking.femaleDriverPreferred,
                      }
                    : null
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted">{icon}</div>
      <div>
        <p className="text-muted text-xs">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
