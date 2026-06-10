import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isApprovedBusOperator, isBusOperator } from "@/lib/user-permissions";
import { BusOperatorDashboard } from "@/components/BusOperatorDashboard";

export default async function BusOperatorDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/operator/bus/dashboard");
  if (!isBusOperator(user)) redirect("/operator/bus/apply");
  if (!isApprovedBusOperator(user)) redirect("/operator/bus/apply");

  return <BusOperatorDashboard />;
}
