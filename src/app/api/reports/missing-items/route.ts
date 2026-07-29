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

    const missingItems = await prisma.missingItem.findMany({
      where,
      include: {
        sku: true,
        route: true,
        assignment: { include: { salesRep: true, driver: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const bySku: Record<
      string,
      { skuName: string; count: number; cartonsAffected: number; customersAffected: number }
    > = {};

    for (const item of missingItems) {
      const key = item.skuId;
      if (!bySku[key]) {
        bySku[key] = {
          skuName: item.sku.name,
          count: 0,
          cartonsAffected: 0,
          customersAffected: 0,
        };
      }
      bySku[key].count++;
      bySku[key].cartonsAffected += item.cartonsAffected;
      bySku[key].customersAffected += item.customerCountAffected;
    }

    const ranked = Object.values(bySku).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        total: missingItems.length,
        bySku: ranked,
        items: missingItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch missing items report" },
      { status: 500 }
    );
  }
}
