# Kanini Field — Training Manual
### For Field Reps & Admin / Management — MarketLink (PlayMax) + Kanini Haraka

**Version:** 1.3.0+5 (MAP-driven, Oct 2026)  
**Applies to:** Kanini Field Android app (`niceos_app` build) + Super Admin portal `/app/kanini-field` and `/app/admin/field-team` (PlayMax)  
**County focus:** Kiambu first — 12 sub-counties, 58 wards (Ruiru 8, Limuru/Lari/Kiambu/Kiambaa etc.) — Thika Cluster pilot, expandable countrywide.  
**Authors:** App Development + Product Management (inspected `apps/kanini-field` v1.3.0+5)

> **One promise:** *You are not selling. You take nothing, offer nothing, promise nothing. A wrong record is worse than a missing one.* — Field Guide

---

## How to use this manual
- **Part A (Ch. 1–9): Field Rep** — read cover-to-cover before your first day. Simple language, step-by-step with screenshots described.
- **Part B (Ch. 10–12): Admin / Cluster Lead / HQ** — dashboards, live monitoring, data governance, RMS provisioning.
- Keep the app's **Field Guide** (in-app, works offline) open beside you. It is the SOP source; this manual explains *how* to do it in the app.

---

# PART A — FIELD REP

## 1. What Kanini Field does (in your words)
You walk every street that sells flour. For each shop you **Observe → Record → Question → Proceed**. One correct record lets MarketLink serve *many* clients — your outlet data becomes the shared Market Reference. That is why accuracy matters more than speed.

**Success = 30 outlets / day** (band 20–40), Mon–Sat, 24 days = 720 outlets per wave (1 440 total). You do it in two blocks; the app counts for you.

## 2. Who is who
| Role | What you see | What you can do |
|------|--------------|-----------------|
| **Field Rep (you)** | Only your assigned routes (`routes_master` where `rep_email = your email` or you are `lead_email`). Your group A–G determines your Kiambu zone. | Census, Visits, photos, orders (inside a visit), daily close, sync |
| **Cluster Lead** | Same + your team's routes (e.g., Martin Mutuku C2, Nicole Githui C3) | Spot-checks (back-checks), debrief |
| **Super Admin / Territory Manager** | All routes/groups + Health Scores + Reports | Live map/timeline, analytics, provisioning |

Your Kiambu zone (2 sub-counties each, total 12):
- **Peter Owuor — Thika Town + Ruiru** (13 wards) — Group A/F
- **Evans Mutune — Juja + Gatundu South** (9) — B/G
- **Nicole Githui — Kiambu + Kiambaa** (9) — C
- **Willys Munyanga — Gatundu North + Githunguri** (9) — D
- **Nelius — Limuru + Lari** (10) — E
- **Erick Kyalo — Kabete + Kikuyu** (8)

> You must only record in your wards. GPS will flag you if you are far from the shop.

## 3. Before your first shift — Install & Login
1. **Install** the APK your lead gives you (`kanini-field-v1.3.0+5…apk`). No Play Store. If you see dark screen **“Missing configuration”**, delete and ask for the latest build — do not try to type a URL.
2. **Open** → Splash “N” → 10 onboarding pages (Observe/Record/Question/Proceed, GPS, outcomes, target 30). Swipe `Next` → `Sign in`. You only see this once; replays from drawer → Field Guide if needed.
3. **Login:** Email + password (Supabase). No OTP in V1. If red error, check email/password, then long-press to paste. After login the app locks; no one can use it without your account.
4. **Permissions — Allow when asked:**
   - **Location → Allow all the time** (required for GPS gate). If you tap Deny, the app shows no GPS and every check-in needs an override reason — slower.
   - **Camera → Allow** (shop front + shelf photos mandatory).
   - **Notifications → Allow** (sync + shift auto-clock-out alerts).
   - If you denied forever, Android Settings → Apps → Kanini Field → Permissions → Allow. Or tell Ian/Brian.

