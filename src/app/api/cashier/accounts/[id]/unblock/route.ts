import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  return NextResponse.json({ success: true });
}
