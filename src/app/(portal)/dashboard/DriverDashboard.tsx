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

interface Assignment {
  id: string;
  date: string;
  status: string;
  route: { name: string };
  salesRep: { name: string };
  vehicle: { registration: string };
  driverShift?: { distanceCovered: number; notes: string } | null;
}

export default function DriverDashboard() {
  const { data: session } = useSession();
  const [todayAssignment, setTodayAssignment] = useState<Assignment | null>(null);
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
        const res = await fetch(`/api/assignments?startDate=${start.toISOString()}&endDate=${new Date().toISOString()}`);
        const data = await res.json();
        const all: Assignment[] = data.data || [];
        const todayA = all.find((a) => a.date === today) || null;
        setTodayAssignment(todayA);
        setRecentAssignments(all.slice(0, 5));
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
        {todayAssignment ? (
          <div className="card p-5 border-l-4 border-l-slate-400 bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Today&apos;s Route</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{todayAssignment.route.name}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {todayAssignment.route.name}</span>
                  <span className="flex items-center gap-1"><Truck size={14} /> {todayAssignment.vehicle.registration}</span>
                </div>
              </div>
              <span className={
                todayAssignment.status === "COMPLETED" ? "badge-success" :
                todayAssignment.status === "IN_PROGRESS" ? "badge-warning" : "badge-neutral"
              }>
                {todayAssignment.status.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400 uppercase">Sales Rep</p>
                <p className="text-sm font-medium text-slate-700">{todayAssignment.salesRep.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Vehicle</p>
                <p className="text-sm font-medium text-slate-700 font-mono">{todayAssignment.vehicle.registration}</p>
              </div>
              {todayAssignment.driverShift && (
                <div>
                  <p className="text-xs text-slate-400 uppercase">Distance Covered</p>
                  <p className="text-sm font-medium text-slate-700">{todayAssignment.driverShift.distanceCovered} km</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <Truck size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No route assigned today.</p>
            <p className="text-xs text-slate-400 mt-1">Check with your administrator.</p>
          </div>
        )}

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
                      <td className="table-cell font-mono text-xs">{a.vehicle.registration}</td>
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
