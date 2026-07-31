"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
  Users,
  RotateCcw,
  CalendarDays,
  Box,
  LogIn,
  LogOut,
  Fuel,
  Gauge,
} from "lucide-react";

interface Sku {
  id: string;
  name: string;
  category: string | null;
  unitPrice: number;
  unitType: string;
  packSize: string | null;
}

interface Return {
  skuId: string;
  type: string;
  quantity: number;
  price: number;
  amount: number;
  reason: string;
  comments: string;
}

interface Assignment {
  id: string;
  date: string;
  route: { id: string; name: string };
  driverShift: {
    id: string;
    loadingStart: string | null;
    loadingEnd: string | null;
    shiftStart: string | null;
    gatePassTime: string | null;
    shiftEnd: string | null;
    customerCountActual: number;
    fuelCost: number | null;
    mileageCovered: number | null;
    comments: string | null;
    returns: {
      skuId: string;
      type: string;
      quantity: number;
      price: number;
      amount: number;
      reason: string | null;
      comments: string | null;
      sku: { id: string; name: string };
    }[];
  } | null;
}

const RETURN_TYPES = [
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "MISSING_ITEM", label: "Missing Item" },
  { value: "CANCELLED_ORDER", label: "Cancelled Order" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "EXPIRED", label: "Expired" },
];

