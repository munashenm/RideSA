import Link from "next/link";
import { TransportSearchForm } from "@/components/TransportSearchForm";
import { RideCard } from "@/components/RideCard";
import { prisma } from "@/lib/db";
import { POPULAR_ROUTES, TRANSPORT_TYPES } from "@/lib/constants";
import { Shield, Wallet, Route, Bus, Car, MapPin, Users } from "lucide-react";

export default async function HomePage() {
  let popularRides: Awaited<ReturnType<typeof loadPopularRides>> = [];

  try {
    popularRides = await loadPopularRides();
  } catch (error) {
    console.error("HomePage ride query failed:", error);
  }

  return (
    <>
      <section className="gradient-hero text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-10">
            <p className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-3">
              South Africa&apos;s Ride Sharing and Passenger Transport Marketplace
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Rides, buses &amp; taxis<br />between cities
            </h1>
            <p className="text-lg text-green-100">
              Book ride shares with verified drivers, buy bus tickets, or reserve minibus taxi seats — all in one place on the N1, N2, and N3.
            </p>
          </div>
          <TransportSearchForm activeType={TRANSPORT_TYPES.RIDE} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Why VayaSA?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Route className="w-6 h-6" />}
            title="Ride Sharing"
            description="Book seats on planned intercity trips with verified drivers already heading your way."
          />
          <FeatureCard
            icon={<Bus className="w-6 h-6" />}
            title="Bus Tickets"
            description="Search scheduled bus routes, compare operators, and buy tickets securely online."
          />
          <FeatureCard
            icon={<Car className="w-6 h-6" />}
            title="Taxi Bookings"
            description="Find minibus taxi departures, check seat availability, and reserve your place."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Women Only Rides"
            description="Filter for women-only ride shares and female-driver trips for added comfort and safety."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Verified Drivers"
            description="Every ride-share driver is ID-verified with admin approval before posting trips."
          />
          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Secure Payments"
            description="Paystack checkout for rides, bus tickets, and taxi seats. Chat unlocks after payment."
          />
        </div>
      </section>

      {popularRides.length > 0 && (
        <section className="bg-white border-y py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming ride shares</h2>
              <Link href="/search" className="text-brand-600 font-medium text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {popularRides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={{
                    ...ride,
                    departureDate: ride.departureDate.toISOString(),
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="gradient-hero rounded-3xl p-8 text-white">
            <Route className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-2">Share a ride</h2>
            <p className="text-green-100 mb-6 text-sm">
              Post your planned trip and earn from spare seats on intercity routes.
            </p>
            <Link
              href="/driver/apply"
              className="inline-flex px-6 py-3 rounded-xl font-semibold bg-white text-brand-700 hover:bg-green-50 transition-colors"
            >
              Become a driver
            </Link>
          </div>
          <div className="bg-brand-800 rounded-3xl p-8 text-white">
            <Bus className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-2">Run a bus service?</h2>
            <p className="text-green-100 mb-6 text-sm">
              Manage buses, routes, schedules, and ticket sales from your operator dashboard.
            </p>
            <Link
              href="/register?role=bus_operator"
              className="inline-flex px-6 py-3 rounded-xl font-semibold bg-white text-brand-700 hover:bg-green-50 transition-colors"
            >
              Apply as bus operator
            </Link>
          </div>
          <div className="gradient-accent rounded-3xl p-8 text-white">
            <Car className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-2">Taxi association?</h2>
            <p className="text-amber-100 mb-6 text-sm">
              List routes, set departure times, and manage seat bookings and revenue online.
            </p>
            <Link
              href="/register?role=taxi_operator"
              className="inline-flex px-6 py-3 rounded-xl font-semibold bg-white text-accent-600 hover:bg-amber-50 transition-colors"
            >
              Apply as taxi operator
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-2">
          <MapPin className="w-6 h-6 text-brand-600" />
          Popular routes
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {POPULAR_ROUTES.map((route) => (
            <Link
              key={route.label}
              href={`/search?from=${route.from}&to=${route.to}`}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-colors text-center"
            >
              {route.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

async function loadPopularRides() {
  return prisma.ride.findMany({
    where: {
      status: "active",
      departureDate: { gte: new Date() },
    },
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
    orderBy: { departureDate: "asc" },
    take: 4,
  });
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6 bg-white rounded-2xl border border-gray-100">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
}
