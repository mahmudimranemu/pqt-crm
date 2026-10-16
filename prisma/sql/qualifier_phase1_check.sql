-- Inquiry Qualifier — read-only check. Lists every table with its exact row
-- count. Run before and after the up script and compare: the only
-- differences must be the 8 new tables (qualifier_rules = 1 row, the rest 0).
-- `prisma db execute` doesn't print results, so run this with psql:
--   psql "$DATABASE_URL" -f prisma/sql/qualifier_phase1_check.sql

SELECT t.table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM %I.%I', t.table_schema, t.table_name),
                           false, true, '')))[1]::text::bigint AS row_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
