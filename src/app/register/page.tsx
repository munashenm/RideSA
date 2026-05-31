"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Route, Package, Car } from "lucide-react";
import { START_ACTIONS } from "@/lib/constants";
import { fetchJson } from "@/lib/fetch-client";
import { PhoneOtpVerify } from "@/components/PhoneOtpVerify";
import { GENDER_OPTIONS } from "@/lib/gender";

const START_OPTIONS = [
  {
    id: START_ACTIONS.RIDE,
    label: "Find a Ride",
    icon: Route,
    desc: "Search and book seats on intercity trips",
  },
  {
    id: START_ACTIONS.PARCEL,
    label: "Send a Parcel",
    icon: Package,
    desc: "Send goods with drivers already on your route",
  },
  {
    id: START_ACTIONS.DRIVER,
    label: "Become a Driver",
    icon: Car,
    desc: "Verify your account to post trips and earn",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    defaultStartAction: "ride" as "ride" | "parcel" | "driver",
    gender: "" as "" | "female" | "male" | "other" | "prefer_not_to_say",
  });
  const [phoneOtpCode, setPhoneOtpCode] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "phone">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsPhoneVerify = !!form.phone.trim() && !phoneOtpCode;

  async function submitRegistration(otpCode?: string) {
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string; redirectTo?: string }>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          gender: form.gender || undefined,
          phoneOtpCode: otpCode ?? phoneOtpCode ?? undefined,
        }),
      }
    );
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Registration failed");
      return;
    }

    router.push(data?.redirectTo || "/search");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsPhoneVerify) {
      setStep("phone");
      return;
    }
    await submitRegistration();
  }

  if (step === "phone") {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify your phone</h1>
        <p className="text-muted text-center mb-8 text-sm">
          We sent a code to {form.phone}. Enter it to finish creating your account.
        </p>
        <PhoneOtpVerify
          phone={form.phone}
          guestMode
          onVerified={(code) => {
            if (code) {
              setPhoneOtpCode(code);
              submitRegistration(code);
            }
          }}
        />
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full mt-4 text-sm text-muted hover:text-gray-700"
        >
          ← Back to form
        </button>
        {error && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Join VayaSA</h1>
      <p className="text-muted text-center mb-2">One account for rides, parcels, and driving</p>
      <p className="text-xs text-center text-muted mb-8">
        You can use all services — this only sets your starting page
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-4">
        <Field label="Full name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Phone (recommended)">
          <input
            type="tel"
            placeholder="+27 82 123 4567"
            value={form.phone}
            onChange={(e) => {
              setForm({ ...form, phone: e.target.value });
              setPhoneOtpCode(null);
            }}
            className={inputClass}
          />
          <p className="text-xs text-muted mt-1">Required for SOS and driver contact — verified via SMS</p>
        </Field>
        <Field label="Gender (optional)">
          <select
            value={form.gender}
            onChange={(e) =>
              setForm({
                ...form,
                gender: e.target.value as typeof form.gender,
              })
            }
            className={inputClass}
          >
            <option value="">Prefer not to say now</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">Needed for women-only rides and female-driver search</p>
        </Field>
        <Field label="Password">
          <input
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
            required
          />
        </Field>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            What would you like to do first?
          </label>
          <div className="space-y-2">
            {START_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  form.defaultStartAction === option.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="defaultStartAction"
                  checked={form.defaultStartAction === option.id}
                  onChange={() => setForm({ ...form, defaultStartAction: option.id })}
                  className="mt-1 border-gray-300 text-brand-600"
                />
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <option.icon className="w-4 h-4" /> {option.label}
                  </p>
                  <p className="text-xs text-muted">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white gradient-hero hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {needsPhoneVerify ? "Continue — verify phone" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
