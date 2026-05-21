"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface DriverTripControlsProps {
  rideId: string;
  tripStatus: string;
}

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_transit", label: "In transit" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function DriverTripControls({ rideId, tripStatus }: DriverTripControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(tripStatus);
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const res = await fetch(`/api/rides/${rideId}/book`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripStatus: newStatus }),
    });

    if (res.ok) {
      setStatus(newStatus);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-3 bg-brand-50 rounded-xl">
        <p className="font-medium text-brand-700 mb-2">Your trip</p>
        <StatusBadge status={status} />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
          Update trip status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={loading || status === s.value}
              onClick={() => updateStatus(s.value)}
              className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                status === s.value
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-200 hover:border-brand-300 text-gray-700"
              }`}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted text-center">
        Manage passenger & parcel requests in My Bookings
      </p>
    </div>
  );
}
