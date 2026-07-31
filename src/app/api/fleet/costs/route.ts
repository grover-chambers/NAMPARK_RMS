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

    const costs = await prisma.vehicleFixedCost.findMany({
      where,
      include: { vehicle: { select: { registration: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: costs });
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
    const { vehicleId, name, amount, frequency, dueDate, notes } = body;
    if (!vehicleId || !name || amount == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cost = await prisma.vehicleFixedCost.create({
      data: {
        vehicleId,
        name,
        amount: Number(amount),
        frequency: frequency || "monthly",
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json({ data: cost }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const cost = await prisma.vehicleFixedCost.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amount !== undefined && { amount: Number(data.amount) }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.paid !== undefined && { paid: data.paid, paidDate: data.paid ? new Date() : null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    return NextResponse.json({ data: cost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
