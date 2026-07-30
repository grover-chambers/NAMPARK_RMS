"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MapPin, CheckCircle, XCircle, Clock, Truck, Loader2, AlertTriangle, ChevronDown, ChevronUp, Package } from "lucide-react";

interface OrderLine {
  sku: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  packSize: string | null;
}

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  lines: OrderLine[];
  delivered: boolean;
  deliveryStatus: string | null;
  deliveryTime: string | null;
}

interface DeliveryStop {
  id: string;
  orderId: string;
  customerName: string;
  status: string;
  reason: string | null;
  timestamp: string;
  totalAmount: number;
  items: OrderLine[];
}

export default function DriverDeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryStops, setDeliveryStops] = useState<DeliveryStop[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalDelivered, setTotalDelivered] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showDelivered, setShowDelivered] = useState(true);
  const [actionOrder, setActionOrder] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string>("DELIVERED");
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/deliveries");
      if (res.ok) {
        const data = await res.json();
        if (data.assignment) {
          setAssignment(data.assignment);
          setOrders(data.orders || []);
          setDeliveryStops(data.deliveryStops || []);
          setProgress(data.progress || 0);
          setTotalDelivered(data.totalDelivered || 0);
          setTotalOrders(data.totalOrders || 0);
        } else {
          setAssignment(null);
          setOrders([]);
          setDeliveryStops([]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchDeliveries();
  }, [status, fetchDeliveries]);

  const markDelivery = async (orderId: string) => {
    setMarkingId(orderId);
    try {
      const res = await fetch("/api/driver/deliveries/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: actionStatus, reason: actionReason || null }),
      });
      if (res.ok) {
        await fetchDeliveries();
        setActionOrder(null);
        setActionReason("");
        setActionStatus("DELIVERED");
      }
    } catch {} finally {
      setMarkingId(null);
    }
  };

  const statusIcon = (status: string | null) => {
    if (status === "DELIVERED") return <CheckCircle size={16} className="text-green-500" />;
    if (status === "PARTIAL") return <AlertTriangle size={16} className="text-amber-500" />;
    if (status === "FAILED") return <XCircle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-slate-300" />;
  };

  const statusColor = (status: string | null) => {
    if (status === "DELIVERED") return "border-green-300 bg-green-50";
    if (status === "PARTIAL") return "border-amber-300 bg-amber-50";
    if (status === "FAILED") return "border-red-300 bg-red-50";
    return "border-slate-200 bg-white";
  };

  const displayOrders = showDelivered ? orders : orders.filter((o) => !o.delivered);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <Truck size={48} className="mx-auto mb-4 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">No Assignment Today</h2>
          <p className="text-sm text-slate-500">You have no delivery assignment scheduled for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto">
      {/* Assignment header */}
      <div className="bg-gradient-to-r from-teal-700 to-green-800 rounded-xl p-4 sm:p-6 text-white mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={16} />
          <span className="text-xs uppercase tracking-wider opacity-80">Today&apos;s Assignment</span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold">{assignment.route}</h1>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="opacity-70" />
            <span>{assignment.vehicle}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package size={14} className="opacity-70" />
            <span>{totalOrders} stops</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span>Delivery Progress</span>
            <span className="font-semibold">{totalDelivered}/{totalOrders} ({progress}%)</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div
              className="bg-gold-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowDelivered(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showDelivered ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({totalOrders})
        </button>
        <button
          onClick={() => setShowDelivered(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !showDelivered ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Pending ({totalOrders - totalDelivered})
        </button>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {displayOrders.map((order) => (
          <div
            key={order.id}
            className={`rounded-xl border-2 ${statusColor(order.deliveryStatus)} transition-colors`}
          >
            <button
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              className="w-full p-3 sm:p-4 flex items-center gap-3 text-left"
            >
              {statusIcon(order.deliveryStatus)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {order.customerName}
                </p>
                <p className="text-xs text-slate-500">
                  {order.lines.length} item{order.lines.length !== 1 ? "s" : ""} · KES {order.totalAmount.toLocaleString()}
                  {order.deliveryTime && (
                    <> · {new Date(order.deliveryTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </div>
              {expandedOrder === order.id ? (
                <ChevronUp size={16} className="text-slate-400" />
              ) : (
                <ChevronDown size={16} className="text-slate-400" />
              )}
            </button>

            {expandedOrder === order.id && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="border-t border-slate-200 pt-2 mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left py-1 pr-2">Item</th>
                        <th className="text-right py-1 px-2">Qty</th>
                        <th className="text-right py-1 px-2">Price</th>
                        <th className="text-right py-1 pl-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line, i) => (
                        <tr key={i} className="text-slate-600">
                          <td className="py-1 pr-2 truncate max-w-[120px] sm:max-w-[200px]">
                            {line.sku}
                            {line.packSize && <span className="text-slate-400"> ({line.packSize})</span>}
                          </td>
                          <td className="text-right py-1 px-2">{line.quantity}</td>
                          <td className="text-right py-1 px-2">{line.unitPrice.toLocaleString()}</td>
                          <td className="text-right py-1 pl-2 font-medium">{line.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!order.delivered && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {["DELIVERED", "PARTIAL", "FAILED"].map((s) => (
                        <button
                          key={s}
                          onClick={() => { setActionStatus(s); setActionOrder(order.id); }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            actionOrder === order.id && actionStatus === s
                              ? s === "DELIVERED" ? "bg-green-600 text-white"
                              : s === "PARTIAL" ? "bg-amber-500 text-white"
                              : "bg-red-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {s === "DELIVERED" ? "✓ Delivered" : s === "PARTIAL" ? "△ Partial" : "✕ Failed"}
                        </button>
                      ))}
                    </div>
                    {actionOrder === order.id && (
                      <div className="flex items-center gap-2 mt-2">
                        {actionStatus === "FAILED" && (
                          <input
                            type="text"
                            placeholder="Reason for failure..."
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        )}
                        <button
                          onClick={() => markDelivery(order.id)}
                          disabled={markingId === order.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {markingId === order.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {order.deliveryStatus === "FAILED" && order.deliveryStatus && (
                  <p className="text-[11px] text-red-600 mt-2">
                    {(deliveryStops.find(s => s.orderId === order.id))?.reason || "Failed delivery"}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {displayOrders.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-slate-500 font-medium">
            {showDelivered ? "No deliveries yet" : "All deliveries completed!"}
          </p>
        </div>
      )}
    </div>
  );
}
