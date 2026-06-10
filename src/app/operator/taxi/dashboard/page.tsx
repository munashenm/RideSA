import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isApprovedTaxiOperator, isTaxiOperator } from "@/lib/user-permissions";
import { TaxiOperatorDashboard } from "@/components/TaxiOperatorDashboard";

export default async function TaxiOperatorDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/operator/taxi/dashboard");
  if (!isTaxiOperator(user)) redirect("/operator/taxi/apply");
  if (!isApprovedTaxiOperator(user)) redirect("/operator/taxi/apply");

  return <TaxiOperatorDashboard />;
}
