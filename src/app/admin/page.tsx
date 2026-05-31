"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Route, Package, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-client";

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJson<Record<string, unknown>>("/api/admin").then(({ data, status }) => {
      if (status === 403) {
        router.push("/");
        return;
      }
      if (status === 401) {
        router.push("/login?redirect=/admin");
        return;
      }
      if (data) setData(data);
    });
  }, [router]);

  async function adminAction(action: string, id: string, extra?: Record<string, unknown>) {
    setLoading(true);
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, data: extra }),
    });
    const { data } = await fetchJson<Record<string, unknown>>("/api/admin");
    if (data) setData(data);
    setLoading(false);
  }

  if (!data) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const analytics = data.analytics as Record<string, unknown>;
  const popularRoutes = analytics.popularRoutes as Array<{ originCity: string; destinationCity: string; _count: { id: number } }>;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "drivers", label: "Driver approvals" },
    { id: "users", label: "Users" },
    { id: "trips", label: "Trips" },
    { id: "disputes", label: "Disputes" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-muted mb-8">Manage VayaSA platform operations</p>

      <div className="flex gap-2 mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              tab === t.id ? "bg-brand-600 text-white" : "bg-white border text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Route className="w-5 h-5" />} label="Total trips" value={analytics.totalTrips as number} />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Active trips" value={analytics.activeTrips as number} />
            <StatCard icon={<Package className="w-5 h-5" />} label="Parcels delivered" value={analytics.parcelDeliveries as number} />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Revenue" value={formatPrice(analytics.revenue as number)} />
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Commission ({((data.settings as Record<string, number>)?.commissionRate ?? 0.1) * 100}%)</h3>
            <p className="text-2xl font-bold text-brand-600">{formatPrice(analytics.commission as number)}</p>
            <p className="text-sm text-muted mt-2">Platform commission from completed payments</p>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Popular routes</h3>
            <div className="space-y-2">
              {popularRoutes?.map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{r.originCity} → {r.destinationCity}</span>
                  <span className="text-muted">{r._count.id} trips</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "drivers" && (
        <div className="space-y-4">
          {(data.driverApplications as Array<Record<string, unknown>>).length === 0 ? (
            <p className="text-muted bg-white rounded-xl border p-6 text-center">No pending driver applications</p>
          ) : (
            (data.driverApplications as Array<Record<string, unknown>>).map((app) => {
              const user = app.user as Record<string, unknown>;
              return (
                <div key={app.id as string} className="bg-white rounded-xl border p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{user.name as string}</p>
                      <p className="text-sm text-muted">{user.email as string} · {user.phone as string}</p>
                      <p className="text-sm mt-1">{app.vehicleModel as string} ({app.vehicleColor as string})</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted">
                        {!!app.idDocument && <span className="bg-gray-100 px-2 py-1 rounded">ID uploaded</span>}
                        {!!app.driverLicense && <span className="bg-gray-100 px-2 py-1 rounded">License uploaded</span>}
                        {!!app.vehicleRegistration && <span className="bg-gray-100 px-2 py-1 rounded">License disk uploaded</span>}
                      </div>
                    </div>
                    <StatusBadge status={app.status as string} />
                  </div>
                  <div className="flex gap-2">
                    <button disabled={loading} onClick={() => adminAction("approve_driver", app.id as string)} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Approve</button>
                    <button disabled={loading} onClick={() => adminAction("reject_driver", app.id as string)} className="flex-1 py-2 rounded-lg border text-sm font-medium">Reject</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Driver status</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.users as Array<Record<string, unknown>>).map((u) => (
                  <tr key={u.id as string} className="border-b last:border-0">
                    <td className="p-3">{u.name as string}</td>
                    <td className="p-3 text-muted">{u.email as string}</td>
                    <td className="p-3 text-xs capitalize">{u.driverVerificationStatus as string}</td>
                    <td className="p-3">
                      {u.isSuspended ? <StatusBadge status="cancelled" /> : <StatusBadge status="active" />}
                    </td>
                    <td className="p-3">
                      {u.isSuspended ? (
                        <button onClick={() => adminAction("unsuspend_user", u.id as string)} className="text-brand-600 text-xs font-medium">Unsuspend</button>
                      ) : (
                        <button onClick={() => adminAction("suspend_user", u.id as string)} className="text-red-600 text-xs font-medium">Suspend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "trips" && (
        <div className="space-y-3">
          {(data.trips as Array<Record<string, unknown>>).slice(0, 20).map((t) => {
            const driver = t.driver as Record<string, unknown>;
            const counts = t._count as Record<string, number>;
            return (
              <div key={t.id as string} className="bg-white rounded-xl border p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{t.originCity as string} → {t.destinationCity as string}</p>
                  <p className="text-sm text-muted">Driver: {driver.name as string} · {counts.bookings} bookings · {counts.parcelBookings} parcels</p>
                </div>
                <StatusBadge status={t.tripStatus as string} />
              </div>
            );
          })}
        </div>
      )}

      {tab === "disputes" && (
        <div className="space-y-4">
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Open disputes</h3>
            {(data.disputes as Array<Record<string, unknown>>).length === 0 ? (
              <p className="text-sm text-muted bg-white rounded-xl border p-4">No open disputes</p>
            ) : (
              (data.disputes as Array<Record<string, unknown>>).map((d) => {
                const user = d.user as Record<string, unknown>;
                return (
                  <div key={d.id as string} className="bg-white rounded-xl border p-4 mb-3">
                    <p className="font-medium">{user.name as string}</p>
                    <p className="text-sm text-gray-600 mt-1">{d.description as string}</p>
                    <button onClick={() => adminAction("resolve_dispute", d.id as string, { resolution: "Resolved by admin" })} className="mt-3 text-sm text-brand-600 font-medium">Resolve</button>
                  </div>
                );
              })
            )}
          </section>

          <section>
            <h3 className="font-semibold mb-3">Open reports</h3>
            {(data.reports as Array<Record<string, unknown>>).map((r) => {
              const reporter = r.reporter as Record<string, unknown>;
              const reported = r.reportedUser as Record<string, unknown>;
              return (
                <div key={r.id as string} className="bg-white rounded-xl border p-4 mb-3">
                  <p className="text-sm"><strong>{reporter.name as string}</strong> reported <strong>{reported.name as string}</strong></p>
                  <p className="text-sm text-muted">{r.reason as string}</p>
                  <button onClick={() => adminAction("resolve_report", r.id as string)} className="mt-2 text-sm text-brand-600 font-medium">Mark resolved</button>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="text-brand-600 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
