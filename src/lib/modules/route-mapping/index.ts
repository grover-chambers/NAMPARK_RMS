import { prisma } from "@/lib/prisma";
import { computeProfitability } from "@/lib/reports/analytics";

/**
 * Route-Mapping module service layer (spec step 2, lean scope).
 *
 * Tenant context is resolved SERVER-SIDE from configuration/database state,
 * never from request payloads (TENANT_MIGRATION_PLAN.md §3 rule 1). The REST
 * surface for rep devices is deliberately deferred until the mobile auth
 * strategy decision lands (v2 backlog); this module currently serves the
 * outbound metrics push and future internal consumption.
 */

export interface ModuleMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  chart_type?: "number" | "bar" | "line" | "pie";
  sort_order?: number;
}

export interface ActiveTenant {
  id: string;
  name: string;
  externalClientId: string | null;
}

/**
 * Fail-closed tenant resolution for the current single-operation deployment.
 * Ambiguity (>1 active tenant) is an error, not a guess — explicit binding
 * (per-user tenant claims) arrives with the v2 auth work.
 */
export async function resolveActiveTenant(): Promise<ActiveTenant> {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    select: { id: true, name: true, externalClientId: true },
    orderBy: { createdAt: "asc" },
  });

  if (tenants.length === 0) {
    throw new Error("NO_ACTIVE_TENANT");
  }
  if (tenants.length > 1) {
    throw new Error("AMBIGUOUS_TENANT_BINDING");
  }
  return tenants[0];
}

/** Monday 00:00 UTC of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function formatWeek(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Weekly route-mapping summary for one tenant, matching the PlayMax ingest
 * metric contract. Null-valued financials (pending SKU pricing) are omitted
 * rather than sent as zero — PlayMax report_metrics requires numeric values.
 *
 * Aggregation mirrors src/app/api/reports/profitability/route.ts and reuses
 * its computeProfitability engine unchanged.
 */
export async function computeWeeklyModuleMetrics(
  tenantId: string,
  weekStartDate: Date,
): Promise<ModuleMetric[]> {
  const weekStart = mondayOf(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const assignments = await prisma.dailyAssignment.findMany({
    where: { tenantId, date: { gte: weekStart, lt: weekEnd } },
    select: {
      id: true,
      status: true,
      salesRepId: true,
      routeId: true,
      route: { select: { id: true, name: true } },
      orders: {
        select: {
          lines: {
            select: {
              quantity: true,
              sku: { select: { unitWeightKg: true, costPrice: true } },
            },
          },
        },
      },
      salesRepShift: { select: { customerCountActual: true } },
      driverShift: { select: { id: true, fuelCost: true, mileageCovered: true } },
      vehicle: { select: { maintenanceRatePerKm: true } },
      missingItems: { select: { amount: true } },
    },
  });

  if (assignments.length === 0) return [];

  // ── Operational counters ──
  const routesAssigned = assignments.length;
  const routesCompleted = assignments.filter(
    (a) => a.status === "COMPLETED",
  ).length;
  const completionRate =
    routesAssigned > 0 ? Math.round((routesCompleted / routesAssigned) * 100) : 0;

  let visitsCompleted = 0;
  const reps = new Set<string>();
  for (const a of assignments) {
    visitsCompleted += a.salesRepShift?.customerCountActual ?? 0;
    if (a.salesRepId) reps.add(a.salesRepId);
  }

  // ── Financials via the existing per-route profitability engine ──
  const byRoute = new Map<string, string>(); // routeId -> routeName
  for (const a of assignments) byRoute.set(a.routeId, a.route?.name ?? "");

  const driverShiftIds = assignments
    .map((a) => a.driverShift?.id)
    .filter(Boolean) as string[];
  const returnsRows =
    driverShiftIds.length > 0
      ? await prisma.return.findMany({
          where: { driverShiftId: { in: driverShiftIds } },
          select: { amount: true },
        })
      : [];
  const returnsTotal = returnsRows.reduce((sum, r) => sum + r.amount, 0);

  let tonnage = 0;
  let sales = 0;
  let profit: number | null = null;

  for (const [routeId, routeName] of byRoute) {
    const routeAssignments = assignments.filter((a) => a.routeId === routeId);

    const orders = routeAssignments.flatMap((a) =>
      a.orders.map((o) => ({
        lines: o.lines.map((l) => ({
          quantity: l.quantity,
          sku: l.sku,
        })),
      })),
    );
    const driverShifts = routeAssignments
      .filter((a) => a.driverShift)
      .map((a) => ({
        fuelCost: a.driverShift!.fuelCost,
        mileageCovered: a.driverShift!.mileageCovered,
        driver: {
          vehicle: a.vehicle
            ? { maintenanceRatePerKm: a.vehicle.maintenanceRatePerKm }
            : null,
        },
      }));
    const missingItemsTotal = routeAssignments.reduce(
      (sum, a) => sum + a.missingItems.reduce((s, m) => s + (m.amount ?? 0), 0),
      0,
    );

    const result = computeProfitability({
      routeId,
      routeName,
      weekStart: formatWeek(weekStart),
      orders: orders as Parameters<typeof computeProfitability>[0]["orders"],
      driverShifts,
      returnsTotal,
      missingItemsTotal,
    });

    tonnage += result.tonnageDelivered ?? 0;
    sales += result.sales;
    if (result.profit != null) profit = (profit ?? 0) + result.profit;
  }

  // ── Contract-shaped metrics ──
  const metrics: ModuleMetric[] = [
    { key: "routes_assigned", label: "Routes Assigned", value: routesAssigned, chart_type: "number", sort_order: 10 },
    { key: "routes_completed", label: "Routes Completed", value: routesCompleted, chart_type: "number", sort_order: 20 },
    { key: "route_completion_rate", label: "Route Completion", value: completionRate, unit: "%", chart_type: "number", sort_order: 30 },
    { key: "visits_completed", label: "Customer Visits", value: visitsCompleted, chart_type: "number", sort_order: 40 },
    { key: "active_reps", label: "Active Reps", value: reps.size, chart_type: "number", sort_order: 50 },
  ];

  if (tonnage > 0) {
    metrics.push({ key: "tonnage_delivered", label: "Tonnage Delivered", value: Math.round(tonnage * 1000) / 1000, unit: "t", chart_type: "number", sort_order: 60 });
  }
  if (sales > 0) {
    metrics.push({ key: "sales_total", label: "Sales (KES)", value: sales, unit: "KES", chart_type: "number", sort_order: 70 });
  }
  if (returnsTotal > 0) {
    metrics.push({ key: "returns_cost", label: "Returns Cost", value: Math.round(returnsTotal), unit: "KES", chart_type: "number", sort_order: 80 });
  }
  if (profit != null && sales > 0) {
    metrics.push({ key: "profit", label: "Profit (KES)", value: profit, unit: "KES", chart_type: "number", sort_order: 90 });
  }

  return metrics;
}
