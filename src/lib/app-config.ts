import { PAYMENT_METHODS } from "./constants";
import { isOzowConfigured } from "./ozow";

export function isPaystackConfigured(): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return !!key && key.startsWith("sk_");
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

export function isUploadStorageConfigured(): boolean {
  return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID);
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Hide demo payment methods in production when Paystack is configured. */
export function getAvailablePaymentMethods() {
  if (process.env.NODE_ENV === "production" && isPaystackConfigured()) {
    const methods = PAYMENT_METHODS.filter((m) => m.id === "paystack");
    if (isOzowConfigured()) {
      return [...methods, PAYMENT_METHODS.find((m) => m.id === "ozow")!];
    }
    return methods;
  }

  return PAYMENT_METHODS.map((m) =>
    m.id === "ozow" && isOzowConfigured()
      ? { ...m, description: "Instant EFT via Ozow" }
      : m
  );
}
