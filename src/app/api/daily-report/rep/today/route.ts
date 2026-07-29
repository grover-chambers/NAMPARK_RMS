import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role: string; salesRepId?: string };
    if (user.role !== "SALES_REP" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await prisma.dailyAssignment.findFirst({
      where: {
        salesRepId: user.salesRepId,
        date: today,
      },
      include: {
        route: true,
        salesRepShift: true,
        orders: {
          include: {
            lines: { include: { sku: true } },
          },
        },
        missingItems: {
          include: { sku: true },
        },
      },
    });

    return NextResponse.json(assignment || null);
  } catch {
    return NextResponse.json({ error: "Failed to fetch today's assignment" }, { status: 500 });
  }
}
