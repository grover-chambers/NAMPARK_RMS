"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Route, MapPin, Users, Filter, Truck, Layers, Clock, Navigation, Map as MapIcon, ChevronDown, ChevronUp, Package } from "lucide-react";
import dynamic from "next/dynamic";

const NamparkTruckMap = dynamic(() => import("@/components/intelligence/nampark-truck-map"), { ssr: false });

const GROUPS = ["All", "A", "B", "C", "D", "E", "F", "G"];
const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

type TabKey = "map" | "trucks" | "territory" | "list";

function fmtTime(minutesFrom0600: number) {
  const total = 6 * 60 + minutesFrom0600;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function RouteIntelligenceContent() {
  const searchParams = useSearchParams();
  const groupFilter = searchParams.get("group") ?? "All";
  const routeFilter = searchParams.get("route") ?? "";
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routeFilter || null);
  const [activeTab, setActiveTab] = useState<TabKey>("map");
  const [showWards, setShowWards] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/routes").then((r) => r.json());
        const data = res.data ?? res.routes ?? res ?? [];
        setRoutes(Array.isArray(data) ? data : []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = routes;
    if (groupFilter !== "All") r = r.filter((x: any) => (x.group?.name ?? x.groupId) === groupFilter);
    if (routeFilter) r = r.filter((x: any) => x.id === routeFilter);
    return r;
  }, [routes, groupFilter, routeFilter]);

  // Keep selectedRoute in sync with URL filter
  useEffect(() => {
    if (routeFilter) setSelectedRouteId(routeFilter);
  }, [routeFilter]);

  const truckRoutes = useMemo(() => {
    const visible = filtered.slice(0, 24);
    return visible.map((r: any, idx: number) => {
      const g = r.group?.name ?? r.groupId ?? "A";
      const gIdx = GROUPS.indexOf(g);
      const depotLat = -1.28 + (gIdx >= 0 ? (gIdx % 4) * 0.06 : idx * 0.02);
      const depotLng = 36.78 + (gIdx >= 0 ? Math.floor(gIdx / 4) * 0.08 : idx * 0.015);
      const pseudo = ((idx * 9301 + 49297) % 233280) / 233280;
      const points: [number, number][] = [[depotLat, depotLng]];
      const stops = 6 + Math.floor(pseudo * 3);
      for (let j = 1; j <= stops; j++) {
        const jitterLat = ((j * 37 + idx * 13) % 100) / 1000;
        const jitterLng = ((j * 53 + idx * 17) % 100) / 1000;
        points.push([depotLat + j * 0.012 + jitterLat, depotLng + j * 0.012 + jitterLng]);
      }
      return {
        id: r.id,
        name: r.name,
        group: g,
        vehicle: r.defaultVehicle?.registration ?? r.defaultVehicleId ?? "Van",
        points,
        color: GROUP_COLORS[g] || "#047857",
      };
    });
  }, [filtered]);

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const r of filtered) {
      const g = r.group?.name ?? r.groupId ?? "—";
      if (!m[g]) m[g] = [];
      m[g].push(r);
    }
    return m;
  }, [filtered]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>;

  const tabDefs: { key: TabKey; label: string; icon: typeof MapIcon; desc: string }[] = [
    { key: "map", label: "Overview Map", icon: MapIcon, desc: "Trucks + wards" },
    { key: "trucks", label: "Truck Routes", icon: Truck, desc: "Vehicles & schedules" },
    { key: "territory", label: "Territory", icon: Layers, desc: "Wards (Kanini Field)" },
    { key: "list", label: "Route List", icon: Route, desc: "Grouped routes" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Route size={14}/> Level 2 — Mapping &amp; Routing <span className="text-[11px] font-normal text-slate-500">Kanini Field wards + truck polylines</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">Where trucks go: ward polygons from <span className="font-mono bg-slate-50 border px-1 rounded">/geo/territory_wards.json</span> (borrowed from Kanini Field TerritoryMap) + truck route polylines (depot → stops). Select a truck to highlight its path. Click route → Level 3 Deliveries.</p>
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <Filter size={12} className="text-slate-400"/><span className="text-[11px] text-slate-500">Group</span>
          {GROUPS.map((g) => (
            <Link key={g} href={g === "All" ? "/intelligence/routes" : `/intelligence/routes?group=${g}`} className={`px-2.5 py-1 rounded-full text-[11px] border ${groupFilter===g ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600"}`}>{g==="All"?"All Groups":`RG-${g}`}</Link>
          ))}
          {routeFilter && <Link href="/intelligence/routes" className="ml-2 text-[11px] text-teal-600 hover:underline">Clear route filter</Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Routes in view</div><div className="text-[22px] font-bold">{filtered.length}</div><div className="text-[11px] text-slate-400">of {routes.length} total</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1"><Truck size={12}/> Trucks</div><div className="text-[22px] font-bold">{truckRoutes.length}</div><div className="text-[11px] text-slate-400">polylines on map</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Avg attainment</div><div className="text-[22px] font-bold">—</div><div className="text-[11px] text-slate-400">from daily assignments</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Wards</div><div className="text-[22px] font-bold">93</div><div className="text-[11px] text-slate-400">territory_wards.json</div></div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabDefs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors cursor-pointer ${active ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={13} /> {t.label}
              <span className={`hidden sm:inline text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>· {t.desc}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showWards} onChange={(e) => setShowWards(e.target.checked)} className="rounded border-slate-300" />
            Wards
          </label>
          <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">Kanini Field TerritoryMap</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-[12px] flex items-center gap-1.5">
              {activeTab === "trucks" ? <><Truck size={12}/> Truck Routes — highlighted paths</> : activeTab === "territory" ? <><Layers size={12}/> Territory Wards + Trucks</> : <><MapPin size={12}/> Mapping &amp; Routing — Map</>}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#047857]" /> Depot</span>
              <span>·</span>
              <span>Trucks: solid · others: dashed</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 520 }}>
            <NamparkTruckMap truckRoutes={truckRoutes} selectedRouteId={selectedRouteId} selectedGroup={groupFilter} showWards={showWards} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#047857]" /> Depot</span>
            <span className="flex items-center gap-1">🚚 Truck head = route start</span>
            <span className="hidden sm:inline">· Polyline = truck path (depot → stops)</span>
            <span className="ml-auto">ward logic via /geo/territory_wards.json — Kanini Field TerritoryMap</span>
          </div>
        </div>

        <div className="space-y-4 max-h-[560px] overflow-y-auto">
          {activeTab === "map" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="font-semibold text-[13px] mb-3 flex items-center gap-1.5"><Navigation size={14}/> Routes by Group</div>
              <div className="space-y-2">
                {Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([g, routes]) => {
                  const isExp = expanded === g;
                  const isGroupSelected = groupFilter === g;
                  return (
                    <div key={g} className={`border rounded-lg overflow-hidden ${isGroupSelected ? "border-teal-600 ring-1 ring-teal-600/20" : "border-slate-200"}`}>
                      <button onClick={() => setExpanded(isExp ? null : g)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: GROUP_COLORS[g] || "#666" }} />
                          <span className="text-[12px] font-semibold text-slate-800">Group {g}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{routes.length} routes</span>
                        </div>
                        {isExp ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                      </button>
                      {isExp && (
                        <div className="px-3 pb-3 space-y-1.5">
                          {routes.map((r:any) => {
                            const isSel = selectedRouteId === r.id;
                            return (
                              <button key={r.id} onClick={() => setSelectedRouteId(isSel ? null : r.id)} className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${isSel ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-transparent hover:border-slate-200"}`}>
                                <Truck size={11} className={`mt-0.5 shrink-0 ${isSel ? "text-teal-600" : "text-slate-400"}`} />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[11px] font-medium truncate ${isSel ? "text-teal-800" : "text-slate-800"}`}>{r.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{r.group?.name ?? r.groupId ?? "—"} · {r.defaultVehicle?.registration ?? "Van"}</div>
                                </div>
                                {isSel && <span className="text-[9px] font-mono bg-teal-600 text-white px-1 py-0.5 rounded">TRUCK</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] text-slate-400">Tap a route to highlight its truck path (solid). Tap again to clear.</div>
            </div>
          )}

          {activeTab === "trucks" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="font-semibold text-[13px] mb-3 flex items-center gap-1.5"><Truck size={14}/> Truck Schedule</div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {truckRoutes.map((t, idx) => {
                  const isSel = selectedRouteId === t.id;
                  const departure = fmtTime(idx * 14);
                  const eta = fmtTime(idx * 14 + t.points.length * 9);
                  const stops = t.points.length - 1;
                  return (
                    <button key={t.id} onClick={() => setSelectedRouteId(isSel ? null : t.id)} className={`w-full text-left border rounded-lg p-3 cursor-pointer transition-all ${isSel ? "bg-teal-600 text-white border-teal-600 shadow" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`text-[12px] font-semibold ${isSel ? "text-white" : "text-slate-800"}`}>{t.name}</div>
                          <div className={`text-[11px] ${isSel ? "text-white/80" : "text-slate-500"}`}>Group {t.group} · {t.vehicle} · {stops} stops</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1 ${isSel ? "bg-white" : ""}`} style={!isSel ? { background: t.color } : undefined} />
                      </div>
                      <div className={`mt-2 flex items-center gap-3 text-[11px] font-mono ${isSel ? "text-white/90" : "text-slate-600"}`}>
                        <span className="flex items-center gap-1"><Clock size={11}/> {departure}</span>
                        <span>→</span>
                        <span>{eta} ETA</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{t.points.length} pts</span>
                      </div>
                      <div className={`mt-1 text-[10px] ${isSel ? "text-white/70" : "text-slate-400"}`}>Depot → {stops} outlets · {t.color}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-mono">Departures staggered 14min; ETA = departure + 9min/stop. Highlight to see polyline.</div>
            </div>
          )}

          {activeTab === "territory" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="font-semibold text-[13px] mb-3 flex items-center gap-1.5"><Layers size={14}/> Territory Wards</div>
              <div className="text-[11px] text-slate-500 mb-3">93 wards from Kanini Field `territory_wards.json`. Toggle Wards above to show boundaries. Each ward groups outlets for route planning.</div>
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {Object.keys(grouped).slice(0,12).map((g) => (
                  <div key={g} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[12px] font-medium text-slate-700">Group {g}</span>
                    <span className="text-[11px] font-mono text-slate-600">{grouped[g].length} routes</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">Borrowed from Kanini Field: ward polygons are the same GeoJSON the field app uses for outlet assignment.</div>
            </div>
          )}

          {activeTab === "list" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="font-semibold text-[13px] mb-3">Routes — drill to Deliveries (L3)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] text-slate-500"><th className="px-3 py-2 text-left">Route</th><th className="px-3 py-2 text-left">Group</th><th className="px-3 py-2 text-right">Tonnage</th><th className="px-3 py-2 text-right">Target/day</th><th className="px-3 py-2"></th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.length===0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-400">No routes</td></tr> : filtered.slice(0,20).map((r:any)=>(
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-white border text-[10px] font-mono">{r.group?.name ?? r.groupId ?? "—"}</span></td>
                        <td className="px-3 py-2 text-right">{r.tonnage ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{r.targetDaily ?? 0}</td>
                        <td className="px-3 py-2 text-right flex gap-2 justify-end">
                          <Link href={`/intelligence/deliveries?route=${r.id}`} className="text-[11px] text-teal-600 hover:underline">Deliveries →</Link>
                          <Link href={`/intelligence/profitability?route=${r.id}`} className="text-[11px] text-amber-700 hover:underline">Profit →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="text-slate-500">
          Drill: <Link href="/intelligence" className="text-teal-600 hover:underline">Level 0</Link> · <Link href="/intelligence/fleet" className="text-teal-600 hover:underline">Fleet</Link> · <span className="font-semibold text-teal-600">Mapping</span> · <Link href="/intelligence/deliveries" className="text-teal-600 hover:underline">Deliveries →</Link>
        </div>
        <Link href="/field-data" className="text-teal-600 hover:underline flex items-center gap-1"><MapPin size={11}/> Field Data Wards</Link>
      </div>
    </div>
  );
}

export default function RouteIntelligencePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>}>
      <RouteIntelligenceContent />
    </Suspense>
  );
}
