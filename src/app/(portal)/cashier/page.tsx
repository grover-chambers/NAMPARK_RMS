"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, AlertTriangle, DollarSign, CheckCircle2, Loader2, Eye } from "lucide-react";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface Account {
  id: string;
  status: string;
  currentBalance: number;
  lastOpenedAt: string | null;
  lastBlockedAt: string | null;
  rep: { name: string; user: { name: string } };
  alerts: any[];
  openLogs: any[];
}

interface Alert {
  id: string;
  alertType: string;
  balanceAtTrigger: number;
  pctAtTrigger: number;
  triggeredAt: string;
  acknowledged: boolean;
  account: { rep: { name: string } };
}

export default function CashierDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "CASHIER") router.push("/dashboard");
  }, [status, router, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/cashier/accounts").then((r) => r.json()),
      fetch("/api/cashier/alerts?acknowledged=false").then((r) => r.json()),
    ]).then(([accData, alertData]) => {
      setAccounts(accData.data || []);
      setAlerts(alertData.data || []);
      setLoading(false);
    });
  }, [status]);

  const openCount = accounts.filter((a) => a.status === "open").length;
  const blockedCount = accounts.filter((a) => a.status === "blocked").length;
  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Alert Inbox */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-600" size={20} />
            <h2 className="font-serif font-bold text-red-800">Alerts ({alerts.length} unacknowledged)</h2>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="bg-white rounded-lg p-3 flex items-center justify-between border border-red-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{alert.account.rep.name}</p>
                  <p className="text-xs text-slate-500">
                    Auto-blocked at {fmt(alert.balanceAtTrigger)} ({alert.pctAtTrigger}% of reference)
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/cashier/alerts/${alert.id}/acknowledge`, { method: "POST" });
                      if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                    } catch {}
                  }}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
          {alerts.length > 5 && (
            <Link href="/cashier/alerts" className="text-sm text-red-600 hover:underline mt-2 inline-block">
              View all alerts →
            </Link>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-indigo-600" size={18} />
            <span className="text-xs text-slate-500">Total Accounts</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{accounts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-green-600" size={18} />
            <span className="text-xs text-slate-500">Open</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600" size={18} />
            <span className="text-xs text-slate-500">Blocked</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-indigo-600" size={18} />
            <span className="text-xs text-slate-500">Total Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{fmt(totalBalance)}</p>
        </div>
      </div>

      {/* Account List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Rep</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Last Opened</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{account.rep.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.status === "open"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {account.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmt(account.currentBalance)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {account.lastOpenedAt ? new Date(account.lastOpenedAt).toLocaleDateString("en-KE") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/cashier/accounts/${account.id}`}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs"
                    >
                      <Eye size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
