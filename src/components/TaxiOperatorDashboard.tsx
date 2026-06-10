"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Car, Route, Calendar, Ticket, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

interface City {
  name: string;
  slug: string;
}

interface TaxiRouteItem {
  id: string;
  originCity: string;
  destinationCity: string;
  pricePerSeat: number;
  status: string;
}

interface TaxiDepartureItem {
  id: string;
  departureDate: string;
  departureTime: string;
  seatsTotal: number;
  seatsAvailable: number;
  status: string;
  route: { originCity: string; destinationCity: string; pricePerSeat: number };
}

interface TaxiBookingItem {
  id: string;
  seats: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  passenger: { name: string; email: string; phone: string | null };
  departure: {
    departureDate: string;
    departureTime: string;
    route: { originCity: string; destinationCity: string };
  };
}

export function TaxiOperatorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "routes" | "departures" | "bookings">("overview");
  const [cities, setCities] = useState<City[]>([]);
  const [routes, setRoutes] = useState<TaxiRouteItem[]>([]);
  const [departures, setDepartures] = useState<TaxiDepartureItem[]>([]);
  const [bookings, setBookings] = useState<TaxiBookingItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [routeForm, setRouteForm] = useState({
    originSlug: "",
    destinationSlug: "",
    pricePerSeat: 180,
  });
  const [departureForm, setDepartureForm] = useState({
    routeId: "",
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: "05:30",
    seatsTotal: 14,
  });
  const [bulkDepartureForm, setBulkDepartureForm] = useState({
    routeId: "",
    departureTime: "05:30",
    seatsTotal: 14,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0] as number[],
  });

  async function loadAll() {
    setLoading(true);
    const [citiesRes, routesRes, departuresRes, bookingsRes] = await Promise.all([
      fetchJson<{ cities: City[] }>("/api/cities"),
      fetchJson<{ routes: TaxiRouteItem[] }>("/api/taxi-routes"),
      fetchJson<{ departures: TaxiDepartureItem[] }>("/api/taxi-departures?operator=true"),
      fetchJson<{ operatorBookings: TaxiBookingItem[] }>("/api/taxi-bookings"),
    ]);

    if (routesRes.status === 403) {
      router.push("/login?redirect=/operator/taxi/dashboard");
      return;
    }

    if (citiesRes.data?.cities) setCities(citiesRes.data.cities);
    if (routesRes.data?.routes) setRoutes(routesRes.data.routes);
    if (departuresRes.data?.departures) setDepartures(departuresRes.data.departures);
    if (bookingsRes.data?.operatorBookings) setBookings(bookingsRes.data.operatorBookings);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const paidBookings = bookings.filter((b) => b.paymentStatus === "paid" || b.status === "completed");
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const seatsSold = paidBookings.reduce((sum, b) => sum + b.seats, 0);

  async function addRoute(e: React.FormEvent) {
    e.preventDefault();
    const origin = cities.find((c) => c.slug === routeForm.originSlug);
    const destination = cities.find((c) => c.slug === routeForm.destinationSlug);
    if (!origin || !destination) {
      setError("Select valid cities");
      return;
    }
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string }>("/api/taxi-routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originCity: origin.name,
        originSlug: origin.slug,
        destinationCity: destination.name,
        destinationSlug: destination.slug,
        pricePerSeat: routeForm.pricePerSeat,
      }),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to create route");
      return;
    }
    setRouteForm({ originSlug: "", destinationSlug: "", pricePerSeat: 180 });
    await loadAll();
  }

  async function addDeparture(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string }>("/api/taxi-departures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(departureForm),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to create departure");
      return;
    }
    await loadAll();
  }

  async function updateSeats(id: string, seatsAvailable: number) {
    await fetchJson("/api/taxi-departures", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, seatsAvailable }),
    });
    await loadAll();
  }

  async function updateBookingStatus(id: string, action: "check_in" | "complete" | "cancel") {
    await fetchJson("/api/taxi-bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await loadAll();
  }

  async function addBulkDepartures(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string }>("/api/taxi-departures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, ...bulkDepartureForm }),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to create departures");
      return;
    }
    await loadAll();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taxi Operator Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage routes, departures, seat availability, and bookings</p>
        </div>
        <Link
          href="/operator/taxi/earnings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Wallet className="w-4 h-4" /> Revenue & payouts
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {(
          [
            ["overview", "Overview", Wallet],
            ["routes", "Routes", Route],
            ["departures", "Departures", Calendar],
            ["bookings", "Bookings", Ticket],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              tab === id ? "bg-brand-600 text-white" : "bg-white border text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      {tab === "overview" && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Routes" value={routes.length} />
          <StatCard label="Departures" value={departures.length} />
          <StatCard label="Seats sold" value={seatsSold} />
          <StatCard label="Revenue" value={formatPrice(totalRevenue)} />
        </div>
      )}

      {tab === "routes" && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={addRoute} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Add a taxi route</h2>
            <select value={routeForm.originSlug} onChange={(e) => setRouteForm({ ...routeForm, originSlug: e.target.value })} className={inputClass} required>
              <option value="">From city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={routeForm.destinationSlug} onChange={(e) => setRouteForm({ ...routeForm, destinationSlug: e.target.value })} className={inputClass} required>
              <option value="">To city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <input type="number" min={30} placeholder="Price per seat (ZAR)" value={routeForm.pricePerSeat} onChange={(e) => setRouteForm({ ...routeForm, pricePerSeat: Number(e.target.value) })} className={inputClass} required />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent disabled:opacity-50">
              Add route
            </button>
          </form>
          <div className="space-y-3">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-xl border p-4">
                <p className="font-medium">{route.originCity} → {route.destinationCity}</p>
                <p className="text-sm text-muted">{formatPrice(route.pricePerSeat)} per seat</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "departures" && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={addDeparture} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Add departure time</h2>
            <select value={departureForm.routeId} onChange={(e) => setDepartureForm({ ...departureForm, routeId: e.target.value })} className={inputClass} required>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destinationCity}</option>)}
            </select>
            <input type="date" value={departureForm.departureDate} onChange={(e) => setDepartureForm({ ...departureForm, departureDate: e.target.value })} className={inputClass} required />
            <input type="time" value={departureForm.departureTime} onChange={(e) => setDepartureForm({ ...departureForm, departureTime: e.target.value })} className={inputClass} required />
            <input type="number" min={4} max={16} placeholder="Total seats" value={departureForm.seatsTotal} onChange={(e) => setDepartureForm({ ...departureForm, seatsTotal: Number(e.target.value) })} className={inputClass} required />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent disabled:opacity-50">
              Add departure
            </button>
          </form>
          <form onSubmit={addBulkDepartures} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Bulk weekly departures</h2>
            <select value={bulkDepartureForm.routeId} onChange={(e) => setBulkDepartureForm({ ...bulkDepartureForm, routeId: e.target.value })} className={inputClass} required>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destinationCity}</option>)}
            </select>
            <input type="time" value={bulkDepartureForm.departureTime} onChange={(e) => setBulkDepartureForm({ ...bulkDepartureForm, departureTime: e.target.value })} className={inputClass} required />
            <input type="number" min={4} max={16} value={bulkDepartureForm.seatsTotal} onChange={(e) => setBulkDepartureForm({ ...bulkDepartureForm, seatsTotal: Number(e.target.value) })} className={inputClass} required />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={bulkDepartureForm.startDate} onChange={(e) => setBulkDepartureForm({ ...bulkDepartureForm, startDate: e.target.value })} className={inputClass} required />
              <input type="date" value={bulkDepartureForm.endDate} onChange={(e) => setBulkDepartureForm({ ...bulkDepartureForm, endDate: e.target.value })} className={inputClass} required />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50">
              Create recurring departures
            </button>
          </form>
          <div className="space-y-3">
            {departures.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border p-4">
                <p className="font-medium">{d.route.originCity} → {d.route.destinationCity}</p>
                <p className="text-sm text-muted mb-2">
                  {formatDate(d.departureDate)} · {d.departureTime}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Seats available:</label>
                  <input
                    type="number"
                    min={0}
                    max={d.seatsTotal}
                    value={d.seatsAvailable}
                    onChange={(e) => updateSeats(d.id, Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded border text-sm"
                  />
                  <span className="text-xs text-muted">/ {d.seatsTotal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted bg-white rounded-xl border p-6 text-center">No bookings yet.</p>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{b.passenger.name}</p>
                  <p className="text-sm text-muted">
                    {b.departure.route.originCity} → {b.departure.route.destinationCity} · {formatDate(b.departure.departureDate)} · {b.seats} seat(s) · {formatPrice(b.totalPrice)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <StatusBadge status={b.status} />
                    <StatusBadge status={b.paymentStatus} />
                  </div>
                </div>
                {b.paymentStatus === "paid" && b.status !== "cancelled" && b.status !== "completed" && (
                  <div className="flex flex-wrap gap-2">
                    {b.status !== "checked_in" && (
                      <button onClick={() => updateBookingStatus(b.id, "check_in")} className="px-4 py-2 rounded-lg border text-sm font-medium">
                        Check in
                      </button>
                    )}
                    <button onClick={() => updateBookingStatus(b.id, "complete")} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
                      Complete
                    </button>
                    <button onClick={() => updateBookingStatus(b.id, "cancel")} className="px-4 py-2 rounded-lg border text-sm font-medium text-red-600">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
