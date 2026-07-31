import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: any
) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN", "SUPERVISOR");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rep = await prisma.salesRep.findUnique({
      where: { id: params.id },
      include: { user: { select: { email: true, isActive: true, phone: true } } },
    });
    if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: rep });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: any
) {
  const session = await getServerSession(authOptions);
  const role = requireRole(session, "ADMIN");
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name } = body;
    const repId = params.id;

    const rep = await prisma.salesRep.findUnique({ where: { id: repId } });
    if (!rep) {
      return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
    }

    if (name) {
      await prisma.salesRep.update({
        where: { id: repId },
        data: { name },
      });
      await prisma.user.update({
        where: { id: rep.userId },
        data: { name },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
