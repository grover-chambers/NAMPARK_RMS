"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  CalendarRange,
  ClipboardCheck,
  TrendingUp,
  Scale,
  AlertTriangle,
  ShoppingCart,
  Activity,
  Users,
  Route,
  Package,
  Loader2,
} from "lucide-react";
import {
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate, getPerformanceColor } from "@/lib/utils";

const ALLOWED_ROLES = ["ADMIN", "SUPERVISOR", "BRANCH_MANAGER", "HQ_MANAGER", "DIRECTOR"];

const RANGE_OPTIONS = [
  { days: 7, label: "7D" },
  { days: 14, label: "14D" },
  { days: 30, label: "30D" },
];

const CHART_COLORS = { actual: "#0d9488", target: "#b45309", bar: "#008080" };
const DAY_TYPE_COLORS = ["#0d9488", "#b45309"];

interface AssignmentOrder {
  id: string;
  totalAmount: number;
}

interface SalesRepShiftData {
  customerCountActual: number;
  customerCountTarget: number;
  salesActual: number;
  salesTarget: number;
  tonnageActual: number | null;
  tonnageTarget: number | null;
  complaints: number;
}

interface Assignment {
  id: string;
  date: string;
  status: string;
  dayType: string;
  route: { name: string };
  salesRep: { id: string; name: string } | null;
  orders?: AssignmentOrder[];
  salesRepShift?: SalesRepShiftData | null;
}

interface DailyRow {
  key: string;
  day: string;
  visitsActual: number;
  visitsTarget: number;
  tonnageActual: number;
  tonnageTarget: number;
}

interface RepRow {
  id: string;
  name: string;
  visits: number;
  visitsTarget: number;
  attainment: number;
  sales: number;
  salesTarget: number;
  variance: number;
}

function getRangeStart(days: number): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() - (days - 1));
  return utc.toISOString().split("T")[0];
}

function buildDaySpan(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const end = Date.parse(`${endKey}T00:00:00Z`);
  for (let t = Date.parse(`${startKey}T00:00:00Z`); t <= end; t += 86400000) {
    keys.push(new Date(t).toISOString().split("T")[0]);
  }
  return keys;
}

