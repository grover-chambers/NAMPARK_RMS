import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { role: string; salesRepId?: string };
  if (user.role !== "SALES_REP" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    assignmentId,
    shiftOpen,
    shiftClose,
    customerCountActual,
    salesActual,
    complaints,
    comments,
    orders,
    missingItems,
  } = body;

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const assignment = await prisma.dailyAssignment.findUnique({
    where: { id: assignmentId },
    include: { route: true, salesRepShift: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const now = new Date();

  await prisma.$transaction(async (tx: TxClient) => {
    // Upsert SalesRepShift
    const shiftData = {
      shiftOpen: shiftOpen ? new Date(shiftOpen) : null,
      shiftClose: shiftClose ? new Date(shiftClose) : null,
      customerCountTarget: assignment.route.targetDaily ? Math.round(assignment.route.targetDaily) : 0,
      customerCountActual: Number(customerCountActual) || 0,
      salesTarget: assignment.route.targetDaily || 0,
      salesActual: Number(salesActual) || 0,
      complaints: Number(complaints) || 0,
      reportSubmissionTime: now,
      comments: comments || null,
    };

    if (assignment.salesRepShift) {
      await tx.salesRepShift.update({
        where: { id: assignment.salesRepShift.id },
        data: shiftData,
      });

      // Delete existing orders and missing items for clean re-submission
      await tx.orderLine.deleteMany({
        where: { order: { assignmentId } },
      });
      await tx.order.deleteMany({
        where: { assignmentId },
      });
      await tx.missingItem.deleteMany({
        where: { assignmentId },
      });
    } else {
      await tx.salesRepShift.create({
        data: {
          assignmentId,
          ...shiftData,
        },
      });
    }

    // Create orders with lines
    let totalSales = 0;
    if (orders && Array.isArray(orders)) {
      for (const order of orders) {
        if (!order.customerName) continue;

        let orderTotal = 0;
        const lines = (order.lines || []).filter(
          (l: { skuId: string; quantity: number; unitPrice?: number; amount?: number }) => l.skuId && l.quantity > 0
        );

        for (const line of lines) {
          orderTotal += Number(line.amount) || 0;
        }

        const createdOrder = await tx.order.create({
          data: {
            assignmentId,
            customerName: order.customerName,
            totalAmount: orderTotal,
          },
        });

        for (const line of lines) {
          await tx.orderLine.create({
            data: {
              orderId: createdOrder.id,
              skuId: line.skuId,
              quantity: Number(line.quantity) || 0,
              unitPrice: Number(line.unitPrice) || 0,
              amount: Number(line.amount) || 0,
            },
          });
        }

        totalSales += orderTotal;
      }
    }

    // Update sales actual with calculated total
    if (totalSales > 0) {
      await tx.salesRepShift.update({
        where: { assignmentId },
        data: { salesActual: totalSales },
      });
    }

    // Create missing items
    if (missingItems && Array.isArray(missingItems)) {
      for (const item of missingItems) {
        if (!item.skuId) continue;

        const week = assignment.date
          ? `W${Math.ceil(((new Date(assignment.date).getTime() - new Date(new Date(assignment.date).getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`
          : null;

        await tx.missingItem.create({
          data: {
            assignmentId,
            skuId: item.skuId,
            routeId: assignment.routeId,
            date: assignment.date,
            week,
            customerCountAffected: Number(item.customerCountAffected) || 0,
            cartonsAffected: Number(item.cartonsAffected) || 0,
            notes: item.notes || null,
          },
        });
      }
    }

    // Update assignment status
    await tx.dailyAssignment.update({
      where: { id: assignmentId },
      data: { status: "COMPLETED" },
    });
  });

  return NextResponse.json({ success: true, message: "Report saved successfully" });
}
