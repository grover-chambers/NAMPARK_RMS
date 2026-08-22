-- Phase 2 backfill: bind every existing row to the default tenant.
-- Run AFTER migration 20260822000001 (which seeds the tenant row).
-- Idempotent — only touches rows where "tenantId" IS NULL.
--
--   psql "$DATABASE_URL" -f scripts/backfill-tenant-ids.sql

WITH t AS (
  SELECT id FROM tenants WHERE name = 'NAMPARK Operations' LIMIT 1
)
UPDATE route_groups              SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE routes                    SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE sales_reps                SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE sales_rep_routes          SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE drivers                   SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE vehicles                  SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE vehicle_fixed_costs       SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE vehicle_maintenance_events SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE payroll_costs             SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE sku_catalog               SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE daily_assignments         SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE sales_rep_shifts          SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE driver_shifts             SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE orders                    SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE order_lines               SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE delivery_stops            SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE missing_items             SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE returns                   SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE fleet_daily               SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE vehicle_inspections       SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE pricing_surveys           SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE challenges                SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE inventory_counts          SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE share_tokens              SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE cashier_accounts          SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE credit_sales              SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE account_block_events      SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE account_unblock_requests  SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE account_open_logs         SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE account_alerts            SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;
UPDATE weekly_profitability_snapshots SET "tenantId" = (SELECT id FROM t) WHERE "tenantId" IS NULL;

-- Verify: every count must be 0 after the run.
SELECT 'route_groups' tbl, COUNT(*) unscoped FROM route_groups WHERE "tenantId" IS NULL
UNION ALL SELECT 'routes', COUNT(*) FROM routes WHERE "tenantId" IS NULL
UNION ALL SELECT 'daily_assignments', COUNT(*) FROM daily_assignments WHERE "tenantId" IS NULL
UNION ALL SELECT 'orders', COUNT(*) FROM orders WHERE "tenantId" IS NULL
ORDER BY unscoped DESC;
