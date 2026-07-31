import { NextRequest, NextResponse } from "next/server";
import { ensureTodayAndRollingWindow } from "@/lib/scheduling";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily schedule generation cron — ensures assignments exist for a rolling
 * 14-day window based on each route's order-taking/delivery days.
 * Call: GET /api/cron/generate-schedule
 * Optional: ?days=21 to control the rolling window size.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET env var not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const daysParam = Number(req.nextUrl.searchParams.get("days") ?? 13);
    const daysAhead = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 0), 60) : 13;
    const result = await ensureTodayAndRollingWindow(daysAhead);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Schedule generation error:", error);
    return NextResponse.json({ error: "Schedule generation failed" }, { status: 500 });
  }
}
