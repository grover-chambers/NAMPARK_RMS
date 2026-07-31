import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN", "SUPERVISOR");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vehicleId = req.nextUrl.searchParams.get("vehicleId");
    const where = vehicleId ? { vehicleId } : {};

    const events = await prisma.vehicleMaintenanceEvent.findMany({
      where,
      include: { vehicle: { select: { registration: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { vehicleId, date, type, description, cost, mileageAtEvent, vendor, invoiceRef, notes } = body;
    if (!vehicleId || !type || !description || cost == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await prisma.vehicleMaintenanceEvent.create({
      data: {
        vehicleId,
        date: new Date(date || Date.now()),
        type,
        description,
        cost: Number(cost),
        mileageAtEvent: mileageAtEvent ? Number(mileageAtEvent) : null,
        vendor: vendor || null,
        invoiceRef: invoiceRef || null,
        notes: notes || null,
      },
    });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
