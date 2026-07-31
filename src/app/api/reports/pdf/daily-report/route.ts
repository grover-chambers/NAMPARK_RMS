import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyRouteReport, generateDailyOverviewPDF } from "@/lib/reports/pdf";
import { computeReport } from "@/lib/reports/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const routeId = searchParams.get("routeId");

    if (!date) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where: any = {
      date: { gte: targetDate, lt: nextDay },
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
        driverShift: true,
        orders: { include: { lines: { include: { sku: true } } } },
        missingItems: { include: { sku: true } },
      },
      orderBy: { createdAt: "asc" },
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
        salesRep: a.salesRep
          ? { id: a.salesRep.id, name: a.salesRep.name }
          : { id: "", name: "Unassigned" },
        driver: a.driver
          ? { id: a.driver.id, name: a.driver.name }
          : { id: "", name: "Unassigned" },
        vehicle: a.vehicle
          ? { id: a.vehicle.id, registration: a.vehicle.registration }
          : { id: "", registration: "—" },
        shift: {
          shiftOpen: shift?.shiftOpen?.toISOString() ?? null,
          shiftClose: shift?.shiftClose?.toISOString() ?? null,
          shiftOpenTarget: shift?.shiftOpenTarget?.toISOString() ?? null,
          shiftCloseTarget: shift?.shiftCloseTarget?.toISOString() ?? null,
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
          loadingStartTarget: a.driverShift?.loadingStartTarget?.toISOString() ?? null,
          loadingEndTarget: a.driverShift?.loadingEndTarget?.toISOString() ?? null,
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

    let doc;
    if (routeId && reports.length === 1) {
      doc = generateDailyRouteReport(reports[0]);
    } else {
      doc = generateDailyOverviewPDF(date, reports);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-daily-report-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
