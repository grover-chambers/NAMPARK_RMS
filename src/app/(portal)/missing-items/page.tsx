"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toCSVRow } from "@/lib/utils";
import ExportBar from "@/components/reports/ExportBar";

interface RouteItem {
  id: string;
  name: string;
  targetDaily: number;
}

interface MissingSku {
  skuName: string;
  count: number;
  cartonsAffected: number;
  customersAffected: number;
  routesAffected: string[];
}

interface MissingItemRaw {
  id: string;
  skuId: string;
  routeId: string;
  customerCountAffected: number;
  cartonsAffected: number;
  sku: { name: string };
  route: { name: string };
}

function getWeekStart(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split("T")[0];
}

function getWeekEnd(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const end = new Date(d);
  end.setDate(diff + 6);
  end.setHours(23, 59, 59, 999);
  return end.toISOString().split("T")[0];
}

function getWeekLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`;
}

export default function MissingItemsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [routeId, setRouteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [items, setItems] = useState<MissingItemRaw[]>([]);
  const [total, setTotal] = useState(0);

  const startDate = getWeekStart(weekOffset);
  const endDate = getWeekEnd(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ startDate, endDate });
        if (routeId) params.set("routeId", routeId);

        const [routesRes, missingRes] = await Promise.all([
          fetch("/api/routes"),
          fetch(`/api/reports/missing-items?${params.toString()}`),
        ]);

        const routesData = await routesRes.json();
        const missingData = await missingRes.json();

        setRoutes(routesData.success ? routesData.data : []);
        setItems(missingData.success ? missingData.data.items : []);
        setTotal(missingData.success ? missingData.data.total : 0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate, routeId]);

  const ranked: (MissingSku & { routesAffected: string[] })[] = (() => {
    const bySku: Record<string, MissingSku & { routesAffected: string[] }> = {};
    for (const item of items) {
      const key = item.skuId;
      if (!bySku[key]) {
        bySku[key] = {
          skuName: item.sku.name,
          count: 0,
          cartonsAffected: 0,
          customersAffected: 0,
          routesAffected: [],
        };
      }
      bySku[key].count++;
      bySku[key].cartonsAffected += item.cartonsAffected;
      bySku[key].customersAffected += item.customerCountAffected;
      if (!bySku[key].routesAffected.includes(item.route.name)) {
        bySku[key].routesAffected.push(item.route.name);
      }
    }
    return Object.values(bySku).sort((a, b) => b.count - a.count);
  })();

  const top10 = ranked.slice(0, 10).map((r) => ({
    name: r.skuName.length > 20 ? r.skuName.slice(0, 20) + "…" : r.skuName,
    count: r.count,
    customers: r.customersAffected,
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
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Missing Items Tracker</h1>
            <p className="text-sm text-slate-500 mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-outline btn-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">{weekLabel}</span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-outline btn-sm">
                <ChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="btn-outline btn-sm text-xs">Today</button>
              )}
            </div>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="form-select w-48">
              <option value="">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <ExportBar
              title="Missing Items"
              filename={`nampark-missing-items`}
              reportType="missing-items"
              params={{
                startDate: startDate,
                endDate: endDate,
                ...(routeId ? { routeId } : {}),
              }}
              onCSVExport={() => {
                const rows = [
                  toCSVRow(["#", "Product", "Routes Affected", "Frequency", "Cartons", "Customers"]),
                  ...ranked.map((s, i) =>
                    toCSVRow([i + 1, s.skuName, s.routesAffected.join(", "), s.count, s.cartonsAffected, s.customersAffected])
                  ),
                ];
                return rows.join("\n");
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{total}</p>
              <p className="text-xs text-slate-500">Total Reports</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{ranked.length}</p>
              <p className="text-xs text-slate-500">Unique SKUs Affected</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {ranked.reduce((s, r) => s + r.customersAffected, 0)}
              </p>
              <p className="text-xs text-slate-500">Customers Affected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <h2 className="font-serif font-bold text-slate-800">Top 10 Missing Items by Frequency</h2>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">All Missing Items (Ranked)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header text-center">#</th>
                <th className="table-header">SKU Name</th>
                <th className="table-header">Routes Affected</th>
                <th className="table-header text-right">Customers Affected</th>
                <th className="table-header text-right">Cartons</th>
                <th className="table-header text-right">Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No missing items for this period.
                  </td>
                </tr>
              ) : (
                ranked.map((row, i) => {
                  const isChronic = row.routesAffected.length > 3;
                  return (
                    <tr
                      key={row.skuName}
                      className={`hover:bg-slate-50/50 ${isChronic ? "bg-red-50/50 border-l-3 border-l-red-400" : ""}`}
                    >
                      <td className="table-cell text-center font-bold text-slate-500">{i + 1}</td>
                      <td className="table-cell font-medium">
                        {row.skuName}
                        {isChronic && (
                          <span className="ml-2 badge-danger text-[10px]">Chronic</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1">
                          {row.routesAffected.map((r) => (
                            <span key={r} className="badge-info text-[10px]">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="table-cell text-right">{row.customersAffected}</td>
                      <td className="table-cell text-right">{row.cartonsAffected}</td>
                      <td className="table-cell text-right font-semibold">{row.count}</td>
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
