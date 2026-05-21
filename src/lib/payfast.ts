import { createHash, createHmac } from "node:crypto";
import { prisma } from "./db";

function pfEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function getPayFastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  const sandbox = process.env.PAYFAST_SANDBOX !== "false";
  const baseUrl = sandbox
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";

  return { merchantId, merchantKey, passphrase, baseUrl, sandbox };
}

export function isPayFastConfigured(): boolean {
  const { merchantId, merchantKey } = getPayFastConfig();
  return !!(merchantId && merchantKey);
}

export function buildPayFastSignature(
  data: Record<string, string>,
  passphrase: string
): string {
  const query = Object.keys(data)
    .filter((k) => data[k] !== "")
    .sort()
    .map((k) => `${k}=${pfEncode(data[k])}`)
    .join("&");

  const withPass = passphrase ? `${query}&passphrase=${pfEncode(passphrase)}` : query;
  return createHash("md5").update(withPass).digest("hex");
}

export function verifyPayFastSignature(
  data: Record<string, string>,
  signature: string
): boolean {
  const { passphrase } = getPayFastConfig();
  const copy = { ...data };
  delete copy.signature;
  return buildPayFastSignature(copy, passphrase) === signature;
}

export async function createPayFastPayment(params: {
  userId: string;
  amount: number;
  referenceType: "booking" | "parcel";
  referenceId: string;
  itemName: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  promoCode?: string;
}) {
  const { merchantId, merchantKey, passphrase, baseUrl } = getPayFastConfig();

  const intent = await prisma.paymentIntent.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      method: "payfast",
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      promoCode: params.promoCode,
      returnUrl: params.returnUrl,
      status: "pending",
    },
  });

  if (!merchantId || !merchantKey) {
    return { mode: "demo" as const, intentId: intent.id };
  }

  const pfData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.email,
    m_payment_id: intent.id,
    amount: params.amount.toFixed(2),
    item_name: params.itemName,
  };

  const signature = buildPayFastSignature(pfData, passphrase);

  return {
    mode: "redirect" as const,
    intentId: intent.id,
    url: baseUrl,
    fields: { ...pfData, signature },
  };
}

export function verifyPayFastItnSignature(
  body: Record<string, string>,
  headerSignature?: string | null
): boolean {
  if (headerSignature) {
    const secret = process.env.PAYFAST_PASSPHRASE ?? "";
    const expected = createHmac("sha256", secret)
      .update(new URLSearchParams(body).toString())
      .digest("hex");
    return expected === headerSignature;
  }
  return verifyPayFastSignature(body, body.signature ?? "");
}
