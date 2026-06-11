import webpush from "web-push";
import { prisma } from "./db";

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@vayasa.co.za";
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  const { publicKey, privateKey } = getVapidConfig();
  return !!(publicKey && privateKey);
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig().publicKey ?? null;
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  await prisma.user.update({
    where: { id: userId },
    data: { pushSubscription: JSON.stringify(subscription) },
  });
}

export async function sendWebPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!isWebPushConfigured()) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  });

  if (!user?.pushSubscription) return false;

  let subscription: PushSubscriptionJSON;
  try {
    subscription = JSON.parse(user.pushSubscription);
  } catch {
    return false;
  }

  const { privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, getVapidPublicKey()!, privateKey!);

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/notifications",
      })
    );
    return true;
  } catch (error) {
    console.error("Web push failed:", error);
    return false;
  }
}
