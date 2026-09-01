"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Truck, Users, Route, Package, TrendingUp, Layers, MapPin, Activity, LayoutDashboard, ArrowRight, ChevronRight, Clock, DollarSign, Boxes } from "lucide-react";

type DrillLevel = "overview" | "route" | "fleet-personnel" | "orders-loads" | "transaction";

interface RouteRow { id: string; name: string; groupId?: string; group?: { name: string }; isActive?: boolean; targetDaily?: number }
interface VehicleRow { id: string; status?: string; name?: string }
interface DriverRow { id: string; name?: string }

export default function IntelligencePowerBiPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [reps, setReps] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<DrillLevel>("overview");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [rRes, vRes, repRes, dRes, delRes, oRes] = await Promise.all([
          fetch("/api/routes").then((r) => r.json()).catch(() => ({ data: [] })),
          fetch("/api/vehicles").then((r) => r.json()).catch(() => ({ data: [] })),
          fetch("/api/sales-reps").then((r) => r.json()).catch(() => fetch("/api/reps").then((x) => x.json()).catch(() => ({ data: [] }))),
          fetch("/api/drivers").then((r) => r.json()).catch(() => ({ data: [] })),
          fetch("/api/deliveries").then((r) => r.json()).catch(() => fetch("/api/driver/deliveries").then((x) => x.json()).catch(() => ({ data: [] }))),
          fetch("/api/orders").then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        const rData = rRes.data ?? rRes.routes ?? rRes ?? [];
        const vData = vRes.data ?? vRes.vehicles ?? vRes ?? [];
        const repData = repRes.data ?? repRes.reps ?? repRes ?? [];
        const driData = dRes.data ?? dRes.drivers ?? dRes ?? [];
        const delData = delRes.data ?? delRes.deliveries ?? delRes ?? [];
        const oData = oRes.data ?? oRes.orders ?? oRes ?? [];
        setRoutes(Array.isArray(rData) ? rData : []);
        setVehicles(Array.isArray(vData) ? vData : []);
        setReps(Array.isArray(repData) ? repData : []);
        setDrivers(Array.isArray(driData) ? driData : []);
        setDeliveries(Array.isArray(delData) ? delData : []);
        setOrders(Array.isArray(oData) ? oData : []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, number>();
    routes.forEach((r) => { const g = (r.group as any)?.name ?? r.groupId ?? "—"; m.set(g, (m.get(g) ?? 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    if (!selectedGroup) return routes;
    return routes.filter((r) => ((r.group as any)?.name ?? r.groupId) === selectedGroup);
  }, [routes, selectedGroup]);

  const stats = useMemo(() => {
    const totalRoutes = routes.length;
    const activeRoutes = routes.filter((r) => r.isActive !== false).length;
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter((v) => (v.status ?? "ACTIVE") === "ACTIVE").length;
    const totalDeliveries = deliveries.length;
    const totalOrders = orders.length;
    return { totalRoutes, activeRoutes, totalVehicles, activeVehicles, totalDeliveries, totalOrders, reps: reps.length, drivers: drivers.length };
  }, [routes, vehicles, deliveries, orders, reps, drivers]);

  const lastTransaction = useMemo(() => {
    const cand = [...deliveries, ...orders].sort((a: any, b: any) => new Date(b.createdAt ?? b.created_at ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? 0).getTime());
    return cand[0] as any | undefined;
  }, [deliveries, orders]);

  if (loading) return <div className="min-h-screen bg-[#0f1419] flex items-center justify-center"><div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0f1419] text-white flex flex-col">
      {/* Header — Power BI title bar */}
      <div className="sticky top-0 z-20 bg-[#0f1419]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[56px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 grid place-items-center font-black text-[#0f1419]">N</div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold tracking-wide">OPERATIONAL INTELLIGENCE</div>
              <div className="text-[11px] text-white/60 -mt-0.5">Power BI · Live · Kiambu-first 12 sub-counties · drill to last transaction</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-white/60">
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
        {/* Breadcrumb chain */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-3 flex items-center gap-1.5 text-[11px] overflow-x-auto">
          <button onClick={() => { setLevel("overview"); setSelectedGroup(null); setSelectedRoute(null); }} className={`px-2.5 py-1 rounded-full border ${level === "overview" ? "bg-white text-[#0f1419] border-white" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"}`}>Overview</button>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
          <button onClick={() => selectedGroup && setLevel("route")} className={`px-2.5 py-1 rounded-full border ${level === "route" ? "bg-teal-400 text-[#0f1419] border-teal-400" : "bg-white/5 text-white/70 border-white/10"}`}>Routes {selectedGroup ? `· ${selectedGroup}` : ""}</button>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
          <button onClick={() => setLevel("fleet-personnel")} className={`px-2.5 py-1 rounded-full border ${level === "fleet-personnel" ? "bg-amber-400 text-[#0f1419] border-amber-400" : "bg-white/5 text-white/70 border-white/10"}`}>Fleet & Personnel</button>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
          <button onClick={() => setLevel("orders-loads")} className={`px-2.5 py-1 rounded-full border ${level === "orders-loads" ? "bg-violet-400 text-[#0f1419] border-violet-400" : "bg-white/5 text-white/70 border-white/10"}`}>Orders & Loads</button>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
          <button onClick={() => setLevel("transaction")} className={`px-2.5 py-1 rounded-full border ${level === "transaction" ? "bg-emerald-400 text-[#0f1419] border-emerald-400" : "bg-white/5 text-white/70 border-white/10"}`}>Last transaction</button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 space-y-5 flex-1 w-full">
        {/* LEVEL 0 / 1 — ROUTE BREAKDOWN at top (Power BI hierarchy) */}
        <section className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden">
          <div className="px-4 md:px-5 py-3 flex items-center justify-between border-b border-white/5">
            <h2 className="text-[12px] font-bold tracking-widest uppercase text-white/90 flex items-center gap-2"><Route size={14} className="text-teal-300" /> Route Breakdown — Top of Chain</h2>
            <span className="text-[11px] font-mono text-white/50">{stats.totalRoutes} total · {stats.activeRoutes} active · {groups.length || 7} groups A–G</span>
          </div>
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {(groups.length ? groups : [["A", 4], ["B", 4], ["C", 4], ["D", 4], ["E", 4], ["F", 4], ["G", 4]]).map(([g, count]) => (
                <button key={String(g)} onClick={() => { setSelectedGroup(String(g)); setSelectedRoute(null); setLevel("route"); }} className={`text-left rounded-xl p-3 border transition-all ${selectedGroup === String(g) ? "bg-teal-400 text-[#0f1419] border-teal-400 shadow-lg shadow-teal-400/20" : "bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white"}`}>
                  <div className="text-[10px] tracking-widest uppercase opacity-70">Group {g}</div>
                  <div className="text-[22px] font-black mt-1">{count as number}</div>
                  <div className="text-[11px] opacity-60">routes</div>
                  <div className="mt-2 text-[11px] font-medium flex items-center gap-1 opacity-80">Drill <ArrowRight size={10} /></div>
                </button>
              ))}
            </div>
            {/* Route table drill — last transaction chain: clicking route goes to fleet/personnel for that route */}
            <div className="mt-4 rounded-xl bg-black/20 border border-white/5 overflow-hidden">
              <div className="px-3 py-2 flex items-center justify-between text-[11px] text-white/60 border-b border-white/5">
                <span>{selectedGroup ? `Routes in Group ${selectedGroup}` : "All routes — click any to drill"} · {filteredRoutes.length} rows</span>
                <span className="hidden sm:inline">Tip: Route → Fleet & Personnel → Orders & Loads → Transaction</span>
              </div>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[#0f1419]/90 backdrop-blur text-[11px] text-white/50">
                    <tr><th className="text-left px-3 py-2 font-medium">Route</th><th className="text-left px-3 py-2 font-medium">Group</th><th className="text-right px-3 py-2 font-medium">Target/day</th><th className="text-left px-3 py-2 font-medium">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRoutes.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-white/40">No routes — seed via /routes or /api/routes</td></tr> : filteredRoutes.slice(0, 20).map((r) => (
                      <tr key={r.id} className={`hover:bg-white/5 cursor-pointer ${selectedRoute?.id === r.id ? "bg-teal-400/15" : ""}`} onClick={() => { setSelectedRoute(r); setLevel("fleet-personnel"); }}>
                        <td className="px-3 py-2 font-medium text-white">{r.name}</td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[11px] font-mono">{(r.group as any)?.name ?? r.groupId ?? "—"}</span></td>
                        <td className="px-3 py-2 text-right font-mono text-white/70">{(r as any).targetDaily ?? "—"}</td>
                        <td className="px-3 py-2"><span className="text-teal-300 hover:underline text-[11px]">Drill → Fleet</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* LEVEL 2 — Fleet & Personnel (side by side) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[12px] font-bold tracking-widest uppercase text-white/90 flex items-center gap-2"><Truck size={14} className="text-amber-300" /> Fleet</h3>
              <button onClick={() => setLevel("fleet-personnel")} className="text-[11px] text-amber-300 hover:underline">Drill →</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-[#0f1419]">
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80 flex items-center gap-1.5"><Boxes size={12} /> Vehicles</div>
                <div className="text-[28px] font-black leading-none mt-1">{stats.totalVehicles}</div>
                <div className="text-[11px] opacity-70">{stats.activeVehicles} active · {stats.totalVehicles - stats.activeVehicles} other</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-white/60">Utilization</div>
                <div className="text-[18px] font-bold text-white">{stats.totalVehicles ? Math.round((stats.activeVehicles / stats.totalVehicles) * 100) : 0}%</div>
                <div className="text-[11px] text-white/40">active / total</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${stats.totalVehicles ? (stats.activeVehicles / stats.totalVehicles) * 100 : 0}%` }} /></div>
              </div>
              <div className="col-span-2 rounded-xl bg-black/20 border border-white/5 p-3">
                <div className="text-[11px] font-mono text-white/50">By status</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {vehicles.length === 0 ? <span className="text-[11px] text-white/40">No vehicles yet</span> : Array.from(vehicles.reduce((a: Map<string, number>, v: any) => { const s = v.status ?? "ACTIVE"; a.set(s, (a.get(s) ?? 0) + 1); return a; }, new Map()).entries()).map(([s, n]) => (
                    <span key={s} className="px-2 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-mono text-white">{s} · {n}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[12px] font-bold tracking-widest uppercase text-white/90 flex items-center gap-2"><Users size={14} className="text-violet-300" /> Personnel</h3>
              <button onClick={() => setLevel("fleet-personnel")} className="text-[11px] text-violet-300 hover:underline">Drill →</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-white/60">Sales Reps</div>
                <div className="text-[28px] font-black text-white">{stats.reps || "—"}</div>
                <div className="text-[11px] text-white/40">assigned to routes</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="text-[11px] text-white/60">Drivers</div>
                <div className="text-[28px] font-black text-white">{stats.drivers || "—"}</div>
                <div className="text-[11px] text-white/40">on fleet</div>
              </div>
              <div className="col-span-2 text-[11px] text-white/40 border-t border-white/5 pt-3">
                {selectedRoute ? <span>Filtered to <b className="text-white">{selectedRoute.name}</b> — personnel assignments for this route show here. Full list at <a href="/reps" className="text-violet-300 underline">/reps</a> & <a href="/drivers" className="text-violet-300 underline">/drivers</a></span> : "Pick a route above to see its crew. Drill from Route → Fleet & Personnel is the chain."}
              </div>
            </div>
          </section>
        </div>

        {/* LEVEL 3 — Orders & Loads */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[12px] font-bold tracking-widest uppercase text-white/90 flex items-center gap-2"><Package size={14} className="text-emerald-300" /> Orders</h3>
              <button onClick={() => setLevel("orders-loads")} className="text-[11px] text-emerald-300 hover:underline">Drill →</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-3 text-[#0f1419]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Orders</div>
                  <div className="text-[26px] font-black">{stats.totalOrders}</div>
                  <div className="text-[11px] opacity-70">total</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60">Value</div>
                  <div className="text-[14px] font-bold text-white">KES —</div>
                  <div className="text-[11px] text-white/40">from order totals</div>
                </div>
              </div>
              <div className="text-[11px] text-white/40">{selectedRoute ? `Orders for ${selectedRoute.name} — last transaction drill shows actual SKU/amount below.` : "Select a route to filter orders by that route's deliveries."}</div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[12px] font-bold tracking-widest uppercase text-white/90 flex items-center gap-2"><Layers size={14} className="text-sky-300" /> Loads & Deliveries</h3>
              <button onClick={() => setLevel("orders-loads")} className="text-[11px] text-sky-300 hover:underline">Drill →</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60">Deliveries</div>
                  <div className="text-[26px] font-black text-white">{stats.totalDeliveries}</div>
                  <div className="text-[11px] text-white/40">loads</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60">Tonnage</div>
                  <div className="text-[14px] font-bold text-white">— t</div>
                  <div className="text-[11px] text-white/40">sum of loads</div>
                </div>
              </div>
              <div className="text-[11px] text-white/40">Loads aggregate per route; click a delivery to see profitability P&L.</div>
            </div>
          </section>
        </div>

        {/* Last transaction — drilled */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/20 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <h3 className="text-[12px] font-bold tracking-widest uppercase text-emerald-200 flex items-center gap-2"><Clock size={14} /> Last transaction in chain</h3>
            <span className="text-[11px] font-mono text-white/50">{lastTransaction ? new Date((lastTransaction as any).createdAt ?? (lastTransaction as any).created_at ?? Date.now()).toLocaleString() : "no data yet"}</span>
          </div>
          <div className="px-4 pb-4">
            {lastTransaction ? (
              <div className="rounded-xl bg-[#0f1419] border border-white/10 p-3 font-mono text-[11px] text-white/80 overflow-auto">
                <div className="flex items-center gap-2 mb-2"><span className="px-1.5 py-0.5 rounded bg-emerald-400 text-[#0f1419] font-bold text-[10px]">{(lastTransaction as any).id?.slice(0, 8) ?? "TX"}</span><span className="text-white">{(lastTransaction as any).routeId ?? (lastTransaction as any).route_id ?? selectedRoute?.name ?? "route"} → fleet → personnel → order/load</span></div>
                <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed">{JSON.stringify(lastTransaction, null, 2).slice(0, 900)}</pre>
                <div className="mt-2 flex gap-2">
                  <a href="/intelligence/deliveries" className="text-[11px] text-teal-300 hover:underline">Open Deliveries →</a>
                  <a href="/intelligence/profitability" className="text-[11px] text-amber-300 hover:underline">Open Profitability →</a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-black/20 border border-white/5 p-4 text-[11px] text-white/50">No deliveries/orders yet — seed routes then create a delivery/order. The last `delivery` or `order` created will appear here as the end of the chain: <span className="text-white/80">Route (top) → Fleet & Personnel → Orders & Loads → this transaction</span>.</div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom — Back to dashboards */}
      <div className="sticky bottom-0 z-20 bg-[#0f1419] border-t border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/50 hidden sm:block">Power BI · drill any card to follow the chain to the last transaction. No nav — immersive.</div>
          <button onClick={() => router.push("/dashboard")} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0f1419] text-[12px] font-bold hover:bg-white/90 transition-colors">
            <LayoutDashboard size={14} /> Back to dashboards (full nav) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
