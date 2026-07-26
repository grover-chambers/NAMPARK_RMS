"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, Mail, Search, ChevronDown } from "lucide-react";

export default function TopNav() {
  const { data: session } = useSession();
  const [time, setTime] = useState<Date | null>(null);
  const [showNotif, setShowNotif] = useState(false);

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
        {/* Left: Greeting + Date */}
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

        {/* Right: Clock + Actions */}
        <div className="flex items-center gap-3">
          {/* Live clock */}
          {time && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                {formatClock(time)}
              </span>
            </div>
          )}

          {/* Search (placeholder) */}
          <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
            <Search size={18} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors relative"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                    <button className="text-xs text-teal-600 hover:text-teal-700">Mark all read</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50">
                      <p className="text-xs text-slate-600">System notifications will appear here</p>
                      <p className="text-[10px] text-slate-400 mt-1">Coming soon</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 text-center">
                    <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">View all</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mail */}
          <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors relative">
            <Mail size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
