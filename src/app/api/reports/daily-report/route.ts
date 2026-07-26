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
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date query parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const assignments = await prisma.dailyAssignment.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: true,
        orders: {
          include: {
            lines: {
              include: { sku: true },
            },
          },
        },
        missingItems: {
          include: { sku: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const routeReports = assignments.map((assignment) => {
      const shift = assignment.salesRepShift;
      const dShift = assignment.driverShift;
      const totalOrderSales = assignment.orders.reduce(
        (sum, o) => sum + o.lines.reduce((ls, l) => ls + l.amount, 0),
        0
      );
      const salesActual = shift?.salesActual ?? totalOrderSales;
      const salesTarget = assignment.route.targetDaily;
      const customerCountTarget = shift?.customerCountTarget ?? (Math.round(assignment.route.targetDaily / 1000) || 0);
      const customerCountActual = shift?.customerCountActual ?? 0;
      const missingItemsTotal = assignment.missingItems.length;
      const cartonsAffected = assignment.missingItems.reduce(
        (sum, m) => sum + m.cartonsAffected,
        0
      );
      const customersAffected = assignment.missingItems.reduce(
        (sum, m) => sum + m.customerCountAffected,
        0
      );

      return {
        id: assignment.id,
        date: assignment.date.toISOString(),
        route: {
          id: assignment.route.id,
          name: assignment.route.name,
          targetDaily: assignment.route.targetDaily,
        },
        salesRep: { id: assignment.salesRep.id, name: assignment.salesRep.name },
        driver: { id: assignment.driver.id, name: assignment.driver.name },
        vehicle: { id: assignment.vehicle.id, registration: assignment.vehicle.registration },
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
        orders: assignment.orders.map((o) => ({
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
        missingItems: assignment.missingItems.map((m) => ({
          id: m.id,
          sku: m.sku.name,
          customerCountAffected: m.customerCountAffected,
          cartonsAffected: m.cartonsAffected,
          notes: m.notes,
        })),
        summary: {
          totalOrders: assignment.orders.length,
          totalOrderSales,
          salesActual,
          salesTarget,
          attainment: salesTarget > 0 ? Math.round((salesActual / salesTarget) * 100) : 0,
          missingItemsTotal,
          cartonsAffected,
          customersAffected,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        date,
        routeReports,
      },
    });
  } catch (error) {
    console.error("Daily report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily report" },
      { status: 500 }
    );
  }
}
