import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.cashierAccount.findMany({
    include: {
      rep: { include: { user: { select: { name: true, email: true } } } },
      alerts: { where: { acknowledged: false }, take: 1 },
      openLogs: { orderBy: { logDate: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { repId, creditReferenceAmount, autoBlockThresholdPct } = body;

  if (!repId) return NextResponse.json({ error: "repId required" }, { status: 400 });

  const existing = await prisma.cashierAccount.findUnique({ where: { repId } });
  if (existing) return NextResponse.json({ error: "Account already exists for this rep" }, { status: 409 });

  const account = await prisma.cashierAccount.create({
    data: {
      repId,
      creditReferenceAmount: creditReferenceAmount || 0,
      autoBlockThresholdPct: autoBlockThresholdPct || 25,
    },
  });

  return NextResponse.json({ data: account }, { status: 201 });
}
