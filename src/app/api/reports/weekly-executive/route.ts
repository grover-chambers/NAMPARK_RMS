import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
            lines: true,
          },
        },
        missingItems: {
          include: { sku: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // Aggregate route performance
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

    for (const a of assignments) {
      const rid = a.routeId;
      if (!routeMap[rid]) {
        routeMap[rid] = {
          routeId: rid,
          routeName: a.route.name,
          salesRepName: a.salesRep.name,
          target: 0,
          actual: 0,
          customerCount: 0,
          complaints: 0,
          daysActive: 0,
        };
      }
      const r = routeMap[rid];
      r.target += a.route.targetDaily;
      r.actual += a.salesRepShift?.salesActual ?? a.orders.reduce((s, o) => s + o.totalAmount, 0);
      r.customerCount += a.salesRepShift?.customerCountActual ?? 0;
      r.complaints += a.salesRepShift?.complaints ?? 0;
      r.daysActive++;
    }

    const routePerformance = Object.values(routeMap)
      .map((r) => ({
        ...r,
        attainment: r.target > 0 ? Math.round((r.actual / r.target) * 100) : 0,
      }))
      .sort((a, b) => b.attainment - a.attainment);

    // Aggregate missing items
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

    // Aggregate returns by type
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

    // Aggregate driver performance
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

        // Calculate delay: difference between expected and actual end
        if (a.driverShift.shiftStart && a.driverShift.shiftEnd) {
          const start = new Date(a.driverShift.shiftStart).getTime();
          const end = new Date(a.driverShift.shiftEnd).getTime();
          const expectedMs = 10 * 60 * 60 * 1000; // 10 hour shift
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

    // Overall stats
    const totalSales = assignments.reduce(
      (sum, a) => sum + (a.salesRepShift?.salesActual ?? a.orders.reduce((s, o) => s + o.totalAmount, 0)),
      0
    );
    const totalTarget = routePerformance.reduce((sum, r) => sum + r.target, 0);
    const avgAttainment =
      routePerformance.length > 0
        ? Math.round(routePerformance.reduce((s, r) => s + r.attainment, 0) / routePerformance.length)
        : 0;
    const totalMissingItemsValue = missingItemsRanked.reduce(
      (sum, m) => sum + m.cartonsAffected,
      0
    );

    // Daily trend for the week
    const dailyTrend: { day: string; sales: number; target: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dayLabel = d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric" });
      const dayStr = d.toISOString().split("T")[0];
      const dayAssignments = assignments.filter(
        (a) => a.date.toISOString().split("T")[0] === dayStr
      );
      const daySales = dayAssignments.reduce(
        (sum, a) => sum + (a.salesRepShift?.salesActual ?? a.orders.reduce((s, o) => s + o.totalAmount, 0)),
        0
      );
      const dayTarget = dayAssignments.reduce((sum, a) => sum + a.route.targetDaily, 0);
      dailyTrend.push({ day: dayLabel, sales: daySales, target: dayTarget });
    }

    return NextResponse.json({
      success: true,
      data: {
        week: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
        overall: {
          totalSales,
          totalTarget,
          avgAttainment,
          totalMissingItemsValue,
          totalReturnsValue,
          totalAssignments: assignments.length,
          totalComplaints: routePerformance.reduce((s, r) => s + r.complaints, 0),
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
