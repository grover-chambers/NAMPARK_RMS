export interface KPIData {
  metric: string;
  target: number | string;
  actual: number | string;
  status: "MET" | "NOT MET";
  reason?: string;
  display?: string;
}

export interface ShiftTiming {
  label: string;
  target?: string;
  actual: string | null;
  status: "Early" | "Late" | "On time" | "N/A";
}

export interface RouteReportData {
  id: string;
  date: string;
  route: { id: string; name: string; targetDaily: number };
  salesRep: { id: string; name: string };
  driver: { id: string; name: string };
  vehicle: { id: string; registration: string };
  shift: {
    shiftOpen: string | null;
    shiftClose: string | null;
    customerCountTarget: number;
    customerCountActual: number;
    salesTarget: number;
    salesActual: number;
    complaints: number;
    complaintTarget: number;
    reportSubmissionTime: string | null;
    comments: string | null;
    kpiReasons?: Record<string, string>;
  };
  driverShift: {
    loadingStart: string | null;
    loadingEnd: string | null;
    shiftStart: string | null;
    gatePassTime: string | null;
    shiftEnd: string | null;
    customerCountActual: number;
    reportSubmissionTime: string | null;
    comments: string | null;
  };
  orders: {
    id: string;
    customerName: string;
    totalAmount: number;
    lines: { sku: string; quantity: number; unitPrice: number; amount: number }[];
  }[];
  missingItems: {
    id: string;
    sku: string;
    customerCountAffected: number;
    cartonsAffected: number;
    notes: string | null;
  }[];
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

export interface ComputedReport {
  route: { id: string; name: string };
  salesRep: { id: string; name: string };
  driver: { id: string; name: string };
  vehicle: { id: string; registration: string };
  date: string;
  kpiStatus: "MET" | "NOT MET";
  attainment: number;
  customerCountDisplay: string;
  kpis: KPIData[];
  shiftTimings: ShiftTiming[];
  comments: string | null;
  orders: RouteReportData["orders"];
  missingItems: RouteReportData["missingItems"];
  driverShift: RouteReportData["driverShift"];
  summary: RouteReportData["summary"];
}

function earlyLate(
  targetTime: string | null | undefined,
  actualTime: string | null | undefined
): "Early" | "Late" | "On time" | "N/A" {
  if (!targetTime || !actualTime) return "N/A";
  const target = new Date(targetTime).getTime();
  const actual = new Date(actualTime).getTime();
  const diff = actual - target;
  if (Math.abs(diff) < 5 * 60 * 1000) return "On time";
  return diff < 0 ? "Early" : "Late";
}

function computeKPIStatus(
  salesActual: number,
  salesTarget: number,
  complaintCount: number,
  complaintTarget: number,
  customerActual: number,
  customerTarget: number
): "MET" | "NOT MET" {
  if (salesActual >= salesTarget && complaintCount <= complaintTarget && customerActual >= customerTarget) {
    return "MET";
  }
  return "NOT MET";
}

export function computeReport(report: RouteReportData): ComputedReport {
  const { shift, route } = report;

  const kpiReasons = (shift.kpiReasons as Record<string, string>) || {};

  const kpiStatus = computeKPIStatus(
    shift.salesActual,
    shift.salesTarget,
    shift.complaints,
    shift.complaintTarget,
    shift.customerCountActual,
    shift.customerCountTarget
  );

  const customerCountDisplay = `${shift.customerCountActual}/${shift.customerCountTarget}`;

  const attainment = shift.salesTarget > 0
    ? Math.round((shift.salesActual / shift.salesTarget) * 100)
    : 0;

  const kpis: KPIData[] = [
    {
      metric: "Customer Count",
      target: shift.customerCountTarget,
      actual: shift.customerCountActual,
      status: shift.customerCountActual >= shift.customerCountTarget ? "MET" : "NOT MET",
      display: customerCountDisplay,
      reason: kpiReasons.customer_count,
    },
    {
      metric: "Sales",
      target: `KES ${shift.salesTarget.toLocaleString()}`,
      actual: `KES ${shift.salesActual.toLocaleString()}`,
      status: shift.salesActual >= shift.salesTarget ? "MET" : "NOT MET",
      reason: kpiReasons.sales,
    },
    {
      metric: "Complaints",
      target: shift.complaintTarget,
      actual: shift.complaints,
      status: shift.complaints <= shift.complaintTarget ? "MET" : "NOT MET",
      reason: kpiReasons.complaint,
    },
    {
      metric: "Report Submission",
      target: "End of day",
      actual: shift.reportSubmissionTime ? "Submitted" : "Not submitted",
      status: shift.reportSubmissionTime ? "MET" : "NOT MET",
      reason: kpiReasons.report_submission,
    },
  ];

  const shiftTimings: ShiftTiming[] = [
    {
      label: "Shift Open",
      actual: shift.shiftOpen,
      status: earlyLate(null, shift.shiftOpen),
    },
    {
      label: "Shift Close",
      actual: shift.shiftClose,
      status: earlyLate(null, shift.shiftClose),
    },
  ];

  return {
    route: report.route,
    salesRep: report.salesRep,
    driver: report.driver,
    vehicle: report.vehicle,
    date: report.date,
    kpiStatus,
    attainment,
    customerCountDisplay,
    kpis,
    shiftTimings,
    comments: shift.comments,
    orders: report.orders,
    missingItems: report.missingItems,
    driverShift: report.driverShift,
    summary: report.summary,
  };
}

export function computeWeeklyStats(reports: ComputedReport[]) {
  if (reports.length === 0) {
    return {
      totalSales: 0,
      totalTarget: 0,
      avgAttainment: 0,
      totalComplaints: 0,
      totalMissingItems: 0,
      totalCustomers: 0,
      metCount: 0,
      notMetCount: 0,
    };
  }

  const totalSales = reports.reduce((sum, r) => sum + r.summary.salesActual, 0);
  const totalTarget = reports.reduce((sum, r) => sum + r.summary.salesTarget, 0);
  const avgAttainment = reports.reduce((sum, r) => sum + r.attainment, 0) / reports.length;
  const totalComplaints = reports.reduce((sum, r) => sum + (r.kpis.find(k => k.metric === "Complaints")?.actual as number || 0), 0);
  const totalMissingItems = reports.reduce((sum, r) => sum + r.summary.missingItemsTotal, 0);
  const totalCustomers = reports.reduce((sum, r) => sum + (r.kpis.find(k => k.metric === "Customer Count")?.actual as number || 0), 0);
  const metCount = reports.filter(r => r.kpiStatus === "MET").length;
  const notMetCount = reports.filter(r => r.kpiStatus === "NOT MET").length;

  return {
    totalSales,
    totalTarget,
    avgAttainment: Math.round(avgAttainment),
    totalComplaints,
    totalMissingItems,
    totalCustomers,
    metCount,
    notMetCount,
  };
}
