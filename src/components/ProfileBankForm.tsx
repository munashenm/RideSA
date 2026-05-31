"use client";

import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

export function ProfileBankForm({
  initial,
}: {
  initial: {
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankName: string | null;
  };
}) {
  const [form, setForm] = useState({
    bankAccountName: initial.bankAccountName ?? "",
    bankAccountNumber: initial.bankAccountNumber ?? "",
    bankName: initial.bankName ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const { ok, data } = await fetchJson<{ error?: string }>("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Failed to save");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border p-5 space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
        <Building2 className="w-4 h-4 text-brand-600" />
        Bank details (for driver payouts)
      </h3>
      <input
        type="text"
        placeholder="Account holder name"
        value={form.bankAccountName}
        onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Bank name"
        value={form.bankName}
        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Account number"
        value={form.bankAccountNumber}
        onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
        className={inputClass}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-green-600">Bank details saved</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Save bank details"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
