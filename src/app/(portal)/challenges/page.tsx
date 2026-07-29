"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Challenge {
  id: string;
  date: string;
  gap: string;
  whatAction: string | null;
  who: string | null;
  when: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export default function ChallengesPage() {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [gap, setGap] = useState("");
  const [action, setAction] = useState("");
  const [who, setWho] = useState("");
  const [when, setWhen] = useState("");

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/challenges");
        const data = await res.json();
        setChallenges(data.success ? data.data : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const refetchChallenges = async () => {
    const res = await fetch("/api/challenges");
    const data = await res.json();
    setChallenges(data.success ? data.data : []);
  };

  const resetForm = () => {
    setGap("");
    setAction("");
    setWho("");
    setWhen("");
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!gap.trim()) {
      setToast({ type: "error", message: "Gap description is required." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gap: gap.trim(),
          whatAction: action.trim() || null,
          who: who.trim() || null,
          when: when || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", message: "Challenge logged successfully!" });
        resetForm();
        refetchChallenges();
      } else {
        setToast({ type: "error", message: data.error || "Failed to save" });
      }
    } catch {
      setToast({ type: "error", message: "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const markResolved = async (id: string) => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      if (res.ok) {
        setToast({ type: "success", message: "Marked as resolved!" });
        refetchChallenges();
      } else {
        setToast({ type: "error", message: "Failed to update." });
      }
    } catch {
      setToast({ type: "error", message: "Something went wrong." });
    } finally {
      setResolvingId(null);
    }
  };

  const pending = challenges.filter((c) => !c.resolved);
  const resolved = challenges.filter((c) => c.resolved);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}

      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Challenges & Gaps</h1>
            <p className="text-sm text-slate-500 mt-1">
              {pending.length} pending · {resolved.length} resolved
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Challenge
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif font-bold text-slate-800">Log New Challenge</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Gap Description *</label>
              <textarea
                value={gap}
                onChange={(e) => setGap(e.target.value)}
                className="form-input min-h-[80px] resize-y"
                placeholder="Describe the gap or challenge..."
              />
            </div>
            <div>
              <label className="form-label">Action Taken / Planned</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="form-input"
                placeholder="What action is being taken?"
              />
            </div>
            <div>
              <label className="form-label">Responsible Person</label>
              <input
                type="text"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                className="form-input"
                placeholder="Who is responsible?"
              />
            </div>
            <div>
              <label className="form-label">Target Date</label>
              <input
                type="date"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="btn-outline">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Challenge
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="font-serif font-bold text-slate-800">Pending ({pending.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header text-center w-12">#</th>
                <th className="table-header">Gap Description</th>
                <th className="table-header">Action</th>
                <th className="table-header">Who</th>
                <th className="table-header">When</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No pending challenges. All clear!
                  </td>
                </tr>
              ) : (
                pending.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="table-cell text-center text-slate-500 font-medium">{i + 1}</td>
                    <td className="table-cell font-medium max-w-[300px]">{c.gap}</td>
                    <td className="table-cell text-sm text-slate-600 max-w-[200px] truncate">{c.whatAction ?? "—"}</td>
                    <td className="table-cell">{c.who ?? "—"}</td>
                    <td className="table-cell text-sm">{c.when ? formatDate(c.when) : "—"}</td>
                    <td className="table-cell text-center">
                      <span className="badge-warning">Pending</span>
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => markResolved(c.id)}
                        disabled={resolvingId === c.id}
                        className="btn-outline btn-sm text-green-600 border-green-300 hover:bg-green-50"
                      >
                        {resolvingId === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resolved.length > 0 && (
        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-serif font-bold text-slate-800">Resolved ({resolved.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header text-center w-12">#</th>
                  <th className="table-header">Gap Description</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Who</th>
                  <th className="table-header">When</th>
                  <th className="table-header text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resolved.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 bg-green-50/30">
                    <td className="table-cell text-center text-slate-500 font-medium">{i + 1}</td>
                    <td className="table-cell font-medium max-w-[300px] text-slate-600">{c.gap}</td>
                    <td className="table-cell text-sm text-slate-500 max-w-[200px] truncate">{c.whatAction ?? "—"}</td>
                    <td className="table-cell text-slate-500">{c.who ?? "—"}</td>
                    <td className="table-cell text-sm text-slate-500">{c.when ? formatDate(c.when) : "—"}</td>
                    <td className="table-cell text-center">
                      <span className="badge-success">Resolved</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
