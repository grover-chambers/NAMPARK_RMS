# Tenant Migration Plan — NAMPARK RMS

Status: **plan approved, phase 1 implemented** (schema only — nullable columns,
zero behaviour change). Phases 2–4 roll out incrementally.

Follows the PlayMax × NAMPARK × Kanini architecture review. Governing rule:

> **PlayMax owns the client relationship and business analytics.
> NAMPARK owns field operations and operational truth.
> The rep app owns temporary offline state. No system becomes a shadow
> database for another.**

## 1. Tenancy model

Internal tenant identity — NAMPARK does **not** depend on PlayMax's schema
(review §2):

```
tenants
  id                  PK (cuid)
  external_client_id  UNIQUE, nullable   -- = PlayMax clients.id, set at activation
  name                UNIQUE
  status              active | paused | disabled
```

Domain tables carry `tenant_id` (TEXT FK → tenants.id). `tenant_id` is
**nullable in phase 1** so every existing query keeps working unchanged;
scoping enforcement tightens per-phase below.

## 2. Ownership classification (audited against schema.prisma, 36 models)

### TENANT_SCOPED (direct `tenant_id` column)
Business data belonging to one operation/tenant:

| Model | Table |
|---|---|
| RouteGroup | route_groups |
| Route | routes |
| SalesRep | sales_reps |
| SalesRepRoute | sales_rep_routes |
| Driver | drivers |
| Vehicle | vehicles |
| VehicleFixedCost | vehicle_fixed_costs |
| VehicleMaintenanceEvent | vehicle_maintenance_events |
| PayrollCost | payroll_costs |
| SkuCatalog | sku_catalog |
| DailyAssignment | daily_assignments |
| SalesRepShift | sales_rep_shifts |
| DriverShift | driver_shifts |
| Order | orders |
| OrderLine | order_lines |
| DeliveryStop | delivery_stops |
| MissingItem | missing_items |
| Return | returns |
| FleetDaily | fleet_daily |
| VehicleInspection | vehicle_inspections |
| PricingSurvey | pricing_surveys |
| Challenge | challenges |
| InventoryCount | inventory_counts |
| ShareToken | share_tokens |
| CashierAccount | cashier_accounts |
| CreditSale | credit_sales |
| AccountBlockEvent | account_block_events |
| AccountUnblockRequest | account_unblock_requests |
| AccountOpenLog | account_open_logs |
| AccountAlert | account_alerts |
| WeeklyProfitabilitySnapshot | weekly_profitability_snapshots |

### GLOBAL (no tenant column — platform infrastructure)
- `User` / `users` — staff identity; reps link through `sales_reps.tenant_id`.
  Per-user tenancy arrives with the v1 API auth work, not here.
- `Notification`, `PushSubscription`, `NotificationPreference` — keyed by user.
- `AuditLog` — cross-cutting; gains a nullable `tenant_id` for context only.

### MODULE FOUNDATION TABLES (new, tenant-scoped from birth)
| Model | Purpose | Review § |
|---|---|---|
| `Tenant` | tenant registry; external_client_id anchors PlayMax | §2 |
| `Device` | device registration/revocation: deviceId, platform, appVersion, pushToken, status, lastSeenAt | §14 |
| `SyncOperation` | idempotency ledger; **PK = client-generated operation_id**; replays hit PK conflict → return original result | §7 |
| `RepLocationEvent` | high-volume GPS breadcrumbs, isolated subsystem; indexed (tenant, rep, recordedAt); retention/aggregation later, PostGIS when justified | §8 |

## 3. Hard rules

1. **Server-side tenant resolution only.** Every authenticated request resolves
   `tenantId` from the authenticated principal (session/JWT → user → tenant).
   Never from request body/query. *Never trust the client to name its tenant.*
2. **Every tenant-scoped query must filter by tenant** — enforced in the data
   layer (phase 3 service modules), not ad-hoc in route handlers.
3. **Nullable ≠ optional forever.** Phase 1 adds columns as NULL-able for
   zero-downtime deploy; backfill sets existing rows to the default tenant;
   phase 3 flips new writes to mandatory via service layer.

## 4. Audit fields

- `updatedAt @updatedAt` added to all tenant-scoped models that lacked it.
- Actor attribution stays in `audit_log` (already exists) — no created_by
  churn across 30 tables in this phase.

## 5. Rollout phases

1. **Phase 1 (this migration):** tables/columns added, all nullable. Deploy
   safe — nothing reads or writes them yet.
2. **Phase 2 (backfill):** create default tenant row; `UPDATE <table> SET
   tenant_id = <default>` for all rows (script provided in migration comments).
3. **Phase 3 (enforcement):** route-mapping service module (`src/lib/modules/
   route-mapping`) + `/api/v1/*` surface resolve tenant server-side and scope
   every query; JWT access+refresh auth for API clients (separate from the
   dashboard's NextAuth cookie sessions).
4. **Phase 4:** outbound metric snapshots → PlayMax ingest endpoint (bearer
   secret, event-oriented, idempotent); flip `tenant_id` to required on
   hot tables once coverage verified.

## 6. What deliberately did NOT happen in this phase

- No query changes anywhere — risk of regression on a live system stays zero.
- No Supabase/Auth.js dependency introduced into NAMPARK.
- No data copied out of NAMPARK (PlayMax receives summary events only).
