export function isCapitecConfigured(): boolean {
  return !!(process.env.CAPITEC_MERCHANT_ID && process.env.CAPITEC_API_KEY);
}

export function getCapitecPaymentUrl(params: {
  amount: number;
  transactionReference: string;
  returnUrl: string;
  cancelUrl: string;
}): string | null {
  if (!isCapitecConfigured()) return null;

  const baseUrl = process.env.CAPITEC_API_URL ?? "https://pay.capitecbank.co.za";
  const query = new URLSearchParams({
    merchantId: process.env.CAPITEC_MERCHANT_ID!,
    amount: params.amount.toFixed(2),
    reference: params.transactionReference,
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
  });

  return `${baseUrl}/pay?${query.toString()}`;
}
