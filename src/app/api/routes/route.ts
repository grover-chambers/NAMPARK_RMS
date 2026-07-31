import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const routes = await prisma.route.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: routes });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch routes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, mileageBefore, mileageAfter, targetDaily } = body;

    if (!name) return NextResponse.json({ error: "Route name required" }, { status: 400 });

    const existing = await prisma.route.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: "Route already exists" }, { status: 409 });

    const route = await prisma.route.create({
      data: {
        name,
        mileageBefore: mileageBefore ?? 0,
        mileageAfter: mileageAfter ?? 0,
        targetDaily: targetDaily ?? 0,
      },
    });

    return NextResponse.json(route);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
