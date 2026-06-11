import {
  isPaystackConfigured,
  isResendConfigured,
  isTwilioConfigured,
  isUploadStorageConfigured,
  getAppUrl,
} from "./app-config";
import { isCapitecConfigured } from "./capitec";
import { isOzowConfigured } from "./ozow";
import { isVerifyIdConfigured } from "./id-verification";
import { isWebPushConfigured } from "./web-push";

export type ReadinessStatus = "ok" | "warning" | "error" | "optional";

export type ReadinessItem = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type ProductionReadiness = {
  environment: string;
  ready: boolean;
  items: ReadinessItem[];
};

function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}

function sessionSecretStatus(): ReadinessItem {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return {
      id: "session_secret",
      label: "Session secret",
      status: isProductionEnv() ? "error" : "warning",
      detail: "SESSION_SECRET is not set",
    };
  }
  if (secret.length < 32) {
    return {
      id: "session_secret",
      label: "Session secret",
      status: "warning",
      detail: "Use a long random SESSION_SECRET (32+ characters)",
    };
  }
  if (secret.includes("your-long-random") || secret === "dev-only-insecure-secret") {
    return {
      id: "session_secret",
      label: "Session secret",
      status: isProductionEnv() ? "error" : "warning",
      detail: "Replace the default SESSION_SECRET before going live",
    };
  }
  return {
    id: "session_secret",
    label: "Session secret",
    status: "ok",
    detail: "Configured",
  };
}

function appUrlStatus(): ReadinessItem {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!url) {
    return {
      id: "app_url",
      label: "Public app URL",
      status: isProductionEnv() ? "error" : "warning",
      detail: "Set NEXT_PUBLIC_APP_URL for payment callbacks and email links",
    };
  }
  if (isProductionEnv() && !url.startsWith("https://")) {
    return {
      id: "app_url",
      label: "Public app URL",
      status: "error",
      detail: "Production NEXT_PUBLIC_APP_URL must use HTTPS",
    };
  }
  return {
    id: "app_url",
    label: "Public app URL",
    status: "ok",
    detail: url,
  };
}

function paystackStatus(): ReadinessItem {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    return {
      id: "paystack",
      label: "Paystack payments",
      status: isProductionEnv() ? "error" : "warning",
      detail: "Set PAYSTACK_SECRET_KEY for live checkout",
    };
  }
  if (isProductionEnv() && key.startsWith("sk_test_")) {
    return {
      id: "paystack",
      label: "Paystack payments",
      status: "warning",
      detail: "Using Paystack test keys in production",
    };
  }
  return {
    id: "paystack",
    label: "Paystack payments",
    status: "ok",
    detail: key.startsWith("sk_live_") ? "Live keys configured" : "Test keys configured",
  };
}

export function getProductionReadiness(): ProductionReadiness {
  const items: ReadinessItem[] = [
    {
      id: "database",
      label: "Database URL",
      status: process.env.DATABASE_URL?.startsWith("postgres") ? "ok" : "error",
      detail: process.env.DATABASE_URL?.startsWith("postgres")
        ? "PostgreSQL connection string set"
        : "DATABASE_URL must be a valid PostgreSQL URL",
    },
    sessionSecretStatus(),
    appUrlStatus(),
    paystackStatus(),
    {
      id: "uploads",
      label: "Document storage (R2/S3)",
      status: isUploadStorageConfigured()
        ? "ok"
        : isProductionEnv()
          ? "error"
          : "warning",
      detail: isUploadStorageConfigured()
        ? "Cloud storage configured — uploads persist across deploys"
        : "Set S3_* vars (Cloudflare R2 recommended). Local uploads are not persistent on Railway",
    },
    {
      id: "email",
      label: "Transactional email (Resend)",
      status: isResendConfigured()
        ? "ok"
        : isProductionEnv()
          ? "warning"
          : "optional",
      detail: isResendConfigured()
        ? "RESEND_API_KEY configured"
        : "Without Resend, verification emails are not sent in production",
    },
    {
      id: "sms",
      label: "SMS OTP (Twilio)",
      status: isTwilioConfigured()
        ? "ok"
        : isProductionEnv()
          ? "warning"
          : "optional",
      detail: isTwilioConfigured()
        ? "Twilio configured for phone verification"
        : "Without Twilio, SMS OTP is unavailable in production",
    },
    {
      id: "verifyid",
      label: "SA ID verification (VerifyID)",
      status: isVerifyIdConfigured() ? "ok" : "optional",
      detail: isVerifyIdConfigured()
        ? "VerifyID API configured"
        : "Optional — demo mode validates ID format locally",
    },
    {
      id: "ozow",
      label: "Ozow instant EFT",
      status: isOzowConfigured() ? "ok" : "optional",
      detail: isOzowConfigured()
        ? `Configured — webhook: ${getAppUrl()}/api/payments/ozow/webhook`
        : "Optional secondary payment method",
    },
    {
      id: "capitec",
      label: "Capitec Pay",
      status: isCapitecConfigured() ? "ok" : "optional",
      detail: isCapitecConfigured()
        ? "Capitec Pay redirect configured"
        : "Optional secondary payment method",
    },
    {
      id: "web_push",
      label: "Web push notifications",
      status: isWebPushConfigured() ? "ok" : "optional",
      detail: isWebPushConfigured()
        ? "VAPID keys configured"
        : "Optional — in-app notifications still work without push",
    },
    {
      id: "paystack_webhook",
      label: "Paystack webhook",
      status: isPaystackConfigured() ? "ok" : "optional",
      detail: isPaystackConfigured()
        ? `${getAppUrl()}/api/payments/paystack/webhook`
        : "Configure after Paystack keys are set",
    },
  ];

  const blocking = items.filter((item) => item.status === "error");
  return {
    environment: process.env.NODE_ENV ?? "development",
    ready: blocking.length === 0,
    items,
  };
}

export function assertProductionUploadsAllowed() {
  if (isProductionEnv() && !isUploadStorageConfigured()) {
    throw new Error(
      "Cloud storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY for production uploads."
    );
  }
}
