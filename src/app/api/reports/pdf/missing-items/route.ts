import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMissingItemsPDF } from "@/lib/reports/pdf";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      include: { sku: true, route: true },
    });

    const grouped: Record<string, { sku: string; count: number; cartons: number; customers: number; routes: Set<string> }> = {};
    for (const item of items) {
      const key = item.skuId;
      if (!grouped[key]) {
        grouped[key] = { sku: item.sku.name, count: 0, cartons: 0, customers: 0, routes: new Set() };
      }
      grouped[key].count++;
      grouped[key].cartons += item.cartonsAffected;
      grouped[key].customers += item.customerCountAffected;
      grouped[key].routes.add(item.route.name);
    }

    const sorted = Object.values(grouped)
      .map((g) => ({ ...g, routes: Array.from(g.routes) }))
      .sort((a, b) => b.cartons - a.cartons);

    const doc = generateMissingItemsPDF(sorted);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-missing-items.pdf"`,
      },
    });
  } catch (error) {
    console.error("Missing items PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
