import { z } from "zod";

export const repReportSchema = z.object({
  assignmentId: z.string().min(1, "Assignment is required"),
  shiftOpen: z.string().optional(),
  shiftClose: z.string().optional(),
  shiftOpenTarget: z.string().optional(),
  shiftCloseTarget: z.string().optional(),
  customerCountActual: z.number().optional(),
  salesActual: z.number().optional(),
  complaints: z.number().optional(),
  comments: z.string().optional(),
  orders: z.array(z.any()).optional(),
  missingItems: z.array(z.any()).optional(),
});

export const driverReportSchema = z.object({
  assignmentId: z.string().min(1, "Assignment is required"),
  loadingStart: z.string().optional(),
  loadingEnd: z.string().optional(),
  shiftStart: z.string().optional(),
  gatePassTime: z.string().optional(),
  shiftEnd: z.string().optional(),
  fuelCost: z.number().optional(),
  mileageCovered: z.number().optional(),
  customerCountActual: z.number().optional(),
  comments: z.string().optional(),
  returns: z.array(z.any()).optional(),
});

export const orderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  totalAmount: z.number().min(0, "Amount must be positive"),
});

export const deliveryStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["DELIVERED", "PARTIAL", "FAILED"]),
  reason: z.string().optional(),
});

export const missingItemSchema = z.object({
  skuId: z.string().min(1, "SKU is required"),
  customerCountAffected: z.number().int().min(0),
  cartonsAffected: z.number().int().min(0),
  unitPrice: z.number().min(0).optional(),
  amount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const assignmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  routeId: z.string().min(1, "Route is required"),
  dayType: z.enum(["ORDER_TAKING", "DELIVERY"]).optional(),
  salesRepId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
});
