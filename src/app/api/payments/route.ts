import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { processPayment, validatePaymentRequest } from "@/lib/payments";
import { createPaystackPayment, isPaystackConfigured } from "@/lib/paystack";
import { validatePromoCode } from "@/lib/promo";
import { getOzowPaymentUrl } from "@/lib/ozow";
import { getCapitecPaymentUrl } from "@/lib/capitec";
import { reserveCashPayment } from "@/lib/cash-payments";
import { prisma } from "@/lib/db";

export { dynamic } from "@/lib/dynamic-api";

const paymentSchema = z.object({
  method: z.enum(["paystack", "ozow", "capitec", "cash_rank", "card", "eft"]),
  referenceType: z.enum(["booking", "bus_booking", "taxi_booking"]),
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

    if (data.method === "cash_rank") {
      await reserveCashPayment({
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        userId: user.id,
      });
      return NextResponse.json({
        success: true,
        paymentStatus: "pending_cash",
        message: "Booking reserved. Pay cash at the rank or terminal before boarding.",
      });
    }

    if (data.method === "paystack") {
      const { getAppUrl } = await import("@/lib/site-url");
      const origin = getAppUrl();
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

    if (data.method === "ozow") {
      const intent = await prisma.paymentIntent.create({
        data: {
          userId: user.id,
          amount: finalAmount,
          method: "ozow",
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          promoCode: data.promoCode,
          status: "pending",
        },
      });

      const { getAppUrl } = await import("@/lib/site-url");
      const origin = getAppUrl();
      const ozowUrl = getOzowPaymentUrl({
        amount: finalAmount,
        transactionReference: intent.id,
        bankReference: `VAYASA-${intent.id.slice(0, 8)}`,
        cancelUrl: `${origin}/bookings`,
        successUrl: `${origin}/payments/callback?reference=${intent.id}`,
        customerEmail: user.email,
      });

      if (ozowUrl) {
        return NextResponse.json({ redirect: { mode: "redirect", url: ozowUrl, intentId: intent.id } });
      }

      const payment = await processPayment({
        userId: user.id,
        amount: finalAmount,
        method: "ozow_demo",
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        promoCode: data.promoCode,
        discountAmount,
      });
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "completed" },
      });
      return NextResponse.json({ payment, success: true });
    }

    if (data.method === "capitec") {
      const intent = await prisma.paymentIntent.create({
        data: {
          userId: user.id,
          amount: finalAmount,
          method: "capitec",
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          promoCode: data.promoCode,
          status: "pending",
        },
      });

      const { getAppUrl } = await import("@/lib/site-url");
      const origin = getAppUrl();
      const capitecUrl = getCapitecPaymentUrl({
        amount: finalAmount,
        transactionReference: intent.id,
        returnUrl: `${origin}/payments/callback?reference=${intent.id}`,
        cancelUrl: `${origin}/bookings`,
      });

      if (capitecUrl) {
        return NextResponse.json({ redirect: { mode: "redirect", url: capitecUrl, intentId: intent.id } });
      }

      const payment = await processPayment({
        userId: user.id,
        amount: finalAmount,
        method: "capitec_demo",
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        promoCode: data.promoCode,
        discountAmount,
      });
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "completed" },
      });
      return NextResponse.json({ payment, success: true });
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
