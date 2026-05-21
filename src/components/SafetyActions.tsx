"use client";

import { useState } from "react";
import { Flag, Scale } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

interface SafetyActionsProps {
  reportedUserId: string;
  rideId?: string;
  bookingId?: string;
  parcelBookingId?: string;
}

export function SafetyActions({
  reportedUserId,
  rideId,
  bookingId,
  parcelBookingId,
}: SafetyActionsProps) {
  const [status, setStatus] = useState("");

  async function report() {
    const reason = prompt("Reason for report (harassment, fraud, safety, other):");
    if (!reason) return;
    const { ok } = await fetchJson("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId, rideId, reason, description: reason }),
    });
    setStatus(ok ? "Report submitted" : "Report failed");
  }

  async function dispute() {
    const description = prompt("Describe the issue:");
    if (!description) return;
    const { ok } = await fetchJson("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, parcelBookingId, description }),
    });
    setStatus(ok ? "Dispute opened" : "Dispute failed");
  }

  async function block() {
    if (!confirm("Block this user? They won't be able to message you.")) return;
    const { ok } = await fetchJson("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedUserId: reportedUserId }),
    });
    setStatus(ok ? "User blocked" : "Block failed");
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button type="button" onClick={report} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:bg-gray-50">
        <Flag className="w-3 h-3" /> Report
      </button>
      <button type="button" onClick={dispute} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:bg-gray-50">
        <Scale className="w-3 h-3" /> Dispute
      </button>
      <button type="button" onClick={block} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-red-600">
        Block user
      </button>
      {status && <span className="text-green-600 self-center">{status}</span>}
    </div>
  );
}
