import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.dailyAssignment.findMany({
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
    });

    const dates = assignments.map((a) => ({
      date: a.date.toISOString().split("T")[0],
      label: new Date(a.date).toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }));

    return NextResponse.json({ success: true, data: dates });
  } catch (error) {
    console.error("Available dates error:", error);
    return NextResponse.json({ error: "Failed to fetch dates" }, { status: 500 });
  }
}
