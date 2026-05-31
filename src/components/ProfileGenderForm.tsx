"use client";

import { useState } from "react";
import { Loader2, User } from "lucide-react";
import { GENDER_OPTIONS } from "@/lib/gender";
import { fetchJson } from "@/lib/fetch-client";

export function ProfileGenderForm({ initialGender }: { initialGender: string | null }) {
  const [gender, setGender] = useState(initialGender ?? "");
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
      body: JSON.stringify({ gender: gender || undefined }),
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
        <User className="w-4 h-4 text-brand-600" />
        Gender (for women-only rides &amp; driver matching)
      </h3>
      <p className="text-xs text-muted">
        Self-reported. Used for women-only trip booking and &quot;female driver preferred&quot; search.
      </p>
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
      >
        <option value="">Not set</option>
        {GENDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-green-600">Saved</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Save"}
      </button>
    </form>
  );
}
