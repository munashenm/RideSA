"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  subject: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    const { data, ok } = await fetchJson<{
      notifications?: NotificationItem[];
      unreadCount?: number;
    }>("/api/notifications");
    if (ok && data) {
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markRead(id: string) {
    await fetchJson("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    loadNotifications();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl border shadow-lg z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">Notifications</p>
            <Link href="/notifications" className="text-xs text-brand-600 hover:underline" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">No notifications yet</p>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-gray-50",
                      !n.readAt && "bg-brand-50/50"
                    )}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.subject ?? "VayaSA"}</p>
                    <p className="text-xs text-muted line-clamp-2 mt-0.5">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
