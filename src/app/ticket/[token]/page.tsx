import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketQr } from "@/components/TicketQr";
import { Bus, Car, Ticket } from "lucide-react";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getSessionUser();

  const [busBooking, taxiBooking] = await Promise.all([
    prisma.busBooking.findUnique({
      where: { ticketToken: token },
      include: {
        passenger: { select: { id: true, name: true } },
        schedule: {
          include: {
            route: { include: { operator: { select: { name: true } } } },
            bus: { select: { name: true, registrationNumber: true } },
          },
        },
      },
    }),
    prisma.taxiBooking.findUnique({
      where: { ticketToken: token },
      include: {
        passenger: { select: { id: true, name: true } },
        departure: {
          include: {
            route: { include: { operator: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const booking = busBooking
    ? { type: "bus" as const, data: busBooking }
    : taxiBooking
      ? { type: "taxi" as const, data: taxiBooking }
      : null;

  if (!booking) notFound();

  const isOwner = user?.id === booking.data.passengerId;
  const isPaid = booking.data.paymentStatus === "paid";
  const isCancelled = booking.data.status === "cancelled";

  if (!isPaid && !isOwner) {
    notFound();
  }

  const routeLabel =
    booking.type === "bus"
      ? `${booking.data.schedule.route.originCity} → ${booking.data.schedule.route.destinationCity}`
      : `${booking.data.departure.route.originCity} → ${booking.data.departure.route.destinationCity}`;

  const departureDate =
    booking.type === "bus"
      ? booking.data.schedule.departureDate
      : booking.data.departure.departureDate;

  const departureTime =
    booking.type === "bus"
      ? booking.data.schedule.departureTime
      : booking.data.departure.departureTime;

  const operatorName =
    booking.type === "bus"
      ? booking.data.schedule.route.operator.name
      : booking.data.departure.route.operator.name;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className={`p-6 text-white ${booking.type === "bus" ? "gradient-accent" : "gradient-hero"}`}>
          <div className="flex items-center gap-2 mb-2">
            {booking.type === "bus" ? <Bus className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            <span className="text-sm font-medium uppercase tracking-wide">
              {booking.type === "bus" ? "Bus ticket" : "Taxi ticket"}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{routeLabel}</h1>
          <p className="text-sm opacity-90 mt-1">{operatorName}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Status</span>
            <StatusBadge status={isCancelled ? "cancelled" : booking.data.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Passenger</span>
            <span className="text-sm font-medium">{booking.data.passenger.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Departure</span>
            <span className="text-sm font-medium">
              {formatDate(departureDate)} · {departureTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Seats</span>
            <span className="text-sm font-medium">{booking.data.seats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="text-sm font-bold text-brand-700">{formatPrice(booking.data.totalPrice)}</span>
          </div>
          {booking.type === "bus" && (
            <div className="flex justify-between">
              <span className="text-sm text-muted">Bus</span>
              <span className="text-sm font-medium">
                {booking.data.schedule.bus.name} ({booking.data.schedule.bus.registrationNumber})
              </span>
            </div>
          )}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" /> Reference
            </p>
            <p className="font-mono text-sm break-all">{booking.data.ticketToken}</p>
          </div>

          {isPaid && !isCancelled && (
            <div className="pt-4 flex flex-col items-center gap-2">
              <TicketQr token={booking.data.ticketToken} />
              <p className="text-xs text-muted text-center">Show this QR code at boarding</p>
            </div>
          )}

          {!isPaid && isOwner && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Payment pending — complete payment from{" "}
              <Link href="/bookings" className="font-medium underline">
                My bookings
              </Link>
              .
            </div>
          )}

          {booking.data.refundStatus === "pending" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              Refund is being processed.
            </div>
          )}
        </div>
      </div>

      <p className="text-center mt-6">
        <Link href="/bookings" className="text-sm text-brand-600 hover:underline">
          ← Back to bookings
        </Link>
      </p>
    </div>
  );
}
