"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface Alert {
  id: string;
  alertType: string;
  balanceAtTrigger: number;
  pctAtTrigger: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  account: { id: string; rep: { name: string } };
  acknowledgedByCashier?: { name: string } | null;
}

export default function CashierAlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unacknowledged" | "acknowledged">("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "CASHIER") router.push("/dashboard");
  }, [status, router, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const q = filter === "unacknowledged" ? "?acknowledged=false" : filter === "acknowledged" ? "?acknowledged=true" : "";
    fetch(`/api/cashier/alerts${q}`)
      .then((r) => r.json())
      .then((d) => { setAlerts(d.data || []); setLoading(false); });
  }, [status, filter]);

  const handleAcknowledge = async (id: string) => {
    await fetch(`/api/cashier/alerts/${id}/acknowledge`, { method: "POST" });
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() } : a));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold text-slate-800">Alerts</h1>
        <p className="text-slate-500 text-sm mt-0.5">Auto-block notifications and account alerts</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["all", "unacknowledged", "acknowledged"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm transition ${
              filter === f ? "bg-white shadow text-indigo-700 font-medium" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`bg-white rounded-xl border p-4 ${!alert.acknowledged ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${!alert.acknowledged ? "text-red-600" : "text-green-600"}`}>
                  {!alert.acknowledged ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{alert.account.rep.name}</p>
                  <p className="text-sm text-slate-500">
                    {alert.alertType === "auto_block" ? "Auto-block triggered" : alert.alertType}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Balance: {fmt(alert.balanceAtTrigger)} ({alert.pctAtTrigger}% of reference) — {new Date(alert.triggeredAt).toLocaleString("en-KE")}
                  </p>
                  {alert.acknowledged && (
                    <p className="text-xs text-green-600 mt-1">
                      Acknowledged{alert.acknowledgedByCashier ? ` by ${alert.acknowledgedByCashier.name}` : ""} {alert.acknowledgedAt ? `at ${new Date(alert.acknowledgedAt).toLocaleString("en-KE")}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200"
                  >
                    Acknowledge
                  </button>
                )}
                <Link
                  href={`/cashier/accounts/${alert.account.id}`}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1"
                >
                  View Account →
                </Link>
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
            <p>No {filter !== "all" ? filter : ""} alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}
