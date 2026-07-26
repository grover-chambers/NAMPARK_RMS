"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  ShoppingCart,
  MessageSquare,
  Clock,
  AlertTriangle,
  CalendarDays,
  BarChart3,
} from "lucide-react";

interface Sku {
  id: string;
  name: string;
  category: string | null;
  unitPrice: number;
  unitType: string;
  packSize: string | null;
}

interface OrderLine {
  skuId: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Order {
  customerName: string;
  lines: OrderLine[];
}

interface MissingItem {
  skuId: string;
  customerCountAffected: number;
  cartonsAffected: number;
  notes: string;
}

interface Assignment {
  id: string;
  date: string;
  route: { id: string; name: string; targetDaily: number };
  salesRepShift: {
    id: string;
    shiftOpen: string | null;
    shiftClose: string | null;
    customerCountActual: number;
    salesActual: number;
    complaints: number;
    comments: string | null;
  } | null;
  orders: {
    id: string;
    customerName: string;
    totalAmount: number;
    lines: {
      skuId: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      sku: { id: string; name: string };
    }[];
  }[];
  missingItems: {
    skuId: string;
    customerCountAffected: number;
    cartonsAffected: number;
    notes: string | null;
    sku: { id: string; name: string };
  }[];
}

export default function SalesRepReportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [skus, setSkus] = useState<Sku[]>([]);

  // Shift fields
  const [shiftOpen, setShiftOpen] = useState("");
  const [shiftClose, setShiftClose] = useState("");
  const [customerCountActual, setCustomerCountActual] = useState(0);
  const [salesActual, setSalesActual] = useState(0);
  const [complaints, setComplaints] = useState(0);
  const [comments, setComments] = useState("");

  // Orders
  const [orders, setOrders] = useState<Order[]>([{ customerName: "", lines: [{ skuId: "", quantity: 1, unitPrice: 0, amount: 0 }] }]);

