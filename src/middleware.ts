import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

type Role = "ADMIN" | "SUPERVISOR" | "SALES_REP" | "DRIVER" | "CASHIER";

const routeAccess: Record<string, Role[]> = {
  "/dashboard": ["ADMIN", "SUPERVISOR", "SALES_REP", "DRIVER", "CASHIER"],
  "/weekly-summary": ["ADMIN", "SUPERVISOR"],
  "/daily-report/view": ["ADMIN", "SUPERVISOR"],
  "/daily-report/rep": ["ADMIN", "SALES_REP"],
  "/daily-report/driver": ["ADMIN", "DRIVER"],
  "/assignments": ["ADMIN", "SUPERVISOR"],
  "/routes": ["ADMIN"],
  "/drivers": ["ADMIN"],
  "/vehicles": ["ADMIN", "SUPERVISOR"],
  "/performance": ["ADMIN", "SUPERVISOR"],
  "/missing-items": ["ADMIN", "SUPERVISOR", "SALES_REP"],
  "/returns": ["ADMIN", "SUPERVISOR", "DRIVER"],
  "/pricing": ["ADMIN"],
  "/inventory": ["ADMIN", "SUPERVISOR"],
  "/challenges": ["ADMIN", "SUPERVISOR"],
  "/settings": ["ADMIN"],
  "/cashier": ["CASHIER"],
  "/profile": ["ADMIN", "SUPERVISOR", "SALES_REP", "DRIVER", "CASHIER"],
};

function getMatchedRoute(pathname: string): string | null {
  const exact = routeAccess[pathname];
  if (exact) return pathname;

  for (const prefix of Object.keys(routeAccess)) {
    if (pathname.startsWith(prefix + "/") || pathname === prefix) {
      return prefix;
    }
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicPrefixes = ["/auth/login", "/api", "/_next", "/favicon"];
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as Role;
  const matchedRoute = getMatchedRoute(pathname);

  if (matchedRoute) {
    const allowed = routeAccess[matchedRoute];
    if (!allowed.includes(userRole)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
