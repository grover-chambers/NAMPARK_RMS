-- Tenant scoping phase 1 (see docs/TENANT_MIGRATION_PLAN.md)
-- All new columns are NULLABLE: zero behaviour change, deploy-safe.
-- Enforcement arrives in phase 3 (service layer + /api/v1).

-- ── Tenant registry ─────────────────────────────────────────────
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "externalClientId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ingestUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_externalClientId_key" ON "tenants"("externalClientId");
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- Default tenant anchor for the existing single-operation dataset.
INSERT INTO "tenants" ("id", "externalClientId", "name", "status", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'NAMPARK Operations', 'active', now()
WHERE NOT EXISTS (SELECT 1 FROM "tenants");

-- ── tenant_id on all tenant-scoped tables (+ updatedAt where missing) ──
ALTER TABLE "route_groups"  ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "routes"        ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sales_reps"    ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sales_rep_routes" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "drivers"       ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicles"      ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_fixed_costs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_maintenance_events" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payroll_costs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sku_catalog"   ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "daily_assignments" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sales_rep_shifts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "driver_shifts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "orders"        ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "order_lines"   ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "delivery_stops" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "missing_items" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "returns"       ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "fleet_daily"   ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vehicle_inspections" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "pricing_surveys" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "challenges"    ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "inventory_counts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "share_tokens"  ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "cashier_accounts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT; -- already has "updatedAt"
ALTER TABLE "credit_sales"  ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account_block_events" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account_unblock_requests" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account_open_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account_alerts" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "weekly_profitability_snapshots" ADD COLUMN IF NOT EXISTS "tenantId" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "audit_logs"    ADD COLUMN IF NOT EXISTS "tenantId" TEXT; -- context only

-- Constraint + index pass (idempotent, PG12+ compatible)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'route_groups','routes','sales_reps','sales_rep_routes','drivers','vehicles',
    'vehicle_fixed_costs','vehicle_maintenance_events','payroll_costs','sku_catalog',
    'daily_assignments','sales_rep_shifts','driver_shifts','orders','order_lines',
    'delivery_stops','missing_items','returns','fleet_daily','vehicle_inspections',
    'pricing_surveys','challenges','inventory_counts','share_tokens','cashier_accounts',
    'credit_sales','account_block_events','account_unblock_requests','account_open_logs',
    'account_alerts','weekly_profitability_snapshots','audit_logs'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = t AND c.conname = 'fk_' || t || '_tenant'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "tenants"(id)', t, 'fk_' || t || '_tenant');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenantId ON %I("tenantId")', t, t);
  END LOOP;
END $$;

-- ── Route-mapping module foundation ─────────────────────────────
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "repId" TEXT,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");
CREATE INDEX "devices_tenantId_status_idx" ON "devices"("tenantId", "status");

CREATE TABLE "sync_operations" (
    "id" TEXT NOT NULL, -- client-generated operation UUID = idempotency key
    "tenantId" TEXT NOT NULL,
    "repId" TEXT,
    "deviceId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "operationType" TEXT NOT NULL DEFAULT 'create',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "resultRef" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sync_operations_tenantId_syncedAt_idx" ON "sync_operations"("tenantId", "syncedAt");
CREATE INDEX "sync_operations_repId_idx" ON "sync_operations"("repId");

CREATE TABLE "rep_location_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "routeId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "speedKph" DOUBLE PRECISION,
    "headingDeg" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "deviceTimestamp" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rep_location_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rep_location_events_tenant_rep_recorded_idx" ON "rep_location_events"("tenantId", "repId", "recordedAt");
CREATE INDEX "rep_location_events_route_recorded_idx" ON "rep_location_events"("routeId", "recordedAt");

ALTER TABLE "devices"             ADD CONSTRAINT fk_devices_tenant     FOREIGN KEY ("tenantId") REFERENCES "tenants"(id);
ALTER TABLE "sync_operations"     ADD CONSTRAINT fk_sync_ops_tenant    FOREIGN KEY ("tenantId") REFERENCES "tenants"(id);
ALTER TABLE "rep_location_events" ADD CONSTRAINT fk_loc_events_tenant  FOREIGN KEY ("tenantId") REFERENCES "tenants"(id);

-- ── PHASE 2 PREVIEW (do NOT run yet): backfill existing rows ──
-- UPDATE "routes" SET "tenantId" = (SELECT id FROM "tenants" WHERE name = 'NAMPARK Operations') WHERE "tenantId" IS NULL;
-- (repeat per table — script generated in phase 2)
