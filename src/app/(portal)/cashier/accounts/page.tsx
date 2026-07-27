"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, Eye, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

interface Account {
  id: string;
  status: string;
  currentBalance: number;
  creditReferenceAmount: number;
  lastOpenedAt: string | null;
  rep: { name: string; user: { name: string } };
}

export default function CashierAccountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "CASHIER") router.push("/dashboard");
  }, [status, router, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/cashier/accounts")
      .then((r) => r.json())
      .then((d) => { setAccounts(d.data || []); setLoading(false); });
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold text-slate-800">Cashier Accounts</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage sales rep transaction accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const blocked = account.status === "blocked";
          const threshold = account.creditReferenceAmount > 0
            ? Math.round((account.currentBalance / account.creditReferenceAmount) * 100)
            : 0;

          return (
            <div key={account.id} className={`bg-white rounded-xl border p-4 ${blocked ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif font-bold text-slate-800">{account.rep.name}</h3>
                  <p className="text-xs text-slate-500">{account.rep.user.name}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    blocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {blocked ? <AlertTriangle size={12} className="mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                  {account.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Outstanding Balance</span>
                  <span className="font-bold text-slate-800">{fmt(account.currentBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reference Amount</span>
                  <span className="text-slate-700">{fmt(account.creditReferenceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Threshold %</span>
                  <span className={`font-medium ${threshold >= account.creditReferenceAmount * 0.25 / account.creditReferenceAmount * 100 ? "text-red-600" : "text-green-600"}`}>
                    {threshold}%
                  </span>
                </div>
              </div>

              <Link
                href={`/cashier/accounts/${account.id}`}
                className="block w-full text-center bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700"
              >
                <Eye size={14} className="inline mr-1" /> View Details
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
