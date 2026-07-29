import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeProfitability, type ProfitabilityResult } from "@/lib/reports/analytics";

const ASSIGNMENT_SELECT = {
  id: true,
  routeId: true,
  orders: {
    select: {
      lines: {
        select: {
          quantity: true,
          sku: {
            select: {
              unitWeightKg: true,
              costPrice: true,
              listSellingPrice: true,
            },
          },
        },
      },
    },
  },
  driverShift: {
    select: {
      id: true,
      fuelCost: true,
      mileageCovered: true,
    },
  },
  vehicle: {
    select: {
      maintenanceRatePerKm: true,
    },
  },
  missingItems: {
    select: { amount: true },
  },
} as const;

async function computeForRoute(
  routeId: string,
  routeName: string,
  weekStartStr: string,
  weekStart: Date,
  weekEnd: Date
): Promise<ProfitabilityResult> {
  const assignments = await prisma.dailyAssignment.findMany({
    where: {
      routeId,
      date: { gte: weekStart, lte: weekEnd },
      status: "COMPLETED",
    },
    select: ASSIGNMENT_SELECT,
  });

  const driverShiftIds = assignments
    .map((a) => a.driverShift?.id)
    .filter(Boolean) as string[];

  const returns = driverShiftIds.length > 0
    ? await prisma.return.findMany({
        where: { driverShiftId: { in: driverShiftIds } },
        select: { amount: true },
      })
    : [];

  const orders = assignments.flatMap((a) => a.orders);
  const driverShifts = assignments.map((a) => ({
    fuelCost: a.driverShift?.fuelCost ?? null,
    mileageCovered: a.driverShift?.mileageCovered ?? null,
    driver: {
      vehicle: a.vehicle
        ? { maintenanceRatePerKm: a.vehicle.maintenanceRatePerKm }
        : null,
    },
  }));

  const returnsTotal = returns.reduce((sum, r) => sum + (r.amount || 0), 0);
  const missingItemsTotal = assignments.reduce(
    (sum, a) => sum + a.missingItems.reduce((s, m) => s + (m.amount || 0), 0),
    0
  );

  return computeProfitability({
    routeId,
    routeName,
    weekStart: weekStartStr,
    orders: orders as any,
    driverShifts,
    returnsTotal,
    missingItemsTotal,
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const roleErr = requireRole(session, "ADMIN", "SUPERVISOR");
    if (roleErr) return roleErr;

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("routeId");
    const weekStartStr = searchParams.get("weekStart");

    if (!weekStartStr) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const weekStart = new Date(weekStartStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    if (routeId) {
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        select: { id: true, name: true },
      });
      if (!route) {
        return NextResponse.json({ error: "Route not found" }, { status: 404 });
      }
      const result = await computeForRoute(route.id, route.name, weekStartStr, weekStart, weekEnd);
      return NextResponse.json(result);
    }

    // No routeId — return all routes
    const routes = await prisma.route.findMany({
      select: { id: true, name: true },
    });
    const results = await Promise.all(
      routes.map((r) => computeForRoute(r.id, r.name, weekStartStr, weekStart, weekEnd))
    );
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Failed to compute profitability" }, { status: 500 });
  }
}
