"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Upload,
  Box,
  Tag,
} from "lucide-react";

interface SkuItem {
  id: string;
  name: string;
  category: string | null;
  unitPrice: number;
  unitType: string;
  packSize: string | null;
}

export default function InventoryPage() {
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
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-1">{skus.length} SKUs in catalog</p>
          </div>
          <button className="btn-outline" disabled title="Coming soon">
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>

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

      <div className="card p-8 text-center border-dashed border-2 border-slate-200">
        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">CSV Import</p>
        <p className="text-xs text-slate-400 mt-1">
          Bulk upload SKUs from a CSV file. Feature coming soon.
        </p>
      </div>
    </div>
  );
}
