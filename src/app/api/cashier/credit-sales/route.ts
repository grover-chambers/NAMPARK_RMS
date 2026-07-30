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

  // Check auto-block threshold
  const threshold = account.autoBlockThresholdPct / 100;
  const referenceAmount = account.creditReferenceAmount;

  if (referenceAmount > 0 && balance / referenceAmount >= threshold && account.status === "open") {
    await prisma.$transaction([
      prisma.cashierAccount.update({
        where: { id: accountId },
        data: { status: "blocked", lastBlockedAt: new Date() },
      }),
      prisma.accountBlockEvent.create({
        data: {
          accountId,
          blockType: "auto",
          reason: `Auto-blocked: balance KES ${balance.toLocaleString()} reached ${Math.round((balance / referenceAmount) * 100)}% of reference KES ${referenceAmount.toLocaleString()}`,
          balanceAtTrigger: balance,
          pctAtTrigger: Math.round((balance / referenceAmount) * 1000) / 10,
        },
      }),
      prisma.accountAlert.create({
        data: {
          accountId,
          alertType: "auto_block",
          balanceAtTrigger: balance,
          pctAtTrigger: Math.round((balance / referenceAmount) * 1000) / 10,
        },
      }),
    ]);
  }

  // Check auto-open
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const settled = searchParams.get("settled");

    const where: any = {};
    if (accountId) where.accountId = accountId;
    if (settled !== null && settled !== undefined) where.settled = settled === "true";

    const sales = await prisma.creditSale.findMany({
      where,
      include: { route: { select: { name: true } }, account: { include: { rep: { select: { name: true } } } } },
      orderBy: { incurredDate: "desc" },
    });

    return NextResponse.json({ data: sales });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { accountId, retailerName, routeId, amount, incurredDate } = body;

    if (!accountId || !retailerName || !routeId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const account = await prisma.cashierAccount.findUnique({ where: { id: accountId } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const sale = await prisma.creditSale.create({
      data: {
        accountId,
        retailerName,
        routeId,
        amount: parsedAmount,
        incurredDate: incurredDate ? new Date(incurredDate) : new Date(),
      },
    });

    await recomputeBalance(accountId);

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
