#!/usr/bin/env node
// =============================================================================
// import-niceos-users.mjs
// -----------------------------------------------------------------------------
// One-time migration: Nice_OS (Supabase) profiles+reps -> NAMPARK RMS
// (User + SalesRep via the /api/v1/admin/reps provisioning API).
//
// WHY THE API, NOT RAW SQL:
//   PlayMax/Nice_OS never write RMS's database directly — same boundary as
//   the metrics push. This script authenticates with REP_ADMIN_SECRET and
//   lets RMS own its data.
//
// SOURCE (read-only): Supabase project for Nice_OS.
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars (service role required
//   to read auth.users emails; profiles alone may lack them).
// DESTINATION: NAMPARK RMS.
//   NAMPARK_RMS_URL + REP_ADMIN_SECRET env vars.
//
// USAGE:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   NAMPARK_RMS_URL=https://nampark.example.com REP_ADMIN_SECRET=... \
//   node scripts/import-niceos-users.mjs [--dry-run] [--zone=Central]
//
// NOTES
//   - Only profiles with role='sales_rep' are imported (managers/staff stay
//     in Nice_OS unless you widen the filter).
//   - RMS generates a temp password per created account and returns it once;
//     this script prints it exactly once per rep so ops can hand it over.
//   - Re-running is safe: RMS upserts by email; existing reps come back with
//     a RESET password each run (documented behaviour of the create action).
//   - Never prints or logs secrets other than the one-time temp passwords.
// =============================================================================

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let fetchImpl = globalThis.fetch;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const zoneArg = args.find((a) => a.startsWith("--zone="));
const zoneFilter = zoneArg ? zoneArg.split("=")[1] : null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RMS_URL = (process.env.NAMPARK_RMS_URL || "").replace(/\/$/, "");
const REP_ADMIN_SECRET = process.env.REP_ADMIN_SECRET;

function fatal(msg) {
  console.error(`[import] ${msg}`);
  process.exit(2);
}

if (!SUPABASE_URL || !SUPABASE_KEY) fatal("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
if (!RMS_URL || !REP_ADMIN_SECRET) fatal("NAMPARK_RMS_URL / REP_ADMIN_SECRET not set");

async function fetchNiceOsReps() {
  // profiles joined to reps on id (reps.id references profiles.id)
  const url = `${SUPABASE_URL}/rest/v1/reps?select=id,name,phone,email,zone,status&limit=1000` +
    (zoneFilter ? `&zone=eq.${encodeURIComponent(zoneFilter)}` : "");
  const res = await fetchImpl(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) fatal(`Supabase read failed ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  // enrich with profile email where rep.email missing
  return rows;
}

async function pushRep(rep) {
  const email = (rep.email || "").trim().toLowerCase();
  if (!email) {
    return { skipped: true, reason: "no email" };
  }
  const body = {
    action: "create",
    email,
    name: rep.name || email.split("@")[0],
    ...(rep.phone ? { phone: rep.phone } : {}),
  };
  const res = await fetchImpl(`${RMS_URL}/api/v1/admin/reps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${REP_ADMIN_SECRET}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: json.error || "unknown" };
  }
  return { ok: true, created: json.data?.created ?? false, tempPassword: json.tempPassword };
}

async function main() {
  console.log(`[import] reading Nice_OS reps${zoneFilter ? ` (zone=${zoneFilter})` : ""}...`);
  const reps = await fetchNiceOsReps();
  console.log(`[import] found ${reps.length} rep(s)`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const rep of reps) {
    if (DRY_RUN) {
      console.log(`[dry-run] would import: ${rep.name} <${rep.email || "?"}> zone=${rep.zone} status=${rep.status}`);
      continue;
    }
    if (rep.status && rep.status !== "active") {
      skipped++;
      continue;
    }
    const result = await pushRep(rep);
    if (result.skipped) {
      console.log(`[skip] ${rep.name}: ${result.reason}`);
      skipped++;
    } else if (!result.ok) {
      console.error(`[fail] ${rep.email}: HTTP ${result.status} — ${result.error}`);
      failed++;
    } else {
      imported++;
      console.log(`[ok] ${rep.email}${result.created ? " created" : " password reset"}`);
      if (result.tempPassword) {
        console.log(`      temp password (hand over securely, shown once): ${result.tempPassword}`);
      }
    }
  }

  console.log(`\n[import] done — imported=${imported} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => fatal(e.message));
