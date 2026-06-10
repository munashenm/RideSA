import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isApprovedBusOperator } from "@/lib/user-permissions";
import { PayoutPanel } from "@/components/PayoutPanel";

export default async function BusOperatorEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/operator/bus/earnings");
  if (!isApprovedBusOperator(user)) redirect("/operator/bus/apply");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/operator/bus/dashboard" className="text-sm text-muted hover:text-gray-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket sales & payouts</h1>
      <p className="text-muted mb-8">Revenue from paid bus bookings on your routes.</p>
      <PayoutPanel payoutType="bus_operator" title="Bus operator payout" />
    </div>
  );
}
