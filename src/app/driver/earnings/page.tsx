import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isApprovedDriver } from "@/lib/user-permissions";
import { formatPrice } from "@/lib/utils";
import { Wallet, ArrowLeft } from "lucide-react";

export default async function DriverEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/driver/earnings");

  if (!isApprovedDriver(user)) {
    redirect("/driver/apply");
  }

  const [rideEarnings, parcelEarnings, payments] = await Promise.all([
    prisma.booking.aggregate({
      where: { ride: { driverId: user.id }, paymentStatus: "paid" },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    prisma.parcelBooking.aggregate({
      where: { ride: { driverId: user.id }, paymentStatus: "paid" },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    prisma.payment.findMany({
      where: { status: "completed", referenceType: { in: ["booking", "parcel"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const total =
    (rideEarnings._sum.totalPrice ?? 0) + (parcelEarnings._sum.totalPrice ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/driver/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Wallet className="w-7 h-7 text-brand-600" />
        Earnings
      </h1>
      <p className="text-muted mb-8">From completed passenger and parcel payments on your trips</p>

      <div className="bg-brand-50 rounded-2xl border border-brand-100 p-8 mb-8 text-center">
        <p className="text-sm text-brand-700 mb-1">Total earnings</p>
        <p className="text-4xl font-bold text-brand-800">{formatPrice(total)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-muted">Passenger bookings</p>
          <p className="text-2xl font-bold mt-1">{formatPrice(rideEarnings._sum.totalPrice ?? 0)}</p>
          <p className="text-xs text-muted mt-1">{rideEarnings._count.id} paid bookings</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-muted">Parcel deliveries</p>
          <p className="text-2xl font-bold mt-1">{formatPrice(parcelEarnings._sum.totalPrice ?? 0)}</p>
          <p className="text-xs text-muted mt-1">{parcelEarnings._count.id} paid parcels</p>
        </div>
      </div>

      <section className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Recent payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                <span className="capitalize">{p.referenceType} · {p.method}</span>
                <span className="font-medium">{formatPrice(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
