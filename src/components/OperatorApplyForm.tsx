"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { FileUploadField } from "@/components/FileUploadField";
import { fetchJson } from "@/lib/fetch-client";
import { USER_ROLES } from "@/lib/constants";

type OperatorType = typeof USER_ROLES.BUS_OPERATOR | typeof USER_ROLES.TAXI_OPERATOR;

interface OperatorApplyFormProps {
  operatorType: OperatorType;
  title: string;
  description: string;
  dashboardPath: string;
}

export function OperatorApplyForm({
  operatorType,
  title,
  description,
  dashboardPath,
}: OperatorApplyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("none");
  const [existing, setExisting] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    registrationNumber: "",
    permitDocument: "",
    idDocument: "",
  });

  useEffect(() => {
    fetchJson<{ verification: Record<string, unknown> | null; status?: string }>(
      `/api/operator/apply?type=${operatorType}`
    ).then(({ data, status: httpStatus }) => {
      if (httpStatus === 401) {
        router.push(`/login?redirect=/operator/${operatorType === USER_ROLES.BUS_OPERATOR ? "bus" : "taxi"}/apply`);
        return;
      }
      if (data) {
        setExisting(data.verification);
        setStatus(data.status ?? "none");
        if (data.verification) {
          setForm({
            companyName: String(data.verification.companyName ?? ""),
            registrationNumber: String(data.verification.registrationNumber ?? ""),
            permitDocument: String(data.verification.permitDocument ?? ""),
            idDocument: String(data.verification.idDocument ?? ""),
          });
        }
      }
    });
  }, [operatorType, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, ok } = await fetchJson<{ error?: string }>("/api/operator/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, operatorType }),
    });
    setLoading(false);

    if (!ok) {
      setError(data?.error || "Application failed");
      return;
    }

    setStatus("pending");
    router.refresh();
  }

  if (status === "approved") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Building2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Operator account approved</h1>
        <p className="text-muted mb-6">Your company is verified. Manage routes and bookings from your dashboard.</p>
        <Link href={dashboardPath} className="inline-flex px-8 py-3 rounded-xl font-semibold text-white gradient-hero">
          Open dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-muted mb-6">{description}</p>

      {existing && (
        <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
          <span className="text-sm">Application status</span>
          <StatusBadge status={status} />
        </div>
      )}

      {status === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          Verification pending — you can still book rides, buses, and taxis while we review your application.
        </div>
      )}

      {status === "rejected" && !!existing?.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-800">
          Rejected: {String(existing.rejectionReason)}. Update your documents and resubmit below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-5">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Company / association name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Company registration (optional)</label>
          <input
            type="text"
            value={form.registrationNumber}
            onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            className={inputClass}
            placeholder="e.g. CK / NPO number"
          />
        </div>
        <FileUploadField
          label="Company ID / director ID"
          purpose="operator_id"
          value={form.idDocument}
          onChange={(url) => setForm({ ...form, idDocument: url })}
        />
        <FileUploadField
          label="Operating permit / association letter"
          purpose="operator_permit"
          value={form.permitDocument}
          onChange={(url) => setForm({ ...form, permitDocument: url })}
        />

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading || status === "pending"}
          className="w-full py-3 rounded-xl font-semibold text-white gradient-hero disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === "pending" ? "Application pending review" : "Submit application"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500";
