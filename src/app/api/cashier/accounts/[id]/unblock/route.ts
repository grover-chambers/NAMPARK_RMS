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
    if (account.status === "open") return NextResponse.json({ error: "Already open" }, { status: 400 });

    const userId = (session?.user as any).id;

    const activeBlock = await prisma.accountBlockEvent.findFirst({
      where: { accountId: id, unblockedAt: null },
      orderBy: { blockedAt: "desc" },
    });

    await prisma.$transaction([
      prisma.cashierAccount.update({
        where: { id },
        data: { status: "open", lastOpenedAt: new Date() },
      }),
      ...(activeBlock
        ? [
            prisma.accountBlockEvent.update({
              where: { id: activeBlock.id },
              data: { unblockedAt: new Date(), unblockReason: "cashier_override" },
            }),
          ]
        : []),
    ]);

    const rep = await prisma.salesRep.findUnique({
      where: { id: account.repId },
      select: { userId: true, name: true },
    });
    if (rep) {
      await createNotification({
        userId: rep.userId,
        title: "Account Unblocked",
        body: `Your cashier account has been unblocked.`,
        type: "unblock_approved",
        link: "/cashier/accounts",
        push: true,
      });
    }

    await createAuditLog(userId, "update", "account_block", id, { accountId: id, action: "unblock" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
