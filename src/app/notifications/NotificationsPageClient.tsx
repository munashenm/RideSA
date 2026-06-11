"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type NotificationItem = {
  id: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<string>("");

  async function loadNotifications() {
    setLoading(true);
    const { data, ok } = await fetchJson<{ notifications?: NotificationItem[] }>("/api/notifications");
    if (ok && data?.notifications) {
      setNotifications(data.notifications);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAllRead() {
    await fetchJson("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    loadNotifications();
  }

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("Push notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("Notification permission denied.");
      return;
    }

    const { data: keyData } = await fetchJson<{ publicKey?: string | null }>("/api/push/subscribe");
    if (!keyData?.publicKey) {
      setPushStatus("Push is not configured on this server yet.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });

    const { ok } = await fetchJson("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    setPushStatus(ok ? "Push notifications enabled." : "Failed to save subscription.");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={enablePush}
            className="px-3 py-2 text-sm rounded-lg border font-medium hover:bg-gray-50"
          >
            Enable push
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="px-3 py-2 text-sm rounded-lg border font-medium hover:bg-gray-50 flex items-center gap-1"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </div>
      </div>

      {pushStatus && (
        <p className="text-sm text-muted mb-4 bg-gray-50 px-3 py-2 rounded-lg">{pushStatus}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-center text-muted py-12">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-xl border p-4",
                !n.readAt ? "border-brand-200 bg-brand-50/40" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{n.subject ?? "VayaSA"}</p>
                  <p className="text-sm text-muted mt-1">{n.body}</p>
                </div>
                <span className="text-xs text-muted shrink-0">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
