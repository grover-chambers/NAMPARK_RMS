"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Truck, Users, Route, Package, MapPin, Layers } from "lucide-react";

export default function FleetAssetsPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rRes, vRes] = await Promise.all([
          fetch("/api/routes").then((r) => r.json()).catch(() => ({ data: [] })),
          fetch("/api/vehicles").then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        setRoutes(rRes.data ?? rRes.routes ?? []);
        setVehicles(vRes.data ?? vRes.vehicles ?? []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>;

  const byStatus = vehicles.reduce((a: any, v: any) => { const s = v.status ?? "ACTIVE"; a[s] = (a[s] ?? 0) + 1; return a; }, {} as Record<string, number>);
  const groups = Array.from(new Set(routes.map((r: any) => r.groupId ?? r.group?.name ?? "—")));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Truck size={14}/> Level 1 — Fleet & Assets <span className="text-[11px] font-normal text-slate-500">Engine room</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">Vehicles, drivers, reps, groups — which parts are strained? Click a route group → Level 2 filtered.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-700 flex items-center gap-2"><Truck size={14}/> Vehicles by Status</div>
          <div className="mt-3 space-y-2">
            {Object.keys(byStatus).length === 0 ? (
              <div className="text-[11px] text-slate-400">No vehicles — seed via /vehicles</div>
            ) : Object.entries(byStatus).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between text-[12px]"><span className="px-2 py-0.5 rounded bg-slate-100 border text-[11px] font-mono">{s}</span><span className="font-bold">{n as number}</span></div>
            ))}
            <div className="pt-2 text-[11px] text-slate-500">{vehicles.length} total vehicles</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-700 flex items-center gap-2"><Route size={14}/> Route Groups</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {groups.length === 0 ? <span className="text-[11px] text-slate-400">No groups</span> : groups.map((g) => (
              <Link key={g} href={`/intelligence/routes?group=${encodeURIComponent(g)}`} className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-medium text-teal-700 hover:bg-teal-100">{g}</Link>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">{routes.length} active routes</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-700 flex items-center gap-2"><Users size={14}/> People</div>
          <div className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-500">Sales Reps</span><Link href="/reps" className="text-teal-600 hover:underline font-medium">Manage →</Link></div>
            <div className="flex justify-between"><span className="text-slate-500">Drivers</span><Link href="/drivers" className="text-teal-600 hover:underline font-medium">Manage →</Link></div>
            <div className="pt-2 text-[11px] text-slate-400">Assign via SalesRepRoute / Driver assignments</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2"><Route size={14} className="text-teal-600"/><span className="text-[12px] font-bold">Routes — drill to Level 2</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] text-slate-500"><th className="px-3 py-2 text-left">Route</th><th className="px-3 py-2 text-left">Group</th><th className="px-3 py-2 text-right">Tonnage</th><th className="px-3 py-2 text-right">Target/day</th><th className="px-3 py-2 text-right">Vehicle</th><th className="px-3 py-2"></th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {routes.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-400 text-sm">No routes</td></tr> : routes.slice(0, 25).map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-white border text-[10px] font-mono">{r.group?.name ?? r.groupId ?? "—"}</span></td>
                  <td className="px-3 py-2 text-right">{r.tonnage ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{r.targetDaily ?? 0}</td>
                  <td className="px-3 py-2 text-right text-[11px]">{r.defaultVehicle?.registration ?? r.defaultVehicleId ?? "—"}</td>
                  <td className="px-3 py-2 text-right"><Link href={`/intelligence/routes?route=${r.id}`} className="text-[11px] text-teal-600 hover:underline">Drill →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
