"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

type PayoutRow = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  bankRef: string | null;
};

export function DriverPayoutPanel() {
  const [earnings, setEarnings] = useState<{
    gross: number;
    commission: number;
    net: number;
  } | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await fetchJson<{
      earnings: { gross: number; commission: number; net: number };
      payouts: PayoutRow[];
    }>("/api/payouts");
    if (data) {
      setEarnings(data.earnings);
      setPayouts(data.payouts);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function requestPayout() {
    setRequesting(true);
    setMessage("");
    const { data, ok } = await fetchJson<{ error?: string; payout?: PayoutRow }>(
      "/api/payouts",
      { method: "POST" }
    );
    setRequesting(false);
    if (!ok) {
      setMessage(data?.error || "Payout request failed");
      return;
    }
    setMessage("Payout requested — admin will process your transfer");
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const hasPending = payouts.some((p) => p.status === "pending" || p.status === "processing");

  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Wallet className="w-5 h-5 text-brand-600" />
        Request payout
      </h2>
      {earnings && (
        <p className="text-sm text-muted">
          Available (after platform fee):{" "}
          <strong className="text-gray-900">{formatPrice(earnings.net)}</strong>
        </p>
      )}
      <button
        type="button"
        onClick={requestPayout}
        disabled={requesting || hasPending || !earnings?.net}
        className="w-full py-3 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {requesting && <Loader2 className="w-4 h-4 animate-spin" />}
        {hasPending ? "Payout pending review" : "Request bank payout"}
      </button>
      {message && <p className="text-sm text-brand-700 bg-brand-50 px-3 py-2 rounded-lg">{message}</p>}
      {payouts.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Payout history</p>
          {payouts.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="capitalize">{p.status}</span>
              <span>{formatPrice(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
