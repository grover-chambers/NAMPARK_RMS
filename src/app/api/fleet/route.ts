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
    const date = searchParams.get("date");

    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registration: "asc" },
    });

    let fleetDaily: any[] = [];
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      fleetDaily = await prisma.fleetDaily.findMany({
        where: {
          date: { gte: targetDate, lt: nextDate },
        },
        include: { vehicle: true },
        orderBy: { createdAt: "desc" },
      });
    }

    const active = vehicles.filter((v) => v.status === "ACTIVE").length;
    const inGarage = vehicles.filter((v) => v.status === "IN_GARAGE").length;
    const maintenance = vehicles.filter(
      (v) => v.status === "MAINTENANCE"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        vehicles,
        fleetDaily,
        summary: {
          total: vehicles.length,
          active,
          inGarage,
          maintenance,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch fleet data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERVISOR") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      date,
      vehicleId,
      expectedAvailable,
      actualAvailable,
      inGarage,
      garageReason,
      workshopTat,
      theftReport,
      theftReason,
      preDispatchInspection,
      inspectionReason,
    } = body;

    if (!date || !vehicleId) {
      return NextResponse.json(
        { success: false, error: "Date and vehicleId are required" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const existing = await prisma.fleetDaily.findUnique({
      where: { date_vehicleId: { date: targetDate, vehicleId } },
    });

    let record;
    if (existing) {
      record = await prisma.fleetDaily.update({
        where: { id: existing.id },
        data: {
          expectedAvailable: expectedAvailable ?? existing.expectedAvailable,
          actualAvailable: actualAvailable ?? existing.actualAvailable,
          inGarage: inGarage ?? existing.inGarage,
          garageReason: garageReason ?? existing.garageReason,
          workshopTat: workshopTat ?? existing.workshopTat,
          theftReport: theftReport ?? existing.theftReport,
          theftReason: theftReason ?? existing.theftReason,
          preDispatchInspection:
            preDispatchInspection ?? existing.preDispatchInspection,
          inspectionReason: inspectionReason ?? existing.inspectionReason,
        },
        include: { vehicle: true },
      });
    } else {
      record = await prisma.fleetDaily.create({
        data: {
          date: targetDate,
          vehicleId,
          expectedAvailable: expectedAvailable ?? 0,
          actualAvailable: actualAvailable ?? 0,
          inGarage: inGarage ?? 0,
          garageReason,
          workshopTat,
          theftReport: theftReport ?? 0,
          theftReason,
          preDispatchInspection: preDispatchInspection ?? false,
          inspectionReason,
        },
        include: { vehicle: true },
      });
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to save fleet record" },
      { status: 500 }
    );
  }
}
