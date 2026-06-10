export const BOOKING_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PAID: "paid",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const TRIP_STATUS = {
  SCHEDULED: "scheduled",
  IN_TRANSIT: "in_transit",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const DRIVER_VERIFICATION_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const USER_ROLES = {
  PASSENGER: "passenger",
  DRIVER: "driver",
  BUS_OPERATOR: "bus_operator",
  TAXI_OPERATOR: "taxi_operator",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const START_ACTIONS = {
  RIDE: "ride",
  BUS: "bus",
  TAXI: "taxi",
  DRIVER: "driver",
  BUS_OPERATOR: "bus_operator",
  TAXI_OPERATOR: "taxi_operator",
} as const;

export type StartAction = (typeof START_ACTIONS)[keyof typeof START_ACTIONS];

export const TRANSPORT_TYPES = {
  RIDE: "ride",
  BUS: "bus",
  TAXI: "taxi",
} as const;

export type TransportType = (typeof TRANSPORT_TYPES)[keyof typeof TRANSPORT_TYPES];

export const PAYMENT_METHODS = [
  { id: "paystack", label: "Paystack", description: "Card, EFT & bank — secure checkout" },
  { id: "ozow", label: "Ozow EFT", description: "Instant EFT (demo)" },
  { id: "card", label: "Card", description: "Visa / Mastercard (demo)" },
  { id: "eft", label: "EFT", description: "Manual bank transfer (demo)" },
] as const;

export const POPULAR_ROUTES = [
  { label: "JHB → Polokwane", from: "johannesburg", to: "polokwane" },
  { label: "JHB → Durban", from: "johannesburg", to: "durban" },
  { label: "JHB → Cape Town", from: "johannesburg", to: "cape-town" },
  { label: "Pretoria → Polokwane", from: "pretoria", to: "polokwane" },
  { label: "Polokwane → Musina", from: "polokwane", to: "musina" },
  { label: "JHB → Musina", from: "johannesburg", to: "musina" },
  { label: "Durban → Cape Town", from: "durban", to: "cape-town" },
  { label: "Cape Town → George", from: "cape-town", to: "george" },
  { label: "Pretoria → Mbombela", from: "pretoria", to: "mbombela" },
];

export function getStartActionRedirect(action: string): string {
  switch (action) {
    case START_ACTIONS.BUS:
      return "/search/buses";
    case START_ACTIONS.TAXI:
      return "/search/taxis";
    case START_ACTIONS.DRIVER:
      return "/driver/apply";
    case START_ACTIONS.BUS_OPERATOR:
      return "/operator/bus/apply";
    case START_ACTIONS.TAXI_OPERATOR:
      return "/operator/taxi/apply";
    default:
      return "/search";
  }
}

export function getRoleForStartAction(action: string): UserRole {
  switch (action) {
    case START_ACTIONS.BUS_OPERATOR:
      return USER_ROLES.BUS_OPERATOR;
    case START_ACTIONS.TAXI_OPERATOR:
      return USER_ROLES.TAXI_OPERATOR;
    default:
      return USER_ROLES.PASSENGER;
  }
}

export function getTransportSearchPath(type: TransportType): string {
  switch (type) {
    case TRANSPORT_TYPES.BUS:
      return "/search/buses";
    case TRANSPORT_TYPES.TAXI:
      return "/search/taxis";
    default:
      return "/search";
  }
}
