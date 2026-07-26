"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  Route,
  FileText,
  BarChart3,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) => d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

interface Assignment {
  id: string;
  date: string;
  status: string;
  route: { name: string };
  salesRep: { name: string };
  driver: { name: string };
  vehicle: { registration: string };
  salesRepShift?: { salesActual: number; customerCountActual: number; complaints: number; returnsCount: number } | null;
}

export default function SupervisorDashboard() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/assignments?startDate=${today}T00:00:00Z&endDate=${today}T23:59:59Z`);
        const data = await res.json();
        setAssignments(data.data || []);
      } catch { setAssignments([]); } finally { setLoading(false); }
    };
    load();
  }, [today]);

  const totalSales = assignments.reduce((sum, a) => sum + (a.salesRepShift?.salesActual || 0), 0);
  const totalCustomers = assignments.reduce((sum, a) => sum + (a.salesRepShift?.customerCountActual || 0), 0);
  const totalComplaints = assignments.reduce((sum, a) => sum + (a.salesRepShift?.complaints || 0), 0);
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;
  const activeCount = assignments.filter((a) => a.status === "IN_PROGRESS").length;

  return (
    <div>
      <div className="page-header">
        <div className="px-4 md:px-6 py-5">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">Supervisor Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Team oversight — {fmtDate(new Date())}</p>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Today stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Today Assignments", value: assignments.length, icon: <CalendarCheck size={20} />, color: "text-teal-600", bg: "bg-teal-50" },
            { label: "Active Now", value: activeCount, icon: <Clock size={20} />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Completed Today", value: completedCount, icon: <CheckCircle2 size={20} />, color: "text-green-600", bg: "bg-green-50" },
            { label: "Today Sales", value: fmt(totalSales), icon: <TrendingUp size={20} />, color: "text-brown-600", bg: "bg-brown-50" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-800 truncate">{s.value}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/assignments", label: "All Assignments", desc: "View & manage", icon: <CalendarCheck size={18} />, color: "bg-teal-50 text-teal-600" },
            { href: "/daily-report/view", label: "Report Viewer", desc: "Daily reports", icon: <FileText size={18} />, color: "bg-blue-50 text-blue-600" },
            { href: "/performance", label: "Performance", desc: "Team analytics", icon: <BarChart3 size={18} />, color: "bg-purple-50 text-purple-600" },
            { href: "/missing-items", label: "Missing Items", desc: "Alerts & gaps", icon: <AlertTriangle size={18} />, color: "bg-amber-50 text-amber-600" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="card p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${link.color}`}>{link.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{link.label}</p>
                    <p className="text-[11px] text-slate-400">{link.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* Team overview table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Today&apos;s Team Activity</h3>
            <span className="text-xs text-slate-400">{assignments.length} assignments</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarCheck size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No assignments today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Route</th>
                    <th className="table-header">Sales Rep</th>
                    <th className="table-header">Driver</th>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header">Sales</th>
                    <th className="table-header">Complaints</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="table-cell font-medium">{a.route.name}</td>
                      <td className="table-cell">{a.salesRep.name}</td>
                      <td className="table-cell">{a.driver.name}</td>
                      <td className="table-cell font-mono text-xs">{a.vehicle.registration}</td>
                      <td className="table-cell font-medium">{a.salesRepShift ? fmt(a.salesRepShift.salesActual) : "—"}</td>
                      <td className="table-cell">
                        {a.salesRepShift?.complaints ? (
                          <span className="badge-danger">{a.salesRepShift.complaints}</span>
                        ) : <span className="text-slate-300">0</span>}
                      </td>
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

        {/* Complaint alert */}
        {totalComplaints > 0 && (
          <div className="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{totalComplaints} complaint(s) reported today</p>
                <p className="text-xs text-amber-600">Review the report viewer for details on each complaint.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
