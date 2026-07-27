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
    const store = searchParams.get("store");
    const skuId = searchParams.get("skuId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (store) where.store = store;
    if (skuId) where.skuId = skuId;
    if (startDate || endDate) {
      where.countDate = {};
      if (startDate) where.countDate.gte = new Date(startDate);
      if (endDate) where.countDate.lte = new Date(endDate);
    }

    const counts = await prisma.inventoryCount.findMany({
      where,
      include: { sku: true },
      orderBy: { countDate: "desc" },
    });

    const stores = await prisma.inventoryCount.findMany({
      select: { store: true },
      distinct: ["store"],
      orderBy: { store: "asc" },
    });

    const totalStockValue = counts.reduce((sum, c) => sum + c.stockValue, 0);
    const totalVariance = counts.reduce((sum, c) => sum + c.variance, 0);
    const shrinkageItems = counts.filter((c) => c.variance < 0).length;
    const expiringItems = counts.filter((c) => {
      if (!c.expiryDate) return false;
      const daysUntil = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30 && daysUntil >= 0;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        counts,
        stores: stores.map((s) => s.store),
        summary: {
          totalStockValue,
          totalVariance,
          shrinkageItems,
          expiringItems,
          totalRecords: counts.length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory counts" },
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

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPERVISOR") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      store,
      countDate,
      skuId,
      category,
      physicalQty,
      systemQty,
      unitPrice,
      lastStocked,
      expiryDate,
      notes,
    } = body;

    if (!store || !countDate || !skuId) {
      return NextResponse.json(
        { success: false, error: "store, countDate, and skuId are required" },
        { status: 400 }
      );
    }

    const variance = (physicalQty || 0) - (systemQty || 0);
    const stockValue = (physicalQty || 0) * (unitPrice || 0);

    const count = await prisma.inventoryCount.create({
      data: {
        store,
        countDate: new Date(countDate),
        skuId,
        category: category || null,
        physicalQty: physicalQty || 0,
        systemQty: systemQty || 0,
        variance,
        unitPrice: unitPrice || 0,
        stockValue,
        lastStocked: lastStocked ? new Date(lastStocked) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
      },
      include: { sku: true },
    });

    return NextResponse.json({ success: true, data: count }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create inventory count" },
      { status: 500 }
    );
  }
}
