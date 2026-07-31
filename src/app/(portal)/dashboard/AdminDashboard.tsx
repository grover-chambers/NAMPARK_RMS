"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Users,
  TrendingUp,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  UserPlus,
  MapPin,
  Box,
  Route,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import AdminCharts from "@/components/dashboard/AdminCharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) => d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
const weekStart = (d: Date) => {
  const s = new Date(d);
  const day = s.getDay();
  s.setDate(s.getDate() - day + (day === 0 ? -6 : 1));
  s.setHours(0, 0, 0, 0);
  return s;
};
const weekEnd = (d: Date) => {
  const e = weekStart(d);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};
const weekLabel = (d: Date) => `${fmtDate(weekStart(d))} — ${fmtDate(weekEnd(d))}`;

interface Assignment {
  id: string;
  date: string;
  status: string;
  route: { name: string };
  salesRep: { name: string };
  driver: { name: string };
  vehicle: { registration: string };
  salesRepShift?: { salesActual: number; customerCountActual: number; complaints: number } | null;
}

export default function AdminDashboard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddSku, setShowAddSku] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  const currentWeek = new Date();
  currentWeek.setDate(currentWeek.getDate() + weekOffset * 7);
  const wStart = weekStart(currentWeek);
  const wEnd = weekEnd(currentWeek);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?startDate=${wStart.toISOString()}&endDate=${wEnd.toISOString()}`);
      const data = await res.json();
      setAssignments(data.data || []);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [wStart.toISOString(), wEnd.toISOString()]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const totalSales = assignments.reduce((sum, a) => sum + (a.salesRepShift?.salesActual ?? 0), 0);
  const totalCustomers = assignments.reduce((sum, a) => sum + (a.salesRepShift?.customerCountActual ?? 0), 0);
  const totalComplaints = assignments.reduce((sum, a) => sum + (a.salesRepShift?.complaints ?? 0), 0);
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;
  const activeRoutes = new Set(assignments.map((a) => a.route.name)).size;

  const stats = [
    { label: "Week Assignments", value: assignments.length, icon: <CalendarCheck size={20} />, color: "text-teal-600", bgColor: "bg-teal-50" },
    { label: "Completed", value: completedCount, icon: <CheckCircle2 size={20} />, color: "text-green-600", bgColor: "bg-green-50" },
    { label: "Week Sales", value: fmt(totalSales), icon: <TrendingUp size={20} />, color: "text-brown-600", bgColor: "bg-brown-50" },
    { label: "Customers Served", value: totalCustomers, icon: <Users size={20} />, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Complaints", value: totalComplaints, icon: <AlertTriangle size={20} />, color: "text-amber-600", bgColor: "bg-amber-50" },
    { label: "Routes Active", value: activeRoutes, icon: <Route size={20} />, color: "text-purple-600", bgColor: "bg-purple-50" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return <span className="badge-success"><CheckCircle2 size={10} /> Done</span>;
      case "IN_PROGRESS": return <span className="badge-warning"><Clock size={10} /> Active</span>;
      default: return <span className="badge-neutral"><Clock size={10} /> Pending</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="px-4 md:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">AnswerPort — Nampark Branch Operations</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreateAssignment(true)} className="btn-primary btn-sm">
              <Plus size={14} /> New Assignment
            </button>
            <button onClick={() => setShowAddStaff(true)} className="btn-outline btn-sm">
              <UserPlus size={14} /> Add Staff
            </button>
          </div>
        </div>
      </div>

      <div className="page-content space-y-5">
        <div className="card px-4 py-3 flex items-center justify-between">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="btn-ghost btn-sm"><ChevronLeft size={16} /> Prev</button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{weekLabel(currentWeek)}</p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-teal-600 hover:text-teal-700 mt-0.5">Go to current week</button>
            )}
          </div>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="btn-ghost btn-sm">Next <ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bgColor} ${s.color}`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-800 truncate">{s.value}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AdminCharts assignments={assignments} profitability={null} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setShowCreateAssignment(true)} className="card p-4 hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors"><CalendarCheck size={20} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">New Assignment</p>
                <p className="text-[11px] text-slate-400">Create daily route</p>
              </div>
            </div>
          </button>
          <button onClick={() => setShowAddStaff(true)} className="card p-4 hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brown-50 text-brown-600 group-hover:bg-brown-100 transition-colors"><UserPlus size={20} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">Add Staff</p>
                <p className="text-[11px] text-slate-400">Rep or driver</p>
              </div>
            </div>
          </button>
          <button onClick={() => setShowAddRoute(true)} className="card p-4 hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors"><MapPin size={20} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">Add Route</p>
                <p className="text-[11px] text-slate-400">New distribution route</p>
              </div>
            </div>
          </button>
          <button onClick={() => setShowAddSku(true)} className="card p-4 hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors"><Box size={20} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">Add SKU</p>
                <p className="text-[11px] text-slate-400">Product catalog</p>
              </div>
            </div>
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">This Week&apos;s Assignments</h3>
            <span className="text-xs text-slate-400">{assignments.length} total</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarCheck size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No assignments this week</p>
              <button onClick={() => setShowCreateAssignment(true)} className="btn-primary btn-sm mt-3"><Plus size={14} /> Create First Assignment</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Date</th>
                    <th className="table-header">Route</th>
                    <th className="table-header">Sales Rep</th>
                    <th className="table-header">Driver</th>
                    <th className="table-header">Vehicle</th>
                    <th className="table-header">Sales</th>
                    <th className="table-header">Customers</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="table-cell text-xs">{fmtDate(new Date(a.date))}</td>
                      <td className="table-cell font-medium">{a.route.name}</td>
                      <td className="table-cell">{a.salesRep.name}</td>
                      <td className="table-cell">{a.driver.name}</td>
                      <td className="table-cell font-mono text-xs">{a.vehicle.registration}</td>
                      <td className="table-cell font-medium">{a.salesRepShift ? fmt(a.salesRepShift.salesActual) : "—"}</td>
                      <td className="table-cell">{a.salesRepShift?.customerCountActual ?? "—"}</td>
                      <td className="table-cell">{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddStaffModal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} onSaved={fetchAssignments} />
      <AddRouteModal isOpen={showAddRoute} onClose={() => setShowAddRoute(false)} onSaved={fetchAssignments} />
      <AddSkuModal isOpen={showAddSku} onClose={() => setShowAddSku(false)} />
      <CreateAssignmentModal isOpen={showCreateAssignment} onClose={() => setShowCreateAssignment(false)} onSaved={fetchAssignments} />
    </div>
  );
}

function AddStaffModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SALES_REP", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: `${form.name} added successfully!` });
        setForm({ name: "", email: "", password: "", role: "SALES_REP", phone: "" });
        onSaved(); setTimeout(onClose, 1200);
      } else { setMsg({ type: "err", text: data.error || "Failed" }); }
    } catch { setMsg({ type: "err", text: "Network error" }); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Staff Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>}
        <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Role *</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="SALES_REP">Sales Rep</option><option value="DRIVER">Driver</option><option value="SUPERVISOR">Supervisor</option>
            </select>
          </div>
          <div><label className="form-label">Password *</label><input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Add Staff"}</button>
        </div>
      </form>
    </Modal>
  );
}

function AddRouteModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", mileageBefore: "", mileageAfter: "", targetDaily: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, mileageBefore: Number(form.mileageBefore) || 0, mileageAfter: Number(form.mileageAfter) || 0, targetDaily: Number(form.targetDaily) || 0 }) });
      const data = await res.json();
      if (data.success || data.id) {
        setMsg({ type: "ok", text: `Route "${form.name}" created!` }); setForm({ name: "", mileageBefore: "", mileageAfter: "", targetDaily: "" }); onSaved(); setTimeout(onClose, 1200);
      } else { setMsg({ type: "err", text: data.error || "Failed" }); }
    } catch { setMsg({ type: "err", text: "Network error" }); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Route">
      <form onSubmit={handleSubmit} className="space-y-4">
        {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>}
        <div><label className="form-label">Route Name *</label><input className="form-input" placeholder="e.g. Kiambu" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Mileage Before (km)</label><input type="number" className="form-input" value={form.mileageBefore} onChange={(e) => setForm({ ...form, mileageBefore: e.target.value })} /></div>
          <div><label className="form-label">Mileage After (km)</label><input type="number" className="form-input" value={form.mileageAfter} onChange={(e) => setForm({ ...form, mileageAfter: e.target.value })} /></div>
        </div>
        <div><label className="form-label">Daily Sales Target (KES)</label><input type="number" className="form-input" placeholder="1100000" value={form.targetDaily} onChange={(e) => setForm({ ...form, targetDaily: e.target.value })} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Create Route"}</button>
        </div>
      </form>
    </Modal>
  );
}

function AddSkuModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", category: "Flour", unitPrice: "", unitType: "piece", packSize: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/sku", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, category: form.category, unitPrice: Number(form.unitPrice), unitType: form.unitType, packSize: form.packSize || null }) });
      const data = await res.json();
      if (data.id || data.success) { setMsg({ type: "ok", text: `"${form.name}" added to catalog!` }); setForm({ name: "", category: "Flour", unitPrice: "", unitType: "piece", packSize: "" }); }
      else { setMsg({ type: "err", text: data.error || "Failed" }); }
    } catch { setMsg({ type: "err", text: "Network error" }); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add SKU to Catalog">
      <form onSubmit={handleSubmit} className="space-y-4">
        {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>}
        <div><label className="form-label">Product Name *</label><input className="form-input" placeholder="e.g. Ndovu Home Baking 2kg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Flour", "Soap", "Cooking Oil", "Sugar", "Rice", "Confectionery", "Beverages", "Detergent", "Paper", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="form-label">Unit Type</label>
            <select className="form-select" value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
              {["piece", "carton", "bale", "bag", "jar", "packet"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Unit Price (KES) *</label><input type="number" className="form-input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></div>
          <div><label className="form-label">Pack Size</label><input className="form-input" placeholder="e.g. 2kg, 500ml" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Add Product"}</button>
        </div>
      </form>
    </Modal>
  );
}

function CreateAssignmentModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], routeId: "", salesRepId: "", driverId: "", vehicleId: "" });
  const [routes, setRoutes] = useState<any[]>([]);
  const [reps, setReps] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/routes").then((r) => r.json()),
        fetch("/api/sales-reps").then((r) => r.json()),
        fetch("/api/drivers").then((r) => r.json()),
        fetch("/api/vehicles").then((r) => r.json()),
      ]).then(([routesData, repsData, driversData, vehiclesData]) => {
        setRoutes(routesData.data || routesData || []);
        setReps(repsData.data || repsData || []);
        setDrivers(driversData.data || driversData || []);
        setVehicles(vehiclesData.data || vehiclesData || []);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success || data.id) { setMsg({ type: "ok", text: "Assignment created!" }); onSaved(); setTimeout(onClose, 1000); }
      else { setMsg({ type: "err", text: data.error || "Failed" }); }
    } catch { setMsg({ type: "err", text: "Network error" }); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Daily Assignment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>}
        <div><label className="form-label">Date *</label><input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
        <div><label className="form-label">Route *</label>
          <select className="form-select" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} required>
            <option value="">Select route...</option>{routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Sales Rep *</label>
            <select className="form-select" value={form.salesRepId} onChange={(e) => setForm({ ...form, salesRepId: e.target.value })} required>
              <option value="">Select rep...</option>{reps.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Driver *</label>
            <select className="form-select" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} required>
              <option value="">Select driver...</option>{drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className="form-label">Vehicle *</label>
          <select className="form-select" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
            <option value="">Select vehicle...</option>{vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.registration} ({v.status})</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Assignment"}</button>
        </div>
      </form>
    </Modal>
  );
}