## 4. Your day, hour by hour (`FieldConfig.dayRhythm`)
| Time | What happens | App |
|------|--------------|-----|
| **07:00** | Sign in at centre. App shows **Shift** gate — no Back button, `NOT STARTED`. Tap **Clock In**. Pill turns `ON SHIFT`, timer `00:00` starts. | `ShiftScreen` |
| **07:15** | Morning brief (lead explains area + target) | — |
| **07:45** | Depart to beat | — |
| **08:00–12:30** | **Block 1:** Walk one side of the street out, other side back. Aim 18–22 outlets. For each: census or visit flow below. | `Census` / `Visits` |
| **12:30–13:15** | Break + midday count: check Dashboard — **Outlets today** vs target 30. If behind, lead re-assigns. | `DashboardScreen` |
| **13:15–16:30** | **Block 2:** 10–14 more outlets | |
| **16:45** | **Sync window:** Stay online 15 min. App auto-syncs every 45s; open `Sync` tab → `Sync now` until `pending 0`. | `Sync` |
| **16:45–17:15** | Debrief + **Close day & submit** (only if you have ≥1 outlet or intercept today). Adds quality flags, queues for supervisor. | `Submissions` |
| **17:30** | Auto clock-out if idle 4h or shift 16h. Otherwise `Clock Out` manually. | `ShiftScreen` |

**Idle rule:** If you do nothing 4 hours, the app clocks you out as `inactivity`. Just tap any screen to refresh `lastActivityAt`.

## 5. The 4 tabs at the bottom (HomeShell)
From left: **Submissions | Census | Dashboard (big amber circle) | Intercept | Visits**. Top bar always shows **Sync badge** (pending count) + **red Safety** button + your initials. Swipe drawer (hamburger) for Quick Actions, Shift, Field Guide, Team, Profile, Support.

## 6. Creating a NEW outlet — Census flow (6 steps, Stepper)
Open **Census → Start a new census**. Fill each step; `Next` is blocked until required * fields are valid.

**Step 1 — Identify & Location:** Business name*, Channel* (Grocery/Duka/Wholesale/… 6), Outlet Type* (filters by channel, 38 + Other), Street/Landmark/Building, County/Constituency/Ward*/Beat, Operating days (tick), Opening hours. *Tip: Read the signboard exactly; don't guess.*

**Step 2 — GPS & Photo (hard gate):** Tap **Acquire GPS fix**. Stand at the **door**, not across the road, wait for `±15m ACCEPT`. Under a metal roof → step outside. Never pin 5 shops from one spot. Then **Storefront Photo*** (camera opens, geotagged). You cannot proceed if accuracy >15m or photo missing — app shows `QualityFlag.gpsGate`.

**Step 3 — Consent & Contact (hard gate):** Read the **Consent Script** aloud (v1.0 shown). Ask “May I record and may MarketLink reuse anonymously?” Tick `Consent Agreed*` to continue. Then Contact name*, Role (owner/manager/attendant), Phone, Preferred language, Is decision maker?

**Step 4 — Commercial Profile:** Size tier (micro/small/medium/large), Shelf metres, Est. daily customers, Fridge/Freezer toggle, Storage (none/backstore/warehouse), Sells on credit, Accepts M-Pesa, Purchase frequency, Primary supply source, Supplier name, Delivery or Collect.

**Step 5 — Categories & Brands:** Tick the 16 product categories the shop **stocks now** (Maize Flour, Wheat, Rice, Sugar, Oil, Milk…). Per ticked category: brands present (flour → Nice/Jogoo/Pembe/Soko/Dola; dairy → Brookside/Fresha; else free text), pack sizes (small<250g/medium/large/xlarge), shelf facings, price KES you see, units on hand, stockout last 7 days?, fastest moving brand + why (price/availability/promo). *Fastest-moving is your judgement — ask “which finishes first?”.*

**Step 6 — Review & Submit:** For each client shown (real accounts from `RetailerProvider`), choose link status: `active_customer / prospect / lapsed / inactive / competitor_only / refused / not_applicable / closed`. `Not applicable` removes it. Tap **Submit → CENSUS SAVED** green stamp. Your list shows it under “Captured today” with ward + time. If rejected, red dialog names the flag (e.g., GPS, consent) — fix and re-submit; hard gates block until fixed. Advisory flags (proximity, speed <4min, straightlining) do not block but go to supervisor for back-check (10% random).

> **One-visit rule:** Same outlet ID + same date = blocked (`one_visit_rule`). You cannot double-count the same shop today. `Hive census_log` enforces locally.

## 7. Visiting a KNOWN outlet — Check-in flow (3 screens)
Open **Visits** → your **Routes** grouped by group name (Thika, Ruiru…), card shows km, tonnage target, order/delivery days, lead, vehicle/driver. Tap route → detail sheet 60% → **Check In**.

