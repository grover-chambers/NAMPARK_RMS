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
    const { registration, status, maintenanceRatePerKm } = body;
    const vehicleId = params.id;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (registration !== undefined) updateData.registration = registration.toUpperCase();
    if (status !== undefined) updateData.status = status;
    if (maintenanceRatePerKm !== undefined) updateData.maintenanceRatePerKm = Number(maintenanceRatePerKm);

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
    });

    await createAuditLog((session.user as any).id, "update", "vehicle", vehicleId, {
      changes: Object.keys(updateData),
    });

    return NextResponse.json({ success: true, vehicle: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
