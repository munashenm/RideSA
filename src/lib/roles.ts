export const USER_ROLES = {
  PASSENGER: "passenger",
  DRIVER: "driver",
  BUS_OPERATOR: "bus_operator",
  TAXI_OPERATOR: "taxi_operator",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  passenger: "Passenger",
  driver: "Driver",
  bus_operator: "Bus Operator",
  taxi_operator: "Taxi Operator",
  admin: "Admin",
};

export function isRole(user: { role?: string; isAdmin?: boolean }, role: UserRole): boolean {
  if (role === USER_ROLES.ADMIN) return user.role === USER_ROLES.ADMIN || !!user.isAdmin;
  return user.role === role;
}

export function isBusOperator(user: { role?: string }): boolean {
  return user.role === USER_ROLES.BUS_OPERATOR;
}

export function isTaxiOperator(user: { role?: string }): boolean {
  return user.role === USER_ROLES.TAXI_OPERATOR;
}

export function syncRoleFlags(role: UserRole) {
  return {
    role,
    isAdmin: role === USER_ROLES.ADMIN,
    isDriver: role === USER_ROLES.DRIVER,
    driverVerificationStatus:
      role === USER_ROLES.DRIVER ? undefined : role === USER_ROLES.PASSENGER ? "none" : undefined,
  };
}

export function resolveRoleFromLegacy(user: {
  role?: string;
  isAdmin?: boolean;
  isDriver?: boolean;
}): UserRole {
  if (user.role && Object.values(USER_ROLES).includes(user.role as UserRole)) {
    return user.role as UserRole;
  }
  if (user.isAdmin) return USER_ROLES.ADMIN;
  if (user.isDriver) return USER_ROLES.DRIVER;
  return USER_ROLES.PASSENGER;
}
