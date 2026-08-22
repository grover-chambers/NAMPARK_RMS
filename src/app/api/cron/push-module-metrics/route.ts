import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  resolveActiveTenant,
  computeDailyModuleMetrics,
  computeWeeklyModuleMetrics,
  formatWeek,
} from "@/lib/modules/route-mapping";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Outbound push: weekly route-mapping metric snapshot -> PlayMax ingest.
 * (spec step 3 / TENANT_MIGRATION_PLAN.md phase 4, lean scope)
 *
 * Auth: house-style CRON_SECRET bearer (matches weekly-snapshot route).
 *
 * Idempotency end-to-end:
 *  - event_id is a DETERMINISTIC UUIDv5 of `${tenantId}:${weekStart}` —
 *    cron retries within the same week produce the same event_id, and the
 *    PlayMax module_events ledger dedupes it.
 *  - Each attempt is recorded in sync_operations (PK = event_id) so ops can
 *    audit exactly what was pushed and when.
 *
 * Prerequisites (skips gracefully if unmet):
 *  - backfill script run (rows carry tenantId)
 *  - tenants.external_client_id set (= PlayMax client UUID)
 *  - PLAYMAX_INGEST_URL + MODULE_INGEST_SECRET configured
 */

const UUID_NAMESPACE = "6f1a0b3e-8c2d-4e7a-9b5f-0d3c2a1e4f6b";

function uuidV5(name: string, namespaceHex: string): string {
  const ns = Buffer.from(namespaceHex.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC variant
  const h = hash.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

interface PushResult {
  tenantId: string;
  eventId: string;
  period: string;
  status: number | null;
  duplicate: boolean;
  ok: boolean;
  reason?: string;
}

export async function GET(req: Request) {
  // ── House-style cron auth ──
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.log("CRON_SECRET env var not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tenant: { id: string; name: string; externalClientId: string | null };
  try {
    tenant = await resolveActiveTenant();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`[push-module-metrics] no-op: ${reason}`);
    return NextResponse.json({ ok: true, pushed: false, reason });
  }

  if (!tenant.externalClientId) {
    return NextResponse.json({
      ok: true,
      pushed: false,
      reason: "Tenant has no externalClientId (PlayMax activation pending)",
    });
  }

  const ingestUrl = process.env.PLAYMAX_INGEST_URL;
  const ingestSecret = process.env.MODULE_INGEST_SECRET;
  if (!ingestUrl || !ingestSecret) {
    return NextResponse.json({
      ok: true,
      pushed: false,
      reason: "PLAYMAX_INGEST_URL / MODULE_INGEST_SECRET not configured",
    });
  }

  // Nightly cadence (access-overview spec §2): push YESTERDAY's completed
  // day as one snapshot event. event_id is deterministic per day, so cron
  // retries within the same day dedupe on PlayMax's ledger.
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const periodDate = formatWeek(yesterday); // YYYY-MM-DD of the covered day

  const metrics = await computeDailyModuleMetrics(tenant.id, yesterday);
  if (metrics.length === 0) {
    return NextResponse.json({
      ok: true,
      pushed: false,
      reason: `No assignments for ${periodDate}`,
    });
  }

  const eventId = uuidV5(`${tenant.id}:${periodDate}`, UUID_NAMESPACE);
  const occurredAt = new Date().toISOString();

  let status: number | null = null;
  let duplicate = false;
  let ok = false;
  let reason: string | undefined;

  try {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ingestSecret}`,
      },
      body: JSON.stringify({
        event_id: eventId,
        source: "nampark",
        tenant_id: tenant.id,
        client_id: tenant.externalClientId,
        event_type: "route_metrics",
        occurred_at: occurredAt,
        period_label: periodDate,
        metrics,
      }),
      signal: AbortSignal.timeout(15000),
    });

    status = res.status;
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    duplicate = body.duplicate === true;
    ok = res.ok;

    if (!res.ok) {
      reason = `Ingest responded ${res.status}`;
      console.error("[push-module-metrics] ingest error:", res.status, body);
    }
  } catch (err) {
    reason = err instanceof Error ? err.message : String(err);
    console.error("[push-module-metrics] fetch failed:", reason);
  }

  // Ledger entry (idempotency key = event_id). Upsert keeps retries honest.
  await prisma.syncOperation.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      tenantId: tenant.id,
      entityType: "module_push",
      entityId: periodDate,
      operationType: "create",
      payload: { metricsCount: metrics.length, occurredAt },
      resultRef: { status, duplicate, ok, reason: reason ?? null },
      syncedAt: new Date(),
    },
    update: {
      resultRef: { status, duplicate, ok, reason: reason ?? null },
      syncedAt: new Date(),
    },
  });

  const result: PushResult = {
    tenantId: tenant.id,
    eventId,
    period: periodDate,
    status,
    duplicate,
    ok,
    reason,
  };

  return NextResponse.json(
    { ok, pushed: ok, result },
    { status: ok ? 200 : 502 },
  );
}
