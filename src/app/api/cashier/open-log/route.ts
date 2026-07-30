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
    const accountId = searchParams.get("accountId");

    const where: any = {};
    if (accountId) where.accountId = accountId;

    const logs = await prisma.accountOpenLog.findMany({
      where,
      include: { account: { include: { rep: { select: { name: true } } } } },
      orderBy: { logDate: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
