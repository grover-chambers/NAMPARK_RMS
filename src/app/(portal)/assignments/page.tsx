"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CalendarCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
  Wand2,
} from "lucide-react";
import { formatDate, getWeekRange } from "@/lib/utils";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";

interface RouteOption {
  id: string;
  name: string;
}
interface SalesRepOption {
  id: string;
  name: string;
}
interface DriverOption {
  id: string;
  name: string;
}
interface VehicleOption {
  id: string;
  registration: string;
}

interface Assignment {
  id: string;
  date: string;
  status: string;
  dayType?: string;
  route: { id: string; name: string };
  salesRep: { id: string; name: string } | null;
  driver: { id: string; name: string } | null;
  vehicle: { id: string; registration: string } | null;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const weekRange = useMemo(() => getWeekRange(currentWeekDate), [currentWeekDate]);

  const [dayTypeFilter, setDayTypeFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    routeId: "",
    salesRepId: "",
    driverId: "",
    vehicleId: "",
    dayType: "DELIVERY",
  });

  useEffect(() => {
    fetchAssignments();
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRange, dayTypeFilter]);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: weekRange.start.toISOString(),
        endDate: weekRange.end.toISOString(),
      });
      if (dayTypeFilter) params.set("dayType", dayTypeFilter);
      const res = await fetch(`/api/assignments?${params.toString()}`);
      const data = await res.json();
      if (data.success) setAssignments(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await fetch("/api/assignments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setGenMessage(data.success ? `Schedule generated: ${data.message}` : data.error || "Failed to generate schedule");
      if (data.success) fetchAssignments();
    } catch {
      setGenMessage("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function fetchOptions() {
    try {
      const [routesRes, repsRes, driversRes, vehiclesRes] = await Promise.all([
        fetch("/api/routes"),
        fetch("/api/sales-reps"),
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
      ]);
      const routesData = await routesRes.json();
      const repsData = await repsRes.json();
      const driversData = await driversRes.json();
      const vehiclesData = await vehiclesRes.json();
      setRoutes(routesData.data || routesData || []);
      setSalesReps(repsData.data || repsData || []);
      setDrivers(driversData.data || driversData || []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({
          date: format(new Date(), "yyyy-MM-dd"),
          routeId: "",
          salesRepId: "",
          driverId: "",
          vehicleId: "",
          dayType: "DELIVERY",
        });
        fetchAssignments();
      } else {
        setError(data.error || "Failed to create assignment");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
      const key = a.date.split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [assignments]);

  return (
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">
              Daily Assignments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-outline"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate Schedule"}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Create New Assignment"}
            </button>
          </div>
        </div>
      </div>

      {genMessage && (
        <div className={`p-3 rounded-lg text-sm border ${
          genMessage.startsWith("Schedule generated")
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {genMessage}
        </div>
      )}

      {showForm && (
        <div className="card p-5">
          <h2 className="font-serif font-bold text-slate-800 mb-4">
            New Assignment
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Route</label>
              <select
                value={form.routeId}
                onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Select route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Day Type</label>
              <select
                value={form.dayType}
                onChange={(e) => setForm({ ...form, dayType: e.target.value })}
                className="form-select"
              >
                <option value="ORDER_TAKING">Order Taking</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
            <div>
              <label className="form-label">Sales Rep (Order Taking)</label>
              <select
                value={form.salesRepId}
                onChange={(e) => setForm({ ...form, salesRepId: e.target.value })}
                className="form-select"
              >
                <option value="">Select sales rep</option>
                {salesReps.map((sr) => (
                  <option key={sr.id} value={sr.id}>{sr.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Driver</label>
              <select
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                className="form-select"
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="form-select"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarCheck className="w-4 h-4" />
                )}
                Create Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <h2 className="font-serif font-bold text-slate-800">Week View</h2>
            <select
              value={dayTypeFilter}
              onChange={(e) => setDayTypeFilter(e.target.value)}
              className="form-select !w-auto !py-1 !text-xs ml-2"
            >
              <option value="">All Types</option>
              <option value="ORDER_TAKING">Order Taking</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeekDate(subWeeks(currentWeekDate, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[160px] text-center">
              {weekRange.label}
            </span>
            <button
              onClick={() => setCurrentWeekDate(addWeeks(currentWeekDate, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : groupedAssignments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No assignments found for this week.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedAssignments.map(([date, items]) => (
              <div key={date}>
                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {formatDate(date)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="table-header">Route</th>
                        <th className="table-header">Type</th>
                        <th className="table-header">Sales Rep</th>
                        <th className="table-header">Driver</th>
                        <th className="table-header">Vehicle</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="table-cell font-medium">{a.route.name}</td>
                          <td className="table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              a.dayType === "ORDER_TAKING" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {a.dayType === "ORDER_TAKING" ? "Order" : "Delivery"}
                            </span>
                          </td>
                          <td className="table-cell">{a.salesRep?.name ?? "—"}</td>
                          <td className="table-cell">{a.driver?.name ?? "—"}</td>
                          <td className="table-cell font-mono text-xs">
                            {a.vehicle?.registration ?? "—"}
                          </td>
                          <td className="table-cell">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "badge-warning",
    IN_PROGRESS: "badge-info",
    PARTIAL: "badge-warning",
    COMPLETED: "badge-success",
  };
  const labels: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    PARTIAL: "Partial",
    COMPLETED: "Completed",
  };
  return (
    <span className={styles[status] ?? "badge-neutral"}>
      {labels[status] ?? status}
    </span>
  );
}
