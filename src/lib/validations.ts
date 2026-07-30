import { z } from "zod";

export const repReportSchema = z.object({
  shiftOpen: z.string().optional(),
  shiftClose: z.string().optional(),
  customerCountActual: z.number().int().min(0).optional(),
  salesActual: z.number().min(0).optional(),
  complaints: z.number().int().min(0).optional(),
  comments: z.string().optional(),
});

export const driverReportSchema = z.object({
  loadingStart: z.string().optional(),
  loadingEnd: z.string().optional(),
  shiftStart: z.string().optional(),
  gatePassTime: z.string().optional(),
  shiftEnd: z.string().optional(),
  fuelCost: z.number().min(0).optional(),
  mileageCovered: z.number().min(0).optional(),
  customerCountActual: z.number().int().min(0).optional(),
  comments: z.string().optional(),
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
  salesRepId: z.string().min(1, "Sales rep is required"),
  driverId: z.string().min(1, "Driver is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
});
