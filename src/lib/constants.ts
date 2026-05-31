export const BOOKING_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PAID: "paid",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PARCEL_STATUS = {
  REQUESTED: "requested",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COLLECTED: "collected",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
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

export const START_ACTIONS = {
  RIDE: "ride",
  PARCEL: "parcel",
  DRIVER: "driver",
} as const;

export type StartAction = (typeof START_ACTIONS)[keyof typeof START_ACTIONS];

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

export const PARCEL_SIZES = ["small", "medium", "large"] as const;
export const ITEM_TYPES = ["documents", "clothing", "electronics", "food", "gifts", "other"] as const;

export function getStartActionRedirect(action: string): string {
  switch (action) {
    case START_ACTIONS.PARCEL:
      return "/parcel";
    case START_ACTIONS.DRIVER:
      return "/driver/apply";
    default:
      return "/search";
  }
}
