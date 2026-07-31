import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotificationForRole } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER", "SALES_REP");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const accountId = searchParams.get("accountId");

    const where: any = {};
    if (status) where.status = status;
    if (accountId) where.accountId = accountId;

    // Sales reps can only see their own requests
    if (role === "SALES_REP") {
      const salesRepId = (session?.user as any).salesRepId;
      const account = await prisma.cashierAccount.findUnique({ where: { repId: salesRepId } });
      if (account) where.accountId = account.id;
      else where.accountId = "__none__";
    }

    const requests = await prisma.accountUnblockRequest.findMany({
      where,
      include: {
        account: { include: { rep: { include: { user: { select: { name: true } } } } } },
        requestedByRep: { select: { name: true } },
        reviewedByCashier: { select: { name: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ data: requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "SALES_REP", "ADMIN", "SUPERVISOR");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { accountId, routeOrRetailerRef, amount, justification } = body;

    if (!accountId || !routeOrRetailerRef || !amount || !justification) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const userId = (session?.user as any).id;

    const request = await prisma.accountUnblockRequest.create({
      data: {
        accountId,
        requestedByRepId: userId,
        routeOrRetailerRef,
        amount: parsedAmount,
        justification,
      },
    });

    await createNotificationForRole("CASHIER", {
      title: "Unblock Request Submitted",
      body: `A sales rep has requested an account unblock for KES ${parsedAmount.toLocaleString()} on ${routeOrRetailerRef}`,
      type: "unblock_request",
      link: "/cashier/requests",
    });

    await createAuditLog(userId, "create", "unblock_request", request.id, { accountId, amount: parsedAmount, routeOrRetailerRef });

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
