"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Route,
  Target,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import SalesRepCharts from "@/components/dashboard/SalesRepCharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface ShiftData {
  salesTarget: number;
  salesActual: number;
  customerCountTarget: number;
  customerCountActual: number;
  complaints: number;
  returnsCount: number;
}

interface Assignment {
  id: string;
  date: string;
  status: string;
  dayType?: string;
  route: { name: string };
  salesRepShift?: ShiftData | null;
}

export default function SalesRepDashboard() {
  const { data: session } = useSession();
  const [todayAssignments, setTodayAssignments] = useState<Assignment[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [weekAssignments, setWeekAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = (session?.user as any)?.name || "Rep";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      try {
        // Fetch this week's assignments
        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const res = await fetch(
          `/api/assignments?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
        );
        const data = await res.json();
        const all: Assignment[] = data.data || [];
        setWeekAssignments(all);
        setTodayAssignments(all.filter((a) => a.date === today));
        setUpcomingAssignments(all.filter((a) => a.date > today));
      } catch {
        setWeekAssignments([]);
        setTodayAssignments([]);
        setUpcomingAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const todayAssignment = todayAssignments[0] ?? null;
  const shift = todayAssignment?.salesRepShift;
  const weekSales = weekAssignments.reduce((s, a) => s + (a.salesRepShift?.salesActual ?? 0), 0);
  const weekTarget = weekAssignments.reduce((s, a) => s + (a.salesRepShift?.salesTarget ?? 0), 0);
  const weekCustomers = weekAssignments.reduce((s, a) => s + (a.salesRepShift?.customerCountActual ?? 0), 0);
  const weekComplaints = weekAssignments.reduce((s, a) => s + (a.salesRepShift?.complaints ?? 0), 0);
  const completionRate = weekTarget > 0 ? Math.round((weekSales / weekTarget) * 100) : 0;

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
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">My Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back, {userName}</p>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Today's status */}
        {todayAssignments.length > 0 ? (
          <div className="space-y-3">
            {todayAssignments.map((a) => {
              const aShift = a.salesRepShift;
              return (
                <div key={a.id} className="card p-5 border-l-4 border-l-teal-400 bg-gradient-to-r from-teal-50/50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-teal-600 uppercase tracking-wide font-medium">
                        Today&apos;s Assignment
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-700 text-[10px] font-semibold">
                          {a.dayType === "ORDER_TAKING" ? "Order Taking" : "Delivery"}
                        </span>
                      </p>
                      <p className="text-lg font-bold text-slate-800 mt-1">{a.route.name} Route</p>
                      <p className="text-sm text-slate-500 mt-0.5">Status: {a.status.replace("_", " ")}</p>
                    </div>
                    <Link href="/daily-report/rep" className="btn-primary btn-sm">
                      <ClipboardList size={14} /> Open Report
                    </Link>
                  </div>
                  {aShift && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-teal-100">
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Sales</p>
                        <p className="text-lg font-bold text-slate-800">{fmt(aShift.salesActual)}</p>
                        <p className="text-xs text-slate-400">of {fmt(aShift.salesTarget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Customers</p>
                        <p className="text-lg font-bold text-slate-800">{aShift.customerCountActual}</p>
                        <p className="text-xs text-slate-400">of {aShift.customerCountTarget}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Complaints</p>
                        <p className={`text-lg font-bold ${aShift.complaints > 0 ? "text-amber-600" : "text-green-600"}`}>{aShift.complaints}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Returns</p>
                        <p className="text-lg font-bold text-slate-800">{aShift.returnsCount}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <Route size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No order-taking assignment for today.</p>
            <p className="text-xs text-slate-400 mt-1">Check the schedule below for your next route.</p>
          </div>
        )}

        <SalesRepCharts
          salesActual={shift?.salesActual ?? 0}
          salesTarget={shift?.salesTarget ?? 0}
          shiftOnTime={true}
        />

        {/* Upcoming schedule */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Schedule (This Week)</h3>
            <span className="text-xs text-slate-400">{upcomingAssignments.length} scheduled</span>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No more assignments scheduled this week.</div>
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
                  <span className={`text-xs font-medium ${
                    a.status === "COMPLETED" ? "text-green-600" : "text-slate-400"
                  }`}>{a.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick action */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link href="/daily-report/rep" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><ClipboardList size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Submit Report</p>
                  <p className="text-[11px] text-slate-400">Daily sales entry</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
          <Link href="/missing-items" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Missing Items</p>
                  <p className="text-[11px] text-slate-400">Log shortages</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
          <Link href="/profile" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Target size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">My Profile</p>
                  <p className="text-[11px] text-slate-400">Settings & password</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Week performance */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">This Week&apos;s Performance</h3>
          </div>
          {weekAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No data for this week yet.</div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Week Sales</p>
                  <p className="text-xl font-bold text-slate-800">{fmt(weekSales)}</p>
                  <p className="text-xs text-slate-400">{completionRate}% of target</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Customers</p>
                  <p className="text-xl font-bold text-slate-800">{weekCustomers}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Days Active</p>
                  <p className="text-xl font-bold text-slate-800">{weekAssignments.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Complaints</p>
                  <p className={`text-xl font-bold ${weekComplaints > 0 ? "text-amber-600" : "text-green-600"}`}>{weekComplaints}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Sales Progress</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
