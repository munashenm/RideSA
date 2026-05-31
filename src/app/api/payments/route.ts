import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { processPayment, validatePaymentRequest } from "@/lib/payments";
import { createPaystackPayment, isPaystackConfigured } from "@/lib/paystack";
import { validatePromoCode } from "@/lib/promo";

export { dynamic } from "@/lib/dynamic-api";

const paymentSchema = z.object({
  method: z.enum(["paystack", "ozow", "card", "eft"]),
  referenceType: z.enum(["booking", "parcel"]),
  referenceId: z.string(),
  amount: z.number().min(1),
  promoCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = paymentSchema.parse(body);

    let finalAmount = data.amount;
    let discountAmount = 0;
    if (data.promoCode) {
      const promo = await validatePromoCode(data.promoCode, data.amount);
      if (!promo.valid) {
        return NextResponse.json({ error: promo.error }, { status: 400 });
      }
      finalAmount = promo.finalAmount;
      discountAmount = promo.discount;
    }

    const validation = await validatePaymentRequest({
      userId: user.id,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      amount: data.amount,
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (data.method === "paystack") {
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || request.nextUrl.origin;
      const ps = await createPaystackPayment({
        userId: user.id,
        amount: finalAmount,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        email: user.email,
        callbackUrl: `${origin}/payments/callback`,
        promoCode: data.promoCode,
      });

      if (ps.mode === "redirect") {
        return NextResponse.json({ redirect: ps });
      }

      if (!isPaystackConfigured()) {
        const payment = await processPayment({
          userId: user.id,
          amount: finalAmount,
          method: "paystack_demo",
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          promoCode: data.promoCode,
          discountAmount,
        });
        return NextResponse.json({ payment, success: true });
      }
    }

    const payment = await processPayment({
      userId: user.id,
      amount: finalAmount,
      method: data.method,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      promoCode: data.promoCode,
      discountAmount,
    });

    return NextResponse.json({ payment, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
