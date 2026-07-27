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
    const driverId = searchParams.get("driverId");

    const driverShiftWhere: any = {};
    const assignmentFilters: any = {};
    if (driverId) assignmentFilters.driverId = driverId;
    if (startDate || endDate) {
      assignmentFilters.date = {};
      if (startDate) assignmentFilters.date.gte = new Date(startDate);
      if (endDate) assignmentFilters.date.lte = new Date(endDate);
    }
    if (routeId) assignmentFilters.routeId = routeId;

    if (Object.keys(assignmentFilters).length > 0) {
      const filteredAssignments = await prisma.dailyAssignment.findMany({
        where: assignmentFilters,
        select: { id: true },
      });
      driverShiftWhere.assignmentId = {
        in: filteredAssignments.map((a) => a.id),
      };
    }

    const returns = await prisma.return.findMany({
      where: Object.keys(driverShiftWhere).length > 0 ? { driverShift: driverShiftWhere } : {},
      include: {
        sku: true,
        driverShift: {
          include: {
            assignment: {
              include: {
                route: true,
                driver: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const byRoute: Record<
      string,
      { routeName: string; totalReturns: number; totalAmount: number }
    > = {};

    let totalQuantity = 0;
    for (const ret of returns) {
      const rId = ret.driverShift.assignment.routeId;
      const rName = ret.driverShift.assignment.route.name;
      if (!byRoute[rId]) {
        byRoute[rId] = { routeName: rName, totalReturns: 0, totalAmount: 0 };
      }
      byRoute[rId].totalReturns += ret.quantity;
      byRoute[rId].totalAmount += ret.amount;
      totalQuantity += ret.quantity;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReturns: totalQuantity,
        totalRecords: returns.length,
        totalAmount: returns.reduce((sum, r) => sum + r.amount, 0),
        byRoute: Object.values(byRoute),
        items: returns,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch returns report" },
      { status: 500 }
    );
  }
}
