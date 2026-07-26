"use client";

import { useState, useEffect, useRef } from "react";
import {
  CalendarDays,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  MessageSquare,
  Clock,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatTimeShort,
  getPerformanceColor,
} from "@/lib/utils";
import ExportBar from "@/components/reports/ExportBar";

interface OrderLine {
  sku: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  lines: OrderLine[];
}

interface MissingItem {
  id: string;
  sku: string;
  customerCountAffected: number;
  cartonsAffected: number;
  notes: string | null;
}

interface Shift {
  shiftOpen: string | null;
  shiftClose: string | null;
  customerCountTarget: number;
  customerCountActual: number;
  salesTarget: number;
  salesActual: number;
  complaints: number;
  reportSubmissionTime: string | null;
  comments: string | null;
}

interface DriverShift {
  loadingStart: string | null;
  loadingEnd: string | null;
  shiftStart: string | null;
  gatePassTime: string | null;
  shiftEnd: string | null;
  customerCountActual: number;
  reportSubmissionTime: string | null;
  comments: string | null;
}

interface RouteReport {
  id: string;
  route: { id: string; name: string; targetDaily: number };
  salesRep: { id: string; name: string };
  driver: { id: string; name: string };
  vehicle: { id: string; registration: string };
  shift: Shift;
  driverShift: DriverShift;
  orders: Order[];
  missingItems: MissingItem[];
  summary: {
    totalOrders: number;
    totalOrderSales: number;
    salesActual: number;
    salesTarget: number;
    attainment: number;
    missingItemsTotal: number;
    cartonsAffected: number;
    customersAffected: number;
  };
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function DailyReportViewPage() {
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [reports, setReports] = useState<RouteReport[]>([]);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- initial loading state for data fetch
    fetch(`/api/reports/daily-report?date=${selectedDate}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReports(data.data.routeReports);
        else setReports([]);
      })
      .catch(() => { if (!controller.signal.aborted) setReports([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [selectedDate]);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toISODate(d));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-content space-y-6 print:space-y-4">
      {/* Header */}
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-800">
                Daily Activity Report
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                View themed route reports for any day
              </p>
            </div>
          </div>
          <ExportBar
            title="Daily Report"
            filename={`nampark-daily-${selectedDate}`}
            reportType="daily-report"
            params={{ date: selectedDate }}
            disablePDF={false}
          />
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="btn-outline btn-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input w-48"
          />
          <button
            onClick={() => shiftDay(1)}
            className="btn-outline btn-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-2">
        <h1 className="text-lg font-bold">DAILY ACTIVITY REPORT</h1>
        <p className="text-sm">
          {new Date(selectedDate).toLocaleDateString("en-KE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading reports...</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-serif font-bold text-slate-700 mb-2">
            No Reports Found
          </h3>
          <p className="text-slate-500 text-sm">
            No route reports available for{" "}
            {formatDate(selectedDate)}.
          </p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {reports.map((report) => (
            <RouteReportCard key={report.id} report={report} date={selectedDate} />
          ))}
        </div>
      )}
    </div>
  );
}

function RouteReportCard({ report, date }: { report: RouteReport; date: string }) {
  const { shift, driverShift, route, salesRep, driver, vehicle, missingItems, summary } = report;
  const formattedDate = new Date(date).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const customerAttainment =
    shift.customerCountTarget > 0
      ? Math.round((shift.customerCountActual / shift.customerCountTarget) * 100)
      : 0;

  return (
    <div className="card overflow-hidden print:shadow-none print:border print:break-inside-avoid">
      {/* Teal header bar */}
      <div className="bg-teal-600 text-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest">
              Daily Activity Report
            </h2>
          </div>
          <div className="text-right text-xs opacity-90">
            <p className="font-semibold">{route.name}</p>
          </div>
        </div>
      </div>

      {/* Route info sub-header */}
      <div className="bg-teal-50 border-b border-teal-100 px-5 py-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Route:</span>{" "}
            <span className="font-semibold text-slate-700">{route.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Sales Person:</span>{" "}
            <span className="font-semibold text-slate-700">{salesRep.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Driver:</span>{" "}
            <span className="font-semibold text-slate-700">{driver.name}</span>
          </div>
          <div>
            <span className="text-slate-500">Vehicle:</span>{" "}
            <span className="font-mono font-semibold text-slate-700">
              {vehicle.registration}
            </span>
          </div>
        </div>
        <div className="mt-1.5 text-xs text-slate-600">
          <CalendarDays size={12} className="inline mr-1" />
          {formattedDate}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI Table */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Key Performance Indicators
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <KpiRow
                  label="Shift Account Opening"
                  value={shift.shiftOpen ? formatTimeShort(shift.shiftOpen) : "—"}
                />
                <KpiRow
                  label="Shift Account Closing"
                  value={shift.shiftClose ? formatTimeShort(shift.shiftClose) : "—"}
                  highlight={false}
                />
                <KpiRow
                  label="Customer Count"
                  value={`${shift.customerCountActual} / ${shift.customerCountTarget}`}
                  badge={
                    shift.customerCountTarget > 0 ? (
                      <span className={`text-xs font-semibold ${getPerformanceColor(customerAttainment)}`}>
                        ({customerAttainment}%)
                      </span>
                    ) : undefined
                  }
                />
                <KpiRow
                  label="Sales"
                  value={`${formatCurrency(shift.salesActual)} / ${formatCurrency(shift.salesTarget)}`}
                  badge={
                    shift.salesTarget > 0 ? (
                      <span className={`text-xs font-semibold ${getPerformanceColor(summary.attainment)}`}>
                        ({summary.attainment}%)
                      </span>
                    ) : undefined
                  }
                />
                <KpiRow
                  label="Customer Complaints"
                  value={String(shift.complaints)}
                  valueClassName={shift.complaints > 0 ? "text-red-600 font-semibold" : ""}
                />
                <KpiRow
                  label="Report Submission Time"
                  value={
                    shift.reportSubmissionTime
                      ? formatTimeShort(shift.reportSubmissionTime)
                      : "—"
                  }
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Comments */}
        {shift.comments && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} />
              Comments
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
              {shift.comments}
            </div>
          </div>
        )}

        {/* Driver Shift Times */}
        {(driverShift.loadingStart || driverShift.shiftStart || driverShift.shiftEnd) && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock size={12} />
              Driver Shift Times
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {driverShift.loadingStart && (
                    <KpiRow label="Loading Start" value={formatTimeShort(driverShift.loadingStart)} />
                  )}
                  {driverShift.loadingEnd && (
                    <KpiRow label="Loading End" value={formatTimeShort(driverShift.loadingEnd)} />
                  )}
                  {driverShift.shiftStart && (
                    <KpiRow label="Shift Start" value={formatTimeShort(driverShift.shiftStart)} />
                  )}
                  {driverShift.gatePassTime && (
                    <KpiRow label="Gate Pass" value={formatTimeShort(driverShift.gatePassTime)} />
                  )}
                  {driverShift.shiftEnd && (
                    <KpiRow label="Shift End" value={formatTimeShort(driverShift.shiftEnd)} />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Missing Items */}
        {missingItems.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" />
              Missing Items ({missingItems.length})
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                      SKU
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                      Customers Affected
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                      Cartons Affected
                    </th>
                    {missingItems.some((m) => m.notes) && (
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                        Notes
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-right">{item.customerCountAffected}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-600">
                        {item.cartonsAffected}
                      </td>
                      {missingItems.some((m) => m.notes) && (
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          {item.notes || "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Route Summary */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
            Route Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryStat label="Total Orders" value={String(summary.totalOrders)} />
            <SummaryStat label="Order Sales" value={formatCurrency(summary.totalOrderSales)} />
            <SummaryStat
              label="Sales Attainment"
              value={`${summary.attainment}%`}
              valueClassName={getPerformanceColor(summary.attainment)}
            />
            <SummaryStat
              label="Missing Items"
              value={String(summary.missingItemsTotal)}
              valueClassName={summary.missingItemsTotal > 0 ? "text-amber-600" : ""}
            />
            <SummaryStat
              label="Cartons Affected"
              value={String(summary.cartonsAffected)}
              valueClassName={summary.cartonsAffected > 0 ? "text-red-600" : ""}
            />
            <SummaryStat
              label="Customers Affected"
              value={String(summary.customersAffected)}
              valueClassName={summary.customersAffected > 0 ? "text-red-600" : ""}
            />
            <SummaryStat
              label="Complaints"
              value={String(shift.complaints)}
              valueClassName={shift.complaints > 0 ? "text-red-600" : ""}
            />
            <SummaryStat
              label="Target"
              value={formatCurrency(shift.salesTarget)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiRow({
  label,
  value,
  badge,
  highlight = false,
  valueClassName = "",
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  highlight?: boolean;
  valueClassName?: string;
}) {
  return (
    <tr className={`border-b border-slate-100 last:border-0 ${highlight ? "bg-teal-50/50" : ""}`}>
      <td className="px-3 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">
        {label}
      </td>
      <td className="px-3 py-2 text-sm font-semibold text-slate-700 text-right">
        <span className={valueClassName}>{value}</span>
        {badge && <span className="ml-1.5">{badge}</span>}
      </td>
    </tr>
  );
}

function SummaryStat({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs text-teal-600 font-medium">{label}</p>
      <p className={`text-base font-bold ${valueClassName || "text-slate-800"}`}>{value}</p>
    </div>
  );
}
