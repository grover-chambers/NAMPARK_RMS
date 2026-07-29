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

    const assignmentWhere: any = {};
    if (startDate || endDate) {
      assignmentWhere.date = {};
      if (startDate) assignmentWhere.date.gte = new Date(startDate);
      if (endDate) assignmentWhere.date.lte = new Date(endDate);
    }

    const drivers = await prisma.driver.findMany({
      include: {
        assignments: {
          where: assignmentWhere,
          include: {
            route: true,
            orders: true,
            driverShift: true,
            missingItems: true,
          },
        },
      },
    });

    const summary = drivers.map((driver) => {
      const totalAssignments = driver.assignments.length;
      const completedAssignments = driver.assignments.filter(
        (a) => a.status === "COMPLETED"
      ).length;
      const totalOrders = driver.assignments.reduce(
        (sum, a) => sum + a.orders.length,
        0
      );
      const totalSales = driver.assignments.reduce(
        (sum, a) => sum + a.orders.reduce((s, o) => s + o.totalAmount, 0),
        0
      );
      const missingCount = driver.assignments.reduce(
        (sum, a) => sum + a.missingItems.length,
        0
      );

      return {
        driverId: driver.id,
        driverName: driver.name,
        totalAssignments,
        completedAssignments,
        completionRate:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
        totalOrders,
        totalSales,
        missingCount,
      };
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch driver summary" },
      { status: 500 }
    );
  }
}
