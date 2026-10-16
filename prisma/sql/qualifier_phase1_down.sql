-- Inquiry Qualifier — Phase 1 ROLLBACK
--
-- Drops ONLY the 8 tables created by qualifier_phase1_up.sql (with their
-- indexes, foreign keys and data). Touches nothing else. No CASCADE: if
-- anything unexpected depends on these tables, it stops instead of
-- spreading.
--
-- NOT for production unless Imran explicitly says so — the spec forbids DROP
-- on production. Turning the feature off is QUALIFIER_MODE=off; the tables
-- can stay (harmless).
--
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/qualifier_phase1_down.sql

BEGIN;

DROP TABLE IF EXISTS "qualifier_run_log";
DROP TABLE IF EXISTS "qualifier_audit";
DROP TABLE IF EXISTS "qualifier_notifications";
DROP TABLE IF EXISTS "qualifier_rules";
DROP TABLE IF EXISTS "inquiry_qualifications";
DROP TABLE IF EXISTS "agent_daily_digests";
DROP TABLE IF EXISTS "agent_time_off";
DROP TABLE IF EXISTS "agent_profiles";

COMMIT;
