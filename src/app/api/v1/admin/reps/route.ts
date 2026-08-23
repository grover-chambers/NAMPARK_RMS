import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveActiveTenant } from "@/lib/modules/route-mapping";

export const dynamic = "force-dynamic";

/**
 * Rep provisioning for device management — /api/v1/admin/reps
 * Auth: Bearer REP_ADMIN_SECRET (fails closed when unset). Never echoes
 * passwords or hashes; the one-time tempPassword is returned only on create.
 */

const adminRepsSchema = z.object({
  action: z.enum(["create", "deactivate"]),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.REP_ADMIN_SECRET;
  if (!expected) {
    console.error("REP_ADMIN_SECRET env var not configured");
    return false;
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  // Fixed-length digests so timingSafeEqual never throws on bad lengths.
  const providedDigest = createHash("sha256")
    .update(authHeader.slice("Bearer ".length).trim())
    .digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      where: { role: "SALES_REP" },
      include: { salesRep: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        salesRepId: u.salesRep?.id ?? null,
      })),
    });
  } catch (error) {
    console.error("Admin reps list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list reps" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = adminRepsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { action, email, name, phone } = parsed.data;

    if (action === "deactivate") {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        data: { id: user.id, email: user.email, isActive: false },
      });
    }

    let activeTenant;
    try {
      activeTenant = await resolveActiveTenant();
    } catch (error) {
      console.error("Admin reps tenant resolution failed:", error);
      return NextResponse.json(
        { success: false, error: "Active tenant could not be resolved" },
        { status: 500 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    const tempPassword = randomBytes(9).toString("base64url");
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: name ?? email.split("@")[0],
        password: hashed,
        role: "SALES_REP",
        isActive: true,
        ...(phone ? { phone } : {}),
      },
      update: {
        password: hashed,
        isActive: true,
        ...(phone ? { phone } : {}),
      },
    });

    if (!existing) {
      await prisma.salesRep.create({
        data: {
          userId: user.id,
          name: name ?? user.name,
          tenantId: activeTenant.id,
        },
      });
    } else {
      await prisma.salesRep.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          name: name ?? user.name,
          tenantId: activeTenant.id,
        },
        update: {},
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        salesRepId: (
          await prisma.salesRep.findUnique({ where: { userId: user.id } })
        )?.id,
        created: !existing,
      },
      ...(action === "create" ? { tempPassword } : {}),
    });
  } catch (error) {
    console.error("Admin reps mutation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process rep action" },
      { status: 500 }
    );
  }
}
