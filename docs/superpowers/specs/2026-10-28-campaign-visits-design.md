# Campaign visits

## Goal

Count what happens before sign-up for every saved campaign link: visits, unique visitors, and the
landing page's Create, Plans and plan clicks. Show it next to the sign-ups, paid hosts and revenue
the Campaigns section already has, plus an overview page with charts.

Today the Campaigns table starts at sign-up. Vercel Web Analytics sees the visits but has no API to
read them back, and GA only counts visitors who accepted cookies. So Spring counts them itself,
without cookies, the way Vercel and Plausible do.

## Decisions

- **Which values:** only utm values that match a saved campaign link. Typed or unknown values are
  ignored, so nobody can add rows to the table.
- **Visit:** a page load that arrives from a campaign link. The same visitor arriving on the same
  link again within 30 minutes of their last arrival is not a new visit (the window slides, like a
  GA session).
- **Visitor:** a person's first visit of the day on a link. Days run on Athens time. Over a range,
  visitors are the sum of each day's visitors; someone who comes on two days counts twice.
- **Clicks:** "Landing Create", "Landing Plans" (the See plans button) and "Landing Plan" (a
  specific plan picked), each counted once per visitor per day per link. Three separate counts.
- **Breakdowns:** device (phone, tablet, desktop) and language (Greek, English) for every visit.
- **No cookies, no storage on the device.** Not gated on consent; the cookie banner doesn't change.
- **Layout:** a new "Campaign overview" sidebar item with the totals, a daily chart and the
  breakdowns. The Campaigns section keeps the table (with new columns) and the link drawer (with
  that link's own chart and breakdowns). The Campaigns section gets no summary at its top.

## 1. Browser (storywall)

### When it sends

- **Visit:** on a landing page (`isLandingPath`) whose URL has `utm_source`, `utm_medium` and
  `utm_campaign`. Saved links always have all three and only point at landing pages. The values are
  read from this page load's URL, separately from the sign-up source's "first visit wins" rule:
  each arrival counts for its own link. A client-side navigation to a URL that carries utm values
  counts as an arrival too (Spring's 30-minute rule absorbs repeats).
- **Click:** when `trackLandingClick` sends `create`, `plans` or `plan`, and this page load arrived
  from a campaign link. The campaign is kept in page memory for the visit, so in-site navigation
  between landing pages keeps it.

Nothing is sent when the page load has no campaign. Nothing is written to cookies, localStorage or
sessionStorage. The utm values stay in the address bar (GA and Vercel read them).

### What it sends

`POST {NEXT_PUBLIC_API_BASE_URL}/api/public/campaign-visits`, straight to Spring, with
`fetch(..., { keepalive: true, credentials: 'omit' })` so a click that leaves the page still
arrives. Errors are swallowed; counting never affects the page.

```json
{ "kind": "VISIT", "utmSource": "instagram", "utmMedium": "social", "utmCampaign": "spring-2027", "language": "el" }
```

- `kind`: `VISIT`, `CREATE`, `PLANS` or `PLAN`.
- utm values: trimmed, capped at 100 characters, as in `lib/signupSource.ts`.
- `language`: the page's locale (`el` or `en`).

Device is not sent; Spring works it out from the `User-Agent` header.

### Files

- `lib/campaignVisits.ts`: read a campaign from a URL, remember it for the visit, build and send
  the request.
- `hooks/useCampaignVisitTracking.ts` (mounted from a small `CampaignVisitTracker` in
  `PublicProviders`, next to `SignupSourceTracker`): sends the visit on each landing page load.
- `lib/landingTracking.ts`: `trackLandingClick` also reports `create`, `plans` and `plan` clicks.
- `lib/api/endpoints.ts`: the new public endpoint.

## 2. Count (Spring, guestwall-be)

### Endpoint

`POST /api/public/campaign-visits`, `permitAll`, `@RateLimit(name = "campaignVisits.record",
limit = 120, windowSeconds = 60)` per IP. That leaves room for a room full of guests on one
venue Wi-Fi scanning a QR code. It always answers `204`, whether the request counted or not, so
it reveals nothing about which links exist. Invalid bodies are ignored with `204` too.

It ignores the request when:

- no saved `CampaignLink` has those three values;
- `User-Agent` is missing or looks like a bot or link preview (a case-insensitive list in a
  `BotUserAgents` class: `bot`, `crawler`, `spider`, `headless`, `preview`, `facebookexternalhit`,
  `slurp`, `lighthouse`, and similar);
- a click arrives for a visitor with no visit on that link today (see below).

### Visitor key

`SHA-256(daily salt + client IP + User-Agent + link id)`, hex. The IP comes from
`ClientAddressResolver`, which already handles Railway's edge. The IP and User-Agent are never
stored.

The salt is 32 random bytes per Athens day, created on the day's first request. Salts from earlier
days are deleted, so yesterday's keys can't be rebuilt. Several app instances share it through the
database.

### Tables

One Flyway migration (the next free number):

- `campaign_visit_salts` — `day date primary key`, `salt bytea not null`. Only today's row is kept.
- `campaign_visitor_days` — today's working state: `day date`, `visitor_key varchar(64)`,
  `link_id uuid`, `last_arrival_at timestamptz`, `clicked_create`, `clicked_plans`, `clicked_plan`
  (booleans). Primary key `(day, visitor_key, link_id)`. Rows from earlier days are deleted.
- `campaign_visit_events` — the counts, kept for good: `id uuid`, `kind varchar(10)`
  (`VISIT`, `CREATE`, `PLANS`, `PLAN`), `utm_source`, `utm_medium`, `utm_campaign`
  (`varchar(100)`), `new_visitor boolean` (true on a day's first visit; false on repeat visits and
  on clicks), `device varchar(10)` (`PHONE`, `TABLET`, `DESKTOP`), `language varchar(2)`,
  `occurred_at timestamptz`. Indexes on `occurred_at` and on `(utm_source, utm_medium,
  utm_campaign, occurred_at)`. No identifier of any kind.

Events store the utm values rather than the link id, like the sign-up source. Deleting a link keeps
its numbers; the row then shows as "Not saved", the same as sign-ups do today. New visits to a
deleted link stop counting (only saved links count), while its sign-ups still count. The delete
confirmation says so: "The link keeps working. Its past numbers and new sign-ups still count, but
new visits don't."

### Recording

- **Visit:** look up today's `campaign_visitor_days` row.
  - None: insert it and write a `VISIT` event with `new_visitor = true`.
  - `last_arrival_at` more than 30 minutes ago: write a `VISIT` event with `new_visitor = false`.
  - Otherwise: no event.
  - In every case, set `last_arrival_at` to now.
- **Click:** if today's row exists and its flag for that kind is false, set the flag and write the
  event. Otherwise nothing.

Concurrent requests for the same key use an upsert on the primary key, so two tabs can't both
create a "new visitor".

### Cleanup

A scheduled job at 00:05 Athens time deletes salts and `campaign_visitor_days` rows from earlier
days. Recording only ever reads today's rows, so a missed run changes no counts.

### Device

From `User-Agent`: `iPad`, `Tablet`, or `Android` without `Mobile` → `TABLET`; `Mobi`, `iPhone` or
`Android` → `PHONE`; anything else → `DESKTOP`.

## 3. Report (Spring)

### Campaigns table

`GET /api/admin/metrics/campaigns` (`CampaignReportService`): each `CampaignRowDto` gains
`visits`, `visitors`, `createClicks`, `plansClicks` and `planPicks` for `[since, until)`. A row
appears when it has a saved link, a sign-up or a visit. Rows sort by visits, then sign-ups, then the
current tie-breakers.

### Overview

`GET /api/admin/metrics/campaigns/overview?since&until[&link={id}]`. Without `link` it covers every
row the table would show except rows with sign-ups only and no saved link or visit; with `link` it
covers that one link's values.

```json
{
  "visits": 1240, "visitors": 980, "createClicks": 139, "plansClicks": 62, "planPicks": 20,
  "signedUp": 42, "paidHost": 9, "revenueMinorByCurrency": { "EUR": 131000 },
  "daily": [{ "date": "2027-03-01", "visits": 40, "visitors": 33 }],
  "devices": [{ "device": "PHONE", "visits": 900 }],
  "languages": [{ "language": "el", "visits": 1100 }]
}
```

`daily` groups by Athens day and lists every day in the range, with zeros where nothing happened.
With an open start it begins at the first event's day. Sign-ups, paid hosts and revenue come from
the same `FunnelMetricsRepository` queries the table uses.

## 4. Admin (storywall)

### Campaign overview (new sidebar item)

- `AdminTab` `campaignOverview`, hash `#campaign-overview`, label "Campaign overview", placed just
  before Campaigns.
- Header and range: `FunnelHeader` and `FunnelRangeControl` with its own `useFunnelRange`, as in
  Visitors.
- **Funnel tiles:** one grid. Visits, Visitors, Create, Plans, Plan picked, Signed up, Paid and
  Revenue. The Create, Plans, Plan picked, Signed up and Paid tiles also show their share of
  visitors. There's no separate
  totals row; this grid holds the totals.
- **Daily chart:** visits and visitors per day, reusing `VisitorsDaily` (its `daily` shape matches).
- **Device and language:** visits split by each, reusing the Visitors split rows where their props
  fit.
- Loading, error and empty states like `VisitorsPanel`. Empty: "No campaign visits in this range."

### Campaigns section

- **Table:** new columns Visits, Visitors, Create, Plans and Plan picked, before Signed up.
- **Link drawer:** a stats block above the name field, for the table's current range, showing that
  link's funnel tiles, daily chart and device/language splits. It uses the same components as the
  overview, fed by the overview endpoint with `link`.

### Files

- `hooks/useAdminCampaignOverview.ts` (query key factory exported), `hooks/useCampaignOverview.ts`
  (range + query + plain values for the panel).
- `components/admin/campaigns/overview/`: `CampaignOverviewPanel`, `CampaignFunnelTiles`,
  `CampaignSplits`, `CampaignOverviewSkeleton`.
- `CampaignsTable.tsx`, `CampaignLinkDrawer.tsx`, `AdminNavigationContext.tsx`, `AdminConsole.tsx`,
  `lib/api/types.ts`, `lib/api/endpoints.ts`.
- `messages/en.json` and `messages/el.json`: every new label, in both languages.

### Data fetching

No server prefetch: the admin console picks its section from the URL hash, which the server never
sees, the same as every other admin section.

## 5. Privacy

- No cookie or device storage, so no consent is needed.
- The IP address is used only to compute the daily key and is never stored. The key itself is
  deleted after the day, with the salt that made it.
- Stored events hold no identifier: only the campaign, the kind, device type, language and time.
- **Owner action:** add one line to the privacy policy about cookieless campaign counting. Legal
  documents are versioned in the admin console, so this isn't part of the code change.

## 6. Limits to keep in mind

- Visitors over a range add up per day, so one person across a week can count up to seven times.
- Two people on the same network with the same browser version count as one visitor that day.
- A click just after Athens midnight, from a visit that started before it, isn't counted (the visit
  belongs to the previous day).
- Ad blockers that block requests to the API domain hide those visits. They're also hidden from
  Vercel and GA.
- Sign-ups come from the account's own first-visit source, which may be up to 30 days older than
  the visits in the range. Shares of visitors are a guide, not an exact conversion rate.

## 7. Rollout

Spring ships first. Until it's deployed, the browser's requests get a 404, which is swallowed.
Staging and production count separately, each in its own database.

## 8. Testing

- **storywall (Vitest):** reading a campaign from a URL (all three values required, caps); a visit
  sent once per landing page load and never without a campaign; clicks sent only with a campaign in
  page memory; nothing written to cookies or storage; new columns and overview states render.
- **guestwall-be:** unknown link ignored; bot user agents ignored; 30-minute window (inside, just
  outside, sliding); first visit of the day sets `new_visitor`; one click event per visitor, day and
  kind; click without a visit ignored; salt rotation and cleanup; device parsing; report and
  overview totals, daily zeros and Athens day boundaries; rate limit and always-`204`.

## Out of scope

- Values that don't match a saved link.
- Page views beyond the arrival, scroll depth and FAQ events.
- Changes to GA, Vercel Web Analytics or the Visitors section.
- No new public routes, so no SEO impact.
