-- Add shiftOpenTarget and shiftCloseTarget to sales_rep_shifts
ALTER TABLE "sales_rep_shifts" ADD COLUMN IF NOT EXISTS "shiftOpenTarget" TIMESTAMPTZ;
ALTER TABLE "sales_rep_shifts" ADD COLUMN IF NOT EXISTS "shiftCloseTarget" TIMESTAMPTZ;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "pushed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint")
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");

-- Indexes for push_subscriptions
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- Indexes for daily_assignments
CREATE INDEX IF NOT EXISTS "daily_assignments_date_idx" ON "daily_assignments"("date");
CREATE INDEX IF NOT EXISTS "daily_assignments_salesRepId_idx" ON "daily_assignments"("salesRepId");
CREATE INDEX IF NOT EXISTS "daily_assignments_driverId_idx" ON "daily_assignments"("driverId");
CREATE INDEX IF NOT EXISTS "daily_assignments_vehicleId_idx" ON "daily_assignments"("vehicleId");
CREATE INDEX IF NOT EXISTS "daily_assignments_status_idx" ON "daily_assignments"("status");

-- Indexes for orders
CREATE INDEX IF NOT EXISTS "orders_assignmentId_idx" ON "orders"("assignmentId");
CREATE INDEX IF NOT EXISTS "orders_customerName_idx" ON "orders"("customerName");

-- Indexes for missing_items
CREATE INDEX IF NOT EXISTS "missing_items_date_idx" ON "missing_items"("date");
CREATE INDEX IF NOT EXISTS "missing_items_routeId_idx" ON "missing_items"("routeId");
CREATE INDEX IF NOT EXISTS "missing_items_week_idx" ON "missing_items"("week");

-- Indexes for credit_sales
CREATE INDEX IF NOT EXISTS "credit_sales_accountId_idx" ON "credit_sales"("accountId");
CREATE INDEX IF NOT EXISTS "credit_sales_settled_idx" ON "credit_sales"("settled");

-- Indexes for account_block_events
CREATE INDEX IF NOT EXISTS "account_block_events_accountId_idx" ON "account_block_events"("accountId");

-- Indexes for account_unblock_requests
CREATE INDEX IF NOT EXISTS "account_unblock_requests_accountId_idx" ON "account_unblock_requests"("accountId");
CREATE INDEX IF NOT EXISTS "account_unblock_requests_status_idx" ON "account_unblock_requests"("status");

-- Indexes for account_open_log
CREATE INDEX IF NOT EXISTS "account_open_log_accountId_idx" ON "account_open_log"("accountId");

-- Indexes for account_alerts
CREATE INDEX IF NOT EXISTS "account_alerts_accountId_idx" ON "account_alerts"("accountId");
CREATE INDEX IF NOT EXISTS "account_alerts_acknowledged_idx" ON "account_alerts"("acknowledged");
