"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Loader2,
  Truck,
  Route,
  Clock,
  CheckCircle,
  Plus,
  Edit3,
  Trash2,
  Save,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

interface DriverData {
  id: string;
  name: string;
  userId: string;
  user: { name: string; email: string; isActive: boolean; phone: string | null };
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDriver, setEditDriver] = useState<DriverData | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch { setDrivers([]); }
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const openAdd = () => {
    setForm({ name: "", email: "", password: "", phone: "" });
    setEditDriver(null);
    setMsg(null);
    setShowAdd(true);
  };

  const openEdit = (d: DriverData) => {
    setForm({ name: d.name, email: d.user.email, password: "", phone: d.user.phone || "" });
    setEditDriver(d);
    setMsg(null);
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editDriver) {
        const res = await fetch(`/api/drivers/${editDriver.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name }),
        });
        const data = await res.json();
        if (data.success) {
          setMsg({ type: "ok", text: "Driver updated" });
          fetchDrivers();
          setTimeout(() => setShowAdd(false), 800);
        } else {
          setMsg({ type: "err", text: data.error || "Failed" });
        }
      } else {
        const res = await fetch("/api/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.id) {
          setMsg({ type: "ok", text: `${form.name} added!` });
          setForm({ name: "", email: "", password: "", phone: "" });
          fetchDrivers();
          setTimeout(() => setShowAdd(false), 800);
        } else {
          setMsg({ type: "err", text: data.error || "Failed" });
        }
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    }
    setSaving(false);
  };

  const handleDisable = async (driver: DriverData) => {
    if (!confirm(`Deactivate ${driver.name}?`)) return;
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchDrivers();
      }
    } catch {}
  };

  const activeDrivers = drivers.filter((d) => d.user?.isActive !== false);

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">
              Driver Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeDrivers.length} active driver{activeDrivers.length !== 1 && "s"} in the system
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary btn-sm">
            <Plus size={14} /> Add Driver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeDrivers.length}</p>
              <p className="text-xs text-slate-500">Active Drivers</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{drivers.length - activeDrivers.length}</p>
              <p className="text-xs text-slate-500">Inactive</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
              <p className="text-xs text-slate-500">Total (all time)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left bg-slate-50/50">
                <th className="px-4 py-3 font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No drivers found. Add your first driver.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brown-100 flex items-center justify-center text-brown-700 font-bold text-sm">
                          {driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-slate-800">{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{driver.user?.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={driver.user?.isActive !== false ? "badge-success" : "badge-danger"}>
                        {driver.user?.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(driver)}
                          className="btn-ghost btn-sm"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        {driver.user?.isActive !== false && (
                          <button
                            onClick={() => handleDisable(driver)}
                            className="btn-ghost btn-sm text-red-500 hover:text-red-700"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editDriver ? "Edit Driver" : "Add Driver"}>
        <form onSubmit={handleSave} className="space-y-4">
          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {msg.text}
            </div>
          )}
          <div>
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          {!editDriver && (
            <>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
            </>
          )}
          <div>
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editDriver ? " Update" : " Add Driver"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
