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
    const routeId = searchParams.get("routeId");

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (routeId) where.routeId = routeId;

    const items = await prisma.missingItem.findMany({
      where,
      include: { sku: true, route: true, assignment: { include: { salesRep: true, driver: true } } },
      orderBy: { date: "desc" },
    });

    const bySkuMap = new Map<string, any>();
    for (const item of items) {
      const key = item.sku.name;
      if (!bySkuMap.has(key)) bySkuMap.set(key, { name: key, count: 0, cartons: 0, customers: 0, routes: new Set<string>() });
      const s = bySkuMap.get(key);
      s.count += 1;
      s.cartons += item.cartonsAffected || 0;
      s.customers += item.customerCountAffected || 0;
      s.routes.add(item.route.name);
    }
    const bySku = Array.from(bySkuMap.values())
      .map((s) => ({ ...s, routes: Array.from(s.routes).join(", ") }))
      .sort((a, b) => b.cartons - a.cartons);

    const dateLabel = startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-KE")} - ${new Date(endDate).toLocaleDateString("en-KE")}`
      : "All Time";

    const pdf = generateReportPDF(
      { title: "Missing Items Report", dateRange: dateLabel },
      [{
        title: "Missing Items by Product",
        columns: [
          { header: "#", key: "rank", width: 15, align: "center" as const },
          { header: "Product", key: "name", width: 60 },
          { header: "Routes Affected", key: "routes", width: 50 },
          { header: "Frequency", key: "count", width: 25, align: "center" as const },
          { header: "Cartons", key: "cartons", width: 25, align: "center" as const },
          { header: "Customers", key: "customers", width: 25, align: "center" as const },
        ],
        rows: bySku.map((s, i) => [i + 1, s.name, s.routes, s.count, s.cartons, s.customers]),
      }],
    );

    const buffer = pdf.output("arraybuffer");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-missing-items.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
