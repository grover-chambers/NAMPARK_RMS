import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportPDF } from "@/lib/reports/pdf";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const shiftWhere: any = {};
    if (startDate || endDate) {
      shiftWhere.assignment = { date: {} };
      if (startDate) shiftWhere.assignment.date.gte = new Date(startDate);
      if (endDate) shiftWhere.assignment.date.lte = new Date(endDate);
    }

    const returns = await prisma.return.findMany({
      where: { driverShift: shiftWhere },
      include: { sku: true, driverShift: { include: { assignment: { include: { route: true, driver: true } } } } },
      orderBy: { id: "desc" },
    });

    const byTypeMap = new Map<string, { type: string; count: number; amount: number }>();
    for (const r of returns) {
      const key = r.type;
      if (!byTypeMap.has(key)) byTypeMap.set(key, { type: key, count: 0, amount: 0 });
      const item = byTypeMap.get(key)!;
      item.count += r.quantity || 0;
      item.amount += r.amount || 0;
    }
    const byType = Array.from(byTypeMap.values());

    const detailRows = returns.map((r) => [
      r.driverShift?.assignment?.date
        ? new Date(r.driverShift.assignment.date).toLocaleDateString("en-KE")
        : "—",
      r.driverShift?.assignment?.driver?.name || "—",
      r.driverShift?.assignment?.route?.name || "—",
      r.sku?.name || "—",
      r.type.replace(/_/g, " "),
      r.quantity || 0,
      `KES ${(r.amount || 0).toLocaleString()}`,
    ]);

    const dateLabel = startDate && endDate
      ? `${new Date(startDate).toLocaleDateString("en-KE")} - ${new Date(endDate).toLocaleDateString("en-KE")}`
      : "All Time";

    const pdf = generateReportPDF(
      { title: "Returns Analysis", dateRange: dateLabel },
      [
        {
          title: "Returns by Type",
          columns: [
            { header: "Type", key: "type", width: 60 },
            { header: "Count", key: "count", width: 30, align: "center" as const },
            { header: "Amount (KES)", key: "amount", width: 40, align: "right" as const },
          ],
          rows: byType.map((r) => [r.type.replace(/_/g, " "), r.count, `KES ${r.amount.toLocaleString()}`]),
        },
        {
          title: "Detailed Returns",
          columns: [
            { header: "Date", key: "date", width: 30 },
            { header: "Driver", key: "driver", width: 35 },
            { header: "Route", key: "route", width: 30 },
            { header: "SKU", key: "sku", width: 45 },
            { header: "Type", key: "type", width: 30 },
            { header: "Qty", key: "qty", width: 15, align: "center" as const },
            { header: "Amount", key: "amount", width: 25, align: "right" as const },
          ],
          rows: detailRows,
        },
      ],
    );

    const buffer = pdf.output("arraybuffer");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nampark-returns.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
