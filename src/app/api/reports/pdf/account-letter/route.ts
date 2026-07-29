import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccountLetter } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "CASHIER", "SALES_REP", "ADMIN", "SUPERVISOR");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { requestId } = body;

  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

  const request = await prisma.accountUnblockRequest.findUnique({
    where: { id: requestId },
    include: { account: { include: { rep: { include: { user: { select: { name: true } } } } } } },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = generateAccountLetter({
    repName: request.account.rep.name,
    amount: request.amount,
    justification: request.justification,
    routeOrRetailerRef: request.routeOrRetailerRef,
    requestedAt: request.requestedAt.toISOString(),
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const base64 = pdfBuffer.toString("base64");

  // Store the PDF URL as base64 data URL
  await prisma.accountUnblockRequest.update({
    where: { id: requestId },
    data: { letterPdfUrl: `data:application/pdf;base64,${base64}` },
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="unblock-request-${request.account.rep.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
