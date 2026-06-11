import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { verifyPaystackTransaction, completePaymentIntent, isPaystackConfigured } from "@/lib/paystack";
import { prisma } from "@/lib/db";

export { dynamic } from "@/lib/dynamic-api";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const intent = await prisma.paymentIntent.findUnique({ where: { id: reference } });
  if (!intent || intent.userId !== user.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (intent.status === "completed") {
    return NextResponse.json({ success: true, referenceType: intent.referenceType });
  }

  if (intent.method === "ozow" || intent.method === "capitec") {
    await completePaymentIntent({ intentId: reference });
    return NextResponse.json({ success: true, referenceType: intent.referenceType });
  }

  if (!isPaystackConfigured()) {
    await completePaymentIntent({ intentId: reference });
    return NextResponse.json({ success: true, referenceType: intent.referenceType });
  }

  const tx = await verifyPaystackTransaction(reference);
  if (!tx || tx.status !== "success") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  const result = await completePaymentIntent({
    intentId: reference,
    externalRef: String(tx.id),
    paystackAmountCents: tx.amount,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Payment validation failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true, referenceType: intent.referenceType });
}
