import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { RideCard } from "@/components/RideCard";
import { prisma } from "@/lib/db";
import { POPULAR_ROUTES } from "@/lib/constants";
import { Shield, Wallet, Users, MapPin, Package, Route } from "lucide-react";

export default async function HomePage() {
  const popularRides = await prisma.ride.findMany({
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

  return (
    <>
      <section className="gradient-hero text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-10">
            <p className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-3">
              South Africa&apos;s intercity sharing platform
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Travel &amp; send parcels<br />between cities
            </h1>
            <p className="text-lg text-green-100">
              Not a taxi app — for planned trips on the N1, N2, and N3. Share seats, send parcels, split costs with verified drivers.
            </p>
          </div>
          <SearchForm />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Why RideSA?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Route className="w-6 h-6" />}
            title="Planned intercity trips"
            description="Drivers already travelling JHB to CPT, Polokwane, Durban — book a seat on their route."
          />
          <FeatureCard
            icon={<Package className="w-6 h-6" />}
            title="Send parcels"
            description="Send documents, gifts, or goods with drivers heading your way. Track from pickup to delivery."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="SA safety first"
            description="Verified drivers, SOS button, trip sharing, ratings, and admin dispute handling."
          />
          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Local payments"
            description="PayFast, Ozow EFT, card, and EFT placeholders — chat unlocks after payment."
          />
        </div>
      </section>

      {popularRides.length > 0 && (
        <section className="bg-white border-y py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming trips</h2>
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
        <div className="grid md:grid-cols-2 gap-6">
          <div className="gradient-hero rounded-3xl p-8 text-white">
            <Users className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Got empty seats?</h2>
            <p className="text-green-100 mb-6 text-sm">
              Post your planned trip and earn from spare seats and parcel space.
            </p>
            <Link
              href="/publish"
              className="inline-flex px-6 py-3 rounded-xl font-semibold bg-white text-brand-700 hover:bg-green-50 transition-colors"
            >
              Post a trip
            </Link>
          </div>
          <div className="gradient-accent rounded-3xl p-8 text-white">
            <Package className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Send a parcel?</h2>
            <p className="text-amber-100 mb-6 text-sm">
              Match your parcel to drivers already on your route. Cheaper than courier for intercity.
            </p>
            <Link
              href="/parcel"
              className="inline-flex px-6 py-3 rounded-xl font-semibold bg-white text-accent-600 hover:bg-amber-50 transition-colors"
            >
              Send a parcel
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