**Screen 1 — Check-in GPS lock:** App tries 3 fixes (8s each). Needs **accuracy ≤5m AND distance to shop ≤5m AND ≥2 fixes** to show `Locked`. Numbers show live. If after 3 tries you are at 20m, it shows **Use override** — you must type a reason (“shop inside mall, GPS blocked by roof”). Button enables if `Locked OR override reason`. Tap **Check In** → `CHECK IN` stamp. If locked, `gpsVerified true` (good); if override, `gpsVerified false` (flagged).

**Screen 2 — Photo capture:** Needs **≥1 photo** (shop_front required, shelf optional). Tap camera → geotagged → `queued`. Counter increments; you can add more. `Continue`.

**Screen 3 — Notes & Outcome (exactly one):** Free notes field + three optional sections:
- **Add Stock:** SKU/name, qty, price, shelf (full/half/low/out) → dialog → queued.
- **Competitor:** brand/product, price, shelf presence (full/half/none), activity (promo/price-drop), promotion tick → queued.
- **Place Order:** Add items (sku/name/qty/price) → total KES sum → `Order status pending`.
- Then **pick ONE outcome** (`ChoiceChip`): `COMPLETE` / `PARTIAL` / `REFUSED` / `CLOSED` / `NOT_AN_OUTLET` / `UNSAFE`. Each has help text. `Complete Visit` is disabled until you pick. Tap → `checkOut` computes `durationMin`, writes `visit` same ID, → stamp with color (green amber red) → returns to list. **Orders only live inside a visit** — no separate order screen.

## 8. Daily close — Submissions
Open **Submissions**. Cards show `Outlets today / Intercepts today / Back-checks`. If you did ≥1 today, **Amber button Close day & submit** is enabled. Tap → app runs **straightlining detector** (≥5 identical answers → flags `straightlining`), checks **back-check due** (10% deterministic) → creates `DailySubmission` (`enumeratorId, date yyyy-MM-dd, outletCount, interceptCount, qualityFlags[], status submitted`) + Hive + `touch()`. List shows date, counts, flags (`StampTag visited/skipped`), and any `BackCheck` (passed/failed, discrepancy). If `Not authenticated` error, sign in again and retry.

## 9. Staying synced — Offline first, what really happens
**Think of two boxes:** `Your phone (Hive)` ↔ `Cloud (Supabase)` ↔ `PlayMax portal map`.

- **Every save** (`Census`, `Visit`, `Stock`, `Competitor`, `Order`, `Photo meta`, `DailySubmission`) does **not** go to internet instantly. It goes to `pending_sync` box on your phone (`entity:rowId → payload`). You see `Sync pending N` on Dashboard badge + Sync screen. This is good — you can work with no bundles.

- **When online,** every **45 seconds** + when connectivity returns, the app calls `sync-push` Edge Function (`device_id + batch`). It sends parents before children (outlets before visits before orders) so the server never complains about missing outlet. Per-entity result: if server says error, that entity **stays queued** (fail-closed); if ok, it is marked `synced` and later purged. **Photos:** metadata queues immediately; the JPG uploads separately to private bucket `shelf-photos/$repId/$photoId.jpg` (upsert). If you are offline in a mall, metadata stays, JPG retries later — portal shows placeholder until JPG arrives (contract §5).

- **Pull:** Routes/retailers/health_scores refresh via `sync-pull` or direct RLS reads. Your routes are filtered by `rep_email = you`.

- **What to do:** End of day, open **Sync** → hero card shows `Online/Offline` pill + `Pending N` big number + **Sync now**. Tap until `N=0`. If red banner `Sync failed: …` appears on Dashboard & Sync, tap **Retry**. `Dismiss` only hides the message, it does not delete data. Never `Clear storage` or uninstall — you will lose queued rows.

- **Idempotency:** Same `rowId UUID` LWW — if you edit the same visit twice, the later timestamp wins, no duplicates on server. Don't create 5 visits for one shop; update the one.

## 10. GPS & Photo discipline (your reputation)
- **ACCEPT ≤15m, WARN 15–40m, REJECT >40m** (`FieldConfig.gpsAcceptM/WarnM`). Door, open sky, wait 15s/3 samples.
- **Never** pin several shops from one spot “to save walking” — `proximity >50m` flags you.
- **Speed <4 min** visit → `speedFlag`. Take your time: Observe→Record→Question→Proceed.
- **Photo:** `maxWidth 2048`, geotagged. If GPS fails, photo still saves without geotag (better than nothing). If picker says `Photo cancelled — grant camera permission`, fix in Settings → Apps → Kanini Field.

