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

    const user = session.user as { role: string; driverId?: string };
    if (user.role !== "DRIVER" && user.role !== "ADMIN" && user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await prisma.dailyAssignment.findFirst({
      where: {
        driverId: user.driverId,
        date: today,
      },
      include: {
        route: true,
        driverShift: {
          include: {
            returns: { include: { sku: true } },
          },
        },
      },
    });

    return NextResponse.json(assignment || null);
  } catch {
    return NextResponse.json({ error: "Failed to fetch today's assignment" }, { status: 500 });
  }
}
