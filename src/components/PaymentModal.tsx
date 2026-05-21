"use client";

import { useState } from "react";
import { Loader2, CreditCard, Building2, Wallet } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  payfast: <Wallet className="w-5 h-5" />,
  ozow: <Building2 className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  eft: <Building2 className="w-5 h-5" />,
};

interface PaymentModalProps {
  amount: number;
  referenceType: "booking" | "parcel";
  referenceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentModal({
  amount,
  referenceType,
  referenceId,
  onSuccess,
  onCancel,
}: PaymentModalProps) {
  const [method, setMethod] = useState("payfast");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string }>("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, referenceType, referenceId, amount }),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Payment failed");
      return;
    }

    onSuccess?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Complete payment</h3>
        <p className="text-sm text-muted mb-6">
          Pay {formatPrice(amount)} to confirm your {referenceType === "booking" ? "seat booking" : "parcel delivery"}.
          Chat unlocks after payment.
        </p>

        <div className="space-y-2 mb-6">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors",
                method === m.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="text-brand-600">{METHOD_ICONS[m.id]}</div>
              <div>
                <p className="font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-muted">{m.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted mb-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
          MVP placeholder — payment simulates success. Production will integrate PayFast, Ozow, and card gateways.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-semibold text-white gradient-hero hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Pay {formatPrice(amount)}
          </button>
        </div>
      </div>
    </div>
  );
}