## 11. Safety — always reachable
Red **emergency** icon top-right + drawer → bottom sheet with 4 contacts (call via `tel:` when provisioned):
- **Hostility → Cluster Lead** (your zone lead) → then Laban (Ops)
- **Police → Laban immediately**
- **Device → Ian → Brian** (same-day)
If you see `Icons.phone_disabled` + “number pending”, numbers are not yet provisioned — **escalate in person**, don't invent numbers. Works offline (cached guide). Your `Shift` must be clocked in; `Profile` shows zone + version `v+build`.

## 12. When the app blocks you — Quality gates (fix it, don't force it)
| Banner | Means | Fix |
|--------|-------|-----|
| `gpsGate` / `GPS required accuracy ≤15m` | Bad fix or no photo | Move outside, wait, retake |
| `one_visit_rule` | Same shop today already | That's correct — don't recapture |
| `Consent required` | You didn't tick consent | Read script, tick, then continue |
| `photo_mandatory` | No storefront photo | Take one |
| Advisory `proximity / speedFlag / straightlining` | Not blocked, but supervisor will back-check 10% | Next time slower, varied answers |

## 13. Troubleshooting for reps (copy this page)
| Problem | Try |
|---------|-----|
| **Missing configuration** dark screen | Wrong build. Ask lead for latest APK. |
| **Login red error** | Check email/password, try hotspot, check `Sync` offline pill. Creds never leave device except to Supabase Auth. |
| **GPS never locks** | Enable Location → High accuracy, step outside, disable battery saver, allow location “All the time”. |
| **Camera won't open** | Settings → Apps → Kanini Field → Permissions → Camera Allow. |
| **Check-in button grey** | Need `Locked` or type override reason. |
| **Sync pending stays >0, red banner** | Go online, open Sync → Sync now, tap Retry. If `no_connection`, find Wi-Fi. If device error, note the text and tell lead + screenshot. |
| **Not authenticated — sign in** on Close day | Session expired — Login again. |
| **App crashed** (red error + stack) | Screenshot + restart. `runZonedGuarded` saved; data in `pending_sync` is safe. |

---

# PART B — ADMIN / CLUSTER LEAD / HQ

## 10. Super Admin dashboards (PlayMax portal)
**Routes:** `/app/kanini-field` (tabbed: Overview/Census/Visits/Map/Submissions/Team) + `/app/analytics` (FMCG engine) + `/portal/kanini` (client view). Styling: `PageHeader` + `ws-stat-card` + `pm-dash-card` + `Button primary/secondary`, `page-content space-y-5`, `pm-clock`.

### 10.1 Live field operations (`/app/kanini-field`)
- **Overview:** `PageHeader` “Kanini Field — Live field operations”, `Refresh` button, sync error banner, 3 KPIs (`Outlets / Visits / To sync`), Tasks `pm-dash-qa-btn` rows → tabs, **Rep monitoring · live** table (color dot, `ON SHIFT/OFF` pill, zone, lat/lng → Google Maps, `todayVisits todayOrders totalVisits`, `lastSyncAt`). Wired to `GET /api/app/kanini-field/monitoring` + `/api/portal/khel/census`.
- **Monitoring API (`/api/app/kanini-field/monitoring` + `/api/portal/khel/monitoring`):** Portal JWT (`portal@marketlink`) → `reps` (`id/name/email/zone/status/on_route/last_sync_at/device/target/wards/color`) + `visits` (500 latest, `check_in_at/gps`). On-shift heuristic: `active && (on_route || last_sync<4h || todayVisits>0)`. Returns `visits[]` for timeline. Reps activated server-side (`6 active`, `zone = Kiambu - X/Y` with split above).

