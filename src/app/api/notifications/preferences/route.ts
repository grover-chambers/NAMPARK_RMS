import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    let prefs = await prisma.notificationPreference.findMany({
      where: { userId },
    });

    if (prefs.length === 0) {
      const defaults = [
        "report_reminder",
        "account_blocked",
        "unblock_approved",
        "unblock_request",
        "assignment_change",
        "stockout_alert",
      ];
      await prisma.notificationPreference.createMany({
        data: defaults.map((type) => ({ userId, type, enabled: true })),
      });
      prefs = await prisma.notificationPreference.findMany({
        where: { userId },
      });
    }

    return NextResponse.json({ success: true, data: prefs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const { type, enabled } = body;

    if (!type || enabled === undefined) {
      return NextResponse.json({ error: "type and enabled required" }, { status: 400 });
    }

    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      update: { enabled },
      create: { userId, type, enabled },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