export default function FieldDataPage() {
  const { data: session, status } = useSession();
  const [rangeDays, setRangeDays] = useState(7);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  const startDate = getRangeStart(rangeDays);
  const endDate = today;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/assignments?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
        );
        const json = await res.json();
        setAssignments(json.data || []);
      } catch (err) {
        console.error(err);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [startDate, endDate]);

  const role = (session?.user as { role?: string } | undefined)?.role ?? "";

  // ── Derived metrics (all computed client-side from /api/assignments) ──
  const visitsActual = assignments.reduce((s, a) => s + (a.salesRepShift?.customerCountActual ?? 0), 0);
  const visitsTarget = assignments.reduce((s, a) => s + (a.salesRepShift?.customerCountTarget ?? 0), 0);
  const salesActual = assignments.reduce((s, a) => s + (a.salesRepShift?.salesActual ?? 0), 0);
  const salesTarget = assignments.reduce((s, a) => s + (a.salesRepShift?.salesTarget ?? 0), 0);
  const tonnageActual = assignments.reduce((s, a) => s + (a.salesRepShift?.tonnageActual ?? 0), 0);
  const tonnageTarget = assignments.reduce((s, a) => s + (a.salesRepShift?.tonnageTarget ?? 0), 0);
  const complaintsTotal = assignments.reduce((s, a) => s + (a.salesRepShift?.complaints ?? 0), 0);
  const ordersTotal = assignments.reduce(
    (s, a) => s + (a.orders ?? []).reduce((x, o) => x + o.totalAmount, 0),
    0
  );
  const ordersCount = assignments.reduce((s, a) => s + (a.orders?.length ?? 0), 0);
  const visitsPct = visitsTarget > 0 ? Math.round((visitsActual / visitsTarget) * 100) : 0;

  const dailyMap = new Map<string, DailyRow>();
  for (const key of buildDaySpan(startDate, endDate)) {
    dailyMap.set(key, {
      key,
      day: new Date(`${key}T12:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
      visitsActual: 0,
      visitsTarget: 0,
      tonnageActual: 0,
      tonnageTarget: 0,
    });
  }
  for (const a of assignments) {
    const key = String(a.date).split("T")[0];
    const row = dailyMap.get(key);
    if (!row || !a.salesRepShift) continue;
    row.visitsActual += a.salesRepShift.customerCountActual ?? 0;
    row.visitsTarget += a.salesRepShift.customerCountTarget ?? 0;
    row.tonnageActual += a.salesRepShift.tonnageActual ?? 0;
    row.tonnageTarget += a.salesRepShift.tonnageTarget ?? 0;
  }
  const dailyData = Array.from(dailyMap.values());

  const repMap = new Map<string, RepRow>();
  for (const a of assignments) {
    const id = a.salesRep?.id ?? "unassigned";
    if (!repMap.has(id)) {
      repMap.set(id, {
        id,
        name: a.salesRep?.name ?? "Unassigned",
        visits: 0,
        visitsTarget: 0,
        attainment: 0,
        sales: 0,
        salesTarget: 0,
        variance: 0,
      });
    }
    const row = repMap.get(id)!;
    row.visits += a.salesRepShift?.customerCountActual ?? 0;
    row.visitsTarget += a.salesRepShift?.customerCountTarget ?? 0;
    row.sales += a.salesRepShift?.salesActual ?? 0;
    row.salesTarget += a.salesRepShift?.salesTarget ?? 0;
  }
  const repRows = Array.from(repMap.values())
    .map((r) => ({
      ...r,
      attainment: r.salesTarget > 0 ? Math.round((r.sales / r.salesTarget) * 100) : 0,
      variance: r.sales - r.salesTarget,
    }))
    .sort((a, b) => b.sales - a.sales);
  const topReps = repRows.slice(0, 8).map((r) => ({ name: r.name, sales: r.sales }));

  const orderTakingCount = assignments.filter((a) => a.dayType === "ORDER_TAKING").length;
  const deliveryCount = assignments.filter((a) => a.dayType === "DELIVERY").length;
  const dayTypeData = [
    { name: "Order Taking", value: orderTakingCount },
    { name: "Delivery", value: deliveryCount },
  ];

  const rangeLabel = `Last ${rangeDays} days · ${formatDate(`${startDate}T12:00:00Z`)} – ${formatDate(`${endDate}T12:00:00Z`)}`;
  const tooltipStyle = { borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" };

  if (status === "authenticated" && !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-500 text-sm">You do not have permission to view field data.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Field Data</h1>
            <p className="text-sm text-slate-500 mt-1">{rangeLabel}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-white">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  rangeDays === opt.days
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarRange size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No field data for this period</p>
          <p className="text-xs text-slate-400 mt-1">Try a longer range once reps have submitted their reports.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className={`text-2xl font-bold ${getPerformanceColor(visitsPct)}`}>{visitsPct}%</p>
                  <p className="text-xs text-slate-500 truncate">
                    Visits · {visitsActual} of {visitsTarget}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(salesActual)}</p>
                  <p className="text-xs text-slate-500 truncate">Sales · of {formatCurrency(salesTarget)}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brown-50 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-brown-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-slate-800">{tonnageActual.toFixed(2)} t</p>
                  <p className="text-xs text-slate-500 truncate">Tonnage · of {tonnageTarget.toFixed(2)} t</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-slate-800">{complaintsTotal}</p>
                  <p className="text-xs text-slate-500 truncate">Complaints reported</p>
                </div>
              </div>
            </div>
            <div className="stat-card col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(ordersTotal)}</p>
                  <p className="text-xs text-slate-500 truncate">{ordersCount} orders captured</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily visits actual vs target */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal-600" />
              <h2 className="font-serif font-bold text-slate-800">Daily Visits — Actual vs Target</h2>
            </div>
            {dailyData.every((d) => d.visitsActual === 0 && d.visitsTarget === 0) ? (
              <p className="text-center text-slate-400 text-sm py-8">No visit data for this period</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="visitsActual" name="Actual visits" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="visitsTarget"
                      name="Target visits"
                      stroke={CHART_COLORS.target}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top reps by sales */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-teal-600" />
                <h2 className="font-serif font-bold text-slate-800">Top Sales Reps</h2>
              </div>
              {topReps.every((r) => r.sales === 0) ? (
                <p className="text-center text-slate-400 text-sm py-8">No sales recorded for this period</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topReps} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} width={110} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
                      <Bar dataKey="sales" fill={CHART_COLORS.bar} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Order taking vs delivery */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Route className="w-5 h-5 text-teal-600" />
                <h2 className="font-serif font-bold text-slate-800">Assignments by Day Type</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dayTypeData}
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
                      {dayTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DAY_TYPE_COLORS[index % DAY_TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily tonnage */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-teal-600" />
              <h2 className="font-serif font-bold text-slate-800">Daily Tonnage</h2>
            </div>
            {dailyData.every((d) => d.tonnageActual === 0 && d.tonnageTarget === 0) ? (
              <p className="text-center text-slate-400 text-sm py-8">No tonnage data for this period</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${Number(v).toFixed(1)}t`} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="tonnageTarget"
                      name="Target (t)"
                      stroke={CHART_COLORS.target}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="tonnageActual"
                      name="Actual (t)"
                      stroke={CHART_COLORS.actual}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Rep table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h2 className="font-serif font-bold text-slate-800">Sales Rep Breakdown</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Sales Rep</th>
                    <th className="table-header text-right">Visits</th>
                    <th className="table-header text-right">Attainment</th>
                    <th className="table-header text-right">Sales</th>
                    <th className="table-header text-right">Target</th>
                    <th className="table-header text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {repRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                        No rep data for this period.
                      </td>
                    </tr>
                  ) : (
                    repRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="table-cell font-medium">{row.name}</td>
                        <td className="table-cell text-right">
                          {row.visits}
                          {row.visitsTarget > 0 && (
                            <span className="text-slate-400 text-xs"> / {row.visitsTarget}</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.attainment >= 90
                                    ? "bg-green-500"
                                    : row.attainment >= 70
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(row.attainment, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold w-10 text-right ${getPerformanceColor(row.attainment)}`}>
                              {row.attainment}%
                            </span>
                          </div>
                        </td>
                        <td className="table-cell text-right font-medium">{formatCurrency(row.sales)}</td>
                        <td className="table-cell text-right text-slate-500">{formatCurrency(row.salesTarget)}</td>
                        <td className="table-cell text-right">
                          <span className={`font-semibold ${row.variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {row.variance >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(row.variance))}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
