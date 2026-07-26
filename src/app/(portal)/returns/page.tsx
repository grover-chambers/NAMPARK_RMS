"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  XCircle,
  Flame,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatDate, toCSVRow } from "@/lib/utils";
import ExportBar from "@/components/reports/ExportBar";

interface ReturnItem {
  id: string;
  type: string;
  quantity: number;
  amount: number;
  reason: string | null;
  sku: { name: string };
  driverShift: {
    assignment: {
      route: { name: string };
      driver: { name: string };
    };
  };
  createdAt: string;
}

interface RouteBreakdown {
  routeName: string;
  totalReturns: number;
  totalAmount: number;
}

const RETURN_TYPES = [
  { key: "WRONG_ITEM", label: "Wrong Item", color: "#b45309", icon: Package },
  { key: "MISSING_ITEM", label: "Missing Item", color: "#dc2626", icon: AlertTriangle },
  { key: "CANCELLED_ORDER", label: "Cancelled", color: "#7c3aed", icon: XCircle },
  { key: "DAMAGED", label: "Damaged", color: "#ea580c", icon: Flame },
  { key: "EXPIRED", label: "Expired", color: "#0891b2", icon: Clock },
] as const;

const TYPE_BADGE: Record<string, string> = {
  WRONG_ITEM: "badge-warning",
  MISSING_ITEM: "badge-danger",
  CANCELLED_ORDER: "badge-info",
  DAMAGED: "bg-orange-100 text-orange-700 border border-orange-200",
  EXPIRED: "bg-cyan-100 text-cyan-700 border border-cyan-200",
};

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

export default function ReturnsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [byRoute, setByRoute] = useState<RouteBreakdown[]>([]);
  const [totalReturns, setTotalReturns] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const startDate = getWeekStart(weekOffset);
  const endDate = getWeekEnd(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/returns?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.data.items ?? []);
          setByRoute(data.data.byRoute ?? []);
          setTotalReturns(data.data.totalReturns ?? 0);
          setTotalAmount(data.data.totalAmount ?? 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate]);

  const typeCounts = RETURN_TYPES.map((t) => ({
    name: t.label,
    value: items.filter((i) => i.type === t.key).length,
    color: t.color,
  })).filter((t) => t.value > 0);

  const typeSummaries = RETURN_TYPES.map((t) => ({
    ...t,
    count: items.filter((i) => i.type === t.key).length,
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
            <h1 className="text-2xl font-serif font-bold text-slate-800">Returns Analysis</h1>
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
            <ExportBar
              title="Returns Analysis"
              filename={`nampark-returns`}
              reportType="returns"
              params={{
                startDate: startDate,
                endDate: endDate,
              }}
              onCSVExport={() => {
                const rows = [
                  toCSVRow(["Date", "Driver", "Route", "SKU", "Type", "Qty", "Amount"]),
                  ...items.map((r) =>
                    toCSVRow([
                      r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-KE") : "—",
                      r.driverShift?.assignment?.driver?.name || "—",
                      r.driverShift?.assignment?.route?.name || "—",
                      r.sku?.name || "—",
                      r.type.replace(/_/g, " "),
                      r.quantity,
                      r.amount,
                    ])
                  ),
                ];
                return rows.join("\n");
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Returns</p>
          <p className="text-xl font-bold text-slate-800">{totalReturns}</p>
          <p className="text-[10px] text-slate-400 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        {typeSummaries.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="stat-card">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                <p className="text-xs text-slate-500">{t.label}</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{t.count}</p>
            </div>
          );
        })}
      </div>

      {typeCounts.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif font-bold text-slate-800 mb-4">Returns by Type</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {typeCounts.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">Returns Detail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Date</th>
                <th className="table-header">Driver</th>
                <th className="table-header">Route</th>
                <th className="table-header">SKU</th>
                <th className="table-header">Type</th>
                <th className="table-header text-right">Qty</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No returns for this period.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="table-cell text-sm">{formatDate(item.createdAt)}</td>
                    <td className="table-cell">{item.driverShift.assignment.driver.name}</td>
                    <td className="table-cell">{item.driverShift.assignment.route.name}</td>
                    <td className="table-cell font-medium">{item.sku.name}</td>
                    <td className="table-cell">
                      <span className={TYPE_BADGE[item.type] ?? "badge-info"}>
                        {item.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="table-cell text-right">{item.quantity}</td>
                    <td className="table-cell text-right">{formatCurrency(item.amount)}</td>
                    <td className="table-cell text-sm text-slate-500 max-w-[200px] truncate">
                      {item.reason ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {byRoute.length > 0 && (
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-serif font-bold text-slate-800">Route-wise Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header">Route</th>
                  <th className="table-header text-right">Total Returns</th>
                  <th className="table-header text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byRoute.map((r) => (
                  <tr key={r.routeName} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium">{r.routeName}</td>
                    <td className="table-cell text-right">{r.totalReturns}</td>
                    <td className="table-cell text-right">{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
