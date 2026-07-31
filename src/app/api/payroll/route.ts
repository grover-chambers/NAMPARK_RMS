import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const month = req.nextUrl.searchParams.get("month");
    const where = month ? { month } : {};

    const costs = await prisma.payrollCost.findMany({
      where,
      orderBy: [{ month: "desc" }, { role: "asc" }],
    });
    return NextResponse.json({ data: costs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { role: staffRole, staffName, month, basicPay, allowance, deductions, notes } = body;
    if (!staffRole || !month || basicPay == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const netPay = Number(basicPay) + Number(allowance || 0) - Number(deductions || 0);

    const cost = await prisma.payrollCost.create({
      data: {
        role: staffRole,
        staffName: staffName || null,
        month,
        basicPay: Number(basicPay),
        allowance: Number(allowance || 0),
        deductions: Number(deductions || 0),
        netPay,
        notes: notes || null,
      },
    });
    return NextResponse.json({ data: cost }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
