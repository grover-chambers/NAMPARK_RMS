"use client";

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Package, Percent } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n || 0);

interface Assignment {
  id: string;
  date: string;
  status: string;
  route: { name: string };
  salesRep: { name: string };
  driver: { name: string };
  vehicle: { registration: string };
  salesRepShift?: { salesActual: number; customerCountActual: number; complaints: number } | null;
}

interface Props {
  assignments: Assignment[];
  profitability: Record<string, number | undefined> | null;
}

export default function AdminCharts({ assignments, profitability }: Props) {
  const dayMap: Record<string, number> = {};
  const routeMap: Record<string, number> = {};

  assignments.forEach((a) => {
    const d = new Date(a.date);
    const key = d.toLocaleDateString("en-KE", { weekday: "short" });
    dayMap[key] = (dayMap[key] || 0) + (a.salesRepShift?.salesActual ?? 0);

    const r = a.route.name;
    routeMap[r] = (routeMap[r] || 0) + (a.salesRepShift?.salesActual ?? 0);
  });

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const revenueData = dayOrder.map((day) => ({ day, sales: dayMap[day] || 0 }));
  const routeData = Object.entries(routeMap).map(([route, sales]) => ({ route, sales }));

  const p = profitability || {};
  const totalRevenue = (p.totalRevenue as number) ?? 0;
  const totalCOGS = (p.totalCOGS as number) ?? 0;
  const grossProfit = (p.grossProfit as number) ?? 0;
  const marginPercent = (p.marginPercent as number) ?? 0;

  const statCards = [
    { label: "Total Revenue", value: fmt(totalRevenue), icon: <DollarSign size={18} />, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "COGS", value: fmt(totalCOGS), icon: <Package size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Gross Profit", value: fmt(grossProfit), icon: <TrendingUp size={18} />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Margin", value: `${Math.round(marginPercent)}%`, icon: <Percent size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const currencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-sm">
          <p className="text-slate-500 text-xs mb-1">{label}</p>
          <p className="font-semibold text-slate-800">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 truncate">{s.value}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={currencyTooltip} />
              <Area type="monotone" dataKey="sales" stroke="#008080" fill="#008080" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Route Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={routeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="route" tick={{ fontSize: 12, fill: "#64748b" }} width={80} />
              <Tooltip content={currencyTooltip} />
              <Bar dataKey="sales" fill="#008080" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
