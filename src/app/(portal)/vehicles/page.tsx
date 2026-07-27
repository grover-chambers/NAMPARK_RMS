"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Loader2,
  Wrench,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/lib/utils";

interface VehicleData {
  id: string;
  registration: string;
  status: string;
  createdAt: string;
  fleetDaily: FleetDailyEntry[];
}

interface FleetDailyEntry {
  id: string;
  date: string;
  vehicleId: string;
  expectedAvailable: number;
  actualAvailable: number;
  inGarage: number;
  garageReason: string | null;
  workshopTat: string | null;
  preDispatchInspection: boolean;
  inspectionReason: string | null;
}

interface FleetForm {
  expectedAvailable: number;
  actualAvailable: number;
  inGarage: number;
  garageReason: string;
  workshopTat: string;
  preDispatchInspection: boolean;
  inspectionReason: string;
}

interface InspectionItem {
  label: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  checked: boolean;
}

const defaultInspectionItems: InspectionItem[] = [
  { label: "Engine oil level", frequency: "Daily", checked: false },
  { label: "Tire pressure", frequency: "Daily", checked: false },
  { label: "Brake fluid", frequency: "Daily", checked: false },
  { label: "Lights functional", frequency: "Daily", checked: false },
  { label: "Windshield wipers", frequency: "Daily", checked: false },
  { label: "Horn", frequency: "Daily", checked: false },
  { label: "Side mirrors", frequency: "Daily", checked: false },
  { label: "Seatbelts", frequency: "Daily", checked: false },
  { label: "Battery health", frequency: "Weekly", checked: false },
  { label: "Coolant level", frequency: "Weekly", checked: false },
  { label: "Transmission fluid", frequency: "Weekly", checked: false },
  { label: "Air filter", frequency: "Weekly", checked: false },
  { label: "Exhaust system", frequency: "Weekly", checked: false },
  { label: "Full engine service", frequency: "Monthly", checked: false },
  { label: "Suspension check", frequency: "Monthly", checked: false },
  { label: "AC system", frequency: "Monthly", checked: false },
  { label: "Alignment", frequency: "Monthly", checked: false },
];

