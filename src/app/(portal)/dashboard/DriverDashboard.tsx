"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  ClipboardList,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
} from "lucide-react";
import DriverCharts from "@/components/dashboard/DriverCharts";

interface Assignment {
  id: string;
  date: string;
  status: string;
  dayType?: string;
  route: { name: string };
  salesRep: { name: string } | null;
  vehicle: { registration: string } | null;
  driverShift?: { distanceCovered: number; notes: string } | null;
}

export default function DriverDashboard() {
  const { data: session } = useSession();
  const [todayAssignments, setTodayAssignments] = useState<Assignment[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = (session?.user as any)?.name || "Driver";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      try {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        const end = new Date();
        end.setDate(end.getDate() + 6);
        const res = await fetch(`/api/assignments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
        const data = await res.json();
        const all: Assignment[] = data.data || [];
        setTodayAssignments(all.filter((a) => a.date === today));
        setUpcomingAssignments(all.filter((a) => a.date > today));
        setRecentAssignments(all.filter((a) => a.date < today).slice(0, 5));
      } catch {
        setRecentAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="px-4 md:px-6 py-5">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">Driver Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome, {userName}</p>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Today's assignment */}
        {todayAssignments.length > 0 ? (
          <div className="space-y-3">
            {todayAssignments.map((a) => (
              <div key={a.id} className="card p-5 border-l-4 border-l-slate-400 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                      Today&apos;s Route
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 text-[10px] font-semibold">
                        {a.dayType === "ORDER_TAKING" ? "Order Taking" : "Delivery"}
                      </span>
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{a.route.name}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {a.route.name}</span>
                      <span className="flex items-center gap-1"><Truck size={14} /> {a.vehicle?.registration ?? "Not assigned"}</span>
                    </div>
                  </div>
                  <span className={
                    a.status === "COMPLETED" ? "badge-success" :
                    a.status === "IN_PROGRESS" ? "badge-warning" : "badge-neutral"
                  }>
                    {a.status.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Sales Rep</p>
                    <p className="text-sm font-medium text-slate-700">{a.salesRep?.name ?? "To be assigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Vehicle</p>
                    <p className="text-sm font-medium text-slate-700 font-mono">{a.vehicle?.registration ?? "—"}</p>
                  </div>
                  {a.driverShift && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Distance Covered</p>
                      <p className="text-sm font-medium text-slate-700">{a.driverShift.distanceCovered} km</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <Truck size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No route assigned today.</p>
            <p className="text-xs text-slate-400 mt-1">Check the schedule below for your next route.</p>
          </div>
        )}

        <DriverCharts deliveryRate={85} fuelEfficiency={null} />

        {/* Upcoming schedule */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Schedule</h3>
            <span className="text-xs text-slate-400">{upcomingAssignments.length} scheduled</span>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No upcoming assignments scheduled.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                      a.dayType === "ORDER_TAKING" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {a.dayType === "ORDER_TAKING" ? "Order" : "Delivery"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{a.route.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.date + "T00:00:00").toLocaleDateString("en-KE", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {a.vehicle?.registration ?? "Vehicle TBA"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link href="/daily-report/driver" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600"><ClipboardList size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Submit Report</p>
                  <p className="text-[11px] text-slate-400">End-of-day log</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
          <Link href="/returns" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><RotateCcw size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Returns</p>
                  <p className="text-[11px] text-slate-400">Log returned items</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
          <Link href="/profile" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Truck size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">My Profile</p>
                  <p className="text-[11px] text-slate-400">Account settings</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Recent trips */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Recent Trips</h3>
          </div>
          {recentAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No recent trips.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Date</th>
                    <th className="table-header">Route</th>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="table-cell text-xs">{new Date(a.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</td>
                      <td className="table-cell font-medium">{a.route.name}</td>
                      <td className="table-cell font-mono text-xs">{a.vehicle?.registration ?? "—"}</td>
                      <td className="table-cell">
                        {a.status === "COMPLETED" ? <span className="badge-success"><CheckCircle2 size={10} /> Done</span> :
                         a.status === "IN_PROGRESS" ? <span className="badge-warning"><Clock size={10} /> Active</span> :
                         <span className="badge-neutral"><Clock size={10} /> Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
