"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchJson } from "@/lib/fetch-client";

interface BookingFormProps {
  rideId: string;
  pricePerSeat: number;
  maxSeats: number;
  isLoggedIn: boolean;
  existingBooking?: {
    id: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    seats: number;
  } | null;
}

export function BookingForm({
  rideId,
  pricePerSeat,
  maxSeats,
  isLoggedIn,
  existingBooking,
}: BookingFormProps) {
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(existingBooking);
  const [showPayment, setShowPayment] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted mb-4">Log in to book this trip</p>
        <Link
          href={`/login?redirect=/rides/${rideId}`}
          className="block w-full py-3 rounded-xl font-semibold text-white gradient-hero hover:opacity-90 transition-opacity"
        >
          Log in to book
        </Link>
      </div>
    );
  }

  if (booking) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Booking status</span>
          <StatusBadge status={booking.status} />
        </div>
        <p className="text-sm text-gray-600">
          {booking.seats} seat{booking.seats > 1 ? "s" : ""} · {formatPrice(booking.totalPrice)}
        </p>

        {booking.status === "pending" && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
            Waiting for driver to accept your booking. Pay after acceptance.
          </p>
        )}

        {booking.status === "accepted" && booking.paymentStatus === "unpaid" && (
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-3 rounded-xl font-semibold text-white gradient-accent hover:opacity-90"
          >
            Pay {formatPrice(booking.totalPrice)}
          </button>
        )}

        {booking.paymentStatus === "paid" && (
          <div className="text-center py-3 bg-green-50 rounded-xl">
            <p className="font-semibold text-green-700">Payment complete</p>
            <p className="text-xs text-green-600 mt-1">Chat is now unlocked below</p>
          </div>
        )}

        {showPayment && (
          <PaymentModal
            amount={booking.totalPrice}
            referenceType="booking"
            referenceId={booking.id}
            onSuccess={() => {
              setShowPayment(false);
              setBooking({ ...booking, paymentStatus: "paid", status: "paid" });
              router.refresh();
            }}
            onCancel={() => setShowPayment(false)}
          />
        )}
      </div>
    );
  }

  async function handleBook() {
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string; booking: typeof booking }>(
      `/api/rides/${rideId}/book`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats }),
      }
    );
    setLoading(false);

    if (!ok || !data?.booking) {
      setError(data?.error || "Booking failed");
      return;
    }

    setBooking(data.booking);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Seats
        </label>
        <select
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} seat{n > 1 ? "s" : ""} — {formatPrice(pricePerSeat * n)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleBook}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-white gradient-accent hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Request {seats} seat{seats > 1 ? "s" : ""}
      </button>

      <p className="text-xs text-muted text-center">
        Driver must accept before you pay. Chat unlocks after payment.
      </p>
    </div>
  );
}
