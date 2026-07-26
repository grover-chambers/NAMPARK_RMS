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
    if (driverId) {
      const assignments = await prisma.dailyAssignment.findMany({
        where: { driverId },
        select: { id: true },
      });
      driverShiftWhere.assignmentId = {
        in: assignments.map((a) => a.id),
      };
    }

    if (startDate || endDate) {
      const assignmentWhere: any = {};
      assignmentWhere.date = {};
      if (startDate) assignmentWhere.date.gte = new Date(startDate);
      if (endDate) assignmentWhere.date.lte = new Date(endDate);
      if (routeId) assignmentWhere.routeId = routeId;

      const filteredAssignments = await prisma.dailyAssignment.findMany({
        where: assignmentWhere,
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
