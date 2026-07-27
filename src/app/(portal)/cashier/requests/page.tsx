"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Loader2, CheckCircle2, XCircle, Download } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface UnblockRequest {
  id: string;
  routeOrRetailerRef: string;
  amount: number;
  justification: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  letterPdfUrl: string | null;
  account: { id: string; rep: { name: string } };
  requestedByRep: { name: string };
  reviewedByCashier?: { name: string } | null;
}

export default function CashierRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<UnblockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "CASHIER") router.push("/dashboard");
  }, [status, router, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const q = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/cashier/unblock-requests${q}`)
      .then((r) => r.json())
      .then((d) => { setRequests(d.data || []); setLoading(false); });
  }, [status, filter]);

  const handleReview = async (id: string, decision: "approved" | "rejected") => {
    setActionLoading(id);
    await fetch(`/api/cashier/unblock-requests/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: decision, reviewedAt: new Date().toISOString() } : r));
    setActionLoading(null);
  };

  const handleDownloadLetter = async (requestId: string) => {
    const res = await fetch("/api/reports/pdf/account-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unblock-letter-${requestId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
        <h1 className="text-xl font-serif font-bold text-slate-800">Unblock Requests</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and act on account unblock requests from sales reps</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
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
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.status === "approved" ? "bg-green-100 text-green-700"
                        : req.status === "rejected" ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(req.requestedAt).toLocaleString("en-KE")}</span>
                  </div>
                  <p className="font-medium text-slate-800">{req.account.rep.name}</p>
                  <p className="text-sm text-slate-500">REF: {req.routeOrRetailerRef}</p>
                  <p className="text-sm font-bold text-indigo-700 mt-1">{fmt(req.amount)}</p>
                </div>
                <div className="flex gap-2 items-start">
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReview(req.id, "approved"); }}
                        disabled={actionLoading === req.id}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 flex items-center gap-1"
                      >
                        {actionLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReview(req.id, "rejected"); }}
                        disabled={actionLoading === req.id}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 flex items-center gap-1"
                      >
                        {actionLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadLetter(req.id); }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Download letter"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>

            {expandedId === req.id && (
              <div className="border-t border-slate-100 p-4 bg-slate-50">
                <p className="text-xs text-slate-500 mb-2">Justification:</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.justification}</p>
                {req.reviewedByCashier && (
                  <p className="text-xs text-slate-400 mt-3">
                    Reviewed by {req.reviewedByCashier.name} at {req.reviewedAt ? new Date(req.reviewedAt).toLocaleString("en-KE") : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <FileText size={24} className="mx-auto mb-2 opacity-50" />
            <p>No {filter !== "all" ? filter : ""} requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
