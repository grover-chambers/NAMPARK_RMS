"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RouteItem {
  id: string;
  name: string;
}

interface SalesRep {
  id: string;
  name: string;
}

interface SkuItem {
  id: string;
  name: string;
  category: string | null;
  unitPrice: number;
  unitType: string;
  packSize: string | null;
}

interface Survey {
  id: string;
  date: string;
  competitorName: string | null;
  competitorPrice: number;
  khelPrice: number;
  difference: number;
  route: { name: string };
  salesRep: { name: string };
  sku: { name: string };
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [skus, setSkus] = useState<SkuItem[]>([]);

  const [filterDate, setFilterDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formRouteId, setFormRouteId] = useState("");
  const [formSalesRepId, setFormSalesRepId] = useState("");
  const [formSkuId, setFormSkuId] = useState("");
  const [formCompetitor, setFormCompetitor] = useState("");
  const [formCompPrice, setFormCompPrice] = useState("");
  const [formKhelPrice, setFormKhelPrice] = useState("");

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterDate) params.set("startDate", filterDate);
        if (filterDate) params.set("endDate", filterDate);
        if (filterRoute) params.set("routeId", filterRoute);

        const [pricingRes, routesRes, repsRes, skuRes] = await Promise.all([
          fetch(`/api/pricing?${params.toString()}`),
          fetch("/api/routes"),
          fetch("/api/sales-reps"),
          fetch("/api/sku"),
        ]);

        const pricingData = await pricingRes.json();
        const routesData = await routesRes.json();
        const repsData = await repsRes.json();
        const skuData = await skuRes.json();

        setSurveys(pricingData.success ? pricingData.data : []);
        setRoutes(routesData.success ? routesData.data : []);
        setSalesReps(repsData.success ? repsData.data : []);
        setSkus(skuData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterDate, filterRoute]);

  const refetch = async () => {
    const params = new URLSearchParams();
    if (filterDate) params.set("startDate", filterDate);
    if (filterDate) params.set("endDate", filterDate);
    if (filterRoute) params.set("routeId", filterRoute);
    const res = await fetch(`/api/pricing?${params.toString()}`);
    const data = await res.json();
    setSurveys(data.success ? data.data : []);
  };

  const handleSkuChange = (skuId: string) => {
    setFormSkuId(skuId);
    if (skuId) {
      const sku = skus.find((s) => s.id === skuId);
      if (sku) setFormKhelPrice(String(sku.unitPrice));
    }
  };

  const resetForm = () => {
    setFormRouteId("");
    setFormSalesRepId("");
    setFormSkuId("");
    setFormCompetitor("");
    setFormCompPrice("");
    setFormKhelPrice("");
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formRouteId || !formSalesRepId || !formSkuId || !formCompPrice || !formKhelPrice) {
      setToast({ type: "error", message: "Please fill all required fields." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: filterDate || new Date().toISOString().split("T")[0],
          routeId: formRouteId,
          salesRepId: formSalesRepId,
          skuId: formSkuId,
          competitorName: formCompetitor || null,
          competitorPrice: Number(formCompPrice),
          khelPrice: Number(formKhelPrice),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", message: "Survey recorded successfully!" });
        resetForm();
        refetch();
      } else {
        setToast({ type: "error", message: data.error || "Failed to save" });
      }
    } catch {
      setToast({ type: "error", message: "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = surveys.slice(0, 15).map((s) => ({
    name: s.sku.name.length > 18 ? s.sku.name.slice(0, 18) + "…" : s.sku.name,
    difference: s.difference,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Competitor Pricing</h1>
            <p className="text-sm text-slate-500 mt-1">{surveys.length} surveys recorded</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="form-input w-40"
            />
            <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} className="form-select w-44">
              <option value="">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Survey
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h2 className="font-serif font-bold text-slate-800">New Pricing Survey</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Route *</label>
              <select value={formRouteId} onChange={(e) => setFormRouteId(e.target.value)} className="form-select">
                <option value="">Select Route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Sales Rep *</label>
              <select value={formSalesRepId} onChange={(e) => setFormSalesRepId(e.target.value)} className="form-select">
                <option value="">Select Sales Rep</option>
                {salesReps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">SKU *</label>
              <select value={formSkuId} onChange={(e) => handleSkuChange(e.target.value)} className="form-select">
                <option value="">Select SKU</option>
                {skus.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — KES {s.unitPrice.toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Competitor Name</label>
              <input
                type="text"
                value={formCompetitor}
                onChange={(e) => setFormCompetitor(e.target.value)}
                className="form-input"
                placeholder="e.g. Bidco, Ketepa..."
              />
            </div>
            <div>
              <label className="form-label">Competitor Price (KES) *</label>
              <input
                type="number"
                min={0}
                value={formCompPrice}
                onChange={(e) => setFormCompPrice(e.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="form-label">KHEL Price (KES) *</label>
              <input
                type="number"
                min={0}
                value={formKhelPrice}
                onChange={(e) => setFormKhelPrice(e.target.value)}
                className="form-input"
                placeholder="Auto-filled from catalog"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="btn-outline">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Survey
            </button>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <h2 className="font-serif font-bold text-slate-800">Price Difference by SKU (KHEL − Competitor)</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(v) => `KES ${Number(v).toLocaleString()}`}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="difference" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.difference > 0 ? "#dc2626" : entry.difference < 0 ? "#059669" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            <span className="inline-block w-3 h-3 rounded bg-green-600 mr-1 align-middle" /> Cheaper &nbsp;
            <span className="inline-block w-3 h-3 rounded bg-slate-400 mr-1 align-middle" /> Same &nbsp;
            <span className="inline-block w-3 h-3 rounded bg-red-600 mr-1 align-middle" /> Expensive
          </p>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">Survey Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">SKU</th>
                <th className="table-header">Competitor</th>
                <th className="table-header text-right">Competitor Price</th>
                <th className="table-header text-right">KHEL Price</th>
                <th className="table-header text-right">Difference</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {surveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No pricing surveys found.
                  </td>
                </tr>
              ) : (
                surveys.map((s) => {
                  const diff = s.difference;
                  let statusLabel = "Same";
                  let statusClass = "badge-info";
                  let StatusIcon = Minus;
                  if (diff < 0) {
                    statusLabel = "Cheaper";
                    statusClass = "badge-success";
                    StatusIcon = TrendingDown;
                  } else if (diff > 0) {
                    statusLabel = "Expensive";
                    statusClass = "badge-danger";
                    StatusIcon = TrendingUp;
                  }
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="table-cell font-medium">{s.sku.name}</td>
                      <td className="table-cell">{s.competitorName ?? "—"}</td>
                      <td className="table-cell text-right">{formatCurrency(s.competitorPrice)}</td>
                      <td className="table-cell text-right font-medium">{formatCurrency(s.khelPrice)}</td>
                      <td className={`table-cell text-right font-semibold ${diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-slate-500"}`}>
                        {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`${statusClass} inline-flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
