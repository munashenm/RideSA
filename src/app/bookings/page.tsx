"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ClipboardList, Car, Check, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { ChatPanel } from "@/components/ChatPanel";
import { formatPrice, formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

type BookingsData = {
  passengerBookings: Array<Record<string, unknown>>;
  driverBookings: Array<Record<string, unknown>>;
  driverParcels: Array<Record<string, unknown>>;
};

export default function BookingsPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    passengerBookings: Array<Record<string, unknown>>;
    driverBookings: Array<Record<string, unknown>>;
    driverParcels: Array<Record<string, unknown>>;
  } | null>(null);
  const [tab, setTab] = useState<"rides" | "driving">("rides");
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    fetchJson<BookingsData>("/api/bookings").then(({ data, status }) => {
      if (status === 401) {
        router.push("/login?redirect=/bookings");
        return;
      }
      if (data) {
        setData({
          passengerBookings: data.passengerBookings,
          driverBookings: data.driverBookings,
          driverParcels: data.driverParcels,
        });
      }
    });
  }, [router]);

  async function refresh() {
    const { data, status } = await fetchJson<BookingsData>("/api/bookings");
    if (status === 401) {
      router.push("/login?redirect=/bookings");
      return;
    }
    if (data) {
      setData({
        passengerBookings: data.passengerBookings,
        driverBookings: data.driverBookings,
        driverParcels: data.driverParcels,
      });
    }
  }

  async function handleBookingAction(id: string, status: "accepted" | "rejected") {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
  }

  async function handleParcelAction(id: string, status: string, proofOfDelivery?: string) {
    await fetch(`/api/parcels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, proofOfDelivery }),
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

  const driverCount = data.driverBookings.length + data.driverParcels.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Bookings</h1>
      <p className="text-sm text-muted mb-6">
        Ride bookings as a passenger.{" "}
        <Link href="/my-parcels" className="text-brand-600 hover:underline">View parcel deliveries →</Link>
      </p>

      <div className="flex gap-2 mb-8">
        <TabButton active={tab === "rides"} onClick={() => setTab("rides")} icon={ClipboardList} label="Ride bookings" count={data.passengerBookings.length} />
        <TabButton active={tab === "driving"} onClick={() => setTab("driving")} icon={Car} label="As driver" count={driverCount} />
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
                    <button onClick={() => setPaymentTarget({ id: b.id as string, amount: b.totalPrice as number })} className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent">
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

      {tab === "driving" && (
        <div className="space-y-6">
          {driverCount === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border">
              <p className="text-muted mb-4">No driver requests yet.</p>
              <Link href="/driver/apply" className="text-brand-600 font-medium hover:underline">Become a verified driver</Link>
            </div>
          ) : (
            <>
              <section>
                <h2 className="font-semibold text-gray-900 mb-3">Passenger requests</h2>
                {data.driverBookings.length === 0 ? (
                  <p className="text-sm text-muted bg-white rounded-xl border p-4">No passenger requests.</p>
                ) : (
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
                )}
              </section>

              <section>
                <h2 className="font-semibold text-gray-900 mb-3">Parcel requests</h2>
                {data.driverParcels.length === 0 ? (
                  <p className="text-sm text-muted bg-white rounded-xl border p-4">No parcel requests.</p>
                ) : (
                  <div className="space-y-3">
                    {data.driverParcels.map((p) => {
                      const sender = p.sender as Record<string, unknown>;
                      const nextStatus = getNextParcelStatus(p.status as string);
                      return (
                        <div key={p.id as string} className="bg-white rounded-xl border p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium">{sender.name as string}</p>
                              <p className="text-sm text-muted">{p.itemType as string} · {p.itemWeight as number}kg · {p.pickupCity as string} → {p.destinationCity as string}</p>
                            </div>
                            <StatusBadge status={p.status as string} />
                          </div>
                          {p.status === "requested" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleParcelAction(p.id as string, "accepted")} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Accept</button>
                              <button onClick={() => handleParcelAction(p.id as string, "rejected")} className="flex-1 py-2 rounded-lg border text-sm font-medium">Reject</button>
                            </div>
                          )}
                          {nextStatus && !["requested", "rejected", "delivered"].includes(p.status as string) && (
                            <button onClick={() => handleParcelAction(p.id as string, nextStatus, nextStatus === "delivered" ? "proof_of_delivery.jpg" : undefined)} className="w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
                              Mark as {nextStatus.replace("_", " ")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          amount={paymentTarget.amount}
          referenceType="booking"
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

function getNextParcelStatus(current: string): string | null {
  const flow: Record<string, string> = { accepted: "collected", collected: "in_transit", in_transit: "delivered" };
  return flow[current] ?? null;
}
