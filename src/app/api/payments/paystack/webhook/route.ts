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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; id?: number; status?: string };
  };

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  await completePaymentIntent({
    intentId: reference,
    externalRef: event.data?.id ? String(event.data.id) : undefined,
  });

  return NextResponse.json({ ok: true });
}
