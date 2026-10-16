# CRM automation API (Inquiry Qualifier)

The endpoints n8n uses for the Inquiry Qualifier (`PQT_LEAD_QUALIFIER_AGENT_SPEC.md`).
n8n never connects to the database; it only calls these.

## Switches (server env vars, set in Coolify)

| Variable | Meaning |
|---|---|
| `QUALIFIER_ENABLED` | `true` to allow anything at all. Anything else = every endpoint returns `503 QUALIFIER_DISABLED` and nothing is read or written. **The kill switch.** |
| `QUALIFIER_MODE` | `off` (default), `shadow` (save + notify, never assign) or `live`. `off` behaves like the kill switch. |
| `QUALIFIER_START_DATE` | e.g. `2026-11-01T00:00:00+03:00`. Older enquiries are never returned for processing. Required. |
| `AUTOMATION_API_SECRET` | Shared with n8n. Generate with `openssl rand -hex 64`. Keep it in Coolify / n8n credentials only. |

`live` mode isn't available yet: `POST /decisions` answers `501 LIVE_NOT_AVAILABLE`.
Assigning has to go through the CRM's existing `assignEnquiry()`, which
needs a logged-in user. Making it callable from automation means changing an
existing file, so it waits for the go-live step (spec Phase 9).

## Signing every request

```
X-PQT-Timestamp: <unix seconds>
X-PQT-Signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<METHOD>.<path with query>.<raw body>")>
```

- The path includes the query string, e.g. `/api/automation/inquiries/unqualified?limit=20`.
- GET requests sign an empty body, so the signed string ends in a `.`.
- Requests more than 5 minutes off the server clock get `401`.

Reference implementation and a test tool: `scripts/automation-request.ts`.

```bash
AUTOMATION_API_SECRET=... AUTOMATION_BASE_URL=https://crm.propertyquestturkey.com \
  npx tsx scripts/automation-request.ts GET /api/automation/rules
```

Limits: 120 requests per minute per IP (`429`), 256 KB body (`413`). Every
call (and every rejected call while the qualifier is on) is logged in
`qualifier_audit`, with ids and counts only.

## Endpoints

| | Endpoint | Notes |
|---|---|---|
| 1 | `GET /api/automation/inquiries/unqualified?limit=20` | Meta + website enquiries since the start date with no qualification yet, oldest first (max 100). Each has `possibleDuplicates`: other enquiries, leads or clients with the same email or the same last 10 phone digits. |
| 2 | `GET /api/automation/agents` | Active sales agents/managers and anyone with a profile: languages, countries, specialties, timezone, hours, availability, current/upcoming leave, open lead and enquiry counts, latest digest. `telegramChatId` is only included for senior consultants. |
| 3 | `POST /api/automation/qualifications` | One per enquiry. `201` = created; `200 created:false` = already existed, nothing changed. The tier must match the score under `rulesVersion` (`422 TIER_MISMATCH`). The CRM copies the ref, source and arrival time itself. |
| 4 | `POST /api/automation/notifications` | Log of a sent message. Give a `dedupeKey` (e.g. `new_inquiry:<enquiryId>:<chatId>`) so it can't be logged twice. A sent `new_inquiry` moves the qualification from `pending` to `notified`. |
| 5 | `POST /api/automation/decisions` | `{ enquiryId, chosenAgentId, telegramChatId, externalMessageId? }`. The chat must belong to an active senior consultant (`403` otherwise). The first decision stands; later presses return `alreadyDecided:true`. In shadow mode it only records (`assigned:false`). |
| 6 | `GET /api/automation/rules` | The active scoring rules version. |
| 7 | `POST /api/automation/digests` | `{ digests: [...] }`, max 200. Same agent and date again = update, not a new row. |
| 8 | `GET /api/automation/activity-summary?date=YYYY-MM-DD` | Per-agent counts for that Istanbul day: calls / emails / spoken / notes logged (from the `[CALL]` / `[EMAIL]` / `[SPOKEN]` contact-log notes), enquiries and leads touched, tasks done, enquiries assigned, leads created, deals won/lost, open leads now. |

### Avoiding duplicate Telegram messages

Post the qualification **before** sending the alert. Only send if the answer
was `201 created:true`. `200 created:false` means another run already
handled this enquiry.

## Admin screen

`/settings/qualifier` (Super Admin only) shows:
- the switches
- agent profiles, with working hours, leave and the senior-consultant tick
- the latest 50 results

It isn't in the sidebar yet, because adding it would mean editing an existing
file. Open it by URL, or approve the one-line sidebar change.
