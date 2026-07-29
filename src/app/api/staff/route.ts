import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password and role required" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "SUPERVISOR", "SALES_REP", "DRIVER", "CASHIER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { name, email, password: hashed, role: role as any, phone },
      });

      if (role === "SALES_REP") {
        await tx.salesRep.create({ data: { userId: u.id, name } });
      } else if (role === "DRIVER") {
        await tx.driver.create({ data: { userId: u.id, name } });
      }

      return u;
    });

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
