import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWeeklySummaryPDF } from "@/lib/reports/pdf";
import { computeReport } from "@/lib/reports/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");

    if (!week) {
      return NextResponse.json({ error: "week parameter required" }, { status: 400 });
    }

    const weekStart = new Date(week);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const assignments = await prisma.dailyAssignment.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: true,
        orders: { include: { lines: { include: { sku: true } } } },
        missingItems: { include: { sku: true } },
      },
      orderBy: { date: "asc" },
    });

    const reports = assignments.map((a) => {
      const shift = a.salesRepShift;
      const totalOrderSales = a.orders.reduce(
        (sum, o) => sum + o.lines.reduce((ls, l) => ls + l.amount, 0),
        0
      );
      return computeReport({
        id: a.id,
        date: a.date.toISOString(),
        route: { id: a.route.id, name: a.route.name, targetDaily: a.route.targetDaily },
        salesRep: { id: a.salesRep.id, name: a.salesRep.name },
        driver: { id: a.driver.id, name: a.driver.name },
        vehicle: { id: a.vehicle.id, registration: a.vehicle.registration },
        shift: {
          shiftOpen: shift?.shiftOpen?.toISOString() ?? null,
          shiftClose: shift?.shiftClose?.toISOString() ?? null,
          customerCountTarget: shift?.customerCountTarget ?? 0,
          customerCountActual: shift?.customerCountActual ?? 0,
          salesTarget: shift?.salesTarget ?? a.route.targetDaily,
          salesActual: shift?.salesActual ?? totalOrderSales,
          complaints: shift?.complaints ?? 0,
          complaintTarget: shift?.complaintTarget ?? 0,
          reportSubmissionTime: shift?.reportSubmissionTime?.toISOString() ?? null,
          comments: shift?.comments ?? null,
          kpiReasons: (shift?.kpiReasons as Record<string, string>) ?? {},
        },
        driverShift: {
          loadingStart: a.driverShift?.loadingStart?.toISOString() ?? null,
          loadingEnd: a.driverShift?.loadingEnd?.toISOString() ?? null,
          shiftStart: a.driverShift?.shiftStart?.toISOString() ?? null,
          gatePassTime: a.driverShift?.gatePassTime?.toISOString() ?? null,
          shiftEnd: a.driverShift?.shiftEnd?.toISOString() ?? null,
          customerCountActual: a.driverShift?.customerCountActual ?? 0,
          reportSubmissionTime: a.driverShift?.reportSubmissionTime?.toISOString() ?? null,
          comments: a.driverShift?.comments ?? null,
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
          salesActual: shift?.salesActual ?? totalOrderSales,
          salesTarget: shift?.salesTarget ?? a.route.targetDaily,
          attainment: (shift?.salesTarget ?? a.route.targetDaily) > 0
            ? Math.round(((shift?.salesActual ?? totalOrderSales) / (shift?.salesTarget ?? a.route.targetDaily)) * 100)
            : 0,
          missingItemsTotal: a.missingItems.length,
          cartonsAffected: a.missingItems.reduce((s, m) => s + m.cartonsAffected, 0),
          customersAffected: a.missingItems.reduce((s, m) => s + m.customerCountAffected, 0),
        },
      });
    });

    const doc = generateWeeklySummaryPDF(week, reports);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-weekly-${week}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Weekly PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
