"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function VerifyButton({
  action,
  icon,
  label,
}: {
  action: "verify_email" | "verify_phone";
  icon: React.ReactNode;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleVerify() {
    setLoading(true);
    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium">
        {label} ✓
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
