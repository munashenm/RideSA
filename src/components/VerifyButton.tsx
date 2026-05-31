"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

export function VerifyButton({
  action,
  icon,
  label,
}: {
  action: "verify_email";
  icon: React.ReactNode;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleVerify() {
    setLoading(true);
    setMessage("");
    const { data, ok } = await fetchJson<{
      message?: string;
      demoLink?: string;
      error?: string;
    }>("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);

    if (!ok) {
      setMessage(data?.error || "Failed to send verification");
      return;
    }

    setMessage(data?.message || "Check your email");
    if (data?.demoLink) {
      console.log("Email verification link:", data.demoLink);
    }
  }

  if (message) {
    return (
      <span className="inline-flex flex-col gap-1 px-4 py-2 rounded-xl bg-green-50 text-green-800 text-sm max-w-xs">
        <span className="font-medium">{label}</span>
        <span className="text-xs">{message}</span>
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
