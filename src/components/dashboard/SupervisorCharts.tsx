"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Truck, CheckCircle2 } from "lucide-react";

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

interface Vehicle {
  id: string;
  registration: string;
  fleetDaily?: { expectedAvailable: number } | null;
}

interface Props {
  assignments: Assignment[];
  vehicles: Vehicle[];
}

export default function SupervisorCharts({ assignments, vehicles }: Props) {
  const routeTotals: Record<string, { total: number; completed: number }> = {};
  assignments.forEach((a) => {
    const name = a.route.name;
    if (!routeTotals[name]) routeTotals[name] = { total: 0, completed: 0 };
    routeTotals[name].total++;
    if (a.status === "COMPLETED") routeTotals[name].completed++;
  });

  const routeData = Object.entries(routeTotals).map(([route, { total, completed }]) => ({
    route,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }));

  const availableVehicles = vehicles.filter(
    (v) => (v.fleetDaily?.expectedAvailable ?? 0) > 0
  ).length;

  const pctTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-sm">
          <p className="text-slate-500 text-xs mb-1">{label}</p>
          <p className="font-semibold text-slate-800">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><CheckCircle2 size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Fleet Availability</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Today</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{availableVehicles}</p>
          <p className="text-xs text-slate-400 mt-1">vehicles available</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Truck size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Total Vehicles</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Fleet</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{vehicles.length}</p>
          <p className="text-xs text-slate-400 mt-1">registered vehicles</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Route Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={routeData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="route" tick={{ fontSize: 12, fill: "#64748b" }} width={80} />
            <Tooltip content={pctTooltip} />
            <Bar dataKey="completionRate" fill="#008080" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
