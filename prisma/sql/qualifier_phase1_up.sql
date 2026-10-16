-- Inquiry Qualifier — Phase 1: new tables only (PQT_LEAD_QUALIFIER_AGENT_SPEC.md)
--
-- Creates 8 NEW tables, their indexes, and seeds scoring rules version 1.
-- It does not alter, rename or drop anything that exists. The only statements
-- that mention an existing table are the three foreign keys from the new
-- agent_* tables to "users"; they live on the new tables and leave "users"
-- unchanged.
--
-- Safe to run twice (IF NOT EXISTS / ON CONFLICT DO NOTHING). One transaction:
-- if anything fails, nothing is applied.
-- Rollback: qualifier_phase1_down.sql
--
-- Apply (never `prisma db push` on this database — it would drop users_legacy):
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/qualifier_phase1_up.sql

BEGIN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strongCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "weeklySchedule" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isSeniorConsultant" BOOLEAN NOT NULL DEFAULT false,
    "telegramChatId" TEXT,
    "maxOpenLeads" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_time_off" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_daily_digests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "callsLogged" INTEGER NOT NULL DEFAULT 0,
    "notesLogged" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "inquiriesHandled" INTEGER NOT NULL DEFAULT 0,
    "leadsConverted" INTEGER NOT NULL DEFAULT 0,
    "dealsWon" INTEGER NOT NULL DEFAULT 0,
    "dealsLost" INTEGER NOT NULL DEFAULT 0,
    "avgFirstResponseMinutes" DOUBLE PRECISION,
    "openLeadCount" INTEGER NOT NULL DEFAULT 0,
    "rollingStats" JSONB,
    "lowData" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_daily_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inquiry_qualifications" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "enquiryRefId" TEXT,
    "enquirySource" "EnquirySource" NOT NULL,
    "enquiryCreatedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "scoreReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extractedData" JSONB,
    "aiSummary" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOf" TEXT,
    "suggestedAgentId" TEXT,
    "backupAgentId" TEXT,
    "suggestionReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestionScoreBreakdown" JSONB,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "finalAgentId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rulesVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiry_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qualifier_rules" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualifier_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qualifier_notifications" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "dedupeKey" TEXT,
    "externalMessageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" TEXT NOT NULL,
    "responseAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "qualifier_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qualifier_audit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "enquiryId" TEXT,
    "outcome" TEXT NOT NULL,
    "summary" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "qualifier_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "qualifier_run_log" (
    "id" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "note" TEXT,

    CONSTRAINT "qualifier_run_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_profiles_userId_key" ON "agent_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_profiles_telegramChatId_key" ON "agent_profiles"("telegramChatId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_time_off_userId_startsAt_idx" ON "agent_time_off"("userId", "startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_daily_digests_date_idx" ON "agent_daily_digests"("date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_daily_digests_userId_date_key" ON "agent_daily_digests"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inquiry_qualifications_enquiryId_key" ON "inquiry_qualifications"("enquiryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiry_qualifications_enquiryRefId_idx" ON "inquiry_qualifications"("enquiryRefId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiry_qualifications_status_idx" ON "inquiry_qualifications"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiry_qualifications_tier_qualifiedAt_idx" ON "inquiry_qualifications"("tier", "qualifiedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inquiry_qualifications_mode_qualifiedAt_idx" ON "inquiry_qualifications"("mode", "qualifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "qualifier_rules_version_key" ON "qualifier_rules"("version");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "qualifier_notifications_dedupeKey_key" ON "qualifier_notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_notifications_enquiryId_idx" ON "qualifier_notifications"("enquiryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_notifications_sentAt_idx" ON "qualifier_notifications"("sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_audit_createdAt_idx" ON "qualifier_audit"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_audit_enquiryId_idx" ON "qualifier_audit"("enquiryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_audit_action_createdAt_idx" ON "qualifier_audit"("action", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "qualifier_run_log_workflow_startedAt_idx" ON "qualifier_run_log"("workflow", "startedAt");

-- AddForeignKey (ADD CONSTRAINT has no IF NOT EXISTS, so check first)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_profiles_userId_fkey') THEN
    ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_time_off_userId_fkey') THEN
    ALTER TABLE "agent_time_off" ADD CONSTRAINT "agent_time_off_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_daily_digests_userId_fkey') THEN
    ALTER TABLE "agent_daily_digests" ADD CONSTRAINT "agent_daily_digests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Only one rules version may be active at a time. (Not expressible in Prisma;
-- this index is the one thing here the schema file doesn't describe.)
CREATE UNIQUE INDEX IF NOT EXISTS "qualifier_rules_one_active_key"
  ON "qualifier_rules"("isActive") WHERE "isActive";

-- Scoring rules version 1 = the defaults from spec Phase 3.
-- Budgets in USD. "bestCountries.countries" is empty until Imran supplies the
-- best-converting list. "usefulMessage.minChars" (40) is a placeholder — the
-- spec doesn't give a number; tune after the backtest.
INSERT INTO "qualifier_rules" ("id", "version", "rules", "isActive", "note")
VALUES (
  'qualifier_rules_v1', 1,
  '{
    "scoring": {
      "budget": [
        { "label": "Budget above $400k",   "gtUsd": 400000,                     "points": 30 },
        { "label": "Budget $150k–400k",    "gteUsd": 150000, "lteUsd": 400000,  "points": 20 },
        { "label": "Budget under $150k",   "ltUsd": 150000,                     "points": 5 }
      ],
      "timeline": [
        { "label": "Buying within 3 months", "lteMonths": 3,                  "points": 25 },
        { "label": "Buying in 3–6 months",   "gtMonths": 3, "lteMonths": 6,   "points": 12 }
      ],
      "purpose":         { "label": "Purpose is citizenship or investment", "values": ["citizenship", "investment"], "points": 15 },
      "bestCountries":   { "label": "Country is in the best-converting list", "countries": [], "points": 10 },
      "validPhone":      { "label": "Valid phone with country code", "points": 10 },
      "allAnswered":     { "label": "All form questions answered", "points": 10 },
      "usefulMessage":   { "label": "Message of useful length", "minChars": 40, "points": 5 },
      "fakeLooking":     { "label": "Fake-looking name or email", "points": -20 },
      "phoneInvalidOrMissing": { "label": "Phone invalid or missing", "points": -15 },
      "duplicate":       { "label": "Duplicate of an existing enquiry, lead or client", "action": "flag_only" }
    },
    "clamp": { "min": 0, "max": 100 },
    "tiers": { "hot": 80, "warm": 50, "cold": 20 }
  }'::jsonb,
  true,
  'Spec Phase 3 defaults'
)
ON CONFLICT ("version") DO NOTHING;

COMMIT;
