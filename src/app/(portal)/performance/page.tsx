"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Route,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, getWeekRange, getPerformanceColor, toCSVRow } from "@/lib/utils";
import ExportBar from "@/components/reports/ExportBar";

interface RouteItem {
  id: string;
  name: string;
  targetDaily: number;
}

interface Assignment {
  id: string;
  date: string;
  route: { id: string; name: string; targetDaily: number };
  salesRep: { id: string; name: string };
  driver: { id: string; name: string };
  salesRepShift: {
    customerCountActual: number;
    salesActual: number;
    complaints: number;
  } | null;
  orders: { totalAmount: number }[];
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

export default function PerformancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [totalSales, setTotalSales] = useState(0);

  const startDate = getWeekStart(weekOffset);
  const endDate = getWeekEnd(weekOffset);
  const weekRange = getWeekRange(new Date(`${startDate}T12:00:00`));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [routesRes, salesRes, assignRes] = await Promise.all([
          fetch("/api/routes"),
          fetch(`/api/reports/sales-summary?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/assignments?startDate=${startDate}&endDate=${endDate}`),
        ]);

        const routesData = await routesRes.json();
        const salesData = await salesRes.json();
        const assignData = await assignRes.json();

        setRoutes(routesData.success ? routesData.data : []);
        setTotalSales(salesData.success ? salesData.data.totalSales : 0);
        setAssignments(assignData.success ? assignData.data : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate]);

  const routePerformance = routes.map((route) => {
    const routeAssignments = assignments.filter((a) => a.route.id === route.id);
    const sales = routeAssignments.reduce(
      (sum, a) => sum + (a.salesRepShift?.salesActual ?? a.orders.reduce((s, o) => s + o.totalAmount, 0)),
      0
    );
    const target = route.targetDaily * 7;
    const customers = routeAssignments.reduce(
      (sum, a) => sum + (a.salesRepShift?.customerCountActual ?? 0),
      0
    );
    const complaints = routeAssignments.reduce(
      (sum, a) => sum + (a.salesRepShift?.complaints ?? 0),
      0
    );
    const salesRep = routeAssignments[0]?.salesRep?.name ?? "—";
    const attainment = target > 0 ? Math.round((sales / target) * 100) : 0;

    return { route: route.name, salesRep, target, actual: sales, attainment, customers, complaints };
  });

  const dailyTrend = (() => {
    const days: Record<string, Record<string, number>> = {};
    const start = new Date(weekRange.start);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      days[key] = {};
      routes.forEach((r) => (days[key][r.name] = 0));
    }
    assignments.forEach((a) => {
      const d = new Date(a.date);
      const key = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      if (days[key] && a.route?.name) {
        days[key][a.route.name] += a.salesRepShift?.salesActual ?? a.orders.reduce((s, o) => s + o.totalAmount, 0);
      }
    });
    return Object.entries(days).map(([day, routeVals]) => ({ day, ...routeVals }));
  })();

  const routeNames = routes.map((r) => r.name);
  const chartColors = ["#0d9488", "#b45309", "#dc2626", "#7c3aed", "#2563eb", "#ca8a04", "#059669", "#be185d"];

  const computedTotalSales = totalSales || routePerformance.reduce((s, r) => s + r.actual, 0);
  const avgAttainment =
    routePerformance.length > 0
      ? Math.round(routePerformance.reduce((s, r) => s + r.attainment, 0) / routePerformance.length)
      : 0;
  const totalComplaints = routePerformance.reduce((s, r) => s + r.complaints, 0);
  const activeRoutes = routePerformance.filter((r) => r.actual > 0).length;

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Performance Overview</h1>
            <p className="text-sm text-slate-500 mt-1">{weekRange.label}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-outline btn-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[160px] text-center">
                {weekRange.label}
              </span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-outline btn-sm">
                <ChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="btn-outline btn-sm text-xs">
                  Today
                </button>
              )}
            </div>
            <ExportBar
              title="Performance Analytics"
              filename={`nampark-performance-${weekRange.label.replace(/\s/g, "-")}`}
              reportType="performance"
              params={{
                startDate: getWeekStart(weekOffset),
                endDate: getWeekEnd(weekOffset),
              }}
              onCSVExport={() => {
                const rows = [
                  toCSVRow(["Route", "Rep", "Target", "Actual", "Attainment%", "Customers", "Complaints"]),
                  ...routePerformance.map((r) =>
                    toCSVRow([r.route, r.salesRep, r.target, r.actual, r.attainment.toFixed(1), r.customers, r.complaints])
                  ),
                ];
                return rows.join("\n");
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(computedTotalSales)}</p>
              <p className="text-xs text-slate-500">Total Sales</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getPerformanceColor(avgAttainment)}`}>{avgAttainment}%</p>
              <p className="text-xs text-slate-500">Avg Attainment</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalComplaints}</p>
              <p className="text-xs text-slate-500">Total Complaints</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Route className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeRoutes}</p>
              <p className="text-xs text-slate-500">Active Routes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          <h2 className="font-serif font-bold text-slate-800">Daily Sales Trend</h2>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              {routeNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId="1"
                  stroke={chartColors[i % chartColors.length]}
                  fill={chartColors[i % chartColors.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h2 className="font-serif font-bold text-slate-800">Route Performance</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Route</th>
                <th className="table-header">Sales Rep</th>
                <th className="table-header text-right">Target</th>
                <th className="table-header text-right">Actual</th>
                <th className="table-header text-right">Attainment</th>
                <th className="table-header text-right">Customers</th>
                <th className="table-header text-right">Complaints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {routePerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No route data for this week.
                  </td>
                </tr>
              ) : (
                routePerformance.map((row) => (
                  <tr key={row.route} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium">{row.route}</td>
                    <td className="table-cell">{row.salesRep}</td>
                    <td className="table-cell text-right">{formatCurrency(row.target)}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(row.actual)}</td>
                    <td className="table-cell text-right">
                      <span className={`font-semibold ${getPerformanceColor(row.attainment)}`}>
                        {row.attainment}%
                      </span>
                    </td>
                    <td className="table-cell text-right">{row.customers}</td>
                    <td className="table-cell text-right">
                      {row.complaints > 0 ? (
                        <span className="badge-danger">{row.complaints}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
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
