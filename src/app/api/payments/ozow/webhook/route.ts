import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyOzowNotification, type OzowNotificationPayload } from "@/lib/ozow";
import { completePaymentIntent } from "@/lib/paystack";

export { dynamic } from "@/lib/dynamic-api";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const payload: OzowNotificationPayload = {
      SiteCode: String(form.get("SiteCode") ?? ""),
      TransactionId: String(form.get("TransactionId") ?? ""),
      TransactionReference: String(form.get("TransactionReference") ?? ""),
      Amount: String(form.get("Amount") ?? ""),
      Status: String(form.get("Status") ?? ""),
      Optional1: form.get("Optional1") ? String(form.get("Optional1")) : undefined,
      Optional2: form.get("Optional2") ? String(form.get("Optional2")) : undefined,
      Optional3: form.get("Optional3") ? String(form.get("Optional3")) : undefined,
      Optional4: form.get("Optional4") ? String(form.get("Optional4")) : undefined,
      Optional5: form.get("Optional5") ? String(form.get("Optional5")) : undefined,
      CurrencyCode: form.get("CurrencyCode") ? String(form.get("CurrencyCode")) : undefined,
      IsTest: form.get("IsTest") ? String(form.get("IsTest")) : undefined,
      Hash: String(form.get("Hash") ?? ""),
    };

    if (!verifyOzowNotification(payload)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    if (payload.Status.toLowerCase() !== "complete") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await completePaymentIntent({
      intentId: payload.TransactionReference,
      externalRef: payload.TransactionId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Payment validation failed" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Ozow webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
