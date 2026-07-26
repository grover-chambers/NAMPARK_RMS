"use client";

import { useEffect, useState } from "react";
import {
  Route,
  Loader2,
  TrendingUp,
  MapPin,
  Target,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RouteData {
  id: string;
  name: string;
  mileageBefore: number;
  mileageAfter: number;
  targetDaily: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    assignments: number;
  };
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    setLoading(true);
    try {
      const res = await fetch("/api/assignments");
      const data = await res.json();
      if (data.success) {
        const routeMap = new Map<string, RouteData>();
        data.data.forEach((a: any) => {
          if (a.route) {
            const r = a.route;
            if (!routeMap.has(r.id)) {
              routeMap.set(r.id, {
                ...r,
                _count: { assignments: 0 },
              });
            }
            const existing = routeMap.get(r.id)!;
            existing._count!.assignments++;
          }
        });
        setRoutes(Array.from(routeMap.values()));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-800">
            Route Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {routes.length} route{routes.length !== 1 && "s"} configured
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Route className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{routes.length}</p>
              <p className="text-xs text-slate-500">Total Routes</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ToggleRight className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {routes.filter((r) => r.isActive).length}
              </p>
              <p className="text-xs text-slate-500">Active Routes</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(
                  routes.reduce((sum, r) => sum + r.targetDaily, 0)
                )}
              </p>
              <p className="text-xs text-slate-500">Combined Daily Target</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-serif font-bold text-slate-800">All Routes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Route Name</th>
                <th className="table-header">Mileage Before</th>
                <th className="table-header">Mileage After</th>
                <th className="table-header">Daily Target</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {routes.map((route) => (
                <tr
                  key={route.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() =>
                    setSelectedRoute(
                      selectedRoute?.id === route.id ? null : route
                    )
                  }
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brown-100 flex items-center justify-center">
                        <Route className="w-4 h-4 text-brown-700" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{route.name}</p>
                        {route._count && (
                          <p className="text-xs text-slate-400">
                            {route._count.assignments} assignment{route._count.assignments !== 1 && "s"}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {route.mileageBefore} km
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {route.mileageAfter} km
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-teal-500" />
                      <span className="font-medium text-teal-700">
                        {formatCurrency(route.targetDaily)}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {route.isActive ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-danger">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRoute && (
        <div className="card p-5">
          <h3 className="font-serif font-bold text-slate-800 mb-3">
            Route Details: {selectedRoute.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Mileage Before</p>
              <p className="font-semibold text-slate-800">{selectedRoute.mileageBefore} km</p>
            </div>
            <div>
              <p className="text-slate-500">Mileage After</p>
              <p className="font-semibold text-slate-800">{selectedRoute.mileageAfter} km</p>
            </div>
            <div>
              <p className="text-slate-500">Daily Target</p>
              <p className="font-semibold text-teal-700">{formatCurrency(selectedRoute.targetDaily)}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Distance</p>
              <p className="font-semibold text-slate-800">
                {Math.abs(selectedRoute.mileageAfter - selectedRoute.mileageBefore)} km
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
