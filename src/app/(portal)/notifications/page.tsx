"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, ArrowLeft } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  account_blocked: "Account Blocked",
  unblock_approved: "Unblock Approved",
  unblock_request: "Unblock Request",
  report_reminder: "Report Reminder",
  assignment_change: "Assignment Change",
  route_change: "Route Change",
  shift_change: "Shift Change",
  weekly_report_ready: "Weekly Report Ready",
  stockout_alert: "Stockout Alert",
  message: "Message",
};

const typeColors: Record<string, string> = {
  account_blocked: "bg-red-100 text-red-700",
  unblock_approved: "bg-green-100 text-green-700",
  unblock_request: "bg-amber-100 text-amber-700",
  report_reminder: "bg-amber-100 text-amber-700",
  assignment_change: "bg-blue-100 text-blue-700",
  route_change: "bg-purple-100 text-purple-700",
  shift_change: "bg-teal-100 text-teal-700",
  weekly_report_ready: "bg-indigo-100 text-indigo-700",
  stockout_alert: "bg-orange-100 text-orange-700",
  message: "bg-slate-100 text-slate-700",
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=100");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchNotifications();
  }, [status, fetchNotifications]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500">
            {unread > 0
              ? `${unread} unread notification${unread !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-600 hover:bg-teal-100"
          >
            <Check size={14} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">
            You will see notifications here when there are updates.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 transition-colors ${
                !n.read ? "bg-teal-50/30 border-teal-200" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    typeColors[n.type] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {typeLabels[n.type] || n.type}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm ${!n.read ? "font-semibold" : ""} text-slate-800`}>
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                      >
                        View details
                      </Link>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
