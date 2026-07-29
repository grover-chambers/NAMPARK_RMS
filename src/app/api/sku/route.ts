import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        unitWeightKg: true,
        costPrice: true,
        listSellingPrice: true,
      },
    });

    return NextResponse.json(skus);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, unitPrice, unitType, packSize, unitWeightKg, costPrice, listSellingPrice } = body;

    if (!name || !unitPrice) {
      return NextResponse.json({ error: "Name and price required" }, { status: 400 });
    }

    const sku = await prisma.skuCatalog.create({
      data: {
        name,
        category,
        unitPrice,
        unitType: unitType || "piece",
        packSize,
        unitWeightKg: unitWeightKg != null ? Number(unitWeightKg) : null,
        costPrice: costPrice != null ? Number(costPrice) : null,
        listSellingPrice: listSellingPrice != null ? Number(listSellingPrice) : null,
      },
    });

    return NextResponse.json(sku);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "SKU id is required" }, { status: 400 });
    }

    const body = await req.json();
    const { unitWeightKg, costPrice, listSellingPrice, unitPrice } = body;

    const data: Record<string, any> = {};
    if (unitWeightKg !== undefined) data.unitWeightKg = unitWeightKg != null ? Number(unitWeightKg) : null;
    if (costPrice !== undefined) data.costPrice = costPrice != null ? Number(costPrice) : null;
    if (listSellingPrice !== undefined) data.listSellingPrice = listSellingPrice != null ? Number(listSellingPrice) : null;
    if (unitPrice !== undefined) data.unitPrice = Number(unitPrice);

    const sku = await prisma.skuCatalog.update({
      where: { id },
      data,
    });

    return NextResponse.json(sku);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
