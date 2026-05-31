"use client";

import { MessageCircle } from "lucide-react";

interface ShareWhatsAppProps {
  title: string;
  text: string;
  url: string;
  className?: string;
}

export function ShareWhatsApp({ title, text, url, className }: ShareWhatsAppProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin + url
      : url.startsWith("http")
        ? url
        : `https://www.vayasa.co.za${url}`;

  const message = encodeURIComponent(`${text}\n\n${shareUrl}`);
  const href = `https://wa.me/?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={
        className ??
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100"
      }
    >
      <MessageCircle className="w-4 h-4" />
      Share on WhatsApp
    </a>
  );
}
