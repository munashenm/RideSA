"use client";

import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";
import { cn } from "@/lib/utils";

interface PhoneOtpVerifyProps {
  phone: string;
  onVerified?: (code?: string) => void;
  /** When true, uses /api/otp/check (for registration before account exists). */
  guestMode?: boolean;
  className?: string;
  compact?: boolean;
}

export function PhoneOtpVerify({
  phone,
  onVerified,
  guestMode = false,
  className,
  compact,
}: PhoneOtpVerifyProps) {
  const [step, setStep] = useState<"send" | "code">("send");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendOtp() {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid SA phone number");
      return;
    }
    setLoading(true);
    setError("");
    const { data, ok } = await fetchJson<{ error?: string; demoCode?: string }>("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!ok) {
      setError(data?.error || "Failed to send code");
      return;
    }
    setDemoCode(data?.demoCode ?? null);
    setStep("code");
    setSent(true);
  }

  async function verifyOtpCode() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    if (guestMode) {
      onVerified?.(code);
      return;
    }
    setLoading(true);
    setError("");
    const { data, ok } = await fetchJson<{ error?: string }>("/api/otp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!ok) {
      setError(data?.error || "Invalid code");
      return;
    }
    onVerified?.(code);
  }

  if (!phone) return null;

  return (
    <div className={cn("rounded-xl border border-brand-100 bg-brand-50/50 p-4", className)}>
      <p className="text-sm font-medium text-gray-800 flex items-center gap-2 mb-3">
        <Phone className="w-4 h-4 text-brand-600" />
        {sent ? "Enter verification code" : "Verify your phone number"}
      </p>

      {step === "send" ? (
        <button
          type="button"
          onClick={sendOtp}
          disabled={loading || !phone}
          className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Send SMS code
        </button>
      ) : (
        <div className="space-y-3">
          {demoCode && (
            <p className="text-xs text-amber-800 bg-amber-100 px-3 py-2 rounded-lg">
              Dev mode — your code is <strong>{demoCode}</strong>
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-3 rounded-lg border text-center tracking-widest text-lg font-mono"
          />
          <div className={compact ? "flex flex-col gap-2" : "flex gap-2"}>
            <button
              type="button"
              onClick={verifyOtpCode}
              disabled={loading || code.length !== 6}
              className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("send");
                setCode("");
                setSent(false);
              }}
              className="px-4 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-white"
            >
              Resend
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
