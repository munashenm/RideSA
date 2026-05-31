"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneOtpVerify } from "@/components/PhoneOtpVerify";

export function ProfilePhoneVerify({
  phone,
  phoneVerified,
}: {
  phone: string | null;
  phoneVerified: boolean;
}) {
  const router = useRouter();
  const [editPhone, setEditPhone] = useState(phone ?? "");

  if (phoneVerified) return null;

  return (
    <div className="mt-4 space-y-3">
      {!phone && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Phone number
          </label>
          <input
            type="tel"
            placeholder="+27 82 123 4567"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
          />
        </div>
      )}
      <PhoneOtpVerify
        phone={phone || editPhone}
        onVerified={() => router.refresh()}
      />
    </div>
  );
}
