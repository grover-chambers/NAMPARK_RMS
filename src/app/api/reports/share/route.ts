import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { reportType, params } = body;

    if (!reportType) {
      return NextResponse.json({ error: "reportType is required" }, { status: 400 });
    }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const shareToken = await prisma.shareToken.create({
      data: {
        token,
        reportType,
        params: params || {},
        createdBy: (session.user as any).id,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, token: shareToken.token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
