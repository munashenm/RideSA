"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

interface City {
  name: string;
  slug: string;
  province: string;
}

export default function PublishPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [driverStatus, setDriverStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    originSlug: "",
    destinationSlug: "",
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: "08:00",
    pricePerSeat: 300,
    seatsTotal: 3,
    description: "",
    carModel: "",
    carColor: "",
    smokingAllowed: false,
    petsAllowed: false,
    luggageSize: "medium",
    parcelSpaceTotal: 2,
    parcelPrice: 150,
    maxParcelWeight: 20,
    maxParcelSize: "medium",
    pickupPoint: "",
    dropoffPoint: "",
    womenOnly: false,
  });

  useEffect(() => {
    fetchJson<{ cities: City[] }>("/api/cities").then(({ data }) => {
      if (data?.cities) setCities(data.cities);
    });
    fetchJson<{ user: { driverVerificationStatus?: string } | null }>("/api/auth/session").then(
      ({ data }) => {
        setIsLoggedIn(!!data?.user);
        if (data?.user) {
          setDriverStatus(data.user.driverVerificationStatus ?? "none");
        }
      }
    );
  }, []);

  function update(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const origin = cities.find((c) => c.slug === form.originSlug);
    const destination = cities.find((c) => c.slug === form.destinationSlug);

    if (!origin || !destination) {
      setError("Please select valid cities");
      setLoading(false);
      return;
    }

    if (form.originSlug === form.destinationSlug) {
      setError("Origin and destination must be different");
      setLoading(false);
      return;
    }

    const { data, ok } = await fetchJson<{ error?: string; ride?: { id: string } }>("/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        originCity: origin.name,
        destinationCity: destination.name,
        pricePerSeat: Number(form.pricePerSeat),
        seatsTotal: Number(form.seatsTotal),
        parcelSpaceTotal: Number(form.parcelSpaceTotal),
        parcelPrice: Number(form.parcelPrice),
        maxParcelWeight: Number(form.maxParcelWeight),
      }),
    });
    setLoading(false);

    if (!ok || !data?.ride?.id) {
      setError(data?.error || "Failed to post trip");
      return;
    }

    router.push(`/rides/${data.ride.id}`);
  }

  if (isLoggedIn === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Post a trip</h1>
        <p className="text-muted mb-6">Log in to offer seats and parcel space on your planned trip.</p>
        <Link href="/login?redirect=/publish" className="inline-flex px-8 py-3 rounded-xl font-semibold text-white gradient-hero">
          Log in
        </Link>
      </div>
    );
  }

  if (driverStatus !== "approved") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Verified driver required</h1>
        <p className="text-muted mb-6">
          {driverStatus === "pending"
            ? "Your verification is pending admin approval. You can still book rides and send parcels."
            : driverStatus === "rejected"
              ? "Your verification was rejected. Resubmit your documents to post trips."
              : "Complete driver verification to post trips. All users can book rides and send parcels without it."}
        </p>
        <Link href="/driver/apply" className="inline-flex px-8 py-3 rounded-xl font-semibold text-white gradient-hero">
          {driverStatus === "pending" ? "View verification" : "Become a driver"}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Post a trip</h1>
      <p className="text-muted mb-8">Share your planned intercity journey. Offer seats and parcel space.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="From">
            <select value={form.originSlug} onChange={(e) => update("originSlug", e.target.value)} className={inputClass} required>
              <option value="">Select city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="To">
            <select value={form.destinationSlug} onChange={(e) => update("destinationSlug", e.target.value)} className={inputClass} required>
              <option value="">Select city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" value={form.departureDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => update("departureDate", e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Departure time">
            <input type="time" value={form.departureTime} onChange={(e) => update("departureTime", e.target.value)} className={inputClass} required />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Price per seat (ZAR)">
            <input type="number" min={50} max={5000} value={form.pricePerSeat} onChange={(e) => update("pricePerSeat", e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Available seats">
            <select value={form.seatsTotal} onChange={(e) => update("seatsTotal", e.target.value)} className={inputClass}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-500" /> Parcel space
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Parcel slots">
              <select value={form.parcelSpaceTotal} onChange={(e) => update("parcelSpaceTotal", e.target.value)} className={inputClass}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Price per parcel (ZAR)">
              <input type="number" min={0} value={form.parcelPrice} onChange={(e) => update("parcelPrice", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Max weight (kg)">
              <input type="number" min={1} value={form.maxParcelWeight} onChange={(e) => update("maxParcelWeight", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Max size">
              <select value={form.maxParcelSize} onChange={(e) => update("maxParcelSize", e.target.value)} className={inputClass}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Pickup point">
            <input type="text" placeholder="e.g. Sandton City entrance" value={form.pickupPoint} onChange={(e) => update("pickupPoint", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Drop-off point">
            <input type="text" placeholder="e.g. Polokwane Mall" value={form.dropoffPoint} onChange={(e) => update("dropoffPoint", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Car model">
            <input type="text" placeholder="e.g. Toyota Corolla" value={form.carModel} onChange={(e) => update("carModel", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Car colour">
            <input type="text" placeholder="e.g. White" value={form.carColor} onChange={(e) => update("carColor", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Description">
          <textarea rows={3} placeholder="Tell passengers about your trip — route, stops, preferences..." value={form.description} onChange={(e) => update("description", e.target.value)} className={inputClass} />
        </Field>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.smokingAllowed} onChange={(e) => update("smokingAllowed", e.target.checked)} className="rounded text-brand-600" />
            Smoking allowed
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.petsAllowed} onChange={(e) => update("petsAllowed", e.target.checked)} className="rounded text-brand-600" />
            Pets welcome
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.womenOnly} onChange={(e) => update("womenOnly", e.target.checked)} className="rounded text-brand-600" />
            Women-only trip
          </label>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white gradient-hero hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Post trip
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";
