import { NextRequest, NextResponse } from "next/server";
import {
  verifyPaystackWebhookSignature,
  completePaymentIntent,
} from "@/lib/paystack";

export { dynamic } from "@/lib/dynamic-api";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    console.error("Paystack webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    data?: { reference?: string; id?: number; status?: string; amount?: number };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, skipped: event.event });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  if (event.data?.status && event.data.status !== "success") {
    return NextResponse.json({ ok: true, skipped: "not_success" });
  }

  try {
    const result = await completePaymentIntent({
      intentId: reference,
      externalRef: event.data?.id ? String(event.data.id) : undefined,
      paystackAmountCents: event.data?.amount,
    });

    if (!result.ok && "error" in result) {
      console.error(`Paystack webhook failed for ${reference}:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, alreadyCompleted: result.alreadyCompleted });
  } catch (error) {
    console.error("Paystack webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
