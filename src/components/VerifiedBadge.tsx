import { BadgeCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  driverApproved?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function VerifiedBadge({
  emailVerified,
  phoneVerified,
  identityVerified,
  driverApproved,
  size = "sm",
  className,
}: VerifiedBadgeProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {driverApproved && (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-medium", textSize)}>
          <BadgeCheck className={iconSize} />
          Verified Driver
        </span>
      )}
      {identityVerified && (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium", textSize)}>
          <Shield className={iconSize} />
          ID Verified
        </span>
      )}
      {emailVerified && (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium", textSize)}>
          Email ✓
        </span>
      )}
      {phoneVerified && (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium", textSize)}>
          Phone ✓
        </span>
      )}
    </div>
  );
}
