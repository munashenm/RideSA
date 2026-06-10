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
