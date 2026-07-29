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
  DollarSign,
  Package,
  Truck,
  RotateCcw,
  FileX2,
  PiggyBank,
  Scale,
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

interface RoutePerformance {
  routeId: string;
  routeName: string;
  salesRepName: string;
  target: number;
  actual: number;
  attainment: number;
  customerCount: number;
  complaints: number;
  daysActive: number;
}

interface DailyTrend {
  day: string;
  sales: number;
  target: number;
}

interface OverallStats {
  totalSales: number;
  totalTarget: number;
  avgAttainment: number;
  totalComplaints: number;
  totalMissingItems: number;
  totalCustomers: number;
  metCount: number;
  notMetCount: number;
  totalAssignments: number;
}

interface PerformanceData {
  period: { startDate: string; endDate: string };
  overall: OverallStats;
  routePerformance: RoutePerformance[];
  dailyTrend: DailyTrend[];
}

interface ProfitabilityRow {
  routeId: string;
  routeName: string;
  tonnageDelivered: number | null;
  sales: number;
  cogs: number | null;
  returnsCost: number;
  fuelVehicleCost: number;
  missingItemsOpportunityCost: number;
  costOfSales: number | null;
  profit: number | null;
  cogsStatus: "available" | "pending_pricing";
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
  const [data, setData] = useState<PerformanceData | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityRow[]>([]);
  const [loadingProfitability, setLoadingProfitability] = useState(true);

  const startDate = getWeekStart(weekOffset);
  const endDate = getWeekEnd(weekOffset);
  const weekRange = getWeekRange(new Date(`${startDate}T12:00:00`));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/performance?startDate=${startDate}&endDate=${endDate}`
        );
        const json = await res.json();
        if (json.success) setData(json.data);
        else setData(null);
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    async function fetchProfitability() {
      setLoadingProfitability(true);
      try {
        const res = await fetch(`/api/reports/profitability?weekStart=${startDate}`);
        const json = await res.json();
        if (Array.isArray(json)) setProfitability(json);
        else setProfitability([]);
      } catch {
        setProfitability([]);
      } finally {
        setLoadingProfitability(false);
      }
    }
    fetchProfitability();
  }, [startDate]);

  const overall = data?.overall ?? {
    totalSales: 0,
    totalTarget: 0,
    avgAttainment: 0,
    totalComplaints: 0,
    totalMissingItems: 0,
    totalCustomers: 0,
    metCount: 0,
    notMetCount: 0,
    totalAssignments: 0,
  };
  const routePerformance = data?.routePerformance ?? [];
  const dailyTrend = data?.dailyTrend ?? [];
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
              params={{ startDate, endDate }}
              onCSVExport={() => {
                const rows = [
                  toCSVRow(["Route", "Rep", "Target", "Actual", "Attainment%", "Customers", "Complaints"]),
                  ...routePerformance.map((r) =>
                    toCSVRow([r.routeName, r.salesRepName, r.target, r.actual, r.attainment, r.customerCount, r.complaints])
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
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(overall.totalSales)}</p>
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
              <p className={`text-2xl font-bold ${getPerformanceColor(overall.avgAttainment)}`}>{overall.avgAttainment}%</p>
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
              <p className="text-2xl font-bold text-slate-800">{overall.totalComplaints}</p>
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
          <h2 className="font-serif font-bold text-slate-800">Daily Sales vs Target</h2>
        </div>
        {dailyTrend.every((d) => d.sales === 0 && d.target === 0) ? (
          <p className="text-center text-slate-400 text-sm py-8">No trend data for this period</p>
        ) : (
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
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#b45309"
                  fill="#b45309"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Target"
                  strokeDasharray="6 3"
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#0d9488"
                  fill="#0d9488"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Sales"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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
                    No route data for this period.
                  </td>
                </tr>
              ) : (
                routePerformance.map((row) => (
                  <tr key={row.routeId} className="hover:bg-slate-50/50">
                    <td className="table-cell font-medium">{row.routeName}</td>
                    <td className="table-cell">{row.salesRepName}</td>
                    <td className="table-cell text-right">{formatCurrency(row.target)}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(row.actual)}</td>
                    <td className="table-cell text-right">
                      <span className={`font-semibold ${getPerformanceColor(row.attainment)}`}>
                        {row.attainment}%
                      </span>
                    </td>
                    <td className="table-cell text-right">{row.customerCount}</td>
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

      {/* Profitability Section */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="w-5 h-5 text-teal-600" />
          <h2 className="font-serif font-bold text-slate-800">Profitability Analysis</h2>
          <span className="text-xs text-slate-400 ml-auto">P = Sales − Cost of Sales</span>
        </div>
        {loadingProfitability ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profitability.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">No profitability data for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-header">Route</th>
                  <th className="table-header text-right"><Package size={12} className="inline mr-1" />Tonnage</th>
                  <th className="table-header text-right"><DollarSign size={12} className="inline mr-1" />Sales</th>
                  <th className="table-header text-right"><Scale size={12} className="inline mr-1" />COGS</th>
                  <th className="table-header text-right"><RotateCcw size={12} className="inline mr-1" />Returns</th>
                  <th className="table-header text-right"><Truck size={12} className="inline mr-1" />Fuel & Vehicle</th>
                  <th className="table-header text-right"><FileX2 size={12} className="inline mr-1" />Missing</th>
                  <th className="table-header text-right">Cost of Sales</th>
                  <th className="table-header text-right"><TrendingUp size={12} className="inline mr-1" />Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profitability.map((row) => {
                  const hasPricing = row.cogsStatus === "available";
                  return (
                    <tr key={row.routeId} className="hover:bg-slate-50/50">
                      <td className="table-cell font-medium">{row.routeName}</td>
                      <td className="table-cell text-right">
                        {row.tonnageDelivered != null ? `${row.tonnageDelivered.toFixed(2)} t` : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {row.sales > 0 ? `KES ${row.sales.toLocaleString()}` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="table-cell text-right">
                        {hasPricing && row.cogs != null
                          ? `KES ${row.cogs.toLocaleString()}`
                          : <span className="text-amber-500 text-xs italic">Pending pricing</span>}
                      </td>
                      <td className="table-cell text-right">
                        {row.returnsCost > 0 ? `KES ${row.returnsCost.toLocaleString()}` : <span className="text-slate-400">0</span>}
                      </td>
                      <td className="table-cell text-right">
                        {row.fuelVehicleCost > 0 ? `KES ${row.fuelVehicleCost.toLocaleString()}` : <span className="text-slate-400">0</span>}
                      </td>
                      <td className="table-cell text-right">
                        {row.missingItemsOpportunityCost > 0
                          ? `KES ${row.missingItemsOpportunityCost.toLocaleString()}`
                          : <span className="text-slate-400">0</span>}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {hasPricing && row.costOfSales != null
                          ? `KES ${row.costOfSales.toLocaleString()}`
                          : <span className="text-amber-500 text-xs italic">Pending pricing</span>}
                      </td>
                      <td className="table-cell text-right">
                        {hasPricing && row.profit != null ? (
                          <span className={row.profit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {row.profit >= 0 ? "+" : ""}KES {row.profit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-amber-500 text-xs italic">Pending pricing</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {profitability.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-500">
            <p><span className="font-medium text-slate-700">Note:</span> Sales = tonnage &times; KES 130,000/t. Returns &amp; missing items valued at opportunity (selling) cost.</p>
          </div>
        )}
      </div>
    </div>
  );
}
