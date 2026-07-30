import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const acknowledged = searchParams.get("acknowledged");

    const where: any = {};
    if (acknowledged !== null && acknowledged !== undefined) where.acknowledged = acknowledged === "true";

    const alerts = await prisma.accountAlert.findMany({
      where,
      include: {
        account: { include: { rep: { include: { user: { select: { name: true } } } } } },
        acknowledgedByCashier: { select: { name: true } },
      },
      orderBy: { triggeredAt: "desc" },
    });

    return NextResponse.json({ data: alerts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
