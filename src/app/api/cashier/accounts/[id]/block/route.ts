import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

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

    const rep = await prisma.salesRep.findUnique({
      where: { id: account.repId },
      select: { userId: true, name: true },
    });
    if (rep) {
      await createNotification({
        userId: rep.userId,
        title: "Account Blocked",
        body: `Your cashier account has been blocked. Reason: ${reason || "Manual block"}`,
        type: "account_blocked",
        link: "/cashier/accounts",
        push: true,
      });
    }

    await createAuditLog(userId, "create", "account_block", id, { accountId: id, reason: reason || "Manual block by cashier" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
