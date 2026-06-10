"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Car } from "lucide-react";
import { FileUploadField } from "@/components/FileUploadField";
import { fetchJson } from "@/lib/fetch-client";

export default function DriverVehiclesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    vehicleModel: "",
    vehicleColor: "",
    vehicleYear: new Date().getFullYear(),
    vehicleRegistration: "",
    vehiclePhotos: [] as string[],
  });

  useEffect(() => {
    fetchJson<{ verification: Record<string, unknown> | null; status?: string }>(
      "/api/driver/vehicle"
    ).then(({ data, status }) => {
      if (status === 401) {
        router.push("/login?redirect=/driver/vehicles");
        return;
      }
      if (status === 403) {
        router.push("/driver/apply");
        return;
      }
      if (data?.verification) {
        const v = data.verification;
        let photos: string[] = [];
        if (typeof v.vehiclePhotos === "string") {
          try {
            photos = JSON.parse(v.vehiclePhotos);
          } catch {
            photos = [];
          }
        }
        setForm({
          vehicleModel: String(v.vehicleModel ?? ""),
          vehicleColor: String(v.vehicleColor ?? ""),
          vehicleYear: Number(v.vehicleYear ?? new Date().getFullYear()),
          vehicleRegistration: String(v.vehicleRegistration ?? ""),
          vehiclePhotos: photos,
        });
      }
      setLoading(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const { data, ok } = await fetchJson<{ error?: string }>("/api/driver/vehicle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!ok) {
      setError(data?.error || "Update failed");
      return;
    }

    setMessage("Vehicle details updated");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/driver/dashboard" className="text-sm text-muted hover:text-gray-900 mb-6 inline-block">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Car className="w-7 h-7 text-brand-600" />
        Vehicle management
      </h1>
      <p className="text-muted mb-8">
        Update your car details shown on trip listings. Major changes may require re-verification.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Vehicle model">
            <input
              type="text"
              value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Vehicle colour">
            <input
              type="text"
              value={form.vehicleColor}
              onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
              className={inputClass}
              required
            />
          </Field>
        </div>
        <Field label="Year">
          <input
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={form.vehicleYear}
            onChange={(e) => setForm({ ...form, vehicleYear: Number(e.target.value) })}
            className={inputClass}
            required
          />
        </Field>
        <FileUploadField
          label="License disk"
          purpose="license_disk"
          value={form.vehicleRegistration}
          onChange={(url) => setForm({ ...form, vehicleRegistration: url })}
        />
        <FileUploadField
          label="Vehicle photo"
          purpose="vehicle_photo"
          accept="image/jpeg,image/png,image/webp"
          value={form.vehiclePhotos[0] || ""}
          onChange={(url) => setForm({ ...form, vehiclePhotos: [url] })}
        />

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save vehicle details
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
