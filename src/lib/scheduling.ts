import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/**
 * Local weekday number, Mon=1 .. Sun=7.
 */
export function localWeekday(d: Date): number {
  const wd = d.getDay(); // 0=Sun
  return wd === 0 ? 7 : wd;
}

/**
 * Normalizes a local calendar date to UTC midnight so it matches @db.Date storage.
 */
export function toDateOnlyUtc(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseDays(value: unknown): Set<number> {
  const set = new Set<number>();
  if (!Array.isArray(value)) return set;
  for (const item of value) {
    const idx = DAY_NAMES.indexOf(String(item));
    if (idx > 0) set.add(idx);
  }
  return set;
}

type UpsertParams = {
  date: Date;
  routeId: string;
  dayType: "ORDER_TAKING" | "DELIVERY";
  salesRepId: string | null;
  vehicleId: string | null;
};

/**
 * Creates or updates the scheduled assignment for a route/date.
 * Manual values the schedule cannot provide (vehicle on "any" routes,
 * driver assignment) are preserved on update.
 */
async function upsertDayAssignment({ date, routeId, dayType, salesRepId, vehicleId }: UpsertParams) {
  const where = { date_routeId: { date, routeId } };
  const existing = await prisma.dailyAssignment.findUnique({ where });

  if (existing) {
    const update: Record<string, unknown> = { dayType };
    if (dayType === "ORDER_TAKING" && salesRepId) update.salesRepId = salesRepId;
    if (vehicleId) update.vehicleId = vehicleId;
    await prisma.dailyAssignment.update({ where, data: update });
    return { created: false };
  }

  await prisma.dailyAssignment.create({
    data: {
      date,
      routeId,
      dayType,
      salesRepId,
      driverId: null,
      vehicleId,
      status: "PENDING",
    },
  });
  return { created: true };
}

/**
 * Ensures scheduled assignments exist for a single date for every active route,
 * based on its order-taking and delivery days. Idempotent.
 */
export async function generateAssignmentsForDate(date: Date) {
  const weekday = localWeekday(date);
  const dateOnly = toDateOnlyUtc(date);

  const routes = await prisma.route.findMany({
    where: { isActive: true },
    include: {
      salesRepRoutes: { take: 1 },
    },
  });

  let created = 0;
  let updated = 0;

  for (const route of routes) {
    const orderSet = parseDays(route.orderTakingDays);
    const deliverySet = parseDays(route.deliveryDays);
    const salesRepId = route.salesRepRoutes[0]?.salesRepId ?? null;
    const vehicleId = route.defaultVehicleId ?? null;

    if (orderSet.has(weekday)) {
      const res = await upsertDayAssignment({
        date: dateOnly,
        routeId: route.id,
        dayType: "ORDER_TAKING",
        salesRepId,
        vehicleId,
      });
      if (res.created) created++;
      else updated++;
    }

    if (deliverySet.has(weekday)) {
      const res = await upsertDayAssignment({
        date: dateOnly,
        routeId: route.id,
        dayType: "DELIVERY",
        salesRepId: null,
        vehicleId,
      });
      if (res.created) created++;
      else updated++;
    }
  }

  return { date: dateOnly.toISOString().split("T")[0], created, updated };
}

/**
 * Ensures scheduled assignments exist across a range of dates (inclusive).
 */
export async function generateAssignmentsForRange(start: Date, end: Date) {
  const results = [];
  let totalCreated = 0;
  let totalUpdated = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= endDay.getTime()) {
    const res = await generateAssignmentsForDate(cursor);
    totalCreated += res.created;
    totalUpdated += res.updated;
    results.push(res);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { days: results, totalCreated, totalUpdated };
}

/**
 * Convenience for callers that just want today's schedule ensured.
 */
export async function ensureTodayAndRollingWindow(daysAhead = 13) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  return generateAssignmentsForRange(start, end);
}
