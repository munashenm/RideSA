import { createHmac } from "node:crypto";
import { prisma } from "./db";
import { processPayment } from "./payments";

function getPaystackConfig() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY ?? "";
  return { secretKey, publicKey };
}

export function isPaystackConfigured(): boolean {
  return !!getPaystackConfig().secretKey;
}

export function verifyPaystackWebhookSignature(body: string, signature: string | null): boolean {
  const { secretKey } = getPaystackConfig();
  if (!secretKey || !signature) return false;
  const hash = createHmac("sha512", secretKey).update(body).digest("hex");
  return hash === signature;
}

export async function createPaystackPayment(params: {
  userId: string;
  amount: number;
  referenceType: "booking" | "bus_booking" | "taxi_booking";
  referenceId: string;
  email: string;
  callbackUrl: string;
  promoCode?: string;
}) {
  const intent = await prisma.paymentIntent.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      method: "paystack",
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      promoCode: params.promoCode,
      returnUrl: params.callbackUrl,
      status: "pending",
    },
  });

  const { secretKey } = getPaystackConfig();
  if (!secretKey) {
    return { mode: "demo" as const, intentId: intent.id };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100),
      currency: "ZAR",
      reference: intent.id,
      callback_url: params.callbackUrl,
      metadata: {
        userId: params.userId,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
      },
    }),
  });

  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url: string };
  };

  if (!res.ok || !json.status || !json.data?.authorization_url) {
    throw new Error(json.message ?? "Paystack initialization failed");
  }

  return {
    mode: "redirect" as const,
    intentId: intent.id,
    url: json.data.authorization_url,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const { secretKey } = getPaystackConfig();
  if (!secretKey) return null;

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const json = (await res.json()) as {
    status?: boolean;
    data?: {
      status: string;
      reference: string;
      id: number;
      amount: number;
    };
  };

  if (!res.ok || !json.status || !json.data) return null;
  return json.data;
}

export async function completePaymentIntent(params: {
  intentId: string;
  externalRef?: string;
  /** Paystack amount in cents (ZAR) — validated when provided */
  paystackAmountCents?: number;
}) {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: params.intentId },
  });

  if (!intent || intent.status === "completed") {
    return { ok: true as const, alreadyCompleted: true };
  }

  if (
    params.paystackAmountCents != null &&
    params.paystackAmountCents !== Math.round(intent.amount * 100)
  ) {
    console.error(
      `Paystack amount mismatch for ${intent.id}: expected ${intent.amount * 100}, got ${params.paystackAmountCents}`
    );
    return { ok: false as const, error: "amount_mismatch" };
  }

  await processPayment({
    userId: intent.userId,
    amount: intent.amount,
    method: "paystack",
    referenceType: intent.referenceType as "booking" | "bus_booking" | "taxi_booking",
    referenceId: intent.referenceId,
    externalRef: params.externalRef,
    promoCode: intent.promoCode ?? undefined,
  });

  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { status: "completed", externalRef: params.externalRef },
  });

  return { ok: true as const, alreadyCompleted: false };
}
