"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";

interface ReviewFormProps {
  revieweeId: string;
  bookingId?: string;
  busBookingId?: string;
  taxiBookingId?: string;
  rideId?: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  revieweeId,
  bookingId,
  busBookingId,
  taxiBookingId,
  rideId,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string }>("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revieweeId,
        bookingId,
        busBookingId,
        taxiBookingId,
        rideId,
        rating,
        comment,
      }),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Failed to submit review");
      return;
    }

    setDone(true);
    onSuccess?.();
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-green-700 font-medium">Thank you for your review!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`w-7 h-7 ${n <= rating ? "fill-accent-400 text-accent-400" : "text-gray-300"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="How was your trip?"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit review
      </button>
    </form>
  );
}
