"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Settings,
  Route,
  Users,
  Package,
  Truck,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Building2,
  Target,
  Bell,
  Shield,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

type Tab = "general" | "routes" | "staff" | "catalog" | "notifications";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");

  const role = (session?.user as any)?.role;
  useEffect(() => {
    if (status === "authenticated" && role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, role, router]);

  if (role !== "ADMIN") return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Building2 size={16} /> },
    { id: "routes", label: "Routes", icon: <Route size={16} /> },
    { id: "staff", label: "Staff", icon: <Users size={16} /> },
    { id: "catalog", label: "SKU Catalog", icon: <Package size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="px-4 md:px-6 py-5">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">Platform Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure system-wide settings for Nampark operations</p>
        </div>
      </div>

      <div className="page-content">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Tab sidebar */}
          <div className="lg:w-56 flex-shrink-0">
            <nav className="card p-2 space-y-0.5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    tab === t.id
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {tab === "general" && <GeneralSettings />}
            {tab === "routes" && <RoutesSettings />}
            {tab === "staff" && <StaffSettings />}
            {tab === "catalog" && <CatalogSettings />}
            {tab === "notifications" && <NotificationSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── General Settings ──
function GeneralSettings() {
  const [config, setConfig] = useState({
    branchName: "Nampark",
    companyName: "Kanini Haraka Enterprises",
    answerportContact: "AnswerPort Ltd",
    defaultSalesTarget: "4500000",
    defaultMileageTarget: "1000",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMsg({ type: "ok", text: "Settings saved!" });
      localStorage.setItem("nampark-config", JSON.stringify(config));
    }, 800);
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Settings size={18} /></div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700">General Configuration</h3>
          <p className="text-xs text-slate-400">Branch and company details</p>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          <CheckCircle2 size={16} /> {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Branch Name</label>
          <input className="form-input" value={config.branchName} onChange={(e) => setConfig({ ...config, branchName: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Company Name</label>
          <input className="form-input" value={config.companyName} onChange={(e) => setConfig({ ...config, companyName: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Managed By</label>
          <input className="form-input" value={config.answerportContact} onChange={(e) => setConfig({ ...config, answerportContact: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Default Daily Sales Target (KES)</label>
          <input type="number" className="form-input" value={config.defaultSalesTarget} onChange={(e) => setConfig({ ...config, defaultSalesTarget: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Default Mileage Target (km)</label>
          <input type="number" className="form-input" value={config.defaultMileageTarget} onChange={(e) => setConfig({ ...config, defaultMileageTarget: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}

// ── Routes Settings ──
function RoutesSettings() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRoute, setEditRoute] = useState<any>(null);
  const [form, setForm] = useState({ name: "", mileageBefore: "", mileageAfter: "", targetDaily: "" });
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes");
      const data = await res.json();
      setRoutes(data.data || data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchRoutes(); }, []);

  const openAdd = () => { setForm({ name: "", mileageBefore: "", mileageAfter: "", targetDaily: "" }); setEditRoute(null); setShowAdd(true); };
  const openEdit = (r: any) => { setForm({ name: r.name, mileageBefore: String(r.mileageBefore), mileageAfter: String(r.mileageAfter), targetDaily: String(r.targetDaily) }); setEditRoute(r); setShowAdd(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editRoute ? "PATCH" : "POST";
      const url = editRoute ? `/api/routes/${editRoute.id}` : "/api/routes";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          mileageBefore: Number(form.mileageBefore) || 0,
          mileageAfter: Number(form.mileageAfter) || 0,
          targetDaily: Number(form.targetDaily) || 0,
        }),
      });
      setShowAdd(false);
      fetchRoutes();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Route Management</h3>
        <button onClick={openAdd} className="btn-primary btn-sm"><Plus size={14} /> Add Route</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="table-header">Route</th>
              <th className="table-header">Mileage (Before)</th>
              <th className="table-header">Mileage (After)</th>
              <th className="table-header">Daily Target</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" /></td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No routes found</td></tr>
            ) : (
              routes.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="table-cell font-medium">{r.name}</td>
                  <td className="table-cell">{r.mileageBefore} km</td>
                  <td className="table-cell">{r.mileageAfter} km</td>
                  <td className="table-cell font-medium">{fmt(r.targetDaily)}</td>
                  <td className="table-cell text-right">
                    <button onClick={() => openEdit(r)} className="btn-ghost btn-sm"><Edit3 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editRoute ? "Edit Route" : "Add Route"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Route Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Mileage Before (km)</label>
              <input type="number" className="form-input" value={form.mileageBefore} onChange={(e) => setForm({ ...form, mileageBefore: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Mileage After (km)</label>
              <input type="number" className="form-input" value={form.mileageAfter} onChange={(e) => setForm({ ...form, mileageAfter: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Daily Sales Target (KES)</label>
            <input type="number" className="form-input" value={form.targetDaily} onChange={(e) => setForm({ ...form, targetDaily: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editRoute ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Staff Settings ──
function StaffSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SALES_REP", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setUsers(data.data || data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: `${form.name} added!` });
        setForm({ name: "", email: "", password: "", role: "SALES_REP", phone: "" });
        fetchUsers();
        setTimeout(() => setShowAdd(false), 1000);
      } else {
        setMsg({ type: "err", text: data.error || "Failed" });
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    }
    setSaving(false);
  };

  const roleColors: Record<string, string> = {
    ADMIN: "badge-danger",
    SUPERVISOR: "badge-info",
    SALES_REP: "badge-success",
    DRIVER: "badge-warning",
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Staff Management ({users.length})</h3>
        <button onClick={() => { setMsg(null); setShowAdd(true); }} className="btn-primary btn-sm"><Plus size={14} /> Add Staff</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Status</th>
              <th className="table-header">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" /></td></tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="table-cell font-medium">{u.name}</td>
                  <td className="table-cell text-slate-500 text-xs">{u.email}</td>
                  <td className="table-cell"><span className={`${roleColors[u.role] || "badge-neutral"} capitalize`}>{u.role.replace("_", " ")}</span></td>
                  <td className="table-cell"><span className={u.isActive ? "badge-success" : "badge-danger"}>{u.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="table-cell text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString("en-KE")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">
          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>
          )}
          <div>
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="SALES_REP">Sales Rep</option>
                <option value="DRIVER">Driver</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
            </div>
            <div>
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Staff
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Catalog Settings ──
function CatalogSettings() {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Flour", unitPrice: "", unitType: "piece", packSize: "", unitWeightKg: "", costPrice: "", listSellingPrice: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchSkus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sku");
      const data = await res.json();
      setSkus(Array.isArray(data) ? data : data.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchSkus(); }, []);

  const filtered = skus.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.category || "").toLowerCase().includes(search.toLowerCase()));

  const categories = [...new Set(skus.map((s) => s.category).filter(Boolean))];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          unitPrice: Number(form.unitPrice),
          unitWeightKg: form.unitWeightKg ? Number(form.unitWeightKg) : null,
          costPrice: form.costPrice ? Number(form.costPrice) : null,
          listSellingPrice: form.listSellingPrice ? Number(form.listSellingPrice) : null,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setMsg({ type: "ok", text: `"${form.name}" added!` });
        setForm({ name: "", category: "Flour", unitPrice: "", unitType: "piece", packSize: "", unitWeightKg: "", costPrice: "", listSellingPrice: "" });
        fetchSkus();
      } else {
        setMsg({ type: "err", text: data.error || "Failed" });
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    }
    setSaving(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">SKU Catalog ({skus.length} products)</h3>
        <div className="flex items-center gap-2">
          <input className="form-input text-xs py-1.5 w-48" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={() => { setMsg(null); setShowAdd(true); }} className="btn-primary btn-sm"><Plus size={14} /> Add SKU</button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-100">
              <th className="table-header">Product</th>
              <th className="table-header">Category</th>
              <th className="table-header">Price</th>
              <th className="table-header">Type</th>
              <th className="table-header">Pack Size</th>
              <th className="table-header text-right">Wt (kg)</th>
              <th className="table-header text-right">Cost (KES)</th>
              <th className="table-header text-right">Sell (KES)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">No products match your search</td></tr>
            ) : (
              filtered.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="table-cell font-medium">{s.name}</td>
                    <td className="table-cell"><span className="badge-neutral">{s.category || "—"}</span></td>
                    <td className="table-cell font-medium">{fmt(s.unitPrice)}</td>
                    <td className="table-cell text-xs capitalize">{s.unitType}</td>
                    <td className="table-cell text-xs">{s.packSize || "—"}</td>
                    <td className="table-cell text-right text-xs">{s.unitWeightKg != null ? s.unitWeightKg : <span className="text-slate-300">—</span>}</td>
                    <td className="table-cell text-right text-xs">{s.costPrice != null ? fmt(s.costPrice) : <span className="text-slate-300">—</span>}</td>
                    <td className="table-cell text-right text-xs">{s.listSellingPrice != null ? fmt(s.listSellingPrice) : <span className="text-slate-300">—</span>}</td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Product to Catalog">
        <form onSubmit={handleAdd} className="space-y-4">
          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{msg.text}</div>
          )}
          <div>
            <label className="form-label">Product Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["Flour", "Soap", "Cooking Oil", "Sugar", "Rice", "Confectionery", "Beverages", "Detergent", "Paper", "Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Unit Type</label>
              <select className="form-select" value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
                {["piece", "carton", "bale", "bag", "jar", "packet"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Price (KES) *</label>
              <input type="number" className="form-input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
            </div>
            <div>
              <label className="form-label">Pack Size</label>
              <input className="form-input" placeholder="2kg, 500ml..." value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} />
            </div>
          </div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">Pricing Data (for profitability)</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Unit Weight (kg)</label>
              <input type="number" step="0.001" className="form-input" placeholder="e.g. 2" value={form.unitWeightKg} onChange={(e) => setForm({ ...form, unitWeightKg: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Cost Price (KES)</label>
              <input type="number" step="0.01" className="form-input" placeholder="e.g. 1800" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Selling Price (KES)</label>
              <input type="number" step="0.01" className="form-input" placeholder="e.g. 2200" value={form.listSellingPrice} onChange={(e) => setForm({ ...form, listSellingPrice: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Notification Settings ──
function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    missingItemAlerts: true,
    lateSubmissionAlerts: true,
    weeklyReportEmail: true,
  });

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Bell size={18} /></div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Notification Preferences</h3>
          <p className="text-xs text-slate-400">Configure alerts and notifications (coming soon)</p>
        </div>
      </div>

      {[
        { key: "emailNotifications", label: "Email Notifications", desc: "Receive system alerts via email" },
        { key: "missingItemAlerts", label: "Missing Item Alerts", desc: "Alert when items are chronically missing across routes" },
        { key: "lateSubmissionAlerts", label: "Late Submission Alerts", desc: "Alert when reps/drivers miss report deadlines" },
        { key: "weeklyReportEmail", label: "Weekly Report Email", desc: "Auto-send weekly executive summary to management" },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
          <div>
            <p className="text-sm font-medium text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-400">{item.desc}</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, [item.key]: !(settings as any)[item.key] })}
            className={`relative w-11 h-6 rounded-full transition-colors ${(settings as any)[item.key] ? "bg-teal-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(settings as any)[item.key] ? "translate-x-5" : ""}`} />
          </button>
        </div>
      ))}

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} />
          <span>Notification system will be activated in the next deployment phase.</span>
        </div>
      </div>
    </div>
  );
}
