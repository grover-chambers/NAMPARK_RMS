"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (entityFilter) params.set("entityType", entityFilter);
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/audit-log?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, entityFilter, actionFilter]);

  const actionColors: Record<string, string> = {
    create: "badge-success",
    update: "badge-info",
    delete: "badge-danger",
    block: "badge-danger",
    unblock: "badge-success",
    approve: "badge-success",
    reject: "badge-danger",
  };

  const fmtTime = (d: string) => format(new Date(d), "MMM d, yyyy HH:mm");

  return (
    <div className="page-content space-y-6">
      <div className="page-header -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Clock size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800">Audit Log</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} total event{total !== 1 && "s"}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            className="form-select text-sm py-1.5"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          >
            <option value="">All entities</option>
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="vehicle">Vehicle</option>
            <option value="assignment">Assignment</option>
            <option value="account_block">Account Block</option>
            <option value="unblock_request">Unblock Request</option>
            <option value="challenge">Challenge</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="form-select text-sm py-1.5"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="block">Block</option>
            <option value="unblock">Unblock</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left bg-slate-50/50">
                <th className="px-4 py-3 font-medium text-slate-500">Time</th>
                <th className="px-4 py-3 font-medium text-slate-500">Action</th>
                <th className="px-4 py-3 font-medium text-slate-500">Entity</th>
                <th className="px-4 py-3 font-medium text-slate-500">Entity ID</th>
                <th className="px-4 py-3 font-medium text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    No audit events found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${actionColors[log.action] || "badge-neutral"} capitalize`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {log.entityType.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {log.entityId.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-outline btn-sm"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-outline btn-sm"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
