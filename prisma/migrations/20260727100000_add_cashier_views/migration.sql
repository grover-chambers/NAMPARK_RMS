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
