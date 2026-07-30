"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const roleRoutePrefixes: Record<string, string[]> = {
  ADMIN: ["/dashboard", "/weekly-summary", "/daily-report/view", "/daily-report/rep", "/daily-report/driver", "/assignments", "/routes", "/drivers", "/vehicles", "/performance", "/missing-items", "/returns", "/pricing", "/inventory", "/challenges", "/settings", "/profile", "/notifications", "/driver/deliveries"],
  SUPERVISOR: ["/dashboard", "/weekly-summary", "/daily-report/view", "/assignments", "/performance", "/missing-items", "/returns", "/vehicles", "/profile", "/notifications"],
  SALES_REP: ["/dashboard", "/daily-report/rep", "/missing-items", "/profile", "/notifications"],
  DRIVER: ["/dashboard", "/daily-report/driver", "/returns", "/profile", "/notifications", "/driver/deliveries"],
  CASHIER: ["/cashier", "/profile", "/notifications"],
};

function isRouteAllowedForRole(pathname: string, role: string): boolean {
  const prefixes = roleRoutePrefixes[role];
  if (!prefixes) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionMismatch, setSessionMismatch] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const role = (session.user as any)?.role;
    if (!role) return;

    if (!isRouteAllowedForRole(pathname, role)) {
      setSessionMismatch(true);
      return;
    }

    setSessionMismatch(false);
  }, [session, status, pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);

    const handler = () => {
      const v = localStorage.getItem("sidebar-collapsed");
      setSidebarCollapsed(v === "true");
    };
    window.addEventListener("storage", handler);
    // Also poll briefly since same-tab localStorage changes don't fire storage event
    const interval = setInterval(() => {
      const v = localStorage.getItem("sidebar-collapsed");
      setSidebarCollapsed(v === "true");
    }, 500);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-ivory-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (sessionMismatch) {
    const role = (session.user as any)?.role || "USER";
    return (
      <div className="min-h-screen bg-ivory-100 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Session Mismatch Detected</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your account (<strong>{session.user.name}</strong>, {role.replace("_", " ")}) does not have access to this section. This can happen when switching accounts in the same browser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
            >
              Go to My Dashboard
            </button>
            <button
              onClick={() => signOut({ redirect: false }).then(() => router.push("/auth/login"))}
              className="px-6 py-2.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ivory-100">
      <Sidebar />
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-60"} ml-0`}>
        <TopNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
