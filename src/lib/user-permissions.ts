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