### 10.2 Kiambu-first Map (`/app/kanini-field/map`) — Track B MapLibre
- **Component:** `src/components/khel/kiambu-map.tsx` — **MapLibre GL + OpenFreeMap Positron** (`https://tiles.openfreemap.org/styles/positron`), **no token, unlimited free**, vector crisp. Center `[-1.033,37.07] z10` (Thika), `AttributionControl`. Falls back to Kiambu view when empty.
- **Wards:** `GET /geo/territory_wards.json` filtered to `zone Kiambu` (58 wards, 15→58 fix `e733c93`), `fill 0.06→0.18` + `line 1→2` when group filter active (`GROUP_COLORS A–G`). `fitBounds` pads 0.15 to 15 wards, maxZoom 11.
- **Routes:** `GET /api/portal/khel/routes` (`routes_master` 56 active across A–G: Peter/Evans/Nicole/Willys/Nelius triaged) → synthetic truck polylines (depot + 6 pins) `LineString` `line-width 4 opacity 0.85 rounded`. Dim not selected.
- **Trucks:** Per route head at start coord, **Uber/Bolt-style**: 34px circle, `GROUP_COLORS` fill + 3px white ring + heading triangle `svg M7 18V6l10 6z` rotated by `bearing(start,next)` (0–360°). Shadow `0 3px 10px`.
- **Outlet pins:** 11px dot white ring, colored by selected group; click → `Popup` + `onSelectPin`, also drives `RouteTimeline`.
- **Timeline (`src/components/khel/route-timeline.tsx`):** Mapsly borrow — `220px meta | 1fr lane`, ruler 07:00–18:00, `PX_PER_MIN 2.2` (1452px), major 1h + minor 30m ticks, **red now-line 2px** auto-scroll, per-rep lanes `stop-card w122 h42 absolute left=(min-START)*PX`, `completed` green 10% / `active` black + shadow, empty “No visits today”.

### 10.3 Census & Analytics
- `GET /api/portal/khel/census` (portal JWT) → outlets/visits/submissions/reps aggregated by channel/type/county/ward, `byStatus/byOutcome/totalOrders/timeline`, `mapPins`, filtered by `group` via `routes_master.rep_email`.
- `/app/analytics` FMCG engine (`pm-dash-kcard`, `pm-dash-qa-strip`) reads `GET /api/analytics/dimensions|uploads` — XLSX sales pipeline remains separate from field census.

## 11. Data handling — for managers (what, where, for how long)
### 11.1 What is stored where
- **PII (minimised):** `contactName, phonePrimary, optional email, consentRecord (scriptVersion, gps, enumeratorId, consentedAt, reuseAgreed)`. No ID numbers. Consent script read aloud §4.3; reuse tick is optional and recorded.
- **Phone:** `Hive pending_sync` (offline) → `Supabase` tables (`outlets, outlet_contacts, outlet_client_links, visits, shelf_photos, stock_observations, competitor_observations, order_intents, daily_submissions`). `SyncService.pushOrder` parents-before-children ensures FK. `supabase_service` `shelf-photos` bucket private `"$repId/$photoId.jpg"` (RLS per rep prefix, `upsert:true`, signedUrl 3600s).
- **Portal reads:** `createCensusClient()` logs in as `portal@marketlink` (JWT 50m cache `TOKEN_TTL_MS`) with `anonKey` + `Authorization Bearer token` — read-only for dashboards, not `service_role`. Verified `insert outlet → read back → delete` probe succeeded.
- **Photo split:** Metadata queues instantly; JPG may lag if offline in mall — portal shows placeholder until binary arrives (contract §5). Binary retry on next flush.

### 11.2 Retention & security (teach leads to teach reps)
- **On device:** `pending_sync` keeps history before `purgeSynced()` deletes only synced entries. `census_log outletId:date` enforces one-visit rule locally; never clear Hive/“Clear storage” or reinstall mid-wave — you lose queue. `device_id` is `SharedPreferences UUID` (reinstall generates new — ambiguous until merged server-side).
- **In cloud:** Supabase `auth` + `storage` private + `sync-push` (active rep check `403 Sync is available to active sales reps only` for portal — reps must be `status active` in `reps`, we activated all 6 on `Supabase reps.status='active'`). RLS scopes `reps`/`retailers` to JWT; portal can read outlets but `sync-push` rejects portal's JWT by design (fail-closed).
- **Privacy:** Outlet is canonical, client link is per-client (`OutletClientLink` 8 statuses). Consumer intercepts are **anonymous** `ConsumerInterceptModel` (no contact) — standalone, V1 hidden tab but code retained. `consentReuseAgreed` governs anonymized reuse.
- **Retention:** Daily submissions `status submitted` + `qualityFlags` kept for audit; back-checks `passed/failed` with `discrepancy` kept. No auto-delete; HQ decides purge policy. Advise reps: free-text `phone` is PII — do not photograph IDs, do not type ID numbers.

