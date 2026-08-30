"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Truck, Users, Route, Package, TrendingUp, AlertTriangle, Target, PiggyBank, Layers, MapPin, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FleetSummary {
  vehicles: { total: number; byStatus: Record<string, number> };
  drivers: number;
  reps: number;
  routeGroups: number;
  routes: number;
  outlets: number;
}

export default function IntelligenceOverviewPage() {
  const [fleet, setFleet] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vRes, rRes] = await Promise.all([
          fetch("/api/vehicles").then((r) => r.json()).catch(() => null),
          fetch("/api/routes").then((r) => r.json()).catch(() => null),
        ]);
        const vehicles = vRes?.vehicles ?? vRes ?? [];
        const routes = rRes?.routes ?? rRes ?? [];
        setFleet({
          vehicles: {
            total: Array.isArray(vehicles) ? vehicles.length : vehicles.total ?? 0,
            byStatus: Array.isArray(vehicles) ? vehicles.reduce((a: any, v: any) => { a[v.status ?? "ACTIVE"] = (a[v.status ?? "ACTIVE"] ?? 0) + 1; return a; }, {}) : {},
          },
          drivers: 0,
          reps: 0,
          routeGroups: 0,
          routes: Array.isArray(routes) ? routes.length : routes.total ?? 0,
          outlets: 0,
        });
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const kpis = useMemo(() => [
    { label: "Fleet Vehicles", value: fleet?.vehicles.total ?? "—", sub: `${fleet?.vehicles.byStatus["ACTIVE"] ?? 0} active`, icon: Truck, tone: "teal" },
    { label: "Route Groups", value: fleet?.routeGroups || "7", sub: "A–G", icon: Layers, tone: "amber" },
    { label: "Active Routes", value: fleet?.routes ?? "—", sub: "last 7d", icon: Route, tone: "violet" },
    { label: "Field Outlets", value: fleet?.outlets || "—", sub: "census mapped", icon: MapPin, tone: "emerald" },
    { label: "Utilization", value: "—", sub: "routes active / total", icon: Activity, tone: "slate" },
    { label: "Profit (W)", value: "—", sub: "sales − cost", icon: PiggyBank, tone: "green" },
  ], [fleet]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      {/* Level 0 — Executive Cockpit */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h1 className="text-[15px] font-bold text-slate-800">Level 0 — Executive Cockpit</h1>
        <p className="text-[11px] text-slate-500 mt-1">Overall Nampark health — assets that make it run. Drill any card → Fleet & Assets (L1) → Route Intelligence (L2) → Deliveries (L3) → Profitability (L4).</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-2"><Icon size={14} className="text-slate-500"/><span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">{k.label}</span></div>
              <div className="text-[20px] font-bold text-slate-800">{k.value}</div>
              <div className="text-[11px] text-slate-400">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link href="/intelligence/fleet" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
          <div className="text-[12px] font-bold text-slate-800 flex items-center gap-2"><Truck size={14}/> Level 1 — Fleet & Assets</div>
          <div className="text-[11px] text-slate-500 mt-1">Vehicles, drivers, reps, groups — engine room. See strained assets.</div>
          <div className="mt-3 text-[11px] font-medium text-teal-600">Open →</div>
        </Link>
        <Link href="/intelligence/routes" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
          <div className="text-[12px] font-bold text-slate-800 flex items-center gap-2"><Route size={14}/> Level 2 — Route Intelligence</div>
          <div className="text-[11px] text-slate-500 mt-1">Coverage %, outlet count, attainment, profitability preview per route.</div>
          <div className="mt-3 text-[11px] font-medium text-teal-600">Open →</div>
        </Link>
        <Link href="/intelligence/profitability" className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
          <div className="text-[12px] font-bold text-slate-800 flex items-center gap-2"><PiggyBank size={14}/> Level 4 — Profitability</div>
          <div className="text-[11px] text-slate-500 mt-1">Sales − COGS − returns − fuel − missing = profit. Post-routing P&L.</div>
          <div className="mt-3 text-[11px] font-medium text-teal-600">Open →</div>
        </Link>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-[12px] font-semibold text-amber-800">How drilling works</div>
        <div className="text-[11px] text-amber-700 mt-1">Overview (all groups) → Click Group B bar → Fleet filtered to B → Click Route 7B row → Deliveries for 7B (that week) → Drillthrough to Profitability for 7B. Slicers persist via URL <span className="font-mono bg-white px-1 py-0.5 rounded border">?group=B&route=routeId</span>. Existing dashboards remain behind at <Link href="/dashboard" className="underline">/dashboard</Link> etc.</div>
      </div>
    </div>
  );
}
