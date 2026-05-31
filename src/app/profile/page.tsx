import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isApprovedDriver, isPendingDriver, isRejectedDriver } from "@/lib/user-permissions";
import { formatPrice, formatDate, formatTime } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { VerifyButton } from "@/components/VerifyButton";
import { ProfilePhoneVerify } from "@/components/ProfilePhoneVerify";
import { ProfileBankForm } from "@/components/ProfileBankForm";
import { Star, Car, Calendar, Package, Shield, Mail, LayoutDashboard } from "lucide-react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/profile");
  const { email: emailStatus } = await searchParams;

  const [myRides, myBookings, verification, earnings] = await Promise.all([
    prisma.ride.findMany({
      where: { driverId: user.id },
      orderBy: { departureDate: "desc" },
      take: 10,
    }),
    prisma.booking.findMany({
      where: { passengerId: user.id },
      include: { ride: { include: { driver: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.driverVerification.findUnique({ where: { userId: user.id } }),
    prisma.booking.aggregate({
      where: { ride: { driverId: user.id }, paymentStatus: "paid" },
      _sum: { totalPrice: true },
    }),
  ]);

  const approved = isApprovedDriver(user);
  const pending = isPendingDriver(user);
  const rejected = isRejectedDriver(user);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {emailStatus === "verified" && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Email verified successfully.
        </div>
      )}
      {emailStatus === "expired" && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Verification link expired. Request a new one below.
        </div>
      )}
      <div className="bg-white rounded-2xl border p-6 md:p-8 mb-8">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-3xl font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-muted">{user.email}</p>
            {user.phone && <p className="text-sm text-muted mt-1">{user.phone}</p>}
            <p className="flex items-center gap-1 text-sm mt-2">
              <Star className="w-4 h-4 fill-accent-400 text-accent-400" />
              <span className="font-medium">{user.rating.toFixed(1)}</span>
              <span className="text-muted">· {user.tripCount} trips</span>
            </p>
            <p className="text-xs text-muted mt-2">
              One account — book rides, send parcels{approved ? ", and drive" : ", or become a driver anytime"}
            </p>
            <VerifiedBadge
              className="mt-3"
              driverApproved={approved}
              identityVerified={user.identityVerified}
              emailVerified={user.emailVerified}
              phoneVerified={user.phoneVerified}
            />
            {user.bio && <p className="text-sm text-gray-600 mt-3">{user.bio}</p>}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex flex-wrap gap-3">
          {!user.emailVerified && (
            <VerifyButton action="verify_email" icon={<Mail className="w-4 h-4" />} label="Verify email" />
          )}
          {!approved && (
            <Link href="/driver/apply" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">
              <Shield className="w-4 h-4" />
              {pending ? "Verification pending" : rejected ? "Resubmit verification" : "Become a driver"}
            </Link>
          )}
          {approved && (
            <Link href="/driver/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50">
              <LayoutDashboard className="w-4 h-4" /> Driver dashboard
            </Link>
          )}
          <Link href="/bookings" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Calendar className="w-4 h-4" /> My bookings
          </Link>
          <Link href="/my-parcels" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Package className="w-4 h-4" /> My parcels
          </Link>
        </div>

        {!user.phoneVerified && (
          <ProfilePhoneVerify phone={user.phone} phoneVerified={user.phoneVerified} />
        )}
      </div>

      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
          Driver verification pending — you can still book rides and send parcels while we review your application.
        </div>
      )}

      {rejected && verification?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-800">
          Verification rejected: {verification.rejectionReason}.{" "}
          <Link href="/driver/apply" className="font-medium underline">Resubmit your documents</Link>
        </div>
      )}

      {(approved || pending) && (
        <div className="mb-8">
          <ProfileBankForm
            initial={{
              bankAccountName: user.bankAccountName,
              bankAccountNumber: user.bankAccountNumber,
              bankName: user.bankName,
            }}
          />
        </div>
      )}

      {approved && (
        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6 mb-8">
          <h2 className="font-semibold text-brand-800 mb-2">Driver earnings</h2>
          <p className="text-2xl font-bold text-brand-700">{formatPrice(earnings._sum.totalPrice ?? 0)}</p>
          <Link href="/driver/earnings" className="text-sm text-brand-600 font-medium hover:underline mt-1 inline-block">
            View earnings →
          </Link>
        </div>
      )}

      {verification && (
        <div className="bg-white rounded-xl border p-4 mb-8 flex items-center justify-between">
          <span className="text-sm font-medium">Driver verification</span>
          <StatusBadge status={user.driverVerificationStatus} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Car className="w-5 h-5" /> My trips
            </h2>
            {approved && (
              <Link href="/publish" className="text-sm text-brand-600 font-medium hover:underline">+ Post trip</Link>
            )}
          </div>
          {myRides.length === 0 ? (
            <p className="text-sm text-muted bg-white rounded-xl border p-6 text-center">
              {approved ? "No trips posted yet." : "Become a verified driver to post trips."}
            </p>
          ) : (
            <div className="space-y-3">
              {myRides.map((ride) => (
                <Link key={ride.id} href={`/rides/${ride.id}`} className="block bg-white rounded-xl border p-4 hover:border-brand-200">
                  <div className="flex justify-between">
                    <p className="font-medium">{ride.originCity} → {ride.destinationCity}</p>
                    <StatusBadge status={ride.tripStatus} />
                  </div>
                  <p className="text-sm text-muted mt-1">
                    {formatDate(ride.departureDate)} at {formatTime(ride.departureTime)} · {formatPrice(ride.pricePerSeat)}/seat
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" /> Recent bookings
          </h2>
          {myBookings.length === 0 ? (
            <p className="text-sm text-muted bg-white rounded-xl border p-6 text-center">
              No bookings yet. <Link href="/search" className="text-brand-600 hover:underline">Find a ride</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {myBookings.map((booking) => (
                <Link key={booking.id} href={`/rides/${booking.rideId}`} className="block bg-white rounded-xl border p-4 hover:border-brand-200">
                  <div className="flex justify-between">
                    <p className="font-medium">{booking.ride.originCity} → {booking.ride.destinationCity}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted mt-1">
                    {formatDate(booking.ride.departureDate)} · {formatPrice(booking.totalPrice)}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <Link href="/parcel" className="mt-4 flex items-center gap-2 text-sm text-accent-600 font-medium hover:underline">
            <Package className="w-4 h-4" /> Send a parcel
          </Link>
        </section>
      </div>
    </div>
  );
}
