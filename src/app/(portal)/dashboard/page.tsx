"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AdminDashboard from "./AdminDashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import SalesRepDashboard from "./SalesRepDashboard";
import DriverDashboard from "./DriverDashboard";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role === "CASHIER") router.push("/cashier");
  }, [status, router, session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = (session?.user as any)?.role;

  switch (role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "SUPERVISOR":
      return <SupervisorDashboard />;
    case "SALES_REP":
      return <SalesRepDashboard />;
    case "DRIVER":
      return <DriverDashboard />;
    default:
      return <AdminDashboard />;
  }
}
