import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyReportPDF } from "@/lib/reports/pdf";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date param required" }, { status: 400 });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const assignments = await prisma.dailyAssignment.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: { include: { returns: { include: { sku: true } } } },
        orders: { include: { lines: { include: { sku: true } } } },
        missingItems: { include: { sku: true } },
      },
      orderBy: { route: { name: "asc" } },
    });

    const routeReports = assignments.map((a) => {
      const totalOrderSales = a.orders.reduce((s, o) => s + o.lines.reduce((ls, l) => ls + (l.amount || 0), 0), 0);
      return {
        route: a.route,
        salesRep: a.salesRep,
        driver: a.driver,
        vehicle: a.vehicle,
        shift: a.salesRepShift,
        driverShift: a.driverShift,
        orders: a.orders,
        missingItems: a.missingItems,
        summary: {
          totalOrders: a.orders.length,
          totalOrderSales,
          salesActual: a.salesRepShift?.salesActual || 0,
          salesTarget: a.salesRepShift?.salesTarget || 0,
          attainment: a.salesRepShift?.salesTarget
            ? ((a.salesRepShift?.salesActual || 0) / a.salesRepShift.salesTarget) * 100
            : 0,
          missingItemsTotal: a.missingItems.length,
          cartonsAffected: a.missingItems.reduce((s, m) => s + (m.cartonsAffected || 0), 0),
          customersAffected: a.missingItems.reduce((s, m) => s + (m.customerCountAffected || 0), 0),
          complaints: a.salesRepShift?.complaints || 0,
        },
      };
    });

    const pdf = generateDailyReportPDF(date, routeReports);
    const buffer = pdf.output("arraybuffer");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-daily-report-${date}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
