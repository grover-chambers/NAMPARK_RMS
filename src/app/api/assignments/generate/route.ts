import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateAssignmentsForRange } from "@/lib/scheduling";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manually trigger schedule generation for a date range.
 * POST /api/assignments/generate
 * Body: { startDate?, endDate? } (YYYY-MM-DD, default: today .. +6 days)
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPERVISOR") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let body: { startDate?: string; endDate?: string } = {};
    try {
      body = await request.json();
    } catch {
      // default range
    }

    const start = body.startDate ? new Date(`${body.startDate}T00:00:00`) : new Date();
    const end = body.endDate ? new Date(`${body.endDate}T00:00:00`) : new Date(start);
    if (!body.endDate) end.setDate(end.getDate() + 6);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ success: false, error: "Invalid date range" }, { status: 400 });
    }

    const result = await generateAssignmentsForRange(start, end);

    await createAuditLog((session.user as any).id, "create", "assignment", "schedule", {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      created: result.totalCreated,
      updated: result.totalUpdated,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Manual schedule generation error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate schedule" }, { status: 500 });
  }
}
