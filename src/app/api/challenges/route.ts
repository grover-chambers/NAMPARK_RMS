import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");

    const where: any = {};
    if (resolved !== null && resolved !== undefined) {
      where.resolved = resolved === "true";
    }

    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: challenges });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gap, whatAction, who, when } = body;

    if (!gap) {
      return NextResponse.json(
        { success: false, error: "Gap description is required" },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        gap,
        whatAction: whatAction ?? null,
        who: who ?? null,
        when: when ? new Date(when) : null,
      },
    });

    return NextResponse.json(
      { success: true, data: challenge },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
