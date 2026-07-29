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
  const userId = (session?.user as any).id;

  const alert = await prisma.accountAlert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (alert.acknowledged) return NextResponse.json({ error: "Already acknowledged" }, { status: 400 });

  await prisma.accountAlert.update({
    where: { id },
    data: { acknowledged: true, acknowledgedByCashierId: userId, acknowledgedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
