"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Truck, Route, Package, PiggyBank, Layers, Sparkles } from "lucide-react";

const tabs = [
  { href: "/intelligence", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/intelligence/fleet", label: "Fleet & Assets", icon: Truck },
  { href: "/intelligence/routes", label: "Mapping & Routing", icon: Route },
  { href: "/intelligence/deliveries", label: "Delivery Execution", icon: Package },
  { href: "/intelligence/profitability", label: "Profitability", icon: PiggyBank },
];

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      {/* Power BI header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
            <Layers size={14} className="text-white" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">Nampark Intelligence <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">POWER BI</span></div>
            <div className="text-[11px] text-slate-500">Assets → Mapping &amp; Truck Routes → Deliveries → Profit — Kanini Field wards + NAMPARK trucks</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500"><Sparkles size={12}/> Default navigation</span>
          <Link href="/dashboard" className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white text-[11px]">Dashboards behind →</Link>
        </div>
      </div>

      {/* Power BI page strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname?.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors ${active ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={13} /> {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
