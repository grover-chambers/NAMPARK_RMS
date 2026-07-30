import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const account = await prisma.cashierAccount.findUnique({
      where: { id },
      include: {
        rep: { include: { user: { select: { name: true, email: true } } } },
        creditSales: {
          include: { route: { select: { name: true } } },
          orderBy: { incurredDate: "desc" },
        },
        blockEvents: {
          include: { blockedByCashier: { select: { name: true } } },
          orderBy: { blockedAt: "desc" },
        },
        unblockRequests: {
          include: {
            requestedByRep: { select: { name: true } },
            reviewedByCashier: { select: { name: true } },
          },
          orderBy: { requestedAt: "desc" },
        },
        openLogs: { orderBy: { logDate: "desc" } },
        alerts: { orderBy: { triggeredAt: "desc" }, take: 20 },
      },
    });

    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Compute route breakdown
    const unsettledByRoute: Record<string, { routeName: string; total: number; settled: number; outstanding: number }> = {};
    for (const cs of account.creditSales) {
      const rName = cs.route.name;
      if (!unsettledByRoute[rName]) unsettledByRoute[rName] = { routeName: rName, total: 0, settled: 0, outstanding: 0 };
      unsettledByRoute[rName].total += cs.amount;
      if (cs.settled) unsettledByRoute[rName].settled += cs.amount;
      else unsettledByRoute[rName].outstanding += cs.amount;
    }

    const routeBreakdown = Object.values(unsettledByRoute).map((r) => ({
      ...r,
      pctOfBalance: account.currentBalance > 0 ? Math.round((r.outstanding / account.currentBalance) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ data: { ...account, routeBreakdown } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
