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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const routeId = searchParams.get("routeId");
    const salesRepId = searchParams.get("salesRepId");

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (routeId) where.routeId = routeId;
    if (salesRepId) where.salesRepId = salesRepId;

    const surveys = await prisma.pricingSurvey.findMany({
      where,
      include: {
        route: true,
        salesRep: true,
        sku: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: surveys });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch pricing surveys" },
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
    const {
      date,
      routeId,
      salesRepId,
      skuId,
      competitorName,
      competitorPrice,
      khelPrice,
    } = body;

    if (!date || !routeId || !salesRepId || !skuId || competitorPrice == null || khelPrice == null) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const survey = await prisma.pricingSurvey.create({
      data: {
        date: new Date(date),
        routeId,
        salesRepId,
        skuId,
        competitorName: competitorName ?? null,
        competitorPrice,
        khelPrice,
        difference: khelPrice - competitorPrice,
      },
      include: {
        route: true,
        salesRep: true,
        sku: true,
      },
    });

    return NextResponse.json({ success: true, data: survey }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create pricing survey" },
      { status: 500 }
    );
  }
}
