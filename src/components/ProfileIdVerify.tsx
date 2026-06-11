"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";
import { StatusBadge } from "@/components/StatusBadge";

type IdVerificationRecord = {
  status: string;
  failureReason?: string | null;
  verifiedAt?: Date | string | null;
};

export function ProfileIdVerify({
  identityVerified,
  idVerification,
  profileName,
}: {
  identityVerified: boolean;
  idVerification: IdVerificationRecord | null;
  profileName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => {
    const parts = profileName.trim().split(/\s+/);
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" ") ?? "",
      idNumber: "",
    };
  });

  if (identityVerified) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Your South African ID is verified.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{
      verified?: boolean;
      status?: string;
      error?: string;
      failureReason?: string;
    }>("/api/id-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!ok) {
      setError(data?.error || "Verification failed");
      return;
    }

    if (data?.verified) {
      router.refresh();
      return;
    }

    if (data?.status === "pending") {
      router.refresh();
      return;
    }

    setError(data?.error || data?.failureReason || "Verification failed");
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-xl border p-4 bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-brand-600" />
        <h3 className="font-semibold text-gray-900">Verify your SA ID</h3>
      </div>
      <p className="text-sm text-muted mb-4">
        Required before applying as a driver or transport operator. We only store a masked ID number.
      </p>

      {idVerification && !identityVerified && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <StatusBadge status={idVerification.status} />
          {idVerification.failureReason && (
            <span className="text-red-600">{idVerification.failureReason}</span>
          )}
        </div>
      )}

      {idVerification?.status === "pending" ? (
        <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Your ID verification is pending review.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First name (as on ID)</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last name (as on ID)</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SA ID number</label>
            <input
              required
              inputMode="numeric"
              placeholder="13 digits"
              maxLength={13}
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value.replace(/\D/g, "") })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify ID
          </button>
        </form>
      )}
    </div>
  );
}
