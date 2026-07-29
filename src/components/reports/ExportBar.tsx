"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Link2,
  Printer,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface ExportBarProps {
  title: string;
  filename: string;
  reportType: string;
  params: Record<string, string>;
  onCSVExport?: () => string;
  disablePDF?: boolean;
}

export default function ExportBar({
  title,
  filename,
  reportType,
  params,
  onCSVExport,
  disablePDF,
}: ExportBarProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | "share" | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePDF = async () => {
    setLoading("pdf");
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/api/reports/pdf/${reportType}?${query}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setLoading(null);
    }
  };

  const handleCSV = () => {
    if (!onCSVExport) return;
    setLoading("csv");
    try {
      const csv = onCSVExport();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setLoading(null);
    }
  };

  const handleShare = async () => {
    setLoading("share");
    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, params }),
      });
      if (!res.ok) throw new Error("Share failed");
      const data = await res.json();
      if (data.success) {
        const url = `${window.location.origin}/reports/shared/${data.token}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (e) {
      console.error("Share failed:", e);
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!disablePDF && (
        <button
          onClick={handlePDF}
          disabled={loading === "pdf"}
          className="btn-outline btn-sm"
        >
          {loading === "pdf" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          PDF
        </button>
      )}
      {onCSVExport && (
        <button
          onClick={handleCSV}
          disabled={loading === "csv"}
          className="btn-outline btn-sm"
        >
          {loading === "csv" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          CSV
        </button>
      )}
      <button
        onClick={handleShare}
        disabled={loading === "share"}
        className="btn-outline btn-sm"
      >
        {loading === "share" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : copied ? (
          <CheckCircle2 size={14} className="text-green-600" />
        ) : (
          <Link2 size={14} />
        )}
        {copied ? "Copied!" : "Share"}
      </button>
      <button onClick={handlePrint} className="btn-outline btn-sm">
        <Printer size={14} /> Print
      </button>
      {shareUrl && (
        <p className="text-xs text-slate-400 mt-1 w-full truncate">
          Share link copied to clipboard
        </p>
      )}
    </div>
  );
}
