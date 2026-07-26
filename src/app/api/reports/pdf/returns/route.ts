import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReturnsPDF } from "@/lib/reports/pdf";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const returns = await prisma.return.findMany({
      where,
      include: {
        sku: true,
        driverShift: {
          include: {
            assignment: {
              include: { route: true, driver: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const byType: Record<string, { type: string; count: number; amount: number }> = {};
    const detailed: { date: string; driver: string; route: string; sku: string; type: string; qty: number; amount: number }[] = [];

    for (const r of returns) {
      const typeName = r.type.replace(/_/g, " ");
      if (!byType[r.type]) {
        byType[r.type] = { type: typeName, count: 0, amount: 0 };
      }
      byType[r.type].count += r.quantity;
      byType[r.type].amount += r.amount;

      detailed.push({
        date: r.driverShift?.assignment?.date?.toISOString() ?? r.createdAt.toISOString(),
        driver: r.driverShift?.assignment?.driver?.name ?? "—",
        route: r.driverShift?.assignment?.route?.name ?? "—",
        sku: r.sku.name,
        type: typeName,
        qty: r.quantity,
        amount: r.amount,
      });
    }

    const types = Object.values(byType).sort((a, b) => b.amount - a.amount);

    const doc = generateReturnsPDF(types, detailed);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-returns.pdf"`,
      },
    });
  } catch (error) {
    console.error("Returns PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
