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
    loadingStartTarget: string | null;
    loadingEndTarget: string | null;
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
    unitPrice?: number | null;
    amount?: number | null;
    alternativeAvailable?: boolean;
    alternativeProduct?: string | null;
    isTrueStockout?: boolean;
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

export interface InventoryCountData {
  id: string;
  store: string;
  countDate: string;
  skuId: string;
  category: string | null;
  physicalQty: number;
  systemQty: number;
  variance: number;
  unitPrice: number;
  stockValue: number;
  lastStocked: string | null;
  expiryDate: string | null;
  notes: string | null;
  sku: { name: string; category: string | null };
}

export interface InventoryStats {
  totalStockValue: number;
  totalVariance: number;
  shrinkageItems: number;
  slowMovingItems: number;
  expiringItems: number;
  totalRecords: number;
  byStore: { store: string; stockValue: number; variance: number; count: number }[];
}

export function computeInventoryStats(counts: InventoryCountData[]): InventoryStats {
  const totalStockValue = counts.reduce((sum, c) => sum + c.stockValue, 0);
  const totalVariance = counts.reduce((sum, c) => sum + c.variance, 0);
  const shrinkageItems = counts.filter((c) => c.variance < 0).length;

  const slowMovingItems = counts.filter((c) => {
    if (!c.lastStocked) return false;
    const daysSince = (Date.now() - new Date(c.lastStocked).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  }).length;

  const expiringItems = counts.filter((c) => {
    if (!c.expiryDate) return false;
    const daysUntil = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 30 && daysUntil >= 0;
  }).length;

  const storeMap: Record<string, { stockValue: number; variance: number; count: number }> = {};
  for (const c of counts) {
    if (!storeMap[c.store]) storeMap[c.store] = { stockValue: 0, variance: 0, count: 0 };
    storeMap[c.store].stockValue += c.stockValue;
    storeMap[c.store].variance += c.variance;
    storeMap[c.store].count++;
  }

  const byStore = Object.entries(storeMap)
    .map(([store, data]) => ({ store, ...data }))
    .sort((a, b) => b.stockValue - a.stockValue);

  return {
    totalStockValue,
    totalVariance,
    shrinkageItems,
    slowMovingItems,
    expiringItems,
    totalRecords: counts.length,
    byStore,
  };
}

export interface ProfitabilityOrderLine {
  quantity: number;
  sku: {
    unitWeightKg: number | null;
    costPrice: number | null;
    listSellingPrice: number | null;
  } | null;
}

export interface ProfitabilityOrder {
  lines: ProfitabilityOrderLine[];
}

export interface ProfitabilityDriverShift {
  fuelCost: number | null;
  mileageCovered: number | null;
  driver: {
    vehicle: { maintenanceRatePerKm: number | null } | null;
  } | null;
}

export interface ProfitabilityInput {
  routeId: string;
  routeName: string;
  weekStart: string;
  orders: ProfitabilityOrder[];
  driverShifts: ProfitabilityDriverShift[];
  returnsTotal: number;
  missingItemsTotal: number;
}

export interface ProfitabilityResult {
  routeId: string;
  routeName: string;
  weekStart: string;
  tonnageDelivered: number | null;
  sales: number;
  cogs: number | null;
  returnsCost: number;
  fuelVehicleCost: number;
  missingItemsOpportunityCost: number;
  costOfSales: number | null;
  profit: number | null;
  cogsStatus: "available" | "pending_pricing";
}

const SELLING_PRICE_PER_TONNE = 130000;

export function computeProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const { orders, driverShifts, returnsTotal, missingItemsTotal } = input;

  // Tonnage = SUM(order_lines.qty * sku.unitWeightKg) / 1000
  let totalWeightKg = 0;
  let hasMissingWeight = false;

  for (const order of orders) {
    for (const line of order.lines) {
      if (line.sku?.unitWeightKg != null) {
        totalWeightKg += line.quantity * line.sku.unitWeightKg;
      } else {
        hasMissingWeight = true;
      }
    }
  }

  const tonnageDelivered = hasMissingWeight ? null : totalWeightKg / 1000;

  // Sales = tonnage × 130,000 (or from actual order amounts fallback)
  const sales = tonnageDelivered != null
    ? Math.round(tonnageDelivered * SELLING_PRICE_PER_TONNE)
    : 0;

  // COGS = SUM(order_lines.qty * sku.costPrice)
  let totalCogs = 0;
  let hasMissingCostPrice = false;

  for (const order of orders) {
    for (const line of order.lines) {
      if (line.sku?.costPrice != null) {
        totalCogs += line.quantity * line.sku.costPrice;
      } else {
        hasMissingCostPrice = true;
      }
    }
  }

  const cogsStatus: "available" | "pending_pricing" =
    hasMissingWeight || hasMissingCostPrice ? "pending_pricing" : "available";

  const cogs = cogsStatus === "available" ? Math.round(totalCogs) : null;

  // Returns cost at selling price (opportunity cost) — already in return.amount
  const returnsCost = Math.round(returnsTotal);

  // Fuel & Vehicle Cost
  let fuelVehicleCost = 0;
  for (const shift of driverShifts) {
    if (shift.fuelCost != null) {
      fuelVehicleCost += shift.fuelCost;
    }
    const maintRate = shift.driver?.vehicle?.maintenanceRatePerKm;
    if (maintRate != null && shift.mileageCovered != null) {
      fuelVehicleCost += shift.mileageCovered * maintRate;
    }
  }
  fuelVehicleCost = Math.round(fuelVehicleCost);

  // Missing items opportunity cost
  const missingItemsOpportunityCost = Math.round(missingItemsTotal);

  // Cost of Sales
  const costOfSales = cogs != null
    ? Math.round(cogs + returnsCost + fuelVehicleCost + missingItemsOpportunityCost)
    : null;

  // Profit
  const profit = (cogs != null && sales > 0)
    ? Math.round(sales - costOfSales!)
    : null;

  return {
    routeId: input.routeId,
    routeName: input.routeName,
    weekStart: input.weekStart,
    tonnageDelivered: tonnageDelivered != null ? Math.round(tonnageDelivered * 1000) / 1000 : null,
    sales: Math.round(sales),
    cogs,
    returnsCost,
    fuelVehicleCost,
    missingItemsOpportunityCost,
    costOfSales,
    profit,
    cogsStatus,
  };
}
