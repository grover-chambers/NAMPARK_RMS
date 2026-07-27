import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly snapshot cron — freezes completed week aggregates.
 * Call: GET /api/cron/weekly-snapshot
 * Optional: ?week=YYYY-Www (e.g. 2026-W28)
 * If no week param, computes the most recently completed week.
 */
export async function GET(req: NextRequest) {
  // Basic auth check for cron
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET env var not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    let targetWeek: string;

    const urlWeek = req.nextUrl.searchParams.get("week");
    if (urlWeek) {
      targetWeek = urlWeek;
    } else {
      // Find the most recently completed week
      const dayOfWeek = now.getDay(); // 0=Sun
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lastMonday = new Date(now);
      lastMonday.setDate(lastMonday.getDate() - daysSinceMonday - 7);
      targetWeek = getWeekString(lastMonday);
    }

    // Find all assignments in the target week
    const weekStart = getWeekStart(targetWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const assignments = await prisma.dailyAssignment.findMany({
      where: {
        date: { gte: weekStart, lt: weekEnd },
      },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        orders: true,
        missingItems: true,
        salesRepShift: true,
        driverShift: { include: { returns: true } },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No assignments found for week ${targetWeek}`,
        week: targetWeek,
        snapshot: null,
      });
    }

    // Aggregate weekly stats
    let totalSales = 0;
    let totalCustomers = 0;
    let totalMissingItems = 0;
    let totalReturns = 0;
    let routeBreakdown: Record<string, { sales: number; customers: number; missingItems: number; returns: number }> = {};

    for (const a of assignments) {
      const routeName = a.route.name;
      if (!routeBreakdown[routeName]) {
        routeBreakdown[routeName] = { sales: 0, customers: 0, missingItems: 0, returns: 0 };
      }

      const shift = a.salesRepShift;
      if (shift) {
        const salesActual = Number(shift.salesActual || 0);
        const customers = Number(shift.customerCountActual || 0);
        totalSales += salesActual;
        totalCustomers += customers;
        routeBreakdown[routeName].sales += salesActual;
        routeBreakdown[routeName].customers += customers;
      }

      const missingCount = a.missingItems?.length || 0;
      totalMissingItems += missingCount;
      routeBreakdown[routeName].missingItems += missingCount;

      const dShift = a.driverShift;
      if (dShift?.returns) {
        totalReturns += dShift.returns.length;
        routeBreakdown[routeName].returns += dShift.returns.length;
      }
    }

    const snapshot = {
      week: targetWeek,
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: new Date(weekEnd.getTime() - 86400000).toISOString().split("T")[0],
      totalAssignments: assignments.length,
      totalSales,
      totalCustomers,
      totalMissingItems,
      totalReturns,
      routes: routeBreakdown,
      generatedAt: now.toISOString(),
    };

    // Store as a challenge with the snapshot data
    await prisma.challenge.create({
      data: {
        date: now,
        gap: `Weekly snapshot for ${targetWeek}`,
        whatAction: JSON.stringify(snapshot),
        who: "SYSTEM",
        when: weekStart,
        resolved: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Snapshot saved for week ${targetWeek}`,
      snapshot,
    });
  } catch (error) {
    console.error("Weekly snapshot error:", error);
    return NextResponse.json({ error: "Snapshot generation failed" }, { status: 500 });
  }
}

function getWeekString(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekStart(weekStr: string): Date {
  const [yearStr, weekStr2] = weekStr.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(weekStr2);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(firstMonday.getDate() + mondayOffset);
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(targetMonday.getDate() + (week - 1) * 7);
  return targetMonday;
}
