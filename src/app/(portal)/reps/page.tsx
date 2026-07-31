"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Loader2,
  UserCheck,
  MapPin,
  Edit3,
  Save,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

interface SalesRepData {
  id: string;
  name: string;
  userId: string;
  user: { email: string; isActive: boolean; phone: string | null };
}

export default function SalesRepsPage() {
  const [reps, setReps] = useState<SalesRepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRep, setEditRep] = useState<SalesRepData | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchReps = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-reps");
      const data = await res.json();
      setReps(data.success ? data.data : []);
    } catch { setReps([]); }
    setLoading(false);
  };

  useEffect(() => { fetchReps(); }, []);

  const openEdit = (r: SalesRepData) => {
    setForm({ name: r.name });
    setEditRep(r);
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRep) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sales-reps/${editRep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: "Updated" });
        fetchReps();
        setTimeout(() => { setEditRep(null); setMsg(null); }, 800);
      } else {
        setMsg({ type: "err", text: data.error || "Failed" });
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    }
    setSaving(false);
  };

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
          <h1 className="text-2xl font-serif font-bold text-slate-800">Sales Representatives</h1>
          <p className="text-sm text-slate-500 mt-1">{reps.length} rep{reps.length !== 1 && "s"} in the system</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{reps.length}</p>
              <p className="text-xs text-slate-500">Total Reps</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{reps.filter((r) => r.user?.isActive !== false).length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{reps.filter((r) => r.user?.isActive === false).length}</p>
              <p className="text-xs text-slate-500">Inactive</p>
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
                <th className="px-4 py-3 font-medium text-slate-500">Phone</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No sales reps found.</td>
                </tr>
              ) : (
                reps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brown-100 flex items-center justify-center text-brown-700 font-bold text-sm">
                          {rep.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-slate-800">{rep.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{rep.user?.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{rep.user?.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={rep.user?.isActive !== false ? "badge-success" : "badge-danger"}>
                        {rep.user?.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(rep)} className="btn-ghost btn-sm" title="Edit">
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editRep} onClose={() => { setEditRep(null); setMsg(null); }} title="Edit Sales Rep">
        <form onSubmit={handleSave} className="space-y-4">
          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {msg.text}
            </div>
          )}
          <div>
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setEditRep(null); setMsg(null); }} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
