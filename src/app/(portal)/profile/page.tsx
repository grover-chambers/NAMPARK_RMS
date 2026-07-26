"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, Mail, Phone, Shield, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const role = (session?.user as any)?.role || "ADMIN";

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: "Profile updated!" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setMsg({ type: "err", text: data.error || "Failed" });
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="px-4 md:px-6 py-5">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-800">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your account settings</p>
        </div>
      </div>

      <div className="page-content max-w-2xl space-y-5">
        {/* Avatar card */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {name.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-info capitalize">{role.replace("_", " ")}</span>
              <span className="text-xs text-slate-400">{email}</span>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Personal Information</h3>

          {msg && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {msg.type === "ok" && <CheckCircle2 size={16} />}
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="form-input pl-10" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="form-input pl-10 bg-slate-50" value={email} disabled />
              </div>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="form-input pl-10" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Role</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="form-input pl-10 bg-slate-50 capitalize" value={role.replace("_", " ")} disabled />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
