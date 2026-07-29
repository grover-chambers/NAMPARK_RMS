"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Loader2,
  Truck,
  Route,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DriverData {
  id: string;
  name: string;
  userId: string;
  assignments: {
    id: string;
    date: string;
    status: string;
    route: { name: string };
    vehicle: { registration: string };
  }[];
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    setLoading(true);
    try {
      // We'll fetch assignments and derive driver data from them
      // In a real app, there'd be a dedicated /api/drivers endpoint
      const res = await fetch("/api/assignments");
      const data = await res.json();
      if (data.success) {
        const driverMap = new Map<string, DriverData>();
        data.data.forEach((a: any) => {
          if (a.driver) {
            const d = a.driver;
            if (!driverMap.has(d.id)) {
              driverMap.set(d.id, {
                id: d.id,
                name: d.name,
                userId: d.userId,
                assignments: [],
              });
            }
            driverMap.get(d.id)!.assignments.push({
              id: a.id,
              date: a.date,
              status: a.status,
              route: a.route,
              vehicle: a.vehicle,
            });
          }
        });
        setDrivers(Array.from(driverMap.values()));
      }
    } catch (err) {
      console.error(err);
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
            Driver Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {drivers.length} driver{drivers.length !== 1 && "s"} in the system
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
              <p className="text-xs text-slate-500">Total Drivers</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {drivers.filter((d) =>
                  d.assignments.some((a) => a.status === "IN_PROGRESS")
                ).length}
              </p>
              <p className="text-xs text-slate-500">Currently Active</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {drivers.filter((d) =>
                  d.assignments.every((a) => a.status === "COMPLETED")
                ).length}
              </p>
              <p className="text-xs text-slate-500">All Tasks Completed</p>
            </div>
          </div>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          No drivers found in the system.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map((driver) => {
            const totalAssignments = driver.assignments.length;
            const completed = driver.assignments.filter(
              (a) => a.status === "COMPLETED"
            ).length;
            const inProgress = driver.assignments.filter(
              (a) => a.status === "IN_PROGRESS"
            ).length;
            const latestAssignment = driver.assignments[0];
            const assignedVehicle = latestAssignment?.vehicle?.registration || "N/A";
            const currentRoute = latestAssignment?.route?.name || "N/A";

            return (
              <div key={driver.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-brown-100 flex items-center justify-center text-brown-700 font-bold text-sm">
                      {driver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {driver.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {totalAssignments} total assignment{totalAssignments !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  {inProgress > 0 ? (
                    <span className="badge-info">Active</span>
                  ) : completed === totalAssignments && totalAssignments > 0 ? (
                    <span className="badge-success">Done</span>
                  ) : (
                    <span className="badge-warning">Idle</span>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      Vehicle:{" "}
                      <span className="font-mono font-medium text-slate-800">
                        {assignedVehicle}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Route className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      Route:{" "}
                      <span className="font-medium text-slate-800">
                        {currentRoute}
                      </span>
                    </span>
                  </div>
                  {latestAssignment && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>Last: {formatDate(latestAssignment.date)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>Performance</span>
                    <span>
                      {totalAssignments > 0
                        ? Math.round((completed / totalAssignments) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{
                        width: `${
                          totalAssignments > 0
                            ? (completed / totalAssignments) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      {completed} done
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <Truck className="w-3 h-3" />
                      {inProgress} active
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
