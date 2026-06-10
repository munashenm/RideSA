export function isApprovedDriver(user: {
  isDriver: boolean;
  driverVerificationStatus: string;
}): boolean {
  return user.isDriver && user.driverVerificationStatus === "approved";
}

export function isPendingDriver(user: { driverVerificationStatus: string }): boolean {
  return user.driverVerificationStatus === "pending";
}

export function isRejectedDriver(user: { driverVerificationStatus: string }): boolean {
  return user.driverVerificationStatus === "rejected";
}

export function isApprovedBusOperator(user: {
  role: string;
  busOperatorVerificationStatus: string;
  isAdmin?: boolean;
}): boolean {
  return (
    !!user.isAdmin ||
    (user.role === "bus_operator" && user.busOperatorVerificationStatus === "approved")
  );
}

export function isPendingBusOperator(user: {
  role: string;
  busOperatorVerificationStatus: string;
}): boolean {
  return user.role === "bus_operator" && user.busOperatorVerificationStatus === "pending";
}

export function isApprovedTaxiOperator(user: {
  role: string;
  taxiOperatorVerificationStatus: string;
  isAdmin?: boolean;
}): boolean {
  return (
    !!user.isAdmin ||
    (user.role === "taxi_operator" && user.taxiOperatorVerificationStatus === "approved")
  );
}

export function isPendingTaxiOperator(user: {
  role: string;
  taxiOperatorVerificationStatus: string;
}): boolean {
  return user.role === "taxi_operator" && user.taxiOperatorVerificationStatus === "pending";
}

export function isRejectedBusOperator(user: {
  busOperatorVerificationStatus: string;
}): boolean {
  return user.busOperatorVerificationStatus === "rejected";
}

export function isRejectedTaxiOperator(user: {
  taxiOperatorVerificationStatus: string;
}): boolean {
  return user.taxiOperatorVerificationStatus === "rejected";
}

export function canApplyAsBusOperator(user: {
  role: string;
  busOperatorVerificationStatus: string;
}): boolean {
  return (
    user.busOperatorVerificationStatus !== "approved" &&
    user.role !== "taxi_operator"
  );
}

export function canApplyAsTaxiOperator(user: {
  role: string;
  taxiOperatorVerificationStatus: string;
}): boolean {
  return (
    user.taxiOperatorVerificationStatus !== "approved" &&
    user.role !== "bus_operator"
  );
}

export function isBusOperator(user: { role: string; isAdmin?: boolean }): boolean {
  return user.role === "bus_operator" || !!user.isAdmin;
}

export function isTaxiOperator(user: { role: string; isAdmin?: boolean }): boolean {
  return user.role === "taxi_operator" || !!user.isAdmin;
}

export function isAdminUser(user: { role: string; isAdmin?: boolean }): boolean {
  return user.role === "admin" || !!user.isAdmin;
}

export const driverPublicSelect = {
  isDriver: true,
  driverVerificationStatus: true,
} as const;

export function driverIsVerified(driver: {
  isDriver: boolean;
  driverVerificationStatus: string;
}): boolean {
  return isApprovedDriver(driver);
}

export type PayoutType = "driver" | "bus_operator" | "taxi_operator";
