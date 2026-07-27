import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role: string; driverId?: string };
    if (user.role !== "DRIVER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      assignmentId,
      loadingStart,
      loadingEnd,
      shiftStart,
      gatePassTime,
      shiftEnd,
      customerCountActual,
      comments,
      returns,
    } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const assignment = await prisma.dailyAssignment.findUnique({
      where: { id: assignmentId },
      include: { driverShift: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (user.role === "DRIVER" && user.driverId && assignment.driverId !== user.driverId) {
      return NextResponse.json({ error: "You can only submit reports for your own assignments" }, { status: 403 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx: TxClient) => {
      // Upsert DriverShift
      const shiftData = {
        loadingStart: loadingStart ? new Date(loadingStart) : null,
        loadingEnd: loadingEnd ? new Date(loadingEnd) : null,
        shiftStart: shiftStart ? new Date(shiftStart) : null,
        gatePassTime: gatePassTime ? new Date(gatePassTime) : null,
        shiftEnd: shiftEnd ? new Date(shiftEnd) : null,
        customerCountActual: Number(customerCountActual) || 0,
        reportSubmissionTime: now,
        comments: comments || null,
      };

      let driverShiftId: string;

      if (assignment.driverShift) {
        await tx.driverShift.update({
          where: { id: assignment.driverShift.id },
          data: shiftData,
        });
        driverShiftId = assignment.driverShift.id;

        // Delete existing returns for clean re-submission
        await tx.return.deleteMany({
          where: { driverShiftId },
        });
      } else {
        const created = await tx.driverShift.create({
          data: {
            assignmentId,
            ...shiftData,
          },
        });
        driverShiftId = created.id;
      }

      // Create returns
      if (returns && Array.isArray(returns)) {
        for (const ret of returns) {
          if (!ret.skuId) continue;

          await tx.return.create({
            data: {
              driverShiftId,
              skuId: ret.skuId,
              type: ret.type,
              quantity: Number(ret.quantity) || 0,
              price: Number(ret.price) || 0,
              amount: Number(ret.amount) || 0,
              reason: ret.reason || null,
              comments: ret.comments || null,
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
  } catch {
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
