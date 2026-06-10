"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

export default function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }

    fetchJson<{ success?: boolean; referenceType?: string; error?: string }>(
      `/api/payments/verify?reference=${encodeURIComponent(reference)}`
    ).then(({ data, ok }) => {
      if (ok && data?.success) {
        setStatus("success");
        setTimeout(() => router.push("/bookings?paid=1"), 2000);
      } else {
        setStatus("error");
      }
    });
  }, [reference, router]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-brand-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Confirming payment…</h1>
          <p className="text-muted mt-2">Please wait while we verify with Paystack.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Payment successful</h1>
          <p className="text-muted mt-2">Chat is now unlocked. Redirecting…</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Payment could not be confirmed</h1>
          <p className="text-muted mt-2 mb-6">
            Try again from your bookings, or contact support if you were charged.
          </p>
          <Link href="/bookings" className="text-brand-600 font-medium hover:underline">
            Back to bookings
          </Link>
        </>
      )}
    </div>
  );
}
