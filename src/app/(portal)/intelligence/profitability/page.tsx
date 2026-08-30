"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PiggyBank, TrendingUp } from "lucide-react";

interface ProfitRow {
  routeId: string;
  routeName: string;
  tonnageDelivered: number | null;
  sales: number;
  cogs: number | null;
  returnsCost: number;
  fuelVehicleCost: number;
  missingOpportunity: number;
  costOfSales: number | null;
  profit: number | null;
  cogsStatus: string;
}

function ProfitabilityContent() {
  const searchParams = useSearchParams();
  const route = searchParams.get("route");
  const [data, setData] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const weekStart = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      try {
        const url = route ? `/api/reports/profitability?weekStart=${weekStart}&routeId=${route}` : `/api/reports/profitability?weekStart=${weekStart}`;
        const res = await fetch(url).then((r) => r.json());
        setData(Array.isArray(res) ? res : []);
      } catch {
        setData([]);
      }
      setLoading(false);
    }
    load();
  }, [weekStart, route]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><PiggyBank size={14}/> Level 4 — Route Profitability <span className="text-[11px] font-normal text-slate-500">Sales − Cost of Sales</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">Post-routing P&L. {route ? <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">route={route}</span> : "All routes this week. Drill from Route Intelligence for one route."} — mirrors PlayMax Kanini profitability.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] text-slate-500"><th className="px-3 py-2 text-left">Route</th><th className="px-3 py-2 text-right">Tonnage</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">COGS</th><th className="px-3 py-2 text-right">Returns</th><th className="px-3 py-2 text-right">Fuel & Vehicle</th><th className="px-3 py-2 text-right">Missing</th><th className="px-3 py-2 text-right">Cost of Sales</th><th className="px-3 py-2 text-right">Profit</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {data.length===0 ? <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">No profitability — run a week with pricing synced, or check <Link href="/intelligence/routes" className="text-teal-600 hover:underline">Route Intelligence</Link></td></tr> : data.map((r)=>(
                <tr key={r.routeId} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{r.routeName}</td>
                  <td className="px-3 py-2 text-right">{r.tonnageDelivered!=null ? `${r.tonnageDelivered.toFixed(2)} t` : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.sales ? `KES ${r.sales.toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2 text-right">{r.cogsStatus==="available" && r.cogs!=null ? `KES ${r.cogs.toLocaleString()}` : <span className="text-amber-500 text-xs italic">Pending pricing</span>}</td>
                  <td className="px-3 py-2 text-right">{r.returnsCost ? `KES ${r.returnsCost.toLocaleString()}` : "0"}</td>
                  <td className="px-3 py-2 text-right">{r.fuelVehicleCost ? `KES ${r.fuelVehicleCost.toLocaleString()}` : "0"}</td>
                  <td className="px-3 py-2 text-right">{r.missingOpportunity ? `KES ${r.missingOpportunity.toLocaleString()}` : "0"}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.costOfSales!=null ? `KES ${r.costOfSales.toLocaleString()}` : <span className="text-amber-500 text-xs italic">Pending</span>}</td>
                  <td className="px-3 py-2 text-right">{r.profit!=null ? <span className={r.profit>=0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{r.profit>=0?"+":""}KES {r.profit.toLocaleString()}</span> : <span className="text-amber-500 text-xs italic">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">Note: Sales = tonnage × KES 130,000/t. Returns & missing at opportunity cost. Leaf of the drill: Overview → Fleet → Routes → Deliveries → Profit.</div>
      </div>
    </div>
  );
}

export default function ProfitabilityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>}>
      <ProfitabilityContent />
    </Suspense>
  );
}
