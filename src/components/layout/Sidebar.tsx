"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  Truck,
  Route,
  Users,
  BarChart3,
  Package,
  AlertTriangle,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  FileText,
  RotateCcw,
  FileBarChart,
  User,
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  section?: string;
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["ADMIN"], section: "Overview" },
  { label: "Weekly Summary", href: "/weekly-summary", icon: <FileBarChart size={18} />, roles: ["ADMIN"], section: "Overview" },
  { label: "Report Viewer", href: "/daily-report/view", icon: <FileText size={18} />, roles: ["ADMIN"], section: "Overview" },
  { label: "Daily Assignments", href: "/assignments", icon: <CalendarCheck size={18} />, roles: ["ADMIN"], section: "Operations" },
  { label: "Rep Reports", href: "/daily-report/rep", icon: <ClipboardList size={18} />, roles: ["ADMIN"], section: "Operations" },
  { label: "Driver Reports", href: "/daily-report/driver", icon: <Truck size={18} />, roles: ["ADMIN"], section: "Operations" },
  { label: "Routes", href: "/routes", icon: <Route size={18} />, roles: ["ADMIN"], section: "Manage" },
  { label: "Drivers", href: "/drivers", icon: <Users size={18} />, roles: ["ADMIN"], section: "Manage" },
  { label: "Sales Reps", href: "/reps", icon: <Users size={18} />, roles: ["ADMIN"], section: "Manage" },
  { label: "Vehicles", href: "/vehicles", icon: <Truck size={18} />, roles: ["ADMIN"], section: "Manage" },
  { label: "Performance", href: "/performance", icon: <BarChart3 size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Missing Items", href: "/missing-items", icon: <AlertTriangle size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Returns", href: "/returns", icon: <RotateCcw size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Pricing", href: "/pricing", icon: <DollarSign size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Inventory", href: "/inventory", icon: <Package size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Challenges", href: "/challenges", icon: <AlertTriangle size={18} />, roles: ["ADMIN"], section: "Analytics" },
  { label: "Audit Log", href: "/audit-log", icon: <FileText size={18} />, roles: ["ADMIN"], section: "Analytics" },
];

const supervisorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["SUPERVISOR"] },
  { label: "Weekly Summary", href: "/weekly-summary", icon: <FileBarChart size={18} />, roles: ["SUPERVISOR"] },
  { label: "Assignments", href: "/assignments", icon: <CalendarCheck size={18} />, roles: ["SUPERVISOR"] },
  { label: "Report Viewer", href: "/daily-report/view", icon: <FileText size={18} />, roles: ["SUPERVISOR"] },
  { label: "Performance", href: "/performance", icon: <BarChart3 size={18} />, roles: ["SUPERVISOR"] },
  { label: "Missing Items", href: "/missing-items", icon: <AlertTriangle size={18} />, roles: ["SUPERVISOR"] },
  { label: "Returns", href: "/returns", icon: <RotateCcw size={18} />, roles: ["SUPERVISOR"] },
  { label: "Vehicles", href: "/vehicles", icon: <Truck size={18} />, roles: ["SUPERVISOR"] },
];

