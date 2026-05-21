"use client";

import { useState } from "react";
import { AlertTriangle, Phone, Share2 } from "lucide-react";

interface SOSButtonProps {
  rideId?: string;
  shareToken?: string;
}

export function SOSButton({ rideId, shareToken }: SOSButtonProps) {
  const [alertSent, setAlertSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  async function handleSOS() {
    if (!confirm("Send emergency alert? This will notify RideSA support and log your trip location.")) {
      return;
    }

    setLoading(true);
    const res = await fetch("/api/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId, message: "Emergency SOS triggered by user" }),
    });

    setLoading(false);
    if (res.ok) setAlertSent(true);
  }

  function handleShare() {
    if (!shareToken) return;
    const url = `${window.location.origin}/trip/${shareToken}`;
    navigator.clipboard.writeText(url);
    setShowShare(true);
    setTimeout(() => setShowShare(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSOS}
          disabled={loading || alertSent}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          {alertSent ? "Alert Sent" : loading ? "Sending..." : "Emergency SOS"}
        </button>

        {shareToken && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {showShare && (
        <p className="text-xs text-green-600 text-center">Trip link copied to clipboard!</p>
      )}

      <p className="text-xs text-muted flex items-center gap-1">
        <Phone className="w-3 h-3" />
        In emergencies, also call 10111 (SAPS) or 112
      </p>
    </div>
  );
}
