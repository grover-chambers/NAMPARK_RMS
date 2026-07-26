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

    const assignmentWhere: any = {};
    if (startDate || endDate) {
      assignmentWhere.date = {};
      if (startDate) assignmentWhere.date.gte = new Date(startDate);
      if (endDate) assignmentWhere.date.lte = new Date(endDate);
    }
    if (routeId) assignmentWhere.routeId = routeId;

    const orders = await prisma.order.findMany({
      where: {
        assignment: assignmentWhere,
      },
      include: {
        assignment: { include: { route: true } },
        lines: true,
      },
    });

    let totalSales = 0;
    let totalOrders = 0;
    const byRoute: Record<string, { routeName: string; totalSales: number; orderCount: number }> = {};

    for (const order of orders) {
      const orderTotal = order.lines.reduce((sum, l) => sum + l.amount, 0);
      totalSales += orderTotal;
      totalOrders++;

      const rId = order.assignment.routeId;
      const rName = order.assignment.route.name;
      if (!byRoute[rId]) {
        byRoute[rId] = { routeName: rName, totalSales: 0, orderCount: 0 };
      }
      byRoute[rId].totalSales += orderTotal;
      byRoute[rId].orderCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        byRoute: Object.values(byRoute),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch sales summary" },
      { status: 500 }
    );
  }
}
