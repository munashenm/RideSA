import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isApprovedTaxiOperator } from "@/lib/user-permissions";
import { PayoutPanel } from "@/components/PayoutPanel";

export default async function TaxiOperatorEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/operator/taxi/earnings");
  if (!isApprovedTaxiOperator(user)) redirect("/operator/taxi/apply");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/operator/taxi/dashboard" className="text-sm text-muted hover:text-gray-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Revenue & payouts</h1>
      <p className="text-muted mb-8">Earnings from paid taxi seat bookings on your routes.</p>
      <PayoutPanel payoutType="taxi_operator" title="Taxi operator payout" />
    </div>
  );
}