export default function DriverReportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);

  // Loading fields
  const [loadingStart, setLoadingStart] = useState("");
  const [loadingEnd, setLoadingEnd] = useState("");

  // Shift fields
  const [shiftStart, setShiftStart] = useState("");
  const [gatePassTime, setGatePassTime] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  // KPI
  const [customerCountActual, setCustomerCountActual] = useState(0);
  const [fuelCost, setFuelCost] = useState("");
  const [mileageCovered, setMileageCovered] = useState("");

  // Returns
  const [returns, setReturns] = useState<Return[]>([]);

  // Comments
  const [comments, setComments] = useState("");

  const timeToDateTime = (t: string) => {
    if (!t) return null;
    const today = new Date();
    const [h, m] = t.split(":");
    today.setHours(Number(h), Number(m), 0, 0);
    return today.toISOString();
  };

  const dateTimeToTime = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
  };

  const applyAssignment = useCallback((a: Assignment) => {
    setAssignment(a);

    if (a.driverShift) {
      const s = a.driverShift;
      setLoadingStart(dateTimeToTime(s.loadingStart));
      setLoadingEnd(dateTimeToTime(s.loadingEnd));
      setShiftStart(dateTimeToTime(s.shiftStart));
      setGatePassTime(dateTimeToTime(s.gatePassTime));
      setShiftEnd(dateTimeToTime(s.shiftEnd));
      setCustomerCountActual(s.customerCountActual ?? 0);
      setFuelCost(s.fuelCost != null ? String(s.fuelCost) : "");
      setMileageCovered(s.mileageCovered != null ? String(s.mileageCovered) : "");
      setComments(s.comments ?? "");

      setReturns(
        s.returns && s.returns.length > 0
          ? s.returns.map((r: { skuId: string; type: string; quantity: number; price: number; amount: number; reason: string | null; comments: string | null }) => ({
              skuId: r.skuId,
              type: r.type,
              quantity: r.quantity,
              price: r.price,
              amount: r.amount,
              reason: r.reason ?? "",
              comments: r.comments ?? "",
            }))
          : []
      );
    } else {
      setReturns([]);
    }
  }, []);

  const fetchAssignment = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-report/driver/today");
      const data = await res.json();
      const list: Assignment[] = Array.isArray(data) ? data : [];

      setAssignments(list);
      if (list.length > 0) {
        applyAssignment(list[0]);
      } else {
        setAssignment(null);
      }
    } catch {
      setAssignment(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [applyAssignment]);

  const fetchSkus = useCallback(async () => {
    try {
      const res = await fetch("/api/sku");
      const data = await res.json();
      setSkus(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const load = async () => {
        await fetchAssignment();
        await fetchSkus();
      };
      load();
    }
  }, [status, fetchAssignment, fetchSkus]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Return helpers
  const addReturn = () => {
    setReturns([...returns, { skuId: "", type: "WRONG_ITEM", quantity: 1, price: 0, amount: 0, reason: "", comments: "" }]);
  };

  const removeReturn = (idx: number) => {
    setReturns(returns.filter((_, i) => i !== idx));
  };

  const updateReturn = (idx: number, field: string, value: string | number) => {
    setReturns(
      returns.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === "skuId") {
          const sku = skus.find((s) => s.id === value);
          if (sku) {
            updated.price = sku.unitPrice;
            updated.amount = sku.unitPrice * updated.quantity;
          }
        }
        if (field === "quantity") {
          updated.amount = r.price * Number(value);
        }
        return updated;
      })
    );
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-report/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId: assignment.id,
            loadingStart: timeToDateTime(loadingStart),
            loadingEnd: timeToDateTime(loadingEnd),
            shiftStart: timeToDateTime(shiftStart),
            gatePassTime: timeToDateTime(gatePassTime),
            shiftEnd: timeToDateTime(shiftEnd),
            fuelCost: fuelCost ? Number(fuelCost) : null,
            mileageCovered: mileageCovered ? Number(mileageCovered) : null,
            customerCountActual,
            comments,
            returns,
          }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", message: "Report submitted successfully!" });
        fetchAssignment();
      } else {
        setToast({ type: "error", message: data.error || "Failed to save report" });
      }
    } catch {
      setToast({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading report form...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertCircle className="text-amber-500" size={32} />
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-800 mb-2">No Assignment Today</h2>
          <p className="text-slate-500 text-sm">
            You don&apos;t have a daily assignment for today. Please contact your supervisor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? <Save size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header sticky top-0 z-10">
        <div className="page-content flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Truck className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-800">Daily Delivery Report</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                <CalendarDays size={12} className="inline mr-1" />
                {new Date(assignment.date).toLocaleDateString("en-KE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                <span className="mx-2 text-slate-300">|</span>
                Route: <span className="text-teal-600 font-medium">{assignment.route.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content max-w-4xl mx-auto space-y-6 pb-32">
        {/* ── Route switcher when multiple assignments today ── */}
        {assignments.length > 1 && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              You have {assignments.length} routes today — select the route to report for
            </p>
            <div className="flex flex-wrap gap-2">
              {assignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => applyAssignment(a)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    assignment?.id === a.id
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-teal-500"
                  }`}
                >
                  {a.route.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading Info ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Box className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Loading</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                <LogIn size={12} className="inline mr-1" />
                Loading Start
              </label>
              <input
                type="time"
                value={loadingStart}
                onChange={(e) => setLoadingStart(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">
                <LogOut size={12} className="inline mr-1" />
                Loading End
              </label>
              <input
                type="time"
                value={loadingEnd}
                onChange={(e) => setLoadingEnd(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* ── Shift Info ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Shift</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Shift Start</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Gate Pass Time</label>
              <input
                type="time"
                value={gatePassTime}
                onChange={(e) => setGatePassTime(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Shift End</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* ── KPI ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Key Performance Indicator</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Customer Count Actual</label>
              <input
                type="number"
                min={0}
                value={customerCountActual ?? ""}
                onChange={(e) => setCustomerCountActual(Number(e.target.value))}
                className="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label">
                <Fuel size={12} className="inline mr-1" />
                Fuel Cost (KES)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                className="form-input"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="form-label">
                <Gauge size={12} className="inline mr-1" />
                Mileage Covered (km)
              </label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={mileageCovered}
                onChange={(e) => setMileageCovered(e.target.value)}
                className="form-input"
                placeholder="e.g. 120"
              />
            </div>
          </div>
        </div>

        {/* ── Returns Section ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="text-amber-500" size={18} />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Returns</h2>
            </div>
            <button onClick={addReturn} className="btn-outline btn-sm">
              <Plus size={14} />
              Add Return
            </button>
          </div>

          {returns.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No returns to report</p>
          ) : (
            <div className="space-y-3">
              {returns.map((ret, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <label className="form-label">SKU</label>
                        <select
                          value={ret.skuId}
                          onChange={(e) => updateReturn(i, "skuId", e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select SKU</option>
                          {skus.map((sku) => (
                            <option key={sku.id} value={sku.id}>
                              {sku.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Type</label>
                        <select
                          value={ret.type}
                          onChange={(e) => updateReturn(i, "type", e.target.value)}
                          className="form-select"
                        >
                          {RETURN_TYPES.map((rt) => (
                            <option key={rt.value} value={rt.value}>
                              {rt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={ret.quantity ?? ""}
                          onChange={(e) => updateReturn(i, "quantity", Number(e.target.value))}
                          className="form-input"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="form-label">Price</label>
                        <input
                          type="number"
                          min={0}
                          value={ret.price ?? ""}
                          onChange={(e) => updateReturn(i, "price", Number(e.target.value))}
                          className="form-input"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="form-label">Amount</label>
                        <div className="form-input bg-slate-50 text-slate-600 font-medium">
                          KES {(ret.amount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeReturn(i)}
                      className="text-red-400 hover:text-red-600 p-1 mt-5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="form-label">Reason</label>
                      <input
                        type="text"
                        value={ret.reason}
                        onChange={(e) => updateReturn(i, "reason", e.target.value)}
                        className="form-input"
                        placeholder="Describe the reason..."
                      />
                    </div>
                    <div>
                      <label className="form-label">Comments</label>
                      <input
                        type="text"
                        value={ret.comments}
                        onChange={(e) => updateReturn(i, "comments", e.target.value)}
                        className="form-input"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {returns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-3">
                <p className="text-xs text-amber-600 font-medium">Total Returns Value</p>
                <p className="text-xl font-bold text-amber-700">
                  KES {returns.reduce((sum, r) => sum + (r.amount ?? 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Comments ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Comments</h2>
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="form-input min-h-[100px] resize-y"
            placeholder="Any additional notes or observations..."
          />
        </div>
      </div>

      {/* ── Sticky Submit Bar ── */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-slate-200 shadow-lg z-20">
        <div className="page-content max-w-4xl mx-auto flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary px-8 py-3"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save size={16} />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
