"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Users,
  Truck,
  FileText,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  formatCurrency,
  getWeekRange,
  getPerformanceColor,
  toCSVRow,
} from "@/lib/utils";
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

interface MissingItemRanked {
  skuName: string;
  count: number;
  cartonsAffected: number;
  customersAffected: number;
}

interface ReturnType {
  type: string;
  count: number;
  amount: number;
}

interface DriverPerformance {
  driverId: string;
  driverName: string;
  routes: number;
  totalCustomers: number;
  totalReturns: number;
  totalReturnValue: number;
  totalDelayMinutes: number;
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
  totalMissingItemsValue: number;
  totalReturnsValue: number;
  totalAssignments: number;
  totalComplaints: number;
}

interface WeeklyData {
  overall: OverallStats;
  routePerformance: RoutePerformance[];
  missingItemsRanked: MissingItemRanked[];
  returnsByType: ReturnType[];
  driverPerformance: DriverPerformance[];
  dailyTrend: DailyTrend[];
}

const RETURN_TYPE_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong Item",
  MISSING_ITEM: "Missing Item",
  CANCELLED_ORDER: "Cancelled Order",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
};

const RETURN_TYPE_COLORS = [
  "#006666",
  "#b45309",
  "#dc2626",
  "#7c3aed",
  "#2563eb",
];

function getWeekStartISO(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split("T")[0];
}

