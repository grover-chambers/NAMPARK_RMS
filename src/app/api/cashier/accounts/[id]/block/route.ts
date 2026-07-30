import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    const account = await prisma.cashierAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (account.status === "blocked") return NextResponse.json({ error: "Already blocked" }, { status: 400 });

    const userId = (session?.user as any).id;

    await prisma.$transaction([
      prisma.cashierAccount.update({
        where: { id },
        data: { status: "blocked", lastBlockedAt: new Date() },
      }),
      prisma.accountBlockEvent.create({
        data: {
          accountId: id,
          blockType: "manual",
          blockedByCashierId: userId,
          reason: reason || "Manual block by cashier",
          balanceAtTrigger: account.currentBalance,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
