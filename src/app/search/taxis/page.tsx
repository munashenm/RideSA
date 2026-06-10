import { Suspense } from "react";
import { TransportSearchForm } from "@/components/TransportSearchForm";
import { TaxiSearchResults } from "@/components/TaxiSearchResults";
import { TRANSPORT_TYPES } from "@/lib/constants";

interface SearchPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    passengers?: string;
  }>;
}

export default async function TaxiSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search taxi departures</h1>
        <div className="bg-brand-700 rounded-2xl p-4">
          <TransportSearchForm
            activeType={TRANSPORT_TYPES.TAXI}
            compact
            defaultFrom={params.from || ""}
            defaultTo={params.to || ""}
            defaultDate={params.date || ""}
            defaultPassengers={parseInt(params.passengers || "1")}
          />
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <TaxiSearchResults
          from={params.from}
          to={params.to}
          date={params.date}
          passengers={params.passengers || "1"}
        />
      </Suspense>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
