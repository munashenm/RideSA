import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { SearchResults } from "@/components/SearchResults";

interface SearchPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    passengers?: string;
    minRating?: string;
    maxPrice?: string;
    womenOnly?: string;
    timeFrom?: string;
    timeTo?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Find a ride</h1>
        <SearchForm
          compact
          defaultFrom={params.from || ""}
          defaultTo={params.to || ""}
          defaultDate={params.date || ""}
          defaultPassengers={parseInt(params.passengers || "1")}
          defaultMinRating={params.minRating || ""}
          defaultMaxPrice={params.maxPrice || ""}
          defaultWomenOnly={params.womenOnly === "true"}
          defaultTimeFrom={params.timeFrom || ""}
          defaultTimeTo={params.timeTo || ""}
        />
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <SearchResults
          from={params.from}
          to={params.to}
          date={params.date}
          passengers={params.passengers || "1"}
          minRating={params.minRating}
          maxPrice={params.maxPrice}
          womenOnly={params.womenOnly}
          timeFrom={params.timeFrom}
          timeTo={params.timeTo}
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
