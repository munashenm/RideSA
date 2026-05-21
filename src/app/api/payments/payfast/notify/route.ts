import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayFastItnSignature } from "@/lib/payfast";
import { processPayment } from "@/lib/payments";

export { dynamic } from "@/lib/dynamic-api";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const body: Record<string, string> = {};
  form.forEach((value, key) => {
    body[key] = String(value);
  });

  if (!verifyPayFastItnSignature(body, body.signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (body.payment_status !== "COMPLETE") {
    return NextResponse.json({ ok: true });
  }

  const intent = await prisma.paymentIntent.findUnique({
    where: { id: body.m_payment_id },
  });
  if (!intent || intent.status === "completed") {
    return NextResponse.json({ ok: true });
  }

  await processPayment({
    userId: intent.userId,
    amount: intent.amount,
    method: "payfast",
    referenceType: intent.referenceType as "booking" | "parcel",
    referenceId: intent.referenceId,
    externalRef: body.pf_payment_id,
    promoCode: intent.promoCode ?? undefined,
  });

  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { status: "completed", externalRef: body.pf_payment_id },
  });

  return NextResponse.json({ ok: true });
}
