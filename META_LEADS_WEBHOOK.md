# Connect Meta (Facebook / Instagram) Lead Ads to the CRM

When someone submits one of your **Lead Ads** forms on Facebook or Instagram, the
lead is delivered to the CRM automatically and appears under **Enquiries** with
source **Facebook / Meta** (status *New*). This guide wires that up end-to-end.

**Webhook endpoint (already built into the CRM):**
```
https://crm.propertyquestturkey.com/api/webhooks/meta-leads
```

## How it works (for context)
1. Meta calls the endpoint with a `leadgen` event — but the event only contains a
   `leadgen_id`, not the answers.
2. The CRM verifies the request signature, then calls Meta's Graph API with a
   **Page access token** to fetch the lead's fields (name, email, phone, custom
   questions).
3. The CRM creates an **Enquiry** and notifies the super-admins. Duplicate
   deliveries (Meta retries) are ignored via the `leadgen_id`.

---

## Step 1 — You need
- A Facebook **Page** running Lead Ads (and admin access to it).
- A **Meta app** at <https://developers.facebook.com> (Business type).
- Admin access to the CRM's server config (Coolify).

## Step 2 — Collect three secrets from Meta

| CRM env var | Where to get it |
|---|---|
| `META_APP_SECRET` | Meta app → **Settings → Basic → App Secret** (click *Show*). |
| `META_PAGE_ACCESS_TOKEN` | A **long-lived Page access token** with the `leads_retrieval` permission (see below). |
| `META_VERIFY_TOKEN` | **You invent this** — any random string (e.g. a 32-char password). You'll paste the same value into Meta in Step 4. |

**Getting the Page access token (recommended: a System User token — it doesn't expire):**
1. <https://business.facebook.com> → **Business Settings → Users → System Users** → add a system user (Admin).
2. **Add Assets** → assign your Facebook **Page** with full control.
3. **Generate New Token** → select your app → grant scopes:
   `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`.
4. Copy the token → this is `META_PAGE_ACCESS_TOKEN`.

*(Quick alternative for testing: Graph API Explorer → your app → your Page → the
same scopes → Generate Access Token. This token is short-lived.)*

## Step 3 — Set the env vars in the CRM (Coolify) and redeploy
Set these on the CRM service, then redeploy:
```
WEBHOOK_META_LEADS_ENABLED=true
WEBHOOK_META_LEADS_WRITE_ENABLED=true
META_VERIFY_TOKEN=<the random string you chose>
META_APP_SECRET=<from Meta>
META_PAGE_ACCESS_TOKEN=<from Meta>
META_GRAPH_API_VERSION=v21.0        # optional; default is v21.0
```
> Keep `WEBHOOK_META_LEADS_WRITE_ENABLED=false` first if you want to dry-run:
> the endpoint will verify and log incoming leads without creating enquiries.

**One-time DB step:** the new `FACEBOOK_ADS` enquiry source must exist in the
database. Either run `npm run db:push` against production once, or run this SQL on
the CRM database:
```sql
ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'FACEBOOK_ADS';
```

## Step 4 — Register the webhook in the Meta app
1. Meta app dashboard → **Webhooks** → select **Page** → **Subscribe to this object**.
2. **Callback URL:** `https://crm.propertyquestturkey.com/api/webhooks/meta-leads`
3. **Verify Token:** the exact `META_VERIFY_TOKEN` value from Step 3.
4. Click **Verify and Save** — Meta calls the endpoint (GET handshake); it should
   save successfully. If it fails, re-check the token matches and the CRM was
   redeployed with `WEBHOOK_META_LEADS_ENABLED=true`.
5. In the Page webhook fields, **subscribe to `leadgen`**.

## Step 5 — Subscribe your Page to the app
This tells Meta to actually send that Page's leads to your app. Easiest via the
Graph API (use your Page token):
```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps" \
  -d "subscribed_fields=leadgen" \
  -d "access_token=<META_PAGE_ACCESS_TOKEN>"
```
A `{"success": true}` response means the Page is connected. (You can also do this
from the app's Webhooks UI where it lists your Pages.)

## Step 6 — Test
1. Open the **Lead Ads Testing Tool**:
   <https://developers.facebook.com/tools/lead-ads-testing>
2. Select your Page + form → **Preview form** → **Create Lead** → submit.
3. Within a few seconds the lead should appear in the CRM under
   **Clients → Enquiries**, source **Facebook / Meta**, and super-admins get a
   "New Facebook lead" notification.
4. Filter Enquiries by **Source → Facebook / Meta** to see them.

## Backfill — import leads that came in *before* the webhook was connected
Meta only pushes **new** submissions to the webhook; it never replays past
leads. To pull historical leads into the CRM, call the one-time backfill
endpoint (it fetches every lead on the page's forms via the Graph API and
creates enquiries, deduped — safe to run repeatedly):

```bash
curl -X POST \
  "https://crm.propertyquestturkey.com/api/webhooks/meta-leads/backfill?page_id=<PAGE_ID>&secret=<META_VERIFY_TOKEN>"
```
- `secret` must equal `META_VERIFY_TOKEN`. Use `page_id=<PAGE_ID>` (e.g.
  `837714986098139`) to backfill all forms, or `form_id=<FORM_ID>` for one form.
- Response: `{ "created": N, "skipped": M, "forms": X, "leads": Y }`.
- Re-running is idempotent (`created: 0` the second time) and won't clash with
  the live webhook — both dedup on the Meta `leadgen_id`.
- Requires `META_PAGE_ACCESS_TOKEN` with `leads_retrieval` (same token the
  webhook uses). Backfilled leads land in Enquiries with source **Facebook /
  Meta** (no per-lead notification, to avoid spam).

---

## Notes & troubleshooting
- **App Review:** to receive leads from Pages in **production**, the app usually
  needs `leads_retrieval` approved via **App Review** and the business
  **verified**. While the app is in *Development mode*, leads work for Pages that
  users with a role on the app administer — enough to build and test.
- **No enquiries appear but the test tool succeeds:** confirm
  `WEBHOOK_META_LEADS_WRITE_ENABLED=true`, the Page is subscribed (Step 5), and
  the token has `leads_retrieval`. Check the CRM logs for the `[meta-leads webhook]`
  tag.
- **"Verify and Save" fails:** the `META_VERIFY_TOKEN` mismatch or the service
  wasn't redeployed with the flag on.
- **Security:** the endpoint rejects any POST without a valid
  `X-Hub-Signature-256` (signed with your App Secret). Keep all tokens in Coolify
  env — never in the website or a public repo. Rotate the Page token / App Secret
  if leaked (regenerate in Meta, update Coolify, redeploy).
- **Custom questions** on the form are preserved in the enquiry's message/notes;
  name, email and phone map to the enquiry's core fields.
