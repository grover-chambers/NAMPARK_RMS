"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Plus,
  X,
  Box,
  Tag,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Clock,
  Filter,
  BarChart3,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SkuItem {
  id: string;
  name: string;
  category: string | null;
  unitPrice: number;
  unitType: string;
  packSize: string | null;
}

interface InventoryCount {
  id: string;
  store: string;
  countDate: string;
  skuId: string;
  category: string | null;
  physicalQty: number;
  systemQty: number;
  variance: number;
  unitPrice: number;
  stockValue: number;
  lastStocked: string | null;
  expiryDate: string | null;
  notes: string | null;
  sku: { name: string; category: string | null; unitPrice: number };
}

interface InventorySummary {
  totalStockValue: number;
  totalVariance: number;
  shrinkageItems: number;
  expiringItems: number;
  totalRecords: number;
}

type Tab = "counts" | "catalog";

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("counts");

  return (
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-1">Track stock counts and manage your SKU catalog</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("counts")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "counts"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Inventory Counts
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Box className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          SKU Catalog
        </button>
      </div>

      {activeTab === "counts" ? <InventoryCountsTab /> : <SkuCatalogTab />}
    </div>
  );
}

/* ─────────────────────── Inventory Counts Tab ─────────────────────── */

function InventoryCountsTab() {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalStockValue: 0,
    totalVariance: 0,
    shrinkageItems: 0,
    expiringItems: 0,
    totalRecords: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [storeFilter, setStoreFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (storeFilter) params.set("store", storeFilter);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);

      const [invRes, skuRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch("/api/sku"),
      ]);
      const invData = await invRes.json();
      const skuData = await skuRes.json();

      if (invData.success) {
        setCounts(invData.data.counts ?? []);
        setStores(invData.data.stores ?? []);
        setSummary(invData.data.summary ?? {});
      }
      setSkus(Array.isArray(skuData) ? skuData : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [storeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreated = () => {
    setShowForm(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="form-select w-44"
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input w-40"
              placeholder="From"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input w-40"
              placeholder="To"
            />
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Record Count"}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <RecordCountForm
          skus={skus}
          stores={stores}
          submitting={submitting}
          setSubmitting={setSubmitting}
          submitMsg={submitMsg}
          setSubmitMsg={setSubmitMsg}
          onCreated={handleCreated}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.totalStockValue)}</p>
              <p className="text-xs text-slate-500">Total Stock Value</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${summary.totalVariance < 0 ? "bg-red-50" : "bg-green-50"} flex items-center justify-center`}>
              <TrendingDown className={`w-5 h-5 ${summary.totalVariance < 0 ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${summary.totalVariance < 0 ? "text-red-600" : "text-slate-800"}`}>
                {summary.totalVariance > 0 ? "+" : ""}{summary.totalVariance}
              </p>
              <p className="text-xs text-slate-500">Total Variance</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{summary.shrinkageItems}</p>
              <p className="text-xs text-slate-500">Shrinkage Items</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{summary.expiringItems}</p>
              <p className="text-xs text-slate-500">Expiring (30d)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">Inventory Counts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Date</th>
                <th className="table-header">Store</th>
                <th className="table-header">SKU</th>
                <th className="table-header text-right">Physical Qty</th>
                <th className="table-header text-right">System Qty</th>
                <th className="table-header text-right">Variance</th>
                <th className="table-header text-right">Stock Value</th>
                <th className="table-header">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {counts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No inventory counts recorded yet.
                  </td>
                </tr>
              ) : (
                counts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="table-cell text-sm">{formatDate(c.countDate)}</td>
                    <td className="table-cell font-medium">{c.store}</td>
                    <td className="table-cell">{c.sku?.name ?? "—"}</td>
                    <td className="table-cell text-right">{c.physicalQty}</td>
                    <td className="table-cell text-right">{c.systemQty}</td>
                    <td className={`table-cell text-right font-medium ${c.variance < 0 ? "text-red-600" : c.variance > 0 ? "text-green-600" : ""}`}>
                      {c.variance > 0 ? "+" : ""}{c.variance}
                    </td>
                    <td className="table-cell text-right">{formatCurrency(c.stockValue)}</td>
                    <td className="table-cell text-sm">
                      {c.expiryDate ? formatDate(c.expiryDate) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Record Count Form ─────────────────────── */

function RecordCountForm({
  skus,
  stores,
  submitting,
  setSubmitting,
  submitMsg,
  setSubmitMsg,
  onCreated,
}: {
  skus: SkuItem[];
  stores: string[];
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  submitMsg: { type: "ok" | "err"; text: string } | null;
  setSubmitMsg: (v: { type: "ok" | "err"; text: string } | null) => void;
  onCreated: () => void;
}) {
  const [store, setStore] = useState("");
  const [countDate, setCountDate] = useState(toISODate(new Date()));
  const [skuId, setSkuId] = useState("");
  const [category, setCategory] = useState("");
  const [physicalQty, setPhysicalQty] = useState("");
  const [systemQty, setSystemQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [lastStocked, setLastStocked] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const onSkuChange = (id: string) => {
    setSkuId(id);
    const sku = skus.find((s) => s.id === id);
    if (sku) {
      setCategory(sku.category ?? "");
      setUnitPrice(String(sku.unitPrice));
    } else {
      setCategory("");
      setUnitPrice("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !countDate || !skuId) {
      setSubmitMsg({ type: "err", text: "Store, date, and SKU are required." });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          countDate,
          skuId,
          category,
          physicalQty: Number(physicalQty) || 0,
          systemQty: Number(systemQty) || 0,
          unitPrice: Number(unitPrice) || 0,
          lastStocked: lastStocked || undefined,
          expiryDate: expiryDate || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMsg({ type: "ok", text: "Inventory count recorded." });
        setStore("");
        setCountDate(toISODate(new Date()));
        setSkuId("");
        setCategory("");
        setPhysicalQty("");
        setSystemQty("");
        setUnitPrice("");
        setLastStocked("");
        setExpiryDate("");
        setNotes("");
        onCreated();
      } else {
        setSubmitMsg({ type: "err", text: data.error || "Failed to save." });
      }
    } catch {
      setSubmitMsg({ type: "err", text: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-slate-800">Record Inventory Count</h3>
        {submitMsg && (
          <span className={`text-sm font-medium ${submitMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {submitMsg.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Store *</label>
          <input
            type="text"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="form-input"
            placeholder="e.g. Nairobi Depot"
            list="store-list"
            required
          />
          <datalist id="store-list">
            {stores.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="form-label">Count Date *</label>
          <input
            type="date"
            value={countDate}
            onChange={(e) => setCountDate(e.target.value)}
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label">SKU *</label>
          <select value={skuId} onChange={(e) => onSkuChange(e.target.value)} className="form-select" required>
            <option value="">Select SKU…</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Category</label>
          <input type="text" value={category} readOnly className="form-input bg-slate-50" />
        </div>
        <div>
          <label className="form-label">Physical Qty</label>
          <input
            type="number"
            value={physicalQty}
            onChange={(e) => setPhysicalQty(e.target.value)}
            className="form-input"
            min={0}
          />
        </div>
        <div>
          <label className="form-label">System Qty</label>
          <input
            type="number"
            value={systemQty}
            onChange={(e) => setSystemQty(e.target.value)}
            className="form-input"
            min={0}
          />
        </div>
        <div>
          <label className="form-label">Unit Price (KES)</label>
          <input type="text" value={unitPrice} readOnly className="form-input bg-slate-50" />
        </div>
        <div>
          <label className="form-label">Last Stocked</label>
          <input
            type="date"
            value={lastStocked}
            onChange={(e) => setLastStocked(e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="form-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            rows={2}
            placeholder="Optional notes…"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              Submit Count
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────── SKU Catalog Tab ─────────────────────── */

function SkuCatalogTab() {
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    async function fetchSkus() {
      try {
        const res = await fetch("/api/sku");
        const data = await res.json();
        setSkus(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchSkus();
  }, []);

  const categories = Array.from(new Set(skus.map((s) => s.category).filter(Boolean))) as string[];

  const filtered = skus.filter((s) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Box className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{skus.length}</p>
              <p className="text-xs text-slate-500">Total SKUs</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{categories.length}</p>
              <p className="text-xs text-slate-500">Categories</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {skus.filter((s) => s.packSize).length}
              </p>
              <p className="text-xs text-slate-500">Packed Items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9"
              placeholder="Search by name..."
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-select w-48">
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">SKU Catalog</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Name</th>
                <th className="table-header">Category</th>
                <th className="table-header text-right">Unit Price (KES)</th>
                <th className="table-header">Pack Size</th>
                <th className="table-header">Unit Type</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No SKUs match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((sku) => (
                  <tr key={sku.id} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium">{sku.name}</td>
                    <td className="table-cell">
                      {sku.category ? (
                        <span className="badge-info">{sku.category}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right">{sku.unitPrice.toLocaleString()}</td>
                    <td className="table-cell">{sku.packSize ?? "—"}</td>
                    <td className="table-cell capitalize">{sku.unitType}</td>
                    <td className="table-cell text-center">
                      <span className="badge-success">Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
