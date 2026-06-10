"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Bus, Route, Calendar, Ticket, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

interface City {
  name: string;
  slug: string;
}

interface BusItem {
  id: string;
  name: string;
  registrationNumber: string;
  seatCapacity: number;
  status: string;
}

interface BusRouteItem {
  id: string;
  originCity: string;
  destinationCity: string;
  pricePerSeat: number;
  status: string;
}

interface BusScheduleItem {
  id: string;
  departureDate: string;
  departureTime: string;
  seatsAvailable: number;
  route: { originCity: string; destinationCity: string; pricePerSeat: number };
  bus: { name: string };
}

interface BusBookingItem {
  id: string;
  seats: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  passenger: { name: string; email: string; phone: string | null };
  schedule: {
    departureDate: string;
    departureTime: string;
    route: { originCity: string; destinationCity: string };
  };
}

export function BusOperatorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "buses" | "routes" | "schedules" | "bookings">("overview");
  const [cities, setCities] = useState<City[]>([]);
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [routes, setRoutes] = useState<BusRouteItem[]>([]);
  const [schedules, setSchedules] = useState<BusScheduleItem[]>([]);
  const [bookings, setBookings] = useState<BusBookingItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [busForm, setBusForm] = useState({ name: "", registrationNumber: "", seatCapacity: 45 });
  const [routeForm, setRouteForm] = useState({
    originSlug: "",
    destinationSlug: "",
    pricePerSeat: 350,
  });
  const [scheduleForm, setScheduleForm] = useState({
    routeId: "",
    busId: "",
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: "06:00",
  });
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    routeId: "",
    busId: "",
    departureTime: "06:00",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0] as number[],
  });

  async function loadAll() {
    setLoading(true);
    const [citiesRes, busesRes, routesRes, schedulesRes, bookingsRes] = await Promise.all([
      fetchJson<{ cities: City[] }>("/api/cities"),
      fetchJson<{ buses: BusItem[] }>("/api/buses"),
      fetchJson<{ routes: BusRouteItem[] }>("/api/bus-routes"),
      fetchJson<{ schedules: BusScheduleItem[] }>("/api/bus-schedules?operator=true"),
      fetchJson<{ operatorBookings: BusBookingItem[] }>("/api/bus-bookings"),
    ]);

    if (busesRes.status === 403) {
      router.push("/login?redirect=/operator/bus/dashboard");
      return;
    }

    if (citiesRes.data?.cities) setCities(citiesRes.data.cities);
    if (busesRes.data?.buses) setBuses(busesRes.data.buses);
    if (routesRes.data?.routes) setRoutes(routesRes.data.routes);
    if (schedulesRes.data?.schedules) setSchedules(schedulesRes.data.schedules);
    if (bookingsRes.data?.operatorBookings) setBookings(bookingsRes.data.operatorBookings);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const paidBookings = bookings.filter((b) => b.paymentStatus === "paid" || b.status === "completed");
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const ticketsSold = paidBookings.reduce((sum, b) => sum + b.seats, 0);

  async function addBus(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string }>("/api/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(busForm),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to add bus");
      return;
    }
    setBusForm({ name: "", registrationNumber: "", seatCapacity: 45 });
    await loadAll();
  }

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
    const { ok, data } = await fetchJson<{ error?: string }>("/api/bus-routes", {
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
    setRouteForm({ originSlug: "", destinationSlug: "", pricePerSeat: 350 });
    await loadAll();
  }

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string }>("/api/bus-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleForm),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to create schedule");
      return;
    }
    await loadAll();
  }

  async function updateBookingStatus(id: string, action: "check_in" | "complete" | "cancel") {
    await fetchJson("/api/bus-bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await loadAll();
  }

  async function addBulkSchedules(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, data } = await fetchJson<{ error?: string; count?: number }>("/api/bus-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, ...bulkScheduleForm }),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || "Failed to create schedules");
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
          <h1 className="text-2xl font-bold text-gray-900">Bus Operator Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage buses, routes, schedules, and ticket sales</p>
        </div>
        <Link
          href="/operator/bus/earnings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Wallet className="w-4 h-4" /> Earnings & payouts
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {(
          [
            ["overview", "Overview", Wallet],
            ["buses", "Buses", Bus],
            ["routes", "Routes", Route],
            ["schedules", "Schedules", Calendar],
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
          <StatCard label="Buses" value={buses.length} />
          <StatCard label="Routes" value={routes.length} />
          <StatCard label="Tickets sold" value={ticketsSold} />
          <StatCard label="Revenue" value={formatPrice(totalRevenue)} />
        </div>
      )}

      {tab === "buses" && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={addBus} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Add a bus</h2>
            <input placeholder="Bus name (e.g. Intercape 101)" value={busForm.name} onChange={(e) => setBusForm({ ...busForm, name: e.target.value })} className={inputClass} required />
            <input placeholder="Registration number" value={busForm.registrationNumber} onChange={(e) => setBusForm({ ...busForm, registrationNumber: e.target.value })} className={inputClass} required />
            <input type="number" min={8} max={80} placeholder="Seat capacity" value={busForm.seatCapacity} onChange={(e) => setBusForm({ ...busForm, seatCapacity: Number(e.target.value) })} className={inputClass} required />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50">
              Add bus
            </button>
          </form>
          <div className="space-y-3">
            {buses.map((bus) => (
              <div key={bus.id} className="bg-white rounded-xl border p-4">
                <p className="font-medium">{bus.name}</p>
                <p className="text-sm text-muted">{bus.registrationNumber} · {bus.seatCapacity} seats</p>
                <StatusBadge status={bus.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "routes" && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={addRoute} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Create a route</h2>
            <select value={routeForm.originSlug} onChange={(e) => setRouteForm({ ...routeForm, originSlug: e.target.value })} className={inputClass} required>
              <option value="">From city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={routeForm.destinationSlug} onChange={(e) => setRouteForm({ ...routeForm, destinationSlug: e.target.value })} className={inputClass} required>
              <option value="">To city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <input type="number" min={50} placeholder="Price per seat (ZAR)" value={routeForm.pricePerSeat} onChange={(e) => setRouteForm({ ...routeForm, pricePerSeat: Number(e.target.value) })} className={inputClass} required />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50">
              Create route
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

      {tab === "schedules" && (
        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={addSchedule} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Create a schedule</h2>
            <select value={scheduleForm.routeId} onChange={(e) => setScheduleForm({ ...scheduleForm, routeId: e.target.value })} className={inputClass} required>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destinationCity}</option>)}
            </select>
            <select value={scheduleForm.busId} onChange={(e) => setScheduleForm({ ...scheduleForm, busId: e.target.value })} className={inputClass} required>
              <option value="">Select bus</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="date" value={scheduleForm.departureDate} onChange={(e) => setScheduleForm({ ...scheduleForm, departureDate: e.target.value })} className={inputClass} required />
            <input type="time" value={scheduleForm.departureTime} onChange={(e) => setScheduleForm({ ...scheduleForm, departureTime: e.target.value })} className={inputClass} required />
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50">
              Create schedule
            </button>
          </form>
          <form onSubmit={addBulkSchedules} className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Bulk weekly schedules</h2>
            <select value={bulkScheduleForm.routeId} onChange={(e) => setBulkScheduleForm({ ...bulkScheduleForm, routeId: e.target.value })} className={inputClass} required>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destinationCity}</option>)}
            </select>
            <select value={bulkScheduleForm.busId} onChange={(e) => setBulkScheduleForm({ ...bulkScheduleForm, busId: e.target.value })} className={inputClass} required>
              <option value="">Select bus</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input type="time" value={bulkScheduleForm.departureTime} onChange={(e) => setBulkScheduleForm({ ...bulkScheduleForm, departureTime: e.target.value })} className={inputClass} required />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={bulkScheduleForm.startDate} onChange={(e) => setBulkScheduleForm({ ...bulkScheduleForm, startDate: e.target.value })} className={inputClass} required />
              <input type="date" value={bulkScheduleForm.endDate} onChange={(e) => setBulkScheduleForm({ ...bulkScheduleForm, endDate: e.target.value })} className={inputClass} required />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent disabled:opacity-50">
              Create recurring schedules
            </button>
          </form>
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border p-4">
                <p className="font-medium">{s.route.originCity} → {s.route.destinationCity}</p>
                <p className="text-sm text-muted">
                  {formatDate(s.departureDate)} · {s.departureTime} · {s.bus.name} · {s.seatsAvailable} seats left
                </p>
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
                    {b.schedule.route.originCity} → {b.schedule.route.destinationCity} · {formatDate(b.schedule.departureDate)} · {b.seats} seat(s) · {formatPrice(b.totalPrice)}
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
