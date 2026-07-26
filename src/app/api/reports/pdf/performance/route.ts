import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportPDF } from "@/lib/reports/pdf";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const assignments = await prisma.dailyAssignment.findMany({
      where,
      include: {
        route: true, salesRep: true,
        salesRepShift: true,
        missingItems: true,
      },
      orderBy: { date: "desc" },
    });

    const routeMap = new Map<string, any>();
    for (const a of assignments) {
      const key = a.route.name;
      if (!routeMap.has(key)) routeMap.set(key, { name: a.route.name, rep: a.salesRep.name, target: 0, actual: 0, customers: 0, complaints: 0, days: 0 });
      const r = routeMap.get(key);
      r.target += a.salesRepShift?.salesTarget || 0;
      r.actual += a.salesRepShift?.salesActual || 0;
      r.customers += a.salesRepShift?.customerCountActual || 0;
      r.complaints += a.salesRepShift?.complaints || 0;
      r.days += 1;
    }

    const routePerf = Array.from(routeMap.values()).map((r) => ({
      ...r,
      attainment: r.target > 0 ? ((r.actual / r.target) * 100).toFixed(1) + "%" : "0%",
    }));

    const dateLabel = startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-KE")} - ${new Date(endDate).toLocaleDateString("en-KE")}`
      : "All Time";

    const pdf = generateReportPDF(
      { title: "Performance Analytics", dateRange: dateLabel },
      [{
        title: "Route Performance",
        columns: [
          { header: "Route", key: "name", width: 35 },
          { header: "Sales Rep", key: "rep", width: 35 },
          { header: "Target (KES)", key: "target", width: 30, align: "right" as const },
          { header: "Actual (KES)", key: "actual", width: 30, align: "right" as const },
          { header: "Attainment", key: "attainment", width: 25, align: "center" as const },
          { header: "Customers", key: "customers", width: 25, align: "center" as const },
          { header: "Complaints", key: "complaints", width: 25, align: "center" as const },
        ],
        rows: routePerf.map((r) => [
          r.name, r.rep, `KES ${r.target.toLocaleString()}`, `KES ${r.actual.toLocaleString()}`,
          r.attainment, r.customers, r.complaints,
        ]),
      }],
    );

    const buffer = pdf.output("arraybuffer");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-performance.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