export default function VehiclesPage() {
  const [activeTab, setActiveTab] = useState<"vehicles" | "fleet-daily">("vehicles");
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fleetForms, setFleetForms] = useState<Record<string, FleetForm>>({});
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [inspectionItems, setInspectionItems] = useState(defaultInspectionItems);
  const [showInspection, setShowInspection] = useState(false);

  useEffect(() => {
    fetchFleet();
  }, [selectedDate]);

  async function fetchFleet() {
    setLoading(true);
    try {
      const res = await fetch(`/api/fleet?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data.vehicles);
        const forms: Record<string, FleetForm> = {};
        data.data.vehicles.forEach((v: VehicleData) => {
          const existing = data.data.fleetDaily.find(
            (fd: any) => fd.vehicleId === v.id
          );
          forms[v.id] = existing
            ? {
                expectedAvailable: existing.expectedAvailable,
                actualAvailable: existing.actualAvailable,
                inGarage: existing.inGarage,
                garageReason: existing.garageReason || "",
                workshopTat: existing.workshopTat || "",
                preDispatchInspection: existing.preDispatchInspection,
                inspectionReason: existing.inspectionReason || "",
              }
            : {
                expectedAvailable: 1,
                actualAvailable: 1,
                inGarage: 0,
                garageReason: "",
                workshopTat: "",
                preDispatchInspection: false,
                inspectionReason: "",
              };
        });
        setFleetForms(forms);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFleet(vehicleId: string) {
    setSaving(vehicleId);
    try {
      const form = fleetForms[vehicleId];
      if (!form) return;
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          vehicleId,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFleet();
      }
    } catch {
    } finally {
      setSaving(null);
    }
  }

  function updateFleetForm(
    vehicleId: string,
    field: keyof FleetForm,
    value: any
  ) {
    setFleetForms((prev) => ({
      ...prev,
      [vehicleId]: { ...prev[vehicleId], [field]: value },
    }));
  }

  const statusConfig: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: { badge: "badge-success", icon: <CheckCircle className="w-4 h-4" />, label: "Active" },
    IN_GARAGE: { badge: "badge-danger", icon: <Wrench className="w-4 h-4" />, label: "In Garage" },
    MAINTENANCE: { badge: "badge-warning", icon: <AlertTriangle className="w-4 h-4" />, label: "Maintenance" },
    RETIRED: { badge: "badge-danger", icon: <AlertTriangle className="w-4 h-4" />, label: "Retired" },
  };

  const statusCounts = vehicles.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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
              Fleet Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {vehicles.length} vehicle{vehicles.length !== 1 && "s"} in fleet
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`pb-3 text-sm transition-colors ${
            activeTab === "vehicles"
              ? "border-b-2 border-teal-600 text-teal-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Vehicles
        </button>
        <button
          onClick={() => setActiveTab("fleet-daily")}
          className={`pb-3 text-sm transition-colors ${
            activeTab === "fleet-daily"
              ? "border-b-2 border-teal-600 text-teal-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Fleet Daily Log
        </button>
      </div>

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <>
          {/* Status Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["ACTIVE", "IN_GARAGE", "MAINTENANCE"] as const).map((status) => {
              const config = statusConfig[status];
              return (
                <div key={status} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">
                      {statusCounts[status] || 0}
                    </p>
                    <p className="text-sm text-slate-500">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vehicles Table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-serif font-bold text-slate-800">
                All Vehicles
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500">Registration</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((vehicle) => {
                    const config = statusConfig[vehicle.status] || statusConfig.ACTIVE;
                    return (
                      <tr key={vehicle.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brown-100 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-brown-700" />
                            </div>
                            <span className="font-mono font-medium text-slate-800">
                              {vehicle.registration}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={config.badge}>{config.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(vehicle.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                        No vehicles found in the fleet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Fleet Daily Log Tab */}
      {activeTab === "fleet-daily" && (
        <>
          {/* Inspection Checklist */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInspection(!showInspection)}
              className="btn-outline"
            >
              <ClipboardList className="w-4 h-4" />
              Inspection Checklist
            </button>
          </div>

          {showInspection && (
            <div className="card p-5">
              <h2 className="font-serif font-bold text-slate-800 mb-4">
                Vehicle Inspection Checklist
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {(["Daily", "Weekly", "Monthly"] as const).map((freq) => (
                  <div key={freq}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      {freq}
                    </h3>
                    <div className="space-y-2">
                      {inspectionItems
                        .filter((item) => item.frequency === freq)
                        .map((item, idx) => {
                          const globalIdx = inspectionItems.indexOf(item);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => {
                                  const newItems = [...inspectionItems];
                                  newItems[globalIdx] = {
                                    ...newItems[globalIdx],
                                    checked: e.target.checked,
                                  };
                                  setInspectionItems(newItems);
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              {item.label}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {inspectionItems.filter((i) => i.checked).length} of{" "}
                  {inspectionItems.length} items checked
                </p>
                <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{
                      width: `${
                        (inspectionItems.filter((i) => i.checked).length /
                          inspectionItems.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Daily Fleet Status */}
          <div className="card">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-serif font-bold text-slate-800">
                Daily Fleet Status
              </h2>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => {
                const config = statusConfig[vehicle.status] || statusConfig.ACTIVE;
                const isExpanded = expandedVehicle === vehicle.id;
                const form = fleetForms[vehicle.id];

                return (
                  <div key={vehicle.id}>
                    <div
                      className="px-4 py-3 hover:bg-slate-50/50 cursor-pointer flex items-center justify-between"
                      onClick={() =>
                        setExpandedVehicle(isExpanded ? null : vehicle.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brown-100 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-brown-700" />
                        </div>
                        <div>
                          <p className="font-mono font-medium text-slate-800">
                            {vehicle.registration}
                          </p>
                          <p className="text-xs text-slate-400">
                            Added {formatDate(vehicle.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={config.badge}>{config.label}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && form && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="form-label">Expected Available</label>
                            <input
                              type="number"
                              min={0}
                              value={form.expectedAvailable}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "expectedAvailable",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">Actual Available</label>
                            <input
                              type="number"
                              min={0}
                              value={form.actualAvailable}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "actualAvailable",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">In Garage</label>
                            <input
                              type="number"
                              min={0}
                              value={form.inGarage}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "inGarage",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">Garage Reason</label>
                            <input
                              type="text"
                              value={form.garageReason}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "garageReason",
                                  e.target.value
                                )
                              }
                              placeholder="Reason for garage"
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">Workshop TAT</label>
                            <input
                              type="text"
                              value={form.workshopTat}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "workshopTat",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 3 days"
                              className="form-input"
                            />
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="form-label">Pre-Dispatch Inspection</label>
                              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={form.preDispatchInspection}
                                  onChange={(e) =>
                                    updateFleetForm(
                                      vehicle.id,
                                      "preDispatchInspection",
                                      e.target.checked
                                    )
                                  }
                                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-sm text-slate-600">
                                  {form.preDispatchInspection ? "Passed" : "Not done"}
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className="form-label">Inspection Reason</label>
                            <input
                              type="text"
                              value={form.inspectionReason}
                              onChange={(e) =>
                                updateFleetForm(
                                  vehicle.id,
                                  "inspectionReason",
                                  e.target.value
                                )
                              }
                              placeholder="Any notes"
                              className="form-input"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveFleet(vehicle.id)}
                            disabled={saving === vehicle.id}
                            className="btn-primary"
                          >
                            {saving === vehicle.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Fleet Status
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {vehicles.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No vehicles found in the fleet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
