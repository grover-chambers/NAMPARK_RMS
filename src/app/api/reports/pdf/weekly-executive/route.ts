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
    const weekStr = searchParams.get("week");
    if (!weekStr) return NextResponse.json({ error: "week param required" }, { status: 400 });

    const weekStart = new Date(weekStr);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const assignments = await prisma.dailyAssignment.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: {
        route: true, salesRep: true, driver: true, vehicle: true,
        salesRepShift: true,
        driverShift: { include: { returns: { include: { sku: true } } } },
        missingItems: { include: { sku: true } },
      },
    });

    // Route performance
    const routeMap = new Map<string, any>();
    for (const a of assignments) {
      const rName = a.route.name;
      if (!routeMap.has(rName)) {
        routeMap.set(rName, { name: rName, target: 0, actual: 0, customers: 0, complaints: 0, days: 0 });
      }
      const r = routeMap.get(rName);
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

    // Missing items
    const missingMap = new Map<string, { name: string; count: number; cartons: number }>();
    for (const a of assignments) {
      for (const m of a.missingItems) {
        const key = m.sku.name;
        if (!missingMap.has(key)) missingMap.set(key, { name: key, count: 0, cartons: 0 });
        const item = missingMap.get(key)!;
        item.count += 1;
        item.cartons += m.cartonsAffected || 0;
      }
    }
    const missingRanked = Array.from(missingMap.values()).sort((a, b) => b.cartons - a.cartons);

    // Returns
    const returnsMap = new Map<string, { type: string; count: number; amount: number }>();
    for (const a of assignments) {
      for (const r of a.driverShift?.returns || []) {
        const key = r.type;
        if (!returnsMap.has(key)) returnsMap.set(key, { type: key, count: 0, amount: 0 });
        const item = returnsMap.get(key)!;
        item.count += r.quantity || 0;
        item.amount += r.amount || 0;
      }
    }
    const returnsByType = Array.from(returnsMap.values());

    const totalSales = assignments.reduce((s, a) => s + (a.salesRepShift?.salesActual || 0), 0);
    const totalTarget = assignments.reduce((s, a) => s + (a.salesRepShift?.salesTarget || 0), 0);

    const sections = [
      {
        title: "Route Performance",
        columns: [
          { header: "Route", key: "name", width: 40 },
          { header: "Target", key: "target", width: 30, align: "right" as const },
          { header: "Actual", key: "actual", width: 30, align: "right" as const },
          { header: "Attainment", key: "attainment", width: 25, align: "center" as const },
          { header: "Customers", key: "customers", width: 25, align: "center" as const },
          { header: "Complaints", key: "complaints", width: 25, align: "center" as const },
          { header: "Days Active", key: "days", width: 25, align: "center" as const },
        ],
        rows: routePerf.map((r) => [
          r.name, `KES ${r.target.toLocaleString()}`, `KES ${r.actual.toLocaleString()}`,
          r.attainment, r.customers, r.complaints, r.days,
        ]),
      },
      {
        title: "Missing Items (Ranked)",
        columns: [
          { header: "#", key: "rank", width: 15, align: "center" as const },
          { header: "Product", key: "name", width: 80 },
          { header: "Frequency", key: "count", width: 30, align: "center" as const },
          { header: "Cartons", key: "cartons", width: 30, align: "center" as const },
        ],
        rows: missingRanked.map((m, i) => [i + 1, m.name, m.count, m.cartons]),
      },
      {
        title: "Returns by Type",
        columns: [
          { header: "Type", key: "type", width: 60 },
          { header: "Count", key: "count", width: 30, align: "center" as const },
          { header: "Amount (KES)", key: "amount", width: 40, align: "right" as const },
        ],
        rows: returnsByType.map((r) => [r.type.replace(/_/g, " "), r.count, `KES ${r.amount.toLocaleString()}`]),
      },
    ];

    const weekLabel = `${weekStart.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;

    const pdf = generateReportPDF(
      { title: "Weekly Executive Summary", dateRange: weekLabel, subtitle: `Total Sales: KES ${totalSales.toLocaleString()} | Target: KES ${totalTarget.toLocaleString()}` },
      sections,
    );
    const buffer = pdf.output("arraybuffer");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-weekly-${weekStr}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
