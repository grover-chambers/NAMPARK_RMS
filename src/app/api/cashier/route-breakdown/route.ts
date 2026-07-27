import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  let query = `SELECT * FROM "v_account_route_breakdown"`;
  const params: any[] = [];
  if (accountId) {
    query += ` WHERE "accountId" = $1`;
    params.push(accountId);
  }
  query += ` ORDER BY "totalOutstanding" DESC`;

  const result = await prisma.$queryRawUnsafe(query, ...params);
  return NextResponse.json({ data: result });
}
