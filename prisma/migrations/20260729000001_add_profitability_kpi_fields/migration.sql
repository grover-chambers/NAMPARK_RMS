-- AlterTable: DriverShift
ALTER TABLE "driver_shifts" ADD COLUMN "fuelCost" DOUBLE PRECISION;
ALTER TABLE "driver_shifts" ADD COLUMN "mileageCovered" DOUBLE PRECISION;

-- AlterTable: Vehicle
ALTER TABLE "vehicles" ADD COLUMN "maintenanceRatePerKm" DOUBLE PRECISION;

-- AlterTable: SkuCatalog
ALTER TABLE "sku_catalog" ADD COLUMN "unitWeightKg" DOUBLE PRECISION;
ALTER TABLE "sku_catalog" ADD COLUMN "costPrice" DOUBLE PRECISION;
ALTER TABLE "sku_catalog" ADD COLUMN "listSellingPrice" DOUBLE PRECISION;

-- CreateTable: WeeklyProfitabilitySnapshot
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
CREATE UNIQUE INDEX "weekly_profitability_snapshots_routeId_weekStart_key" ON "weekly_profitability_snapshots"("routeId", "weekStart");

-- AddForeignKey
ALTER TABLE "weekly_profitability_snapshots" ADD CONSTRAINT "weekly_profitability_snapshots_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
