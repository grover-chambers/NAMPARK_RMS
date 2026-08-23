import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveActiveTenant } from "@/lib/modules/route-mapping";
import { signMobileJwt } from "@/lib/mobile-jwt";

export const dynamic = "force-dynamic";

/**
 * Mobile rep login — POST /api/v1/auth/login
 * Body: { email, password }
 * Returns a top-level token (12h HS256 JWT) for the Flutter field app.
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = `v1-login:${parsed.data.email}:${ip}`;
    const rateCheck = checkRateLimit(rateKey, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { salesRep: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    let activeTenant;
    try {
      activeTenant = await resolveActiveTenant();
    } catch (error) {
      console.error("Mobile login tenant resolution failed:", error);
      return NextResponse.json(
        { success: false, error: "Active tenant could not be resolved" },
        { status: 500 }
      );
    }

    const token = signMobileJwt({
      sub: user.id,
      role: user.role,
      salesRepId: user.salesRep?.id ?? null,
      tenantId: activeTenant.id,
    });

    return NextResponse.json({
      success: true,
      token,
      rep: {
        id: user.id,
        name: user.name,
        email: user.email,
        salesRepId: user.salesRep?.id ?? null,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
