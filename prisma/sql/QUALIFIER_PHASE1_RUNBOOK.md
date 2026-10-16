# Inquiry Qualifier — Phase 1 runbook (new tables)

Plain-language steps for adding the qualifier tables. Nothing here changes
how enquiries arrive, how they're assigned, or any existing table.

## Files

| File | What it does |
|---|---|
| `qualifier_phase1_up.sql` | Creates the 8 new tables and seeds scoring rules version 1. Safe to run twice. |
| `qualifier_phase1_down.sql` | Removes only those 8 tables. For the scratch database; not for production without Imran's say-so. |
| `qualifier_phase1_check.sql` | Read-only: lists every table with its row count. Run before and after. |
| `agent_profiles_seed.csv` | Empty template for Imran to fill (one row per agent). |

The 8 tables: `agent_profiles`, `agent_time_off`, `agent_daily_digests`,
`inquiry_qualifications`, `qualifier_rules`, `qualifier_notifications`,
`qualifier_audit`, `qualifier_run_log`.

**Never use `prisma db push` on the CRM database.** It would also delete
tables that exist in the database but not in the code (`users_legacy`).

## 1. Rehearsal on a scratch copy (required first)

Needs Docker running, and the latest production dump (a `pg_dump` file).

```bash
# Start an empty throwaway Postgres (port 5433, so nothing clashes)
docker run -d --name qualifier-scratch -e POSTGRES_PASSWORD=scratch -p 5433:5432 postgres:15-alpine

# Restore the dump into it — plain .sql dump:
docker exec -i qualifier-scratch psql -U postgres < /path/to/crm_dump.sql
#   or a custom-format .dump:
#   docker exec -i qualifier-scratch pg_restore -U postgres -d postgres --no-owner < /path/to/crm.dump

SCRATCH="postgresql://postgres:scratch@localhost:5433/<db name in the dump>"

psql "$SCRATCH" -f prisma/sql/qualifier_phase1_check.sql > before.txt
DATABASE_URL="$SCRATCH" npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/qualifier_phase1_up.sql
psql "$SCRATCH" -f prisma/sql/qualifier_phase1_check.sql > after.txt
diff before.txt after.txt   # expect ONLY the 8 new tables (qualifier_rules = 1 row)

# Rollback test, then apply again
DATABASE_URL="$SCRATCH" npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/qualifier_phase1_down.sql
psql "$SCRATCH" -f prisma/sql/qualifier_phase1_check.sql | diff before.txt -   # expect no differences
DATABASE_URL="$SCRATCH" npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/qualifier_phase1_up.sql

docker rm -f qualifier-scratch   # throw the copy away
```

(No local `psql`? Use `docker exec -i qualifier-scratch psql -U postgres -d <db> < prisma/sql/qualifier_phase1_check.sql`.)

## 2. Production (only after the rehearsal, a fresh backup, and Imran's "go")

1. Imran confirms a fresh `pg_dump` of the CRM exists and gives the file name.
2. Run `qualifier_phase1_check.sql` → save as `prod_before.txt`.
3. Run `qualifier_phase1_up.sql` with `prisma db execute` inside the CRM container.
4. Run the check again → `prod_after.txt`; `diff` must show only the 8 new tables.
5. Smoke test: open Enquiries, an enquiry, Leads, a lead, Clients.

Undo in production = set `QUALIFIER_MODE=off`. The empty tables can stay.

## Filling `agent_profiles_seed.csv`

One row per agent or senior consultant. Use `;` between items in a list
(not commas).

| Column | Example |
|---|---|
| `crm_email` | the agent's CRM login email (how the row is matched to the user) |
| `name` | Ayşe Yılmaz |
| `role` | `agent` or `senior_consultant` |
| `languages` | `English;Turkish;Arabic` |
| `strong_countries` | `AE;SA;Gulf` |
| `specialties` | `citizenship;investment;high_budget;rental` |
| `timezone` | `Europe/Istanbul` |
| `working_days_and_hours` | `Mon-Fri 09:00-18:00;Sat 10:00-14:00` |
| `telegram_chat_id` | leave empty for now (filled in Phase 7) |
| `max_open_leads` | `40`, or empty for no limit |