### 11.3 Quality & oversight (how to use flags)
Hard gates block until fixed (gpsGate, consent, photo_mandatory, one_visit_rule). Advisory flags feed supervisor `BackCheckModel` (10% deterministic `qualityService.dueForBackCheck`, `straightlining ≥5 identical`, `proximity >50m`, `speedFlag <4min`). `BackCheck` re-visits compare `businessMatches, openForBusiness, discrepancy`. Ratio dashboards in `/app/analytics/reports` will show `straightlining`/`proximity` per enumerator — use for coaching, not punishment in Wave 1. Thresholds all in `FieldConfig` (`gpsAcceptM 15, Warn 40, proximityRadiusM 50, minVisitDuration 4m, backCheckFraction 0.1, dailyTarget 30`) — bundled V1, future served by `NAMPARK /mobile/config`.

## 12. Provisioning & RMS sync
- **Field Team provisioning (`/app/admin/field-team`):** Proxies **NAMPARK RMS** `GET+POST /api/v1/admin/reps` via `NAMPARK_RMS_URL` + `REP_ADMIN_SECRET` (`Bearer`). Never writes RMS DB directly. `POST {action:create|deactivate, email, name?, phone?}` generates temp password `randomBytes(9).base64url` server-side (returned once to admin to hand to rep). Currently `.env.example` has `https://rms.example.com` placeholder — set real URL + secret in Vercel env to make RMS visible; until then `not_configured` is expected. Census `routes_master` + `reps` allocation above is independent of RMS reachability — map will still show Kiambu correctly.
- **Ingest (`POST /api/modules/nampark/ingest`):** Bearer token enforced in-route (`middleware.ts` allowlist), `ApiStatus` rate-limited, Zod `source default "nampark"` — RMS pushes `route-mapping metric_snapshot` events (idempotent by `metric_key` + `period`). Not the field census path.

## 13. Ops checklist for leads (print this)
- [ ] Before wave: verify `NAMPARK_RMS_URL` in Vercel, provision 6 reps (now active), print this manual + safety sheet, confirm safety phone numbers provisioned (else “pending” UI).
- [ ] Daily: brief 07:15, check **Rep monitoring** `onShift/offShift` + `todayVisits` vs 30, **Map** `Group` highlight to see coverage gaps across 12 sub-counties, midday count 12:30, debrief 17:15.
- [ ] End of day: every rep `Sync now` until `pending 0`, then `Close day & submit` → flag review, trigger back-checks for flagged 10%.
- [ ] Weekly: export `visits` + `categoryObservations` → `/app/analytics` XLSX upload → share report → coaching.

---

## Appendices

### A. Six Visit Outcomes (must pick exactly one)
`COMPLETE` (all questions answered) / `PARTIAL` (owner busy, some done) / `REFUSED` (no consent but observation preserved) / `CLOSED` (shut that day) / `NOT_AN_OUTLET` (not a flour seller) / `UNSAFE` (hostility — leave, flag, escalate to lead→Laban).

### B. Glossary
Outlet = shop; Channel = Grocery/Duka etc.; OutletType = kiosk/supermarket etc.; Ward/Beat = admin area; Shelf facing = brands on shelf; Stockout last 7d = was it missing this week; OrderIntent pending = ordered but not yet forwarded to distributor; Back-check = supervisor re-visit to verify.

### C. APK
`1.3.0+5` signed `2026-08-27 20:13 kanini-field-v1.3.0+5-release-official.apk` (54MB) — SUPABASE `zsprlozg…` baked. No rebuild needed after portal-only map changes; rebuild only if `apps/kanini-field/lib/*` or `.env` changes (then `flutter build apk --release --dart-define …`).

### D. Troubleshooting quick ref (admin)
Sync `no_connection` → offline; `Invalid or expired token` on `sync-push` → rep not `active` (reactivate in `reps` or RMS); `Premium` → provision real `NAMPARK_RMS_URL`; map grey → check `maplibre-gl.css` import, tile 200, `max-width:none`, `invalidateSize`.

---
*End. Questions: App Dev (Hive/Sync/MapLibre) + Product (SOP DayRhythm/Quality). Keep this manual with the APK in Drive; version it with each wave.*