export default function WeeklySummaryPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeeklyData | null>(null);

  const startDate = getWeekStartISO(weekOffset);
  const weekRange = getWeekRange(new Date(`${startDate}T12:00:00`));

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- initial loading state for data fetch
    fetch(`/api/reports/weekly-executive?week=${startDate}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setData(null);
      })
      .catch(() => { if (!controller.signal.aborted) setData(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [startDate]);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ["Route", "Sales Rep", "Target", "Actual", "Attainment%", "Customers", "Complaints"];
    const rows = data.routePerformance.map((r) => [
      r.routeName,
      r.salesRepName,
      r.target.toFixed(0),
      r.actual.toFixed(0),
      String(r.attainment),
      String(r.customerCount),
      String(r.complaints),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-summary-${startDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overall = data?.overall ?? {
    totalSales: 0,
    totalTarget: 0,
    avgAttainment: 0,
    totalMissingItemsValue: 0,
    totalReturnsValue: 0,
    totalAssignments: 0,
    totalComplaints: 0,
  };

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-800">
                Weekly Executive Summary
              </h1>
              <p className="text-sm text-slate-500 mt-1">{weekRange.label}</p>
            </div>
          </div>
          <ExportBar
            title="Weekly Summary"
            filename={`nampark-weekly-${weekRange.label.replace(/\s/g, "-")}`}
            reportType="weekly-executive"
            params={{ week: startDate }}
            onCSVExport={() => {
              if (!data) return "";
              const rows = [
                toCSVRow(["Route", "Rep", "Target", "Actual", "Attainment%", "Customers", "Complaints"]),
                ...data.routePerformance.map((r: any) =>
                  toCSVRow([r.routeName, r.salesRepName, r.target, r.actual, r.attainment.toFixed(1), r.customerCount, r.complaints])
                ),
              ];
              return rows.join("\n");
            }}
          />
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-outline btn-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
            {weekRange.label}
          </span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-outline btn-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="btn-outline btn-sm text-xs"
            >
              This Week
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading weekly data...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="card p-12 text-center">
          <FileText className="text-slate-400 mx-auto mb-4" size={40} />
          <h3 className="text-lg font-serif font-bold text-slate-700 mb-2">
            No Data Available
          </h3>
          <p className="text-slate-500 text-sm">
            No assignment data found for this week.
          </p>
        </div>
      ) : (
        <>
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
              iconBg="bg-teal-50"
              label="Total Sales (All Routes)"
              value={formatCurrency(overall.totalSales)}
            />
            <StatCard
              icon={<Target className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-50"
              label="Average Attainment"
              value={`${overall.avgAttainment}%`}
              valueClass={getPerformanceColor(overall.avgAttainment)}
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
              iconBg="bg-red-50"
              label="Total Missing Items"
              value={String(overall.totalMissingItemsValue)}
              sub="cartons affected"
            />
            <StatCard
              icon={<RotateCcw className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-50"
              label="Total Returns Value"
              value={formatCurrency(overall.totalReturnsValue)}
            />
          </div>

          {/* Route Performance Table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h2 className="font-serif font-bold text-slate-800">
                  Route Performance
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Route</th>
                    <th className="table-header">Rep</th>
                    <th className="table-header text-right">Target</th>
                    <th className="table-header text-right">Actual</th>
                    <th className="table-header text-right">Attainment</th>
                    <th className="table-header text-right">Customers</th>
                    <th className="table-header text-right">Complaints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.routePerformance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                        No route data for this week.
                      </td>
                    </tr>
                  ) : (
                    data.routePerformance.map((row) => (
                      <tr key={row.routeId} className="hover:bg-slate-50/50">
                        <td className="table-cell font-medium">{row.routeName}</td>
                        <td className="table-cell">{row.salesRepName}</td>
                        <td className="table-cell text-right">
                          {formatCurrency(row.target)}
                        </td>
                        <td className="table-cell text-right font-medium">
                          {formatCurrency(row.actual)}
                        </td>
                        <td className="table-cell text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getPerformanceBg(
                              row.attainment
                            )} ${getPerformanceColor(row.attainment)}`}
                          >
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

          {/* Charts Row: Missing Items + Returns Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Missing Items Bar Chart */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-serif font-bold text-slate-800">
                  Top Missing Items
                </h2>
              </div>
              {data.missingItemsRanked.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  No missing items this week
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.missingItemsRanked.slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        type="category"
                        dataKey="skuName"
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="cartonsAffected"
                        fill="#006666"
                        radius={[0, 4, 4, 0]}
                        name="Cartons Affected"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Returns Breakdown PieChart */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                <h2 className="font-serif font-bold text-slate-800">
                  Returns by Type
                </h2>
              </div>
              {data.returnsByType.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  No returns this week
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.returnsByType.map((r) => ({
                          name: RETURN_TYPE_LABELS[r.type] || r.type,
                          value: r.amount,
                          count: r.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {data.returnsByType.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={RETURN_TYPE_COLORS[index % RETURN_TYPE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Driver Performance Table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                <h2 className="font-serif font-bold text-slate-800">
                  Driver Performance
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Driver</th>
                    <th className="table-header text-right">Routes</th>
                    <th className="table-header text-right">Total Customers</th>
                    <th className="table-header text-right">Total Returns</th>
                    <th className="table-header text-right">Returns Value</th>
                    <th className="table-header text-right">Total Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.driverPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                        No driver data for this week.
                      </td>
                    </tr>
                  ) : (
                    data.driverPerformance.map((d) => (
                      <tr key={d.driverId} className="hover:bg-slate-50/50">
                        <td className="table-cell font-medium">{d.driverName}</td>
                        <td className="table-cell text-right">{d.routes}</td>
                        <td className="table-cell text-right">{d.totalCustomers}</td>
                        <td className="table-cell text-right">
                          {d.totalReturns > 0 ? (
                            <span className="badge-warning">{d.totalReturns}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          {d.totalReturnValue > 0
                            ? formatCurrency(d.totalReturnValue)
                            : "—"}
                        </td>
                        <td className="table-cell text-right">
                          {d.totalDelayMinutes > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-amber-600 text-xs font-medium">
                              <Clock size={12} />
                              {Math.floor(d.totalDelayMinutes / 60)}h {d.totalDelayMinutes % 60}m
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overall Performance Trend AreaChart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              <h2 className="font-serif font-bold text-slate-800">
                Daily Sales vs Target Trend
              </h2>
            </div>
            {data.dailyTrend.every((d) => d.sales === 0 && d.target === 0) ? (
              <p className="text-center text-slate-400 text-sm py-8">
                No trend data for this week
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
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
                      stroke="#006666"
                      fill="#006666"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Sales"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClass = "",
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${valueClass || "text-slate-800"}`}>
            {value}
          </p>
          <p className="text-xs text-slate-500">
            {label}
            {sub && <span className="text-slate-400 ml-1">({sub})</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function getPerformanceBg(pct: number): string {
  if (pct >= 90) return "bg-green-50 border-green-200";
  if (pct >= 70) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}
