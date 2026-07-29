import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        resolved: body.resolved ?? true,
        resolvedAt: body.resolved ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: challenge });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update challenge" }, { status: 500 });
  }
}
