import { Shield, User } from "lucide-react";

export function WomenOnlyTripBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 text-xs font-semibold text-pink-700 bg-pink-50 px-2 py-1 rounded-full"
      }
    >
      <Shield className="w-3 h-3" />
      Women-only ride
    </span>
  );
}

export function FemaleDriverBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full"
      }
    >
      <User className="w-3 h-3" />
      Female driver
    </span>
  );
}
