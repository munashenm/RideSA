import { OperatorApplyForm } from "@/components/OperatorApplyForm";
import { USER_ROLES } from "@/lib/constants";

export default function TaxiOperatorApplyPage() {
  return (
    <OperatorApplyForm
      operatorType={USER_ROLES.TAXI_OPERATOR}
      title="Taxi operator verification"
      description="Submit your association documents for admin approval before listing routes and departures."
      dashboardPath="/operator/taxi/dashboard"
    />
  );
}
