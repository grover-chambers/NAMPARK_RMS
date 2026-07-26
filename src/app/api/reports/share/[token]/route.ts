import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
    }

    if (new Date() > shareToken.expiresAt) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      data: {
        reportType: shareToken.reportType,
        params: shareToken.params,
        expiresAt: shareToken.expiresAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
