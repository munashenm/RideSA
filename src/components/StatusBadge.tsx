import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  collected: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_transit: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-50 text-gray-600 border-gray-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  open: "bg-orange-50 text-orange-700 border-orange-200",
  investigating: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  unpaid: "bg-gray-50 text-gray-600 border-gray-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  active: "bg-green-50 text-green-700 border-green-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
        STATUS_STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200",
        className
      )}
    >
      {label}
    </span>
  );
}
