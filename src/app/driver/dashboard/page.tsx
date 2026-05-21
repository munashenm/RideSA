import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isApprovedDriver } from "@/lib/user-permissions";
import { formatPrice, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Car, Package, Users, PlusCircle } from "lucide-react";

export default async function DriverDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/driver/dashboard");

  if (!isApprovedDriver(user)) {
    redirect("/driver/apply");
  }

  const [trips, pendingBookings, pendingParcels] = await Promise.all([
    prisma.ride.findMany({
      where: { driverId: user.id, tripStatus: { in: ["scheduled", "in_transit"] } },
      orderBy: { departureDate: "asc" },
      take: 10,
      include: { _count: { select: { bookings: true, parcelBookings: true } } },
    }),
    prisma.booking.findMany({
      where: { ride: { driverId: user.id }, status: "pending" },
      include: {
        passenger: { select: { name: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      take: 10,
    }),
    prisma.parcelBooking.findMany({
      where: { ride: { driverId: user.id }, status: "requested" },
      include: {
        sender: { select: { name: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage trips, passengers, and parcels</p>
        </div>
        <Link href="/publish" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium">
          <PlusCircle className="w-4 h-4" /> Post a trip
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Car className="w-5 h-5" />} label="Active trips" value={trips.length} />
        <StatCard icon={<Users className="w-5 h-5" />} label="Pending passengers" value={pendingBookings.length} />
        <StatCard icon={<Package className="w-5 h-5" />} label="Pending parcels" value={pendingParcels.length} />
      </div>

      {(pendingBookings.length > 0 || pendingParcels.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm">
          You have requests waiting —{" "}
          <Link href="/bookings" className="font-medium text-brand-700 hover:underline">
            review in My Bookings (driver tab)
          </Link>
        </div>
      )}

      <section>
        <h2 className="font-semibold text-gray-900 mb-4">Upcoming trips</h2>
        {trips.length === 0 ? (
          <p className="text-sm text-muted bg-white rounded-xl border p-6 text-center">
            No active trips. <Link href="/publish" className="text-brand-600 hover:underline">Post a trip</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/rides/${trip.id}`} className="block bg-white rounded-xl border p-4 hover:border-brand-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{trip.originCity} → {trip.destinationCity}</p>
                    <p className="text-sm text-muted mt-1">
                      {formatDate(trip.departureDate)} · {trip.seatsAvailable} seats · {trip._count.bookings} bookings · {trip._count.parcelBookings} parcels
                    </p>
                  </div>
                  <StatusBadge status={trip.tripStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="text-brand-600 mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
