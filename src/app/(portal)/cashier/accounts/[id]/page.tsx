"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2, ArrowLeft, AlertTriangle, CheckCircle2, Lock, Unlock,
  Plus, DollarSign, Clock, Route, FileText,
} from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

export default function CashierAccountDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"breakdown" | "credits" | "blocks" | "requests" | "openlog">("breakdown");

  // Modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [unblockReason, setUnblockReason] = useState("");
  const [creditForm, setCreditForm] = useState({ retailerName: "", routeId: "", amount: "", incurredDate: "" });
  const [routes, setRoutes] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchAccount = () => {
    fetch(`/api/cashier/accounts/${accountId}`)
      .then((r) => r.json())
      .then((d) => { setAccount(d.data); setLoading(false); });
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchAccount();
    fetch("/api/routes").then((r) => r.json()).then((d) => setRoutes(d.data || []));
  }, [status, accountId]);

  const handleBlock = async () => {
    setActionLoading(true);
    await fetch(`/api/cashier/accounts/${accountId}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: blockReason }),
    });
    setShowBlockModal(false);
    setBlockReason("");
    fetchAccount();
    setActionLoading(false);
  };

  const handleUnblock = async () => {
    setActionLoading(true);
    await fetch(`/api/cashier/accounts/${accountId}/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: unblockReason }),
    });
    setShowUnblockModal(false);
    setUnblockReason("");
    fetchAccount();
    setActionLoading(false);
  };

  const handleAddCredit = async () => {
    setActionLoading(true);
    await fetch("/api/cashier/credit-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, ...creditForm, amount: parseFloat(creditForm.amount) }),
    });
    setShowCreditModal(false);
    setCreditForm({ retailerName: "", routeId: "", amount: "", incurredDate: "" });
    fetchAccount();
    setActionLoading(false);
  };

  const handleSettle = async (saleId: string) => {
    setActionLoading(true);
    await fetch(`/api/cashier/credit-sales/${saleId}/settle`, { method: "POST" });
    fetchAccount();
    setActionLoading(false);
  };

  if (loading || !account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "breakdown" as const, label: "Route Breakdown", icon: <Route size={14} /> },
    { id: "credits" as const, label: "Credit Sales", icon: <DollarSign size={14} /> },
    { id: "blocks" as const, label: "Block History", icon: <Lock size={14} /> },
    { id: "requests" as const, label: "Unblock Requests", icon: <FileText size={14} /> },
    { id: "openlog" as const, label: "Open Log", icon: <Clock size={14} /> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cashier/accounts" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-serif font-bold text-slate-800">{account.rep.name}</h1>
          <p className="text-slate-500 text-sm">{account.rep.user.name}</p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            account.status === "blocked" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {account.status === "blocked" ? <Lock size={14} className="mr-1" /> : <Unlock size={14} className="mr-1" />}
          {account.status.toUpperCase()}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Outstanding Balance</p>
          <p className="text-xl font-bold text-slate-800">{fmt(account.currentBalance)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Reference Amount</p>
          <p className="text-xl font-bold text-slate-700">{fmt(account.creditReferenceAmount)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Threshold</p>
          <p className="text-xl font-bold text-slate-700">{account.autoBlockThresholdPct}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Last Opened</p>
          <p className="text-sm font-medium text-slate-700">
            {account.lastOpenedAt ? new Date(account.lastOpenedAt).toLocaleDateString("en-KE") : "—"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {account.status === "open" ? (
          <button onClick={() => setShowBlockModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-1">
            <Lock size={14} /> Block Account
          </button>
        ) : (
          <button onClick={() => setShowUnblockModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1">
            <Unlock size={14} /> Unblock Account
          </button>
        )}
        <button onClick={() => setShowCreditModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1">
          <Plus size={14} /> Record Credit Sale
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition ${
              tab === t.id ? "bg-white shadow text-indigo-700 font-medium" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "breakdown" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Total Credit</th>
                <th className="px-4 py-3 font-medium">Settled</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">% of Balance</th>
              </tr>
            </thead>
            <tbody>
              {account.routeBreakdown?.map((r: any) => (
                <tr key={r.routeName} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium">{r.routeName}</td>
                  <td className="px-4 py-3">{fmt(r.total)}</td>
                  <td className="px-4 py-3 text-green-600">{fmt(r.settled)}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{fmt(r.outstanding)}</td>
                  <td className="px-4 py-3">{r.pctOfBalance}%</td>
                </tr>
              ))}
              {(!account.routeBreakdown || account.routeBreakdown.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No credit sales recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "credits" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Retailer</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {account.creditSales?.map((cs: any) => (
                <tr key={cs.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-xs">{new Date(cs.incurredDate).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-3">{cs.retailerName}</td>
                  <td className="px-4 py-3">{cs.route.name}</td>
                  <td className="px-4 py-3 font-medium">{fmt(cs.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${cs.settled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {cs.settled ? "Settled" : "Unsettled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!cs.settled && (
                      <button onClick={() => handleSettle(cs.id)} disabled={actionLoading} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200">
                        Settle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!account.creditSales || account.creditSales.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No credit sales</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "blocks" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Blocked At</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Unblocked At</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {account.blockEvents?.map((be: any) => (
                <tr key={be.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-xs">{new Date(be.blockedAt).toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${be.blockType === "auto" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {be.blockType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate">{be.reason}</td>
                  <td className="px-4 py-3">{fmt(be.balanceAtTrigger || 0)}</td>
                  <td className="px-4 py-3 text-xs">
                    {be.unblockedAt ? new Date(be.unblockedAt).toLocaleString("en-KE") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{be.unblockReason || "—"}</td>
                </tr>
              ))}
              {(!account.blockEvents || account.blockEvents.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No block history</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "requests" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">REF</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reviewed By</th>
              </tr>
            </thead>
            <tbody>
              {account.unblockRequests?.map((ur: any) => (
                <tr key={ur.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-xs">{new Date(ur.requestedAt).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-3 font-medium">{fmt(ur.amount)}</td>
                  <td className="px-4 py-3 text-xs">{ur.routeOrRetailerRef}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      ur.status === "approved" ? "bg-green-100 text-green-700"
                        : ur.status === "rejected" ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {ur.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{ur.reviewedByCashier?.name || "—"}</td>
                </tr>
              ))}
              {(!account.unblockRequests || account.unblockRequests.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "openlog" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Delay (min)</th>
              </tr>
            </thead>
            <tbody>
              {account.openLogs?.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-xs">{new Date(log.logDate).toLocaleDateString("en-KE")}</td>
                  <td className="px-4 py-3 text-xs">{log.scheduledOpenTime ? new Date(log.scheduledOpenTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{log.actualOpenTime ? new Date(log.actualOpenTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className={`px-4 py-3 font-medium ${log.delayMinutes > 0 ? "text-red-600" : "text-green-600"}`}>
                    {log.delayMinutes > 0 ? `+${log.delayMinutes}` : "0"}
                  </td>
                </tr>
              ))}
              {(!account.openLogs || account.openLogs.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No open log entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Block Modal */}
      <Modal isOpen={showBlockModal} onClose={() => setShowBlockModal(false)} title="Block Account">
        <div className="p-6 space-y-4">
          <h2 className="font-serif font-bold text-slate-800">Block Account</h2>
          <p className="text-sm text-slate-500">Block {account.rep.name}&apos;s account. They will not be able to start their shift until the account is unblocked.</p>
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Reason for blocking..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowBlockModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleBlock} disabled={actionLoading} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Block"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unblock Modal */}
      <Modal isOpen={showUnblockModal} onClose={() => setShowUnblockModal(false)} title="Unblock Account">
        <div className="p-6 space-y-4">
          <h2 className="font-serif font-bold text-slate-800">Unblock Account</h2>
          <p className="text-sm text-slate-500">Manually unblock {account.rep.name}&apos;s account (override).</p>
          <textarea
            value={unblockReason}
            onChange={(e) => setUnblockReason(e.target.value)}
            placeholder="Reason for unblocking..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowUnblockModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleUnblock} disabled={actionLoading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Unblock"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Credit Modal */}
      <Modal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)} title="Record Credit Sale">
        <div className="p-6 space-y-4">
          <h2 className="font-serif font-bold text-slate-800">Record Credit Sale</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={creditForm.retailerName}
              onChange={(e) => setCreditForm({ ...creditForm, retailerName: e.target.value })}
              placeholder="Retailer name"
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            />
            <select
              value={creditForm.routeId}
              onChange={(e) => setCreditForm({ ...creditForm, routeId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            >
              <option value="">Select route</option>
              {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input
              type="number"
              value={creditForm.amount}
              onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
              placeholder="Amount (KES)"
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            />
            <input
              type="date"
              value={creditForm.incurredDate}
              onChange={(e) => setCreditForm({ ...creditForm, incurredDate: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCreditModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleAddCredit} disabled={actionLoading || !creditForm.retailerName || !creditForm.routeId || !creditForm.amount} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Record"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
