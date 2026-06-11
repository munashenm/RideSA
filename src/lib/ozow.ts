import { createHash } from "crypto";

export function isOzowConfigured(): boolean {
  return !!(process.env.OZOW_SITE_CODE && process.env.OZOW_PRIVATE_KEY);
}

export function getOzowPaymentUrl(params: {
  amount: number;
  transactionReference: string;
  bankReference: string;
  cancelUrl: string;
  successUrl: string;
  customerEmail: string;
}): string | null {
  if (!isOzowConfigured()) return null;

  const siteCode = process.env.OZOW_SITE_CODE!;
  const baseUrl = process.env.OZOW_API_URL ?? "https://pay.ozow.com";

  const query = new URLSearchParams({
    SiteCode: siteCode,
    CountryCode: "ZA",
    CurrencyCode: "ZAR",
    Amount: params.amount.toFixed(2),
    TransactionReference: params.transactionReference,
    BankReference: params.bankReference,
    CancelUrl: params.cancelUrl,
    SuccessUrl: params.successUrl,
    Customer: params.customerEmail,
  });

  return `${baseUrl}?${query.toString()}`;
}

export type OzowNotificationPayload = {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  CurrencyCode?: string;
  IsTest?: string;
  Hash: string;
};

export function verifyOzowNotification(payload: OzowNotificationPayload): boolean {
  const privateKey = process.env.OZOW_PRIVATE_KEY;
  if (!privateKey) return false;

  const parts = [
    payload.SiteCode,
    payload.TransactionId,
    payload.TransactionReference,
    payload.Amount,
    payload.Status,
    payload.Optional1 ?? "",
    payload.Optional2 ?? "",
    payload.Optional3 ?? "",
    payload.Optional4 ?? "",
    payload.Optional5 ?? "",
    payload.CurrencyCode ?? "ZAR",
    payload.IsTest ?? "false",
    privateKey,
  ];

  const expected = createHash("sha512").update(parts.join("")).digest("hex").toLowerCase();
  return expected === payload.Hash.toLowerCase();
}
