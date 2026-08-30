"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package, AlertTriangle, RotateCcw, FileText, CalendarCheck } from "lucide-react";

function DeliveryExecutionContent() {
  const searchParams = useSearchParams();
  const route = searchParams.get("route");

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Package size={14}/> Level 3 — Delivery Execution <span className="text-[11px] font-normal text-slate-500">Day → Stop → Order</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">Did the truck deliver? Drilled from Route Intelligence. {route ? <span className="font-mono bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">route={route}</span> : "Pick a route in Level 2 to drill."}</p>
      </div>

      {!route ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <CalendarCheck size={32} className="mx-auto text-slate-300 mb-3"/>
          <div className="text-[13px] font-semibold text-slate-700">No route selected</div>
          <div className="text-[11px] text-slate-500 mt-1">Go to <Link href="/intelligence/routes" className="text-teal-600 hover:underline">Route Intelligence</Link> and click “Deliveries →” on a route.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Assignments (week)</div>
              <div className="text-[20px] font-bold mt-1">—</div>
              <div className="text-[11px] text-slate-400">DailyAssignment for this route</div>
              <Link href="/assignments" className="inline-flex mt-3 text-[11px] text-teal-600 hover:underline">Open Assignments →</Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Orders</div>
              <div className="text-[20px] font-bold mt-1">—</div>
              <div className="text-[11px] text-slate-400">Customer orders for route·date</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Exceptions</div>
              <div className="flex gap-2 mt-2 text-[11px]">
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200"><AlertTriangle size={12}/> Missing</span>
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200"><RotateCcw size={12}/> Returns</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-[12px] flex items-center gap-2"><FileText size={13}/> Orders — drill to lines</div>
              <div className="p-8 text-center text-[12px] text-slate-400">No daily assignment selected — pick a date in Assignments, then drill here.<br/><span className="text-[11px]">Orders: customer | cartons | amount → lines sku/qty/unitPrice</span></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-[12px] flex items-center gap-2"><AlertTriangle size={13}/> Missing Items — true stockout vs alternative</div>
              <div className="p-8 text-center text-[12px] text-slate-400">Missing items for route·date will appear here.<br/><span className="text-[11px]">sku | customersAffected | cartons | alternative | isTrueStockout</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">Continue to profitability for this route</div>
            <Link href={`/intelligence/profitability?route=${route}`} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700">Profitability →</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function DeliveryExecutionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"/></div>}>
      <DeliveryExecutionContent />
    </Suspense>
  );
}
