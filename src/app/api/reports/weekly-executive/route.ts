import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeReport, computeWeeklyStats, type RouteReportData, type ComputedReport } from "@/lib/reports/analytics";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const weekStr = searchParams.get("week");

    if (!weekStr) {
      return NextResponse.json(
        { success: false, error: "week query parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const weekStart = new Date(weekStr);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const assignments = await prisma.dailyAssignment.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: {
          include: {
            returns: {
              include: { sku: true },
            },
          },
        },
        orders: {
          include: {
            lines: { include: { sku: true } },
          },
        },
        missingItems: {
          include: { sku: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const computedReports: ComputedReport[] = [];
    for (const a of assignments) {
      const shift = a.salesRepShift;
      const dShift = a.driverShift;

      const totalOrderSales = a.orders.reduce(
        (sum, o) => sum + o.lines.reduce((ls, l) => ls + l.amount, 0),
        0
      );
      const salesActual = shift?.salesActual ?? totalOrderSales;
      const salesTarget = a.route.targetDaily;
      const customerCountTarget = shift?.customerCountTarget ?? 0;
      const customerCountActual = shift?.customerCountActual ?? 0;

      const reportData: RouteReportData = {
        id: a.id,
        date: toDateKey(a.date),
        route: { id: a.route.id, name: a.route.name, targetDaily: a.route.targetDaily },
        salesRep: { id: a.salesRep.id, name: a.salesRep.name },
        driver: { id: a.driver.id, name: a.driver.name },
        vehicle: { id: a.vehicle.id, registration: a.vehicle.registration },
        shift: {
          shiftOpen: shift?.shiftOpen?.toISOString() ?? null,
          shiftClose: shift?.shiftClose?.toISOString() ?? null,
          shiftOpenTarget: shift?.shiftOpenTarget?.toISOString() ?? null,
          shiftCloseTarget: shift?.shiftCloseTarget?.toISOString() ?? null,
          customerCountTarget,
          customerCountActual,
          salesTarget,
          salesActual,
          complaints: shift?.complaints ?? 0,
          complaintTarget: shift?.complaintTarget ?? 0,
          reportSubmissionTime: shift?.reportSubmissionTime?.toISOString() ?? null,
          comments: shift?.comments ?? null,
          kpiReasons: (shift?.kpiReasons as Record<string, string>) ?? {},
        },
        driverShift: {
          loadingStart: dShift?.loadingStart?.toISOString() ?? null,
          loadingEnd: dShift?.loadingEnd?.toISOString() ?? null,
          loadingStartTarget: dShift?.loadingStartTarget?.toISOString() ?? null,
          loadingEndTarget: dShift?.loadingEndTarget?.toISOString() ?? null,
          shiftStart: dShift?.shiftStart?.toISOString() ?? null,
          gatePassTime: dShift?.gatePassTime?.toISOString() ?? null,
          shiftEnd: dShift?.shiftEnd?.toISOString() ?? null,
          customerCountActual: dShift?.customerCountActual ?? 0,
          reportSubmissionTime: dShift?.reportSubmissionTime?.toISOString() ?? null,
          comments: dShift?.comments ?? null,
        },
        orders: a.orders.map((o) => ({
          id: o.id,
          customerName: o.customerName,
          totalAmount: o.totalAmount,
          lines: o.lines.map((l) => ({
            sku: l.sku.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
          })),
        })),
        missingItems: a.missingItems.map((m) => ({
          id: m.id,
          sku: m.sku.name,
          customerCountAffected: m.customerCountAffected,
          cartonsAffected: m.cartonsAffected,
          notes: m.notes,
        })),
        summary: {
          totalOrders: a.orders.length,
          totalOrderSales,
          salesActual,
          salesTarget,
          attainment: salesTarget > 0 ? Math.round((salesActual / salesTarget) * 100) : 0,
          missingItemsTotal: a.missingItems.length,
          cartonsAffected: a.missingItems.reduce((sum, m) => sum + m.cartonsAffected, 0),
          customersAffected: a.missingItems.reduce((sum, m) => sum + m.customerCountAffected, 0),
        },
      };

      computedReports.push(computeReport(reportData));
    }

    const weeklyStats = computeWeeklyStats(computedReports);

    const routeMap: Record<
      string,
      {
        routeId: string;
        routeName: string;
        salesRepName: string;
        target: number;
        actual: number;
        customerCount: number;
        complaints: number;
        daysActive: number;
      }
    > = {};

    for (const cr of computedReports) {
      const rid = cr.route.id;
      if (!routeMap[rid]) {
        routeMap[rid] = {
          routeId: rid,
          routeName: cr.route.name,
          salesRepName: cr.salesRep.name,
          target: 0,
          actual: 0,
          customerCount: 0,
          complaints: 0,
          daysActive: 0,
        };
      }
      const r = routeMap[rid];
      r.target += cr.summary.salesTarget;
      r.actual += cr.summary.salesActual;
      r.customerCount += (cr.kpis.find((k) => k.metric === "Customer Count")?.actual as number) || 0;
      r.complaints += (cr.kpis.find((k) => k.metric === "Complaints")?.actual as number) || 0;
      r.daysActive++;
    }

    const routePerformance = Object.values(routeMap)
      .map((r) => ({
        ...r,
        attainment: r.target > 0 ? Math.round((r.actual / r.target) * 100) : 0,
      }))
      .sort((a, b) => b.attainment - a.attainment);

    const missingMap: Record<
      string,
      { skuName: string; count: number; cartonsAffected: number; customersAffected: number }
    > = {};

    for (const a of assignments) {
      for (const m of a.missingItems) {
        const key = m.skuId;
        if (!missingMap[key]) {
          missingMap[key] = {
            skuName: m.sku.name,
            count: 0,
            cartonsAffected: 0,
            customersAffected: 0,
          };
        }
        missingMap[key].count++;
        missingMap[key].cartonsAffected += m.cartonsAffected;
        missingMap[key].customersAffected += m.customerCountAffected;
      }
    }

    const missingItemsRanked = Object.values(missingMap)
      .sort((a, b) => b.cartonsAffected - a.cartonsAffected);

    const returnsByTypeMap: Record<string, { type: string; count: number; amount: number }> = {};
    let totalReturnsValue = 0;

    for (const a of assignments) {
      if (!a.driverShift) continue;
      for (const r of a.driverShift.returns) {
        const t = r.type;
        if (!returnsByTypeMap[t]) {
          returnsByTypeMap[t] = { type: t, count: 0, amount: 0 };
        }
        returnsByTypeMap[t].count++;
        returnsByTypeMap[t].amount += r.amount;
        totalReturnsValue += r.amount;
      }
    }

    const returnsByType = Object.values(returnsByTypeMap).sort(
      (a, b) => b.amount - a.amount
    );

    const driverMap: Record<
      string,
      {
        driverId: string;
        driverName: string;
        routes: number;
        totalCustomers: number;
        totalReturns: number;
        totalReturnValue: number;
        totalDelayMinutes: number;
      }
    > = {};

    for (const a of assignments) {
      const did = a.driverId;
      if (!driverMap[did]) {
        driverMap[did] = {
          driverId: did,
          driverName: a.driver.name,
          routes: 0,
          totalCustomers: 0,
          totalReturns: 0,
          totalReturnValue: 0,
          totalDelayMinutes: 0,
        };
      }
      const d = driverMap[did];
      d.routes++;
      d.totalCustomers += a.driverShift?.customerCountActual ?? 0;

      if (a.driverShift) {
        for (const r of a.driverShift.returns) {
          d.totalReturns++;
          d.totalReturnValue += r.amount;
        }

        if (a.driverShift.shiftStart && a.driverShift.shiftEnd) {
          const start = new Date(a.driverShift.shiftStart).getTime();
          const end = new Date(a.driverShift.shiftEnd).getTime();
          const expectedMs = 10 * 60 * 60 * 1000;
          const actualMs = end - start;
          if (actualMs > expectedMs) {
            d.totalDelayMinutes += Math.round((actualMs - expectedMs) / (60 * 1000));
          }
        }
      }
    }

    const driverPerformance = Object.values(driverMap).sort(
      (a, b) => b.totalCustomers - a.totalCustomers
    );

    const dailyTrend: { day: string; sales: number; target: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dayLabel = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      const dayKey = toDateKey(d);

      const dayReports = computedReports.filter((cr) => cr.date === dayKey);
      const daySales = dayReports.reduce((sum, cr) => sum + cr.summary.salesActual, 0);
      const dayTarget = dayReports.reduce((sum, cr) => sum + cr.summary.salesTarget, 0);
      dailyTrend.push({ day: dayLabel, sales: daySales, target: dayTarget });
    }

    return NextResponse.json({
      success: true,
      data: {
        week: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
        overall: {
          totalSales: weeklyStats.totalSales,
          totalTarget: weeklyStats.totalTarget,
          avgAttainment: weeklyStats.avgAttainment,
          totalMissingItemsValue: weeklyStats.totalMissingItems,
          totalReturnsValue,
          totalAssignments: assignments.length,
          totalComplaints: weeklyStats.totalComplaints,
        },
        routePerformance,
        missingItemsRanked,
        returnsByType,
        driverPerformance,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error("Weekly executive report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch weekly executive report" },
      { status: 500 }
    );
  }
}
