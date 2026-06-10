"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Clock, MapPin, Users, Loader2 } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";
import { PaymentModal } from "@/components/PaymentModal";

interface TaxiDeparture {
  id: string;
  departureDate: string;
  departureTime: string;
  seatsAvailable: number;
  seatsTotal: number;
  route: {
    originCity: string;
    destinationCity: string;
    pricePerSeat: number;
    operator: { name: string; rating: number };
  };
}

export function TaxiSearchResults({
  from,
  to,
  date,
  passengers,
}: {
  from?: string;
  to?: string;
  date?: string;
  passengers: string;
}) {
  const router = useRouter();
  const [departures, setDepartures] = useState<TaxiDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"time" | "price">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    params.set("passengers", passengers);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    fetchJson<{ departures: TaxiDeparture[] }>(`/api/taxi-departures?${params}`)
      .then(({ data }) => {
        if (data?.departures) {
          setDepartures(
            data.departures.map((d) => ({
              ...d,
              departureDate:
                typeof d.departureDate === "string"
                  ? d.departureDate
                  : new Date(d.departureDate).toISOString(),
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [from, to, date, passengers, sortBy, sortOrder]);

  async function book(departure: TaxiDeparture) {
    setBookingLoading(departure.id);
    const seats = parseInt(passengers) || 1;
    const { data, ok } = await fetchJson<{ booking?: { id: string; totalPrice: number }; error?: string }>(
      "/api/taxi-bookings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departureId: departure.id, seats }),
      }
    );
    setBookingLoading(null);

    if (!ok || !data?.booking) {
      alert(data?.error || "Booking failed");
      return;
    }

    setBookingId(data.booking.id);
    setPayAmount(data.booking.totalPrice);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (departures.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center text-muted">
        No taxi departures found for this route. Try different dates or cities.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "time" | "price")} className="px-3 py-2 rounded-lg border text-sm">
          <option value="time">Sort by departure</option>
          <option value="price">Sort by price</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")} className="px-3 py-2 rounded-lg border text-sm">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div className="space-y-4">
        {departures.map((departure) => (
          <div key={departure.id} className="bg-white rounded-2xl border p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  {departure.route.originCity} → {departure.route.destinationCity}
                </div>
                <p className="text-sm text-muted mt-1 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(departure.departureDate)} · {departure.departureTime}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Car className="w-3.5 h-3.5" />
                    Taxi rank departure
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {departure.seatsAvailable} of {departure.seatsTotal} seats
                  </span>
                </p>
                <p className="text-xs text-muted mt-1">{departure.route.operator.name} · {departure.route.operator.rating.toFixed(1)}★</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-700">{formatPrice(departure.route.pricePerSeat)}</p>
                  <p className="text-xs text-muted">per seat</p>
                </div>
                <button
                  onClick={() => book(departure)}
                  disabled={bookingLoading === departure.id || departure.seatsAvailable < parseInt(passengers)}
                  className="px-6 py-3 rounded-xl font-semibold text-white gradient-accent disabled:opacity-50"
                >
                  {bookingLoading === departure.id ? "Booking..." : "Book seat"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookingId && (
        <PaymentModal
          referenceType="taxi_booking"
          referenceId={bookingId}
          amount={payAmount}
          onCancel={() => {
            setBookingId(null);
            router.refresh();
          }}
          onSuccess={() => {
            setBookingId(null);
            router.push("/bookings?paid=1");
          }}
        />
      )}
    </>
  );
}
