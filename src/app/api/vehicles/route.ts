import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registration: "asc" },
    });

    return NextResponse.json(vehicles);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { registration } = body;

    if (!registration) {
      return NextResponse.json({ error: "Registration is required" }, { status: 400 });
    }

    const existing = await prisma.vehicle.findFirst({
      where: { registration: registration.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Vehicle with this registration already exists" }, { status: 409 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registration: registration.toUpperCase(),
      },
    });

    return NextResponse.json({ success: true, vehicle });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
