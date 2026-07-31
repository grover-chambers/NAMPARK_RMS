import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { assignmentSchema } from "@/lib/validations";

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
    const dayType = searchParams.get("dayType");

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;
    if (dayType) where.dayType = dayType;

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

    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, routeId, salesRepId, driverId, vehicleId } = parsed.data;
    const dayType = parsed.data.dayType ?? "DELIVERY";

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
        dayType,
        salesRepId: salesRepId || null,
        driverId: driverId || null,
        vehicleId: vehicleId || null,
      },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
      },
    });

    if (assignment.salesRep) {
      await createNotification({
        userId: assignment.salesRep.userId,
        title: "New Assignment",
        body: `You have been assigned to ${assignment.route.name} on ${new Date(date).toLocaleDateString("en-KE")}`,
        type: "assignment_change",
        link: "/dashboard",
        push: true,
      });
    }
    if (assignment.driver) {
      await createNotification({
        userId: assignment.driver.userId,
        title: "New Assignment",
        body: `You have been assigned to ${assignment.route.name} on ${new Date(date).toLocaleDateString("en-KE")}`,
        type: "assignment_change",
        link: "/dashboard",
        push: true,
      });
    }

    await createAuditLog((session.user as any).id, "create", "assignment", assignment.id, { date: assignment.date.toISOString(), routeId: assignment.routeId });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
