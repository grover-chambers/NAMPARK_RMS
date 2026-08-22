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

## 7. Deferred decisions (v2 backlog) — logged, not built

Scope calibration (arch review pushback): this is a one-person team shipping
for a client base of one. Only cheap-to-do-right-now / expensive-to-retrofit
items were built (tenant indirection, idempotency keys). The rest are
**explicit decisions to make later**, recorded here so they are not
accidentally re-litigated:

| Decision | When needed | Notes |
|---|---|---|
| Mobile auth token strategy | Kanini onboarding (step 4) | JWT access+refresh vs opaque tokens vs NextAuth cookie reuse. Decide with real device constraints in hand. Rep accounts already exist as User+SalesRep rows. |
| Device registration build-out | Step 4 | `Device` table exists; API + revocation flows deferred until there is a device fleet. |
| `/api/v1` versioning | First mobile endpoint shipped | Folder rename at that point; nothing public exists yet to break. |
| Integration Layer abstraction | Second client OR second module type | Current: one service module + one cron route + PlayMax's ledger/gate. Extract a framework only when the second instance shows the shape. |
| PostGIS + GPS retention policy | When `rep_location_events` exceeds ~10M rows | Table is isolated; aggregation/rollup can land without migration pain. Nice_OS reference: `visits.gps_*` pattern. |
| Per-user tenant binding (multi-tenant ops) | Second tenant activation | `resolveActiveTenant()` currently fails closed on ambiguity by design. |

## 8. Reference assets from Nice_OS (step 4 prep)

Audited 2026-08-22 (read-only). No license file exists; code is internal/
proprietary — extraction for the same owner is fine.

Ranked port candidates for the Kanini rep app:
1. **Sync queue** — `mobile/niceos_app/lib/services/sync_service.dart` (~153 LOC,
   Hive-backed, parent-before-child push order, failed items stay queued) +
   server-side `sync_apply(p_entity, p_rows)` RPC idea.
2. **GPS stabilisation** — `lib/services/location_service.dart::stabiliseFixes()`
   (multi-sample average, 10 m haversine tolerance over 15 s).
3. **Schema shapes** — Nice_OS migrations for `visits`, `retailers`,
   `routes`/`route_stops` are production-shaped references for NAMPARK phase-3
   customer/visit tables.
4. **Hive box-per-domain convention** — census/submission/intercept providers.
5. **Fail-closed boot config gate** — `main.dart` env validation screen.

Absent in Nice_OS: working OTP flow (stubbed), SQLite/drift layer, any LICENSE.
