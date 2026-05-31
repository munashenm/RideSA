"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, BadgeCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { FileUploadField } from "@/components/FileUploadField";
import { fetchJson } from "@/lib/fetch-client";

export default function DriverApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("none");
  const [existing, setExisting] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    idDocument: "",
    driverLicense: "",
    vehicleRegistration: "",
    vehiclePhotos: [] as string[],
    selfiePhoto: "",
    vehicleModel: "",
    vehicleColor: "",
    vehicleYear: 2020,
  });

  useEffect(() => {
    fetchJson<{ verification: Record<string, unknown> | null; status?: string }>(
      "/api/driver/apply"
    ).then(({ data }) => {
      if (data) {
        setExisting(data.verification);
        setVerificationStatus(data.status ?? "none");
        if (data.verification) {
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
            idDocument: String(v.idDocument ?? ""),
            driverLicense: String(v.driverLicense ?? ""),
            vehicleRegistration: String(v.vehicleRegistration ?? ""),
            vehiclePhotos: photos,
            selfiePhoto: String(v.selfiePhoto ?? ""),
            vehicleModel: String(v.vehicleModel ?? ""),
            vehicleColor: String(v.vehicleColor ?? ""),
            vehicleYear: Number(v.vehicleYear ?? 2020),
          });
        }
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.idDocument || !form.driverLicense || !form.vehicleRegistration || !form.selfiePhoto) {
      setError("Upload all required documents before submitting");
      return;
    }
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{
      error?: string;
      verification?: Record<string, unknown>;
    }>("/api/driver/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Application failed");
      return;
    }

    setExisting(data?.verification ?? null);
    setVerificationStatus("pending");
    router.refresh();
  }

  if (verificationStatus === "approved") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <BadgeCheck className="w-16 h-16 text-brand-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">You&apos;re a verified driver!</h1>
        <p className="text-muted mb-2">Post trips, accept passengers, and deliver parcels.</p>
        <p className="text-sm text-muted mb-6">You can still book rides and send parcels with the same account.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/publish" className="inline-flex px-8 py-3 rounded-xl font-semibold text-white gradient-hero">
            Post a trip
          </Link>
          <Link href="/search" className="inline-flex px-8 py-3 rounded-xl font-semibold border text-gray-700">
            Find a ride
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver verification</h1>
      <p className="text-muted mb-2">
        Upload your documents for admin review. This unlocks posting trips — it does not affect booking rides or sending parcels.
      </p>

      {existing && (
        <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
          <span className="text-sm">Status</span>
          <StatusBadge status={verificationStatus} />
        </div>
      )}

      {verificationStatus === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          Verification pending — continue using Find a Ride and Send a Parcel while we review.
        </div>
      )}

      {verificationStatus === "rejected" && !!existing?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-800">
          Rejected: {String(existing.rejectionReason)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-5">
        <FileUploadField
          label="SA ID / Passport"
          purpose="id_document"
          value={form.idDocument}
          onChange={(url) => setForm({ ...form, idDocument: url })}
        />
        <FileUploadField
          label="Driver's license"
          purpose="drivers_license"
          value={form.driverLicense}
          onChange={(url) => setForm({ ...form, driverLicense: url })}
        />
        <FileUploadField
          label="Vehicle license disk"
          purpose="license_disk"
          value={form.vehicleRegistration}
          onChange={(url) => setForm({ ...form, vehicleRegistration: url })}
        />
        <FileUploadField
          label="Selfie verification"
          purpose="selfie"
          accept="image/jpeg,image/png,image/webp"
          value={form.selfiePhoto}
          onChange={(url) => setForm({ ...form, selfiePhoto: url })}
        />
        <FileUploadField
          label="Vehicle photo (front)"
          purpose="vehicle_photo"
          accept="image/jpeg,image/png,image/webp"
          value={form.vehiclePhotos[0] || ""}
          onChange={(url) => setForm({ ...form, vehiclePhotos: [url] })}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Vehicle model</label>
            <input
              type="text"
              value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Vehicle colour</label>
            <input
              type="text"
              value={form.vehicleColor}
              onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
              className={inputClass}
              required
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          JPG, PNG, WebP or PDF — max 5MB per file. Documents are reviewed by RideSA admin.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading || verificationStatus === "pending"}
          className="w-full py-3 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {verificationStatus === "pending"
            ? "Verification pending review"
            : verificationStatus === "rejected"
              ? "Resubmit verification"
              : "Submit verification"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
