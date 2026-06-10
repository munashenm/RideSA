"use client";

import { getAppUrl } from "@/lib/app-config";

export function TicketQr({ token, size = 200 }: { token: string; size?: number }) {
  const ticketUrl = `${getAppUrl()}/ticket/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(ticketUrl)}`;

  return (
    <img
      src={qrUrl}
      alt={`Ticket QR code for ${token}`}
      width={size}
      height={size}
      className="rounded-xl border bg-white p-2 mx-auto"
    />
  );
}
