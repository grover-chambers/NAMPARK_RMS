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
      orderBy: { date: "asc" },
    });

    const weekMap = new Map<string, { start: string; end: string; count: number }>();

    for (const a of assignments) {
      const d = new Date(a.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const key = weekStart.toISOString().split("T")[0];
      if (weekMap.has(key)) {
        weekMap.get(key)!.count++;
      } else {
        weekMap.set(key, {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          count: 1,
        });
      }
    }

    const weeks = Array.from(weekMap.entries())
      .map(([key, val]) => ({
        weekStart: key,
        start: val.start,
        end: val.end,
        reportCount: val.count,
        label: `${new Date(val.start).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} - ${new Date(val.end).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`,
      }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    return NextResponse.json({ success: true, data: weeks });
  } catch (error) {
    console.error("Available weeks error:", error);
    return NextResponse.json({ error: "Failed to fetch weeks" }, { status: 500 });
  }
}
