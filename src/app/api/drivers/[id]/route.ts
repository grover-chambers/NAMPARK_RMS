import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;
    const driverId = params.id;

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (name) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { name },
      });
      await prisma.user.update({
        where: { id: driver.userId },
        data: { name },
      });
    }

    await createAuditLog((session.user as any).id, "update", "driver", driverId, {
      changes: Object.keys(body),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = params.id;
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: driver.userId },
      data: { isActive: false },
    });

    await createAuditLog((session.user as any).id, "delete", "driver", driverId, {
      deactivated: true,
    });

    return NextResponse.json({ success: true, message: "Driver deactivated" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
