import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const skus = await prisma.skuCatalog.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
      unitType: true,
      packSize: true,
    },
  });

  return NextResponse.json(skus);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, unitPrice, unitType, packSize } = body;

    if (!name || !unitPrice) {
      return NextResponse.json({ error: "Name and price required" }, { status: 400 });
    }

    const sku = await prisma.skuCatalog.create({
      data: { name, category, unitPrice, unitType: unitType || "piece", packSize },
    });

    return NextResponse.json(sku);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
