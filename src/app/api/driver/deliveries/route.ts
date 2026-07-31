import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const assignment = await prisma.dailyAssignment.findFirst({
      where: {
        driverId: driver.id,
        date: today,
      },
      include: {
        route: true,
        vehicle: true,
        driverShift: {
          include: {
            deliveryStops: {
              include: {
                order: {
                  include: {
                    lines: {
                      include: { sku: true },
                    },
                  },
                },
              },
            },
          },
        },
        orders: {
          include: {
            lines: {
              include: { sku: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({
        assignment: null,
        message: "No assignment for today",
      });
    }

    const deliveredOrderIds = new Set(
      assignment.driverShift?.deliveryStops?.map((s) => s.orderId) || []
    );

    const orders = assignment.orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      lines: order.lines.map((l) => ({
        sku: l.sku.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
        packSize: l.sku.packSize,
      })),
      delivered: deliveredOrderIds.has(order.id),
      deliveryStatus: assignment.driverShift?.deliveryStops?.find(
        (s) => s.orderId === order.id
      )?.status || null,
      deliveryTime: assignment.driverShift?.deliveryStops?.find(
        (s) => s.orderId === order.id
      )?.timestamp || null,
    }));

    const deliveryStops = assignment.driverShift?.deliveryStops?.map((stop) => ({
      id: stop.id,
      orderId: stop.orderId,
      customerName: stop.order.customerName,
      status: stop.status,
      reason: stop.reason,
      timestamp: stop.timestamp,
      totalAmount: stop.order.totalAmount,
      items: stop.order.lines.map((l) => ({
        sku: l.sku.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        packSize: l.sku.packSize,
      })),
    })) || [];

    const totalDelivered = orders.filter((o) => o.delivered).length;
    const totalOrders = orders.length;
    const progress = totalOrders > 0 ? Math.round((totalDelivered / totalOrders) * 100) : 0;

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        date: assignment.date,
        route: assignment.route.name,
        vehicle: assignment.vehicle?.registration ?? null,
        status: assignment.status,
      },
      orders,
      deliveryStops,
      progress,
      totalDelivered,
      totalOrders,
      driverShiftId: assignment.driverShift?.id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
