"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Package, Search } from "lucide-react";
import { RideCard } from "@/components/RideCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { ITEM_TYPES, PARCEL_SIZES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

interface City {
  name: string;
  slug: string;
}

function ParcelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRideId = searchParams.get("rideId");

  const [cities, setCities] = useState<City[]>([]);
  const [rides, setRides] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"search" | "form" | "done">("search");
  const [selectedRide, setSelectedRide] = useState<Record<string, unknown> | null>(null);
  const [parcel, setParcel] = useState<{ id: string; totalPrice: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const [search, setSearch] = useState({ from: "", to: "" });
  const [form, setForm] = useState({
    itemType: "documents",
    itemSize: "medium",
    itemWeight: 2,
    pickupContactName: "",
    pickupContactPhone: "",
    receivingContactName: "",
    receivingContactPhone: "",
    itemPhotos: [] as string[],
  });

  useEffect(() => {
    fetchJson<{ cities: City[] }>("/api/cities").then(({ data }) => {
      if (data?.cities) setCities(data.cities);
    });
    fetchJson<{ user: unknown }>("/api/auth/session").then(({ data }) => {
      setIsLoggedIn(!!data?.user);
    });
  }, []);

  useEffect(() => {
    if (preselectedRideId) {
      fetchJson<{ ride: Record<string, unknown> }>(`/api/rides/${preselectedRideId}`).then(
        ({ data }) => {
          if (data?.ride) {
            setSelectedRide(data.ride);
            setStep("form");
          }
        }
      );
    }
  }, [preselectedRideId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams();
    if (search.from) params.set("from", search.from);
    if (search.to) params.set("to", search.to);

    const { data } = await fetchJson<{ rides: Array<Record<string, unknown>> }>(
      `/api/parcels?${params}`
    );
    setRides(data?.rides ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRide) return;

    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string; parcel?: { id: string; totalPrice: number } }>(
      "/api/parcels",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: selectedRide.id,
          ...form,
          pickupCity: selectedRide.originCity,
          destinationCity: selectedRide.destinationCity,
        }),
      }
    );
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Failed to send parcel request");
      return;
    }

    setParcel(data?.parcel ?? null);
    setStep("done");
  }

  if (isLoggedIn === null) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Package className="w-12 h-12 text-brand-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Send a parcel</h1>
        <p className="text-muted mb-6">Log in to send parcels on intercity trips.</p>
        <Link href="/login?redirect=/parcel" className="inline-flex px-8 py-3 rounded-xl font-semibold text-white gradient-hero">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Package className="w-7 h-7 text-brand-600" />
        Send a parcel
      </h1>
      <p className="text-muted mb-8">
        Match your parcel to drivers already travelling your route. Cheaper than courier for intercity delivery.
      </p>

      {step === "search" && (
        <>
          <form onSubmit={handleSearch} className="bg-white rounded-2xl border p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">From</label>
                <select
                  value={search.from}
                  onChange={(e) => setSearch({ ...search, from: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Any city</option>
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">To</label>
                <select
                  value={search.to}
                  onChange={(e) => setSearch({ ...search, to: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Any city</option>
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white gradient-hero flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find trips with parcel space
            </button>
          </form>

          <div className="space-y-4">
            {rides.map((ride) => (
              <div key={ride.id as string} className="relative">
                <RideCard ride={ride as Parameters<typeof RideCard>[0]["ride"]} showParcel />
                <button
                  onClick={() => { setSelectedRide(ride); setStep("form"); }}
                  className="absolute top-5 right-5 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600"
                >
                  Select trip
                </button>
              </div>
            ))}
            {rides.length === 0 && !loading && (
              <p className="text-center text-muted py-8">Search for trips with available parcel space.</p>
            )}
          </div>
        </>
      )}

      {step === "form" && selectedRide && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-4">
          <div className="bg-brand-50 rounded-xl p-4 mb-4">
            <p className="font-medium text-gray-900">
              {selectedRide.originCity as string} → {selectedRide.destinationCity as string}
            </p>
            <p className="text-sm text-muted mt-1">
              Parcel fee: {formatPrice(selectedRide.parcelPrice as number)}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Item type</label>
              <select value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} className={inputClass}>
                {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Size</label>
              <select value={form.itemSize} onChange={(e) => setForm({ ...form, itemSize: e.target.value })} className={inputClass}>
                {PARCEL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Weight (kg)</label>
            <input type="number" min={0.1} step={0.1} value={form.itemWeight} onChange={(e) => setForm({ ...form, itemWeight: parseFloat(e.target.value) })} className={inputClass} required />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Pickup contact</label>
              <input type="text" value={form.pickupContactName} onChange={(e) => setForm({ ...form, pickupContactName: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Pickup phone</label>
              <input type="tel" value={form.pickupContactPhone} onChange={(e) => setForm({ ...form, pickupContactPhone: e.target.value })} className={inputClass} placeholder="+27..." required />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Receiving contact</label>
              <input type="text" value={form.receivingContactName} onChange={(e) => setForm({ ...form, receivingContactName: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Receiving phone</label>
              <input type="tel" value={form.receivingContactPhone} onChange={(e) => setForm({ ...form, receivingContactPhone: e.target.value })} className={inputClass} placeholder="+27..." required />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Item photos (placeholder)</label>
            <input
              type="text"
              placeholder="e.g. parcel_photo.jpg"
              className={inputClass}
              onChange={(e) => setForm({ ...form, itemPhotos: e.target.value ? [e.target.value] : [] })}
            />
            <p className="text-xs text-muted mt-1">MVP: enter filename. Production will support camera upload.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("search")} className="flex-1 py-3 rounded-xl border font-medium text-gray-700">
              Back
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-white gradient-accent flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Request delivery
            </button>
          </div>
        </form>
      )}

      {step === "done" && parcel && (
        <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
          <Package className="w-12 h-12 text-brand-600 mx-auto" />
          <h2 className="text-xl font-bold">Parcel request sent!</h2>
          <StatusBadge status="requested" />
          <p className="text-sm text-muted">
            The driver will accept or reject. Pay {formatPrice(parcel.totalPrice)} after acceptance to unlock chat & tracking.
          </p>
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-3 rounded-xl font-semibold text-white gradient-accent"
          >
            Pay now (after driver accepts)
          </button>
          <Link href="/bookings" className="block text-brand-600 font-medium text-sm hover:underline">
            View in My Bookings →
          </Link>

          {showPayment && (
            <PaymentModal
              amount={parcel.totalPrice}
              referenceType="parcel"
              referenceId={parcel.id}
              onSuccess={() => { setShowPayment(false); router.push("/bookings"); }}
              onCancel={() => setShowPayment(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ParcelPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
      <ParcelPageContent />
    </Suspense>
  );
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
