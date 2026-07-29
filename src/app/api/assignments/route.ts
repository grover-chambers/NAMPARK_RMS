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
    const status = searchParams.get("status");

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;

    const assignments = await prisma.dailyAssignment.findMany({
      where,
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        orders: true,
        missingItems: true,
        salesRepShift: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch assignments" },
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
    const { date, routeId, salesRepId, driverId, vehicleId } = body;

    if (!date || !routeId || !salesRepId || !driverId || !vehicleId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.dailyAssignment.findUnique({
      where: { date_routeId: { date: new Date(date), routeId } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Assignment already exists for this route on this date" },
        { status: 409 }
      );
    }

    const assignment = await prisma.dailyAssignment.create({
      data: {
        date: new Date(date),
        routeId,
        salesRepId,
        driverId,
        vehicleId,
      },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
      },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
