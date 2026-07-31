"use client";

import { Clock, Fuel } from "lucide-react";

interface Props {
  deliveryRate: number;
  fuelEfficiency: number | null;
}

export default function DriverCharts({ deliveryRate, fuelEfficiency }: Props) {
  const colorClass =
    deliveryRate >= 80
      ? "text-green-600"
      : deliveryRate >= 60
        ? "text-amber-600"
        : "text-red-500";

  const bgClass =
    deliveryRate >= 80
      ? "bg-green-50"
      : deliveryRate >= 60
        ? "bg-amber-50"
        : "bg-red-50";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}><Clock size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-700">On-Time Delivery</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Performance</p>
          </div>
        </div>

        <div className="flex flex-col items-center py-2">
          <p className={`text-5xl font-bold ${colorClass}`}>{Math.round(deliveryRate)}%</p>
          <p className="text-xs text-slate-400 mt-2">
            {deliveryRate >= 80
              ? "Excellent on-time performance"
              : deliveryRate >= 60
                ? "Moderate — room for improvement"
                : "Needs urgent attention"}
          </p>
        </div>

        <div className="mt-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                deliveryRate >= 80
                  ? "bg-green-500"
                  : deliveryRate >= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(deliveryRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Fuel size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Fuel Efficiency</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Km / Cost Ratio</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          {fuelEfficiency !== null && fuelEfficiency !== undefined ? (
            <>
              <p className="text-4xl font-bold text-slate-800">{fuelEfficiency.toFixed(1)}</p>
              <p className="text-xs text-slate-400 mt-1">km per KES</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  fuelEfficiency > 1 ? "bg-green-500" : fuelEfficiency > 0.5 ? "bg-amber-500" : "bg-red-500"
                }`} />
                {fuelEfficiency > 1
                  ? "Efficient"
                  : fuelEfficiency > 0.5
                    ? "Average"
                    : "Below average"}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-4">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
