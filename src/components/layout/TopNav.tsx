"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function TopNav() {
  const { data: session } = useSession();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    if (!time) return "Good day";
    const hour = time.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatClock = (d: Date) =>
    d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const firstName = session?.user?.name?.split(" ")[0] || "User";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        <div className="flex items-center gap-4 min-w-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {getGreeting()}, {firstName}
            </h2>
            {time && (
              <p className="text-[11px] text-slate-400">{formatDate(time)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {time && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                {formatClock(time)}
              </span>
            </div>
          )}

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
