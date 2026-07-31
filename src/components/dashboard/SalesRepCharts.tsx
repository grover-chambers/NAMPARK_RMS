"use client";

import { Target, Clock } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n || 0);

interface Props {
  salesActual: number;
  salesTarget: number;
  shiftOnTime: boolean;
}

export default function SalesRepCharts({ salesActual, salesTarget, shiftOnTime }: Props) {
  const pct = salesTarget > 0 ? Math.min((salesActual / salesTarget) * 100, 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Target size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-700">KPI Gauge</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Sales vs Target</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-xl font-bold text-slate-800 mb-3"
            style={{
              background: `conic-gradient(#008080 ${pct}%, #e2e8f0 ${pct}%)`,
            }}
          >
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
              {Math.round(pct)}%
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500">
              {fmt(salesActual)} <span className="text-slate-300">/</span> {fmt(salesTarget)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">target</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Shift Adherence</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">On-Time Status</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              shiftOnTime ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
            }`}
          >
            <Clock size={28} />
          </div>
          <p className={`text-lg font-bold ${shiftOnTime ? "text-green-600" : "text-red-500"}`}>
            {shiftOnTime ? "On Time" : "Late"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {shiftOnTime
              ? "Shift started and ended on schedule"
              : "Shift times need attention"}
          </p>
        </div>
      </div>
    </div>
  );
}