const repNavItems: NavItem[] = [
  { label: "My Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["SALES_REP"] },
  { label: "My Report", href: "/daily-report/rep", icon: <ClipboardList size={18} />, roles: ["SALES_REP"] },
  { label: "Missing Items", href: "/missing-items", icon: <AlertTriangle size={18} />, roles: ["SALES_REP"] },
];

const driverNavItems: NavItem[] = [
  { label: "My Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, roles: ["DRIVER"] },
  { label: "My Report", href: "/daily-report/driver", icon: <ClipboardList size={18} />, roles: ["DRIVER"] },
  { label: "Deliveries", href: "/driver/deliveries", icon: <Truck size={18} />, roles: ["DRIVER"] },
  { label: "Returns", href: "/returns", icon: <RotateCcw size={18} />, roles: ["DRIVER"] },
];

const cashierNavItems: NavItem[] = [
  { label: "Dashboard", href: "/cashier", icon: <LayoutDashboard size={18} />, roles: ["CASHIER"], section: "Accounts" },
  { label: "Accounts", href: "/cashier/accounts", icon: <Users size={18} />, roles: ["CASHIER"], section: "Accounts" },
  { label: "Alerts", href: "/cashier/alerts", icon: <AlertTriangle size={18} />, roles: ["CASHIER"], section: "Alerts" },
  { label: "Unblock Requests", href: "/cashier/requests", icon: <FileText size={18} />, roles: ["CASHIER"], section: "Alerts" },
];

// Role → color scheme
const roleThemes: Record<string, { gradient: string; activeBg: string; mobileGradient: string }> = {
  ADMIN: {
    gradient: "from-green-800 to-green-900",
    activeBg: "bg-brown-600",
    mobileGradient: "from-green-800 to-green-900",
  },
  SUPERVISOR: {
    gradient: "from-teal-700 to-teal-800",
    activeBg: "bg-brown-600",
    mobileGradient: "from-teal-700 to-teal-800",
  },
  SALES_REP: {
    gradient: "from-brown-700 to-brown-800",
    activeBg: "bg-teal-600",
    mobileGradient: "from-brown-700 to-brown-800",
  },
  DRIVER: {
    gradient: "from-slate-700 to-slate-800",
    activeBg: "bg-teal-600",
    mobileGradient: "from-slate-700 to-slate-800",
  },
  CASHIER: {
    gradient: "from-indigo-700 to-indigo-800",
    activeBg: "bg-indigo-600",
    mobileGradient: "from-indigo-700 to-indigo-800",
  },
};

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (session?.user as any)?.role || "ADMIN";
  const theme = roleThemes[role] || roleThemes.ADMIN;

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  let items = adminNavItems;
  if (role === "SUPERVISOR") items = supervisorNavItems;
  else if (role === "SALES_REP") items = repNavItems;
  else if (role === "DRIVER") items = driverNavItems;
  else if (role === "CASHIER") items = cashierNavItems;

  const filtered = items.filter((item) => item.roles.includes(role));
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const handleSignOut = () => {
    signOut({ redirect: false }).then(() => router.push("/auth/login"));
  };

  // Group items by section (admin and cashier have sections)
  const grouped = (role === "ADMIN" || role === "CASHIER")
    ? filtered.reduce((acc, item) => {
        const section = item.section || "Other";
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
      }, {} as Record<string, NavItem[]>)
    : { Menu: filtered };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-4 border-b border-white/10 ${collapsed ? "px-3" : ""}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-serif text-lg font-bold">N</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-serif text-base font-bold leading-tight">Nampark</h1>
              <p className="text-white/40 text-[9px] uppercase tracking-widest">Route Management</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white font-serif text-lg font-bold">N</span>
            </div>
          </div>
        )}
      </div>

      {/* User info */}
      <div className={`p-3 border-b border-white/10 ${collapsed ? "px-3" : ""}`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{role.replace("_", " ")}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {Object.entries(grouped).map(([section, sectionItems]) => (
          <div key={section} className="mb-1">
            {!collapsed && (role === "ADMIN" || role === "CASHIER") && (
              <p className="text-[10px] uppercase tracking-widest text-white/30 px-3 pt-3 pb-1 font-semibold">
                {section}
              </p>
            )}
            {!collapsed && role !== "ADMIN" && section === "Menu" && <></>}
            {sectionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${
                  isActive(item.href)
                    ? `${theme.activeBg} text-white shadow-lg`
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-[13px]">{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom actions: Profile, Settings, Sign Out */}
      <div className={`border-t border-white/10 ${collapsed ? "p-2 flex flex-col items-center gap-1" : "p-2 space-y-0.5"}`}>
        {/* Profile */}
        <Link
          href="/profile"
          className={`sidebar-item text-white/70 hover:bg-white/10 hover:text-white ${
            isActive("/profile") ? `${theme.activeBg} text-white` : ""
          } ${collapsed ? "justify-center px-2" : ""}`}
          title={collapsed ? "Profile" : undefined}
        >
          <User size={18} />
          {!collapsed && <span className="text-[13px]">Profile</span>}
        </Link>

        {/* Settings (admin only) */}
        {role === "ADMIN" && (
          <Link
            href="/settings"
            className={`sidebar-item text-white/70 hover:bg-white/10 hover:text-white ${
              isActive("/settings") ? `${theme.activeBg} text-white` : ""
            } ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={18} />
            {!collapsed && <span className="text-[13px]">Settings</span>}
          </Link>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className={`sidebar-item text-red-300 hover:text-red-200 hover:bg-red-500/20 w-full ${
            collapsed ? "justify-center px-2" : ""
          }`}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-[13px]">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-green-700 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b ${theme.mobileGradient} transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-white/70 hover:text-white">
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-gradient-to-b ${theme.gradient} transition-all duration-200 ${collapsed ? "w-[68px]" : "w-60"}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 z-40 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50"
        >
          <ChevronLeft size={14} className={`text-slate-500 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
