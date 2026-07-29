import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function recomputeBalance(accountId: string) {
  const result = await prisma.creditSale.aggregate({
    where: { accountId, settled: false },
    _sum: { amount: true },
  });
  const balance = result._sum.amount || 0;

  const account = await prisma.cashierAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  await prisma.cashierAccount.update({
    where: { id: accountId },
    data: { currentBalance: balance },
  });

  const threshold = account.autoBlockThresholdPct / 100;
  const referenceAmount = account.creditReferenceAmount;

  // Auto-open check
  if (referenceAmount > 0 && balance / referenceAmount < threshold && account.status === "blocked") {
    const activeBlock = await prisma.accountBlockEvent.findFirst({
      where: { accountId, unblockedAt: null },
      orderBy: { blockedAt: "desc" },
    });

    await prisma.$transaction([
      prisma.cashierAccount.update({
        where: { id: accountId },
        data: { status: "open", lastOpenedAt: new Date() },
      }),
      ...(activeBlock
        ? [
            prisma.accountBlockEvent.update({
              where: { id: activeBlock.id },
              data: { unblockedAt: new Date(), unblockReason: "debt_settled" },
            }),
          ]
        : []),
    ]);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sale = await prisma.creditSale.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sale.settled) return NextResponse.json({ error: "Already settled" }, { status: 400 });

  await prisma.creditSale.update({
    where: { id },
    data: {
      settled: true,
      settledDate: new Date(),
      settledAmount: sale.amount,
    },
  });

  await recomputeBalance(sale.accountId);

  return NextResponse.json({ success: true });
}
