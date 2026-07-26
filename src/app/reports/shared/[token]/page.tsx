"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";

export default function SharedReportPage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reports/share/${token}`);
        const data = await res.json();
        if (data.success) {
          setReportData(data.data);
          // Redirect to the appropriate report page with the params
          const params = new URLSearchParams(data.data.params).toString();
          const reportRoutes: Record<string, string> = {
            "daily-report": `/daily-report/view`,
            "weekly-executive": `/weekly-summary`,
            "performance": `/performance`,
            "missing-items": `/missing-items`,
            "returns": `/returns`,
          };
          const basePath = reportRoutes[data.data.reportType] || "/dashboard";
          router.replace(`${basePath}?${params}`);
        } else {
          setError(data.error || "Failed to load report");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="card p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Report Unavailable</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            <FileText size={14} /> Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