  // Missing items
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);

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

  const fetchAssignment = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-report/rep/today");
      const data = await res.json();

      if (data && data.id) {
        setAssignment(data);

        // Pre-fill shift data
        if (data.salesRepShift) {
          const s = data.salesRepShift;
          setShiftOpen(dateTimeToTime(s.shiftOpen));
          setShiftClose(dateTimeToTime(s.shiftClose));
          setCustomerCountActual(s.customerCountActual || 0);
          setSalesActual(s.salesActual || 0);
          setComplaints(s.complaints || 0);
          setComments(s.comments || "");
        }

        // Pre-fill orders
        if (data.orders && data.orders.length > 0) {
          setOrders(
            data.orders.map((o: { customerName: string; lines: { skuId: string; quantity: number; unitPrice: number; amount: number }[] }) => ({
              customerName: o.customerName,
              lines: o.lines.length > 0
                ? o.lines.map((l: { skuId: string; quantity: number; unitPrice: number; amount: number }) => ({
                    skuId: l.skuId,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    amount: l.amount,
                  }))
                : [{ skuId: "", quantity: 1, unitPrice: 0, amount: 0 }],
            }))
          );
        }

        // Pre-fill missing items
        if (data.missingItems && data.missingItems.length > 0) {
          setMissingItems(
            data.missingItems.map((m: { skuId: string; customerCountAffected: number; cartonsAffected: number; notes: string | null }) => ({
              skuId: m.skuId,
              customerCountAffected: m.customerCountAffected,
              cartonsAffected: m.cartonsAffected,
              notes: m.notes || "",
            }))
          );
        }
      }
    } catch {
      // No assignment
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Order helpers
  const addOrder = () => {
    setOrders([...orders, { customerName: "", lines: [{ skuId: "", quantity: 1, unitPrice: 0, amount: 0 }] }]);
  };

  const removeOrder = (idx: number) => {
    if (orders.length <= 1) return;
    setOrders(orders.filter((_, i) => i !== idx));
  };

  const updateOrder = (idx: number, field: string, value: string | number) => {
    setOrders(orders.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const addLine = (orderIdx: number) => {
    setOrders(
      orders.map((o, i) =>
        i === orderIdx ? { ...o, lines: [...o.lines, { skuId: "", quantity: 1, unitPrice: 0, amount: 0 }] } : o
      )
    );
  };

  const removeLine = (orderIdx: number, lineIdx: number) => {
    setOrders(
      orders.map((o, i) =>
        i === orderIdx ? { ...o, lines: o.lines.filter((_, li) => li !== lineIdx) } : o
      )
    );
  };

  const updateLine = (orderIdx: number, lineIdx: number, field: string, value: string | number) => {
    setOrders(
      orders.map((o, i) => {
        if (i !== orderIdx) return o;
        return {
          ...o,
          lines: o.lines.map((l, li) => {
            if (li !== lineIdx) return l;
            const updated = { ...l, [field]: value };
            if (field === "skuId") {
              const sku = skus.find((s) => s.id === value);
              if (sku) {
                updated.unitPrice = sku.unitPrice;
                updated.amount = sku.unitPrice * updated.quantity;
              }
            }
            if (field === "quantity") {
              updated.amount = l.unitPrice * Number(value);
            }
            return updated;
          }),
        };
      })
    );
  };

  // Missing item helpers
  const addMissing = () => {
    setMissingItems([...missingItems, { skuId: "", customerCountAffected: 0, cartonsAffected: 0, notes: "" }]);
  };

  const removeMissing = (idx: number) => {
    setMissingItems(missingItems.filter((_, i) => i !== idx));
  };

  const updateMissing = (idx: number, field: string, value: string | number) => {
    setMissingItems(missingItems.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-report/rep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          shiftOpen: timeToDateTime(shiftOpen),
          shiftClose: timeToDateTime(shiftClose),
          customerCountActual,
          salesActual,
          complaints,
          comments,
          orders,
          missingItems,
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
              <ClipboardList className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-800">Daily Order Booking Report</h1>
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
        {/* ── Shift Info ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Shift Info</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Opening Time</label>
              <input
                type="time"
                value={shiftOpen}
                onChange={(e) => setShiftOpen(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Closing Time</label>
              <input
                type="time"
                value={shiftClose}
                onChange={(e) => setShiftClose(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* ── KPI Section ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-teal-600" size={18} />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Key Performance Indicators</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-xs font-medium text-teal-600 mb-1">Customer Target</p>
              <p className="text-2xl font-bold text-teal-700">{Math.round(assignment.route.targetDaily) || 0}</p>
            </div>
            <div>
              <label className="form-label">Customer Count Actual</label>
              <input
                type="number"
                min={0}
                value={customerCountActual || ""}
                onChange={(e) => setCustomerCountActual(Number(e.target.value))}
                className="form-input"
                placeholder="0"
              />
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-xs font-medium text-teal-600 mb-1">Sales Target</p>
              <p className="text-2xl font-bold text-teal-700">
                {assignment.route.targetDaily > 0
                  ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(assignment.route.targetDaily)
                  : "KES 0"}
              </p>
            </div>
            <div>
              <label className="form-label">Sales Actual (KES)</label>
              <input
                type="number"
                min={0}
                value={salesActual || ""}
                onChange={(e) => setSalesActual(Number(e.target.value))}
                className="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label">Customer Complaints</label>
              <input
                type="number"
                min={0}
                value={complaints || ""}
                onChange={(e) => setComplaints(Number(e.target.value))}
                className="form-input"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* ── Orders Section ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-teal-600" size={18} />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Orders</h2>
            </div>
            <button onClick={addOrder} className="btn-primary btn-sm">
              <Plus size={14} />
              Add Order
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((order, oi) => (
              <div key={oi} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-brown-800 text-white text-xs font-bold flex items-center justify-center">
                      {oi + 1}
                    </span>
                    <input
                      type="text"
                      value={order.customerName}
                      onChange={(e) => updateOrder(oi, "customerName", e.target.value)}
                      className="form-input w-64"
                      placeholder="Customer name"
                    />
                  </div>
                  <button
                    onClick={() => removeOrder(oi)}
                    disabled={orders.length <= 1}
                    className="btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  {order.lines.map((line, li) => (
                    <div key={li} className="flex items-center gap-2">
                      <select
                        value={line.skuId}
                        onChange={(e) => updateLine(oi, li, "skuId", e.target.value)}
                        className="form-select flex-1"
                      >
                        <option value="">Select SKU</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.name} - KES {sku.unitPrice.toLocaleString()}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity || ""}
                        onChange={(e) => updateLine(oi, li, "quantity", Number(e.target.value))}
                        className="form-input w-20"
                        placeholder="Qty"
                      />
                      <div className="w-28 text-right text-sm font-medium text-slate-600">
                        KES {(line.amount || 0).toLocaleString()}
                      </div>
                      {order.lines.length > 1 && (
                        <button
                          onClick={() => removeLine(oi, li)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addLine(oi)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 mt-1"
                  >
                    <Plus size={12} />
                    Add line item
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                  <span className="text-sm font-semibold text-slate-700">
                    Order Total: KES{" "}
                    {order.lines.reduce((sum, l) => sum + (l.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-6 py-3">
              <p className="text-xs text-teal-600 font-medium">Total Orders Value</p>
              <p className="text-xl font-bold text-teal-700">
                KES{" "}
                {orders
                  .reduce((sum, o) => sum + o.lines.reduce((ls, l) => ls + (l.amount || 0), 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ── Missing Items Section ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Missing Items</h2>
            </div>
            <button onClick={addMissing} className="btn-outline btn-sm">
              <Plus size={14} />
              Add Item
            </button>
          </div>

          {missingItems.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No missing items reported</p>
          ) : (
            <div className="space-y-3">
              {missingItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="form-label">SKU</label>
                      <select
                        value={item.skuId}
                        onChange={(e) => updateMissing(i, "skuId", e.target.value)}
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
                      <label className="form-label">Customers Affected</label>
                      <input
                        type="number"
                        min={0}
                        value={item.customerCountAffected || ""}
                        onChange={(e) => updateMissing(i, "customerCountAffected", Number(e.target.value))}
                        className="form-input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="form-label">Cartons Affected</label>
                      <input
                        type="number"
                        min={0}
                        value={item.cartonsAffected || ""}
                        onChange={(e) => updateMissing(i, "cartonsAffected", Number(e.target.value))}
                        className="form-input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="form-label">Notes</label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateMissing(i, "notes", e.target.value)}
                        className="form-input"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeMissing(i)}
                    className="text-red-400 hover:text-red-600 p-1 mt-5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
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
