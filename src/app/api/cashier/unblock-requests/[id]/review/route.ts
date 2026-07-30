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
    const { decision } = body;

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Decision must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const request = await prisma.accountUnblockRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (request.status !== "pending") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

    const userId = (session?.user as any).id;

    await prisma.accountUnblockRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedByCashierId: userId,
        reviewedAt: new Date(),
      },
    });

    // If approved, auto-unblock the account
    if (decision === "approved") {
      const account = await prisma.cashierAccount.findUnique({ where: { id: request.accountId } });
      if (account && account.status === "blocked") {
        const activeBlock = await prisma.accountBlockEvent.findFirst({
          where: { accountId: request.accountId, unblockedAt: null },
          orderBy: { blockedAt: "desc" },
        });

        await prisma.$transaction([
          prisma.cashierAccount.update({
            where: { id: request.accountId },
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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
