import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeReport, computeWeeklyStats, type RouteReportData, type ComputedReport } from "@/lib/reports/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sp = new URL(request.url).searchParams;
    const startDate = sp.get("startDate");
    const endDate = sp.get("endDate");
    const routeId = sp.get("routeId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const where: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };
    if (routeId) where.routeId = routeId;

    const assignments = await prisma.dailyAssignment.findMany({
      where,
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: {
          include: {
            returns: { include: { sku: true } },
          },
        },
        orders: {
          include: { lines: { include: { sku: true } } },
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
        date: a.date.toISOString(),
        route: { id: a.route.id, name: a.route.name, targetDaily: a.route.targetDaily },
        salesRep: { id: a.salesRep.id, name: a.salesRep.name },
        driver: { id: a.driver.id, name: a.driver.name },
        vehicle: { id: a.vehicle.id, registration: a.vehicle.registration },
        shift: {
          shiftOpen: shift?.shiftOpen?.toISOString() ?? null,
          shiftClose: shift?.shiftClose?.toISOString() ?? null,
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

    const dailyTrend: { day: string; sales: number; target: number }[] = [];
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const totalDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startD);
      d.setDate(startD.getDate() + i);
      const dayLabel = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      const dayStr = d.toISOString().split("T")[0];

      const dayReports = computedReports.filter((cr) => {
        const crDate = cr.date.split("T")[0];
        return crDate === dayStr;
      });

      const daySales = dayReports.reduce((sum, cr) => sum + cr.summary.salesActual, 0);
      const dayTarget = dayReports.reduce((sum, cr) => sum + cr.summary.salesTarget, 0);
      dailyTrend.push({ day: dayLabel, sales: daySales, target: dayTarget });
    }

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate },
        overall: {
          totalSales: weeklyStats.totalSales,
          totalTarget: weeklyStats.totalTarget,
          avgAttainment: weeklyStats.avgAttainment,
          totalComplaints: weeklyStats.totalComplaints,
          totalMissingItems: weeklyStats.totalMissingItems,
          totalCustomers: weeklyStats.totalCustomers,
          metCount: weeklyStats.metCount,
          notMetCount: weeklyStats.notMetCount,
          totalAssignments: assignments.length,
        },
        routePerformance,
        dailyTrend,
        computedReports,
      },
    });
  } catch (error) {
    console.error("Performance report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch performance report" },
      { status: 500 }
    );
  }
}
