import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveActiveTenant } from "@/lib/modules/route-mapping";
import { verifyMobileJwt } from "@/lib/mobile-jwt";

export const dynamic = "force-dynamic";

/**
 * Today's route assignments for the signed-in rep — GET /api/v1/routes/today
 * Auth: Bearer mobile JWT. Returns [] when the user has no linked SalesRep.
 */

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const token = verifyMobileJwt(authHeader.slice("Bearer ".length).trim());
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    let activeTenant;
    try {
      activeTenant = await resolveActiveTenant();
    } catch (error) {
      console.error("Mobile routes tenant resolution failed:", error);
      return NextResponse.json(
        { success: false, error: "Active tenant could not be resolved" },
        { status: 500 }
      );
    }

    if (token.tenantId !== activeTenant.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!token.salesRepId) {
      return NextResponse.json({ success: true, assignments: [] });
    }

    // Mirrors src/app/api/assignments/today/route.ts "today" computation.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignments = await prisma.dailyAssignment.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        tenantId: activeTenant.id,
        salesRepId: token.salesRepId,
      },
      select: {
        id: true,
        status: true,
        dayType: true,
        route: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      assignments: assignments.map((a) => ({
        id: a.id,
        routeName: a.route.name,
        status: a.status,
        dayType: a.dayType,
      })),
    });
  } catch (error) {
    console.error("Mobile routes today error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch today's routes" },
      { status: 500 }
    );
  }
}
