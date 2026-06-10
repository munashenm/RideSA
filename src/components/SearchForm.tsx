"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Users, ArrowRight, ArrowLeftRight, Star, Wallet } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

interface City {
  name: string;
  slug: string;
  province: string;
}

interface SearchFormProps {
  defaultFrom?: string;
  defaultTo?: string;
  defaultDate?: string;
  defaultPassengers?: number;
  defaultMinRating?: string;
  defaultMaxPrice?: string;
  defaultWomenOnly?: boolean;
  defaultFemaleDriverOnly?: boolean;
  defaultTimeFrom?: string;
  defaultTimeTo?: string;
  compact?: boolean;
  searchPath?: string;
}

export function SearchForm({
  defaultFrom = "",
  defaultTo = "",
  defaultDate = "",
  defaultPassengers = 1,
  defaultMinRating = "",
  defaultMaxPrice = "",
  defaultWomenOnly = false,
  defaultFemaleDriverOnly = false,
  defaultTimeFrom = "",
  defaultTimeTo = "",
  compact = false,
  searchPath = "/search",
}: SearchFormProps) {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [date, setDate] = useState(defaultDate || todayString());
  const [passengers, setPassengers] = useState(defaultPassengers);
  const [minRating, setMinRating] = useState(defaultMinRating);
  const [maxPrice, setMaxPrice] = useState(defaultMaxPrice);
  const [womenOnly, setWomenOnly] = useState(defaultWomenOnly);
  const [femaleDriverOnly, setFemaleDriverOnly] = useState(defaultFemaleDriverOnly);
  const [timeFrom, setTimeFrom] = useState(defaultTimeFrom);
  const [timeTo, setTimeTo] = useState(defaultTimeTo);
  const [showFilters, setShowFilters] = useState(
    !!defaultMinRating || !!defaultMaxPrice || defaultWomenOnly || defaultFemaleDriverOnly
  );

  useEffect(() => {
    fetchJson<{ cities: City[] }>("/api/cities").then(({ data }) => {
      if (data?.cities) setCities(data.cities);
    });
  }, []);

  function swapCities() {
    setFrom(to);
    setTo(from);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    if (passengers > 1) params.set("passengers", String(passengers));
    if (minRating) params.set("minRating", minRating);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (womenOnly) params.set("womenOnly", "true");
    if (femaleDriverOnly) params.set("femaleDriverOnly", "true");
    if (timeFrom) params.set("timeFrom", timeFrom);
    if (timeTo) params.set("timeTo", timeTo);
    router.push(`${searchPath}?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "space-y-3"
          : "bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-4"
      }
    >
      <div className={compact ? "flex flex-col md:flex-row gap-3 items-stretch" : "md:flex md:items-end md:gap-4 space-y-4 md:space-y-0"}>
        <div className="flex-1 space-y-1.5">
          {!compact && (
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Leaving from
            </label>
          )}
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} required>
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}, {c.province}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={swapCities} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 shrink-0 self-center" aria-label="Swap cities">
          <ArrowLeftRight className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex-1 space-y-1.5">
          {!compact && (
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Going to
            </label>
          )}
          <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} required>
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}, {c.province}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          {!compact && (
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> When
            </label>
          )}
          <input type="date" value={date} min={todayString()} onChange={(e) => setDate(e.target.value)} className={selectClass} required />
        </div>

        <div className="space-y-1.5 w-full md:w-32">
          {!compact && (
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Seats
            </label>
          )}
          <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className={selectClass}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-white gradient-accent shadow-md hover:opacity-90 shrink-0">
          Search
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <button type="button" onClick={() => setShowFilters(!showFilters)} className="text-sm text-brand-600 font-medium hover:underline">
        {showFilters ? "Hide filters" : "More filters (price, driver rating)"}
      </button>

      {showFilters && (
        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
              <Star className="w-3.5 h-3.5" /> Min driver rating
            </label>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={selectClass}>
              <option value="">Any rating</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
              <Wallet className="w-3.5 h-3.5" /> Max price (ZAR)
            </label>
            <input type="number" min={50} placeholder="e.g. 400" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={selectClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Depart after</label>
            <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className={selectClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Depart before</label>
            <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className={selectClass} />
          </div>
          <label className="flex items-start gap-2 md:col-span-2 cursor-pointer">
            <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="rounded border-gray-300 text-brand-600 mt-1" />
            <span>
              <span className="text-sm font-medium text-gray-800 block">Women-only rides</span>
              <span className="text-xs text-muted">Trips marked by drivers for female passengers only</span>
            </span>
          </label>
          <label className="flex items-start gap-2 md:col-span-2 cursor-pointer">
            <input type="checkbox" checked={femaleDriverOnly} onChange={(e) => setFemaleDriverOnly(e.target.checked)} className="rounded border-gray-300 text-brand-600 mt-1" />
            <span>
              <span className="text-sm font-medium text-gray-800 block">Female driver preferred</span>
              <span className="text-xs text-muted">Only show trips with a female driver (self-reported on profile)</span>
            </span>
          </label>
        </div>
      )}
    </form>
  );
}

const selectClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer";

function todayString() {
  return new Date().toISOString().split("T")[0];
}
