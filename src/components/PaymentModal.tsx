"use client";

import { useState } from "react";
import { Loader2, CreditCard, Building2, Wallet, Tag } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  paystack: <Wallet className="w-5 h-5" />,
  ozow: <Building2 className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  eft: <Building2 className="w-5 h-5" />,
};

interface PaymentModalProps {
  amount: number;
  referenceType: "booking" | "bus_booking" | "taxi_booking";
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
  const [method, setMethod] = useState("paystack");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);

  async function applyPromo() {
    const { data, ok } = await fetchJson<{ discount?: number; error?: string }>("/api/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, amount }),
    });
    if (ok && data?.discount) {
      setDiscount(data.discount);
    } else {
      setError(data?.error || "Invalid promo");
    }
  }

  const finalAmount = amount - discount;

  async function handlePay() {
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{
      error?: string;
      redirect?: { mode: string; url: string };
    }>("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        referenceType,
        referenceId,
        amount,
        promoCode: promoCode || undefined,
      }),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Payment failed");
      return;
    }

    if (data?.redirect?.mode === "redirect" && data.redirect.url) {
      window.location.href = data.redirect.url;
      return;
    }

    onSuccess?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Complete payment</h3>
        <p className="text-sm text-muted mb-4">
          Pay {formatPrice(finalAmount)} to confirm your{" "}
          {referenceType === "booking"
            ? "seat booking"
            : referenceType === "bus_booking"
              ? "bus ticket"
              : "taxi booking"}.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
          />
          <button type="button" onClick={applyPromo} className="px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1">
            <Tag className="w-3 h-3" /> Apply
          </button>
        </div>
        {discount > 0 && (
          <p className="text-sm text-green-600 mb-4">Discount: -{formatPrice(discount)}</p>
        )}

        <div className="space-y-2 mb-6">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors",
                method === m.id ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border font-medium text-gray-700 hover:bg-gray-50">
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
            Pay {formatPrice(finalAmount)}
          </button>
        </div>
      </div>
    </div>
  );
}
