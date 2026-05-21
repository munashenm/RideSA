"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentModal } from "@/components/PaymentModal";
import { ChatPanel } from "@/components/ChatPanel";
import { formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

export default function MyParcelsPage() {
  const router = useRouter();
  const [parcels, setParcels] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; amount: number } | null>(null);

  useEffect(() => {
    fetchJson<{ parcelBookings: Array<Record<string, unknown>> }>("/api/bookings").then(
      ({ data, status }) => {
        if (status === 401) {
          router.push("/login?redirect=/my-parcels");
          return;
        }
        if (data) setParcels(data.parcelBookings ?? []);
        setLoading(false);
      }
    );
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-7 h-7 text-brand-600" />
          My Parcels
        </h1>
        <Link href="/parcel" className="text-sm text-brand-600 font-medium hover:underline">
          + Send a parcel
        </Link>
      </div>

      {parcels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-muted mb-4">No parcel deliveries yet.</p>
          <Link href="/parcel" className="text-brand-600 font-medium hover:underline">
            Send your first parcel
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {parcels.map((p) => {
            const ride = p.ride as Record<string, unknown>;
            const driver = ride.driver as Record<string, unknown>;
            return (
              <div key={p.id as string} className="bg-white rounded-2xl border p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {p.pickupCity as string} → {p.destinationCity as string}
                    </p>
                    <p className="text-sm text-muted">
                      {p.itemType as string} · {p.itemWeight as number}kg · {formatPrice(p.totalPrice as number)}
                    </p>
                    <p className="text-xs text-muted">Driver: {driver.name as string}</p>
                  </div>
                  <StatusBadge status={p.status as string} />
                </div>

                <div className="flex gap-1">
                  {["requested", "accepted", "collected", "in_transit", "delivered"].map((s, i) => (
                    <div
                      key={s}
                      className={`flex-1 h-1.5 rounded-full ${
                        getStepIndex(p.status as string) >= i ? "bg-brand-500" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                {p.status === "accepted" && p.paymentStatus === "unpaid" && (
                  <button
                    onClick={() => setPaymentTarget({ id: p.id as string, amount: p.totalPrice as number })}
                    className="w-full py-2.5 rounded-xl font-semibold text-white gradient-accent"
                  >
                    Pay {formatPrice(p.totalPrice as number)}
                  </button>
                )}

                {!!p.chatEnabled && (
                  <ChatPanel parcelBookingId={p.id as string} enabled={!!p.chatEnabled} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          amount={paymentTarget.amount}
          referenceType="parcel"
          referenceId={paymentTarget.id}
          onSuccess={async () => {
            setPaymentTarget(null);
            const { data } = await fetchJson<{ parcelBookings: Array<Record<string, unknown>> }>(
              "/api/bookings"
            );
            if (data) setParcels(data.parcelBookings ?? []);
          }}
          onCancel={() => setPaymentTarget(null)}
        />
      )}
    </div>
  );
}

function getStepIndex(status: string): number {
  return ["requested", "accepted", "collected", "in_transit", "delivered"].indexOf(status);
}
