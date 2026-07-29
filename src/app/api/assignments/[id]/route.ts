import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const assignment = await prisma.dailyAssignment.findUnique({
      where: { id },
      include: {
        route: true,
        salesRep: true,
        driver: true,
        vehicle: true,
        salesRepShift: true,
        driverShift: {
          include: { returns: { include: { sku: true } } },
        },
        orders: {
          include: {
            lines: { include: { sku: true } },
          },
        },
        missingItems: {
          include: { sku: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Assignment fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment" },
      { status: 500 }
    );
  }
}
