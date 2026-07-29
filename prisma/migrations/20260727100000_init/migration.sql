-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'SALES_REP', 'DRIVER', 'CASHIER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_GARAGE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('WRONG_ITEM', 'MISSING_ITEM', 'CANCELLED_ORDER', 'DAMAGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DELIVERED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mileageBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileageAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDaily" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "sales_reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_rep_routes" (
    "id" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,

    CONSTRAINT "sales_rep_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "maintenanceRatePerKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'piece',
    "packSize" TEXT,
    "unitWeightKg" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "listSellingPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_assignments" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "routeId" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_rep_shifts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "shiftOpen" TIMESTAMP(3),
    "shiftClose" TIMESTAMP(3),
    "customerCountTarget" INTEGER NOT NULL DEFAULT 0,
    "customerCountActual" INTEGER NOT NULL DEFAULT 0,
    "salesTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complaints" INTEGER NOT NULL DEFAULT 0,
    "complaintTarget" INTEGER NOT NULL DEFAULT 0,
    "reportSubmissionTime" TIMESTAMP(3),
    "comments" TEXT,
    "kpiReasons" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_rep_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_shifts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "loadingStart" TIMESTAMP(3),
    "loadingEnd" TIMESTAMP(3),
    "loadingStartTarget" TIMESTAMP(3),
    "loadingEndTarget" TIMESTAMP(3),
    "shiftStart" TIMESTAMP(3),
    "gatePassTime" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "fuelCost" DOUBLE PRECISION,
    "mileageCovered" DOUBLE PRECISION,
    "customerCountActual" INTEGER NOT NULL DEFAULT 0,
    "reportSubmissionTime" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_stops" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverShiftId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DELIVERED',
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missing_items" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "week" TEXT,
    "customerCountAffected" INTEGER NOT NULL DEFAULT 0,
    "cartonsAffected" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "alternativeAvailable" BOOLEAN NOT NULL DEFAULT false,
    "alternativeProduct" TEXT,
    "isTrueStockout" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" TEXT NOT NULL,
    "driverShiftId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "type" "ReturnReason" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "expectedAvailable" INTEGER NOT NULL DEFAULT 0,
    "actualAvailable" INTEGER NOT NULL DEFAULT 0,
    "inGarage" INTEGER NOT NULL DEFAULT 0,
    "garageReason" TEXT,
    "workshopTat" TEXT,
    "theftReport" INTEGER NOT NULL DEFAULT 0,
    "theftReason" TEXT,
    "preDispatchInspection" BOOLEAN NOT NULL DEFAULT false,
    "inspectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_inspections" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "InspectionType" NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_surveys" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "routeId" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "competitorName" TEXT,
    "competitorPrice" DOUBLE PRECISION NOT NULL,
    "khelPrice" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gap" TEXT NOT NULL,
    "whatAction" TEXT,
    "who" TEXT,
    "when" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "countDate" DATE NOT NULL,
    "skuId" TEXT NOT NULL,
    "category" TEXT,
    "physicalQty" INTEGER NOT NULL DEFAULT 0,
    "systemQty" INTEGER NOT NULL DEFAULT 0,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastStocked" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashier_accounts" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditReferenceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoBlockThresholdPct" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "lastOpenedAt" TIMESTAMP(3),
    "lastBlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashier_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_sales" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "retailerName" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "incurredDate" DATE NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledDate" TIMESTAMP(3),
    "settledAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_block_events" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockType" TEXT NOT NULL,
    "blockedByCashierId" TEXT,
    "reason" TEXT,
    "balanceAtTrigger" DOUBLE PRECISION,
    "pctAtTrigger" DOUBLE PRECISION,
    "relatedCreditSaleId" TEXT,
    "unblockedAt" TIMESTAMP(3),
    "unblockReason" TEXT,

    CONSTRAINT "account_block_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_unblock_requests" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedByRepId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routeOrRetailerRef" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedByCashierId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "letterPdfUrl" TEXT,

    CONSTRAINT "account_unblock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_open_log" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "scheduledOpenTime" TIMESTAMP(3),
    "actualOpenTime" TIMESTAMP(3),
    "delayMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_open_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_alerts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'auto_block',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceAtTrigger" DOUBLE PRECISION,
    "pctAtTrigger" DOUBLE PRECISION,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedByCashierId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "account_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_profitability_snapshots" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "tonnageDelivered" DOUBLE PRECISION,
    "sales" DOUBLE PRECISION,
    "cogs" DOUBLE PRECISION,
    "fuelVehicleCost" DOUBLE PRECISION,
    "returnsCost" DOUBLE PRECISION,
    "costOfSales" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "missingItemsOpportunityCost" DOUBLE PRECISION,
    "cogsStatus" TEXT NOT NULL DEFAULT 'pending_pricing',
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_profitability_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "routes_name_key" ON "routes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reps_userId_key" ON "sales_reps"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_rep_routes_salesRepId_routeId_key" ON "sales_rep_routes"("salesRepId", "routeId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_key" ON "vehicles"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "daily_assignments_date_routeId_key" ON "daily_assignments"("date", "routeId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_rep_shifts_assignmentId_key" ON "sales_rep_shifts"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_shifts_assignmentId_key" ON "driver_shifts"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_stops_orderId_key" ON "delivery_stops"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_daily_date_vehicleId_key" ON "fleet_daily"("date", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_key" ON "share_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "cashier_accounts_repId_key" ON "cashier_accounts"("repId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_profitability_snapshots_routeId_weekStart_key" ON "weekly_profitability_snapshots"("routeId", "weekStart");

-- AddForeignKey
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_rep_routes" ADD CONSTRAINT "sales_rep_routes_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "sales_reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_rep_routes" ADD CONSTRAINT "sales_rep_routes_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "sales_reps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assignments" ADD CONSTRAINT "daily_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_rep_shifts" ADD CONSTRAINT "sales_rep_shifts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "daily_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "daily_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "daily_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missing_items" ADD CONSTRAINT "missing_items_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "daily_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missing_items" ADD CONSTRAINT "missing_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missing_items" ADD CONSTRAINT "missing_items_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_daily" ADD CONSTRAINT "fleet_daily_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_surveys" ADD CONSTRAINT "pricing_surveys_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_surveys" ADD CONSTRAINT "pricing_surveys_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "sales_reps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_surveys" ADD CONSTRAINT "pricing_surveys_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "sku_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_accounts" ADD CONSTRAINT "cashier_accounts_repId_fkey" FOREIGN KEY ("repId") REFERENCES "sales_reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cashier_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_block_events" ADD CONSTRAINT "account_block_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cashier_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_block_events" ADD CONSTRAINT "account_block_events_blockedByCashierId_fkey" FOREIGN KEY ("blockedByCashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_block_events" ADD CONSTRAINT "account_block_events_relatedCreditSaleId_fkey" FOREIGN KEY ("relatedCreditSaleId") REFERENCES "credit_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_unblock_requests" ADD CONSTRAINT "account_unblock_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cashier_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_unblock_requests" ADD CONSTRAINT "account_unblock_requests_requestedByRepId_fkey" FOREIGN KEY ("requestedByRepId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_unblock_requests" ADD CONSTRAINT "account_unblock_requests_reviewedByCashierId_fkey" FOREIGN KEY ("reviewedByCashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_open_log" ADD CONSTRAINT "account_open_log_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cashier_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_alerts" ADD CONSTRAINT "account_alerts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cashier_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_alerts" ADD CONSTRAINT "account_alerts_acknowledgedByCashierId_fkey" FOREIGN KEY ("acknowledgedByCashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_profitability_snapshots" ADD CONSTRAINT "weekly_profitability_snapshots_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateView: v_account_route_breakdown
CREATE OR REPLACE VIEW "v_account_route_breakdown" AS
SELECT
  cs."accountId",
  r.id AS "routeId",
  r.name AS "routeName",
  COALESCE(SUM(cs.amount), 0) AS "totalCredit",
  COALESCE(SUM(CASE WHEN cs.settled THEN cs.amount ELSE 0 END), 0) AS "totalSettled",
  COALESCE(SUM(CASE WHEN NOT cs.settled THEN cs.amount ELSE 0 END), 0) AS "totalOutstanding",
  ca."currentBalance",
  CASE
    WHEN ca."currentBalance" > 0
    THEN ROUND((COALESCE(SUM(CASE WHEN NOT cs.settled THEN cs.amount ELSE 0 END), 0) / ca."currentBalance" * 100)::numeric, 1)
    ELSE 0
  END AS "pctOfRepBalance"
FROM "credit_sales" cs
JOIN "cashier_accounts" ca ON ca.id = cs."accountId"
JOIN "routes" r ON r.id = cs."routeId"
GROUP BY cs."accountId", r.id, r.name, ca."currentBalance";

-- CreateView: v_account_blocked_cost
CREATE OR REPLACE VIEW "v_account_blocked_cost" AS
SELECT
  aol."accountId",
  sr.name AS "repName",
  aol."logDate",
  aol."delayMinutes",
  srs."salesTarget",
  srs."salesActual",
  srs."customerCountTarget",
  srs."customerCountActual",
  CASE
    WHEN aol."delayMinutes" > 0 AND srs."salesTarget" > 0
    THEN ROUND((srs."salesActual" / srs."salesTarget" * aol."delayMinutes" * -1)::numeric, 0)
    ELSE 0
  END AS "estimatedMissedSales",
  CASE
    WHEN aol."delayMinutes" > 0 AND srs."customerCountTarget" > 0
    THEN ROUND((aol."delayMinutes" / 480.0 * srs."customerCountTarget")::numeric, 0)
    ELSE 0
  END AS "estimatedMissedCustomers"
FROM "account_open_log" aol
JOIN "cashier_accounts" ca ON ca.id = aol."accountId"
JOIN "sales_reps" sr ON sr.id = ca."repId"
LEFT JOIN "daily_assignments" da ON da."salesRepId" = sr.id AND da.date = aol."logDate"
LEFT JOIN "sales_rep_shifts" srs ON srs."assignmentId" = da.id;
