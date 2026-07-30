import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || user.role !== "DRIVER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, status, reason } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
    }

    const validStatuses = ["DELIVERED", "PARTIAL", "FAILED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        assignment: true,
        deliveryStop: true,
      },
    });

    if (!order || !driver) {
      return NextResponse.json({ error: "Order or driver not found" }, { status: 404 });
    }

    if (order.assignment.driverId !== driver.id) {
      return NextResponse.json({ error: "This order is not assigned to you" }, { status: 403 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let driverShift = await prisma.driverShift.findUnique({
      where: { assignmentId: order.assignmentId },
    });

    if (!driverShift) {
      driverShift = await prisma.driverShift.create({
        data: {
          assignmentId: order.assignmentId,
          shiftStart: new Date(),
        },
      });
    }

    if (order.deliveryStop) {
      const stop = await prisma.deliveryStop.update({
        where: { id: order.deliveryStop.id },
        data: { status, reason: reason || null, timestamp: new Date() },
        include: {
          order: {
            include: {
              lines: { include: { sku: true } },
            },
          },
        },
      });
      return NextResponse.json({ success: true, deliveryStop: stop });
    }

    const deliveryStop = await prisma.deliveryStop.create({
      data: {
        orderId,
        driverShiftId: driverShift.id,
        status,
        reason: reason || null,
      },
      include: {
        order: {
          include: {
            lines: { include: { sku: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, deliveryStop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
