"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ClipboardList, Car, Bus, Check, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { ChatPanel } from "@/components/ChatPanel";
import { formatPrice, formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

type BookingsData = {
  passengerBookings: Array<Record<string, unknown>>;
  driverBookings: Array<Record<string, unknown>>;
  busBookings: Array<Record<string, unknown>>;
  taxiBookings: Array<Record<string, unknown>>;
};

export default function BookingsPage() {
  const router = useRouter();
  const [data, setData] = useState<BookingsData | null>(null);
  const [tab, setTab] = useState<"rides" | "buses" | "taxis" | "driving">("rides");
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    amount: number;
    type: "booking" | "bus_booking" | "taxi_booking";
  } | null>(null);

  useEffect(() => {
    fetchJson<BookingsData>("/api/bookings").then(({ data, status }) => {
      if (status === 401) {
        router.push("/login?redirect=/bookings");
        return;
      }
      if (data) setData(data);
    });
  }, [router]);

  async function refresh() {
    const { data, status } = await fetchJson<BookingsData>("/api/bookings");
    if (status === 401) {
      router.push("/login?redirect=/bookings");
      return;
    }
    if (data) setData(data);
  }

  async function handleBookingAction(id: string, status: "accepted" | "rejected") {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
  }

  if (!data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Bookings</h1>
      <p className="text-sm text-muted mb-6">
        Ride shares, bus tickets, and taxi seats — all in one place.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <TabButton active={tab === "rides"} onClick={() => setTab("rides")} icon={ClipboardList} label="Ride sharing" count={data.passengerBookings.length} />
        <TabButton active={tab === "buses"} onClick={() => setTab("buses")} icon={Bus} label="Bus tickets" count={data.busBookings.length} />
        <TabButton active={tab === "taxis"} onClick={() => setTab("taxis")} icon={Car} label="Taxi bookings" count={data.taxiBookings.length} />
        <TabButton active={tab === "driving"} onClick={() => setTab("driving")} icon={Car} label="As driver" count={data.driverBookings.length} />
      </div>

      {tab === "rides" && (
        <div className="space-y-4">
          {data.passengerBookings.length === 0 ? (
            <EmptyState message="No ride bookings yet." href="/search" linkText="Find a ride" />
          ) : (
            data.passengerBookings.map((b) => {
              const ride = b.ride as Record<string, unknown>;
              const driver = ride.driver as Record<string, unknown>;
              return (
                <div key={b.id as string} className="bg-white rounded-2xl border p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {ride.originCity as string} → {ride.destinationCity as string}
                      </p>
                      <p className="text-sm text-muted mt-1">
                        {formatDate(ride.departureDate as string)} · Driver: {driver.name as string} · {b.seats as number} seat(s) · {formatPrice(b.totalPrice as number)}
                      </p>
                    </div>
                    <StatusBadge status={b.status as string} />
                  </div>

                  {b.status === "accepted" && b.paymentStatus === "unpaid" && (
                    <button
                      onClick={() =>
                        setPaymentTarget({
                          id: b.id as string,
                          amount: b.totalPrice as number,
                          type: "booking",
                        })
                      }
                      className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent"
                    >
                      Pay {formatPrice(b.totalPrice as number)}
                    </button>
                  )}

                  {!!b.chatEnabled && <ChatPanel bookingId={b.id as string} enabled={!!b.chatEnabled} />}

                  <Link href={`/rides/${ride.id}`} className="text-sm text-brand-600 hover:underline">View trip →</Link>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "buses" && (
        <div className="space-y-4">
          {data.busBookings.length === 0 ? (
            <EmptyState message="No bus tickets yet." href="/search/buses" linkText="Search bus tickets" />
          ) : (
            data.busBookings.map((b) => {
              const schedule = b.schedule as Record<string, unknown>;
              const route = schedule.route as Record<string, unknown>;
              return (
                <div key={b.id as string} className="bg-white rounded-2xl border p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {route.originCity as string} → {route.destinationCity as string}
                      </p>
                      <p className="text-sm text-muted mt-1">
                        {formatDate(schedule.departureDate as string)} · {b.seats as number} seat(s) · {formatPrice(b.totalPrice as number)}
                      </p>
                    </div>
                    <StatusBadge status={b.paymentStatus as string} />
                  </div>
                  {b.paymentStatus === "unpaid" && (
                    <button
                      onClick={() =>
                        setPaymentTarget({
                          id: b.id as string,
                          amount: b.totalPrice as number,
                          type: "bus_booking",
                        })
                      }
                      className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent"
                    >
                      Pay {formatPrice(b.totalPrice as number)}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "taxis" && (
        <div className="space-y-4">
          {data.taxiBookings.length === 0 ? (
            <EmptyState message="No taxi bookings yet." href="/search/taxis" linkText="Search taxi departures" />
          ) : (
            data.taxiBookings.map((b) => {
              const departure = b.departure as Record<string, unknown>;
              const route = departure.route as Record<string, unknown>;
              return (
                <div key={b.id as string} className="bg-white rounded-2xl border p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {route.originCity as string} → {route.destinationCity as string}
                      </p>
                      <p className="text-sm text-muted mt-1">
                        {formatDate(departure.departureDate as string)} · {b.seats as number} seat(s) · {formatPrice(b.totalPrice as number)}
                      </p>
                    </div>
                    <StatusBadge status={b.paymentStatus as string} />
                  </div>
                  {b.paymentStatus === "unpaid" && (
                    <button
                      onClick={() =>
                        setPaymentTarget({
                          id: b.id as string,
                          amount: b.totalPrice as number,
                          type: "taxi_booking",
                        })
                      }
                      className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent"
                    >
                      Pay {formatPrice(b.totalPrice as number)}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "driving" && (
        <div className="space-y-6">
          {data.driverBookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border">
              <p className="text-muted mb-4">No driver requests yet.</p>
              <Link href="/driver/apply" className="text-brand-600 font-medium hover:underline">Become a verified driver</Link>
            </div>
          ) : (
            <section>
              <h2 className="font-semibold text-gray-900 mb-3">Passenger requests</h2>
              <div className="space-y-3">
                {data.driverBookings.map((b) => {
                  const passenger = b.passenger as Record<string, unknown>;
                  const ride = b.ride as Record<string, unknown>;
                  return (
                    <div key={b.id as string} className="bg-white rounded-xl border p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{passenger.name as string}</p>
                        <p className="text-sm text-muted">
                          {ride.originCity as string} → {ride.destinationCity as string} · {b.seats as number} seat(s) · {formatPrice(b.totalPrice as number)}
                        </p>
                        <StatusBadge status={b.status as string} />
                        {!!b.femaleDriverPreferred && (
                          <p className="text-xs text-purple-700 mt-1">Female driver preferred</p>
                        )}
                      </div>
                      {b.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleBookingAction(b.id as string, "accepted")} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><Check className="w-5 h-5" /></button>
                          <button onClick={() => handleBookingAction(b.id as string, "rejected")} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"><X className="w-5 h-5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          amount={paymentTarget.amount}
          referenceType={paymentTarget.type}
          referenceId={paymentTarget.id}
          onSuccess={async () => { setPaymentTarget(null); await refresh(); }}
          onCancel={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; count: number }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${active ? "bg-brand-600 text-white" : "bg-white border text-gray-700"}`}>
      <Icon className="w-4 h-4" /> {label}
      {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>}
    </button>
  );
}

function EmptyState({ message, href, linkText }: { message: string; href: string; linkText: string }) {
  return (
    <div className="text-center py-12 bg-white rounded-2xl border">
      <p className="text-muted mb-4">{message}</p>
      <Link href={href} className="text-brand-600 font-medium hover:underline">{linkText}</Link>
    </div>
  );
}
