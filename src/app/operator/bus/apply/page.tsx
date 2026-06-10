import { OperatorApplyForm } from "@/components/OperatorApplyForm";
import { USER_ROLES } from "@/lib/constants";

export default function BusOperatorApplyPage() {
  return (
    <OperatorApplyForm
      operatorType={USER_ROLES.BUS_OPERATOR}
      title="Bus operator verification"
      description="Submit your company documents for admin approval before managing buses, routes, and ticket sales."
      dashboardPath="/operator/bus/dashboard"
    />
  );
}
