# FE integration guide: cost & volume dashboard

Five new admin-only endpoints under the existing `GET /api/admin/metrics` family, plus the
`storage` block already covered in `account-plans-disabled-and-platform-metrics-fe-integration.md`.
See `frontend-integration-guide.md` §0 for base setup (auth header, the RFC 7807 error envelope).
Nothing here changes any existing endpoint — this is additive.

There is **no digest-recipient, provider-token, or calendar-threshold management UI to build**. The
weekly email digest, the provider reconciliation job, and the calendar's load-coloring thresholds
are all config-driven on the backend (env vars); there is no admin endpoint to change any of them
from the UI. `/cost-summary`'s `providerActuals` is read-only, populated once the backend operator
sets a provider's token, and `/calendar`'s `thresholds` is read-only, sourced from that env config.

## Why

Follow-up to the "Per-Event Cost Model" work: instead of a one-off spreadsheet estimate, the admin
dashboard can now show live event volume by plan tier, its estimated cost, and — once provider
tokens are configured — the actual bill from Stripe/Railway/Vercel/Cloudflare/Brevo alongside it.

## 1. `GET /api/admin/metrics/events` — per-event list with quota

```
GET /api/admin/metrics/events?since=2026-06-01T00:00:00Z&until=2026-09-30T00:00:00Z&page=0&size=50&sort=DESC
→ 200 Page<EventDashboardRowDto>
```

Every event with `startAt` in the half-open range `[since, until)`, with its plan tier's quota
carried alongside it — no need to cross-reference the plan catalog per row. `size` is capped at
200 server-side; requesting more silently clamps rather than erroring.

- `since` — optional, defaults to 90 days ago.
- `until` — optional, open-ended (no upper bound) when omitted, and **exclusive** when present: an
  event starting exactly at `until` is not included. To get everything through the end of a
  calendar day, pass the *following* midnight, not that day's own midnight — e.g. for "through
  2026-09-30" pass `until=2026-10-01T00:00:00Z`, not `2026-09-30T00:00:00Z` (which would exclude
  every event later that same day). `400` if `until` is before the effective `since`.
- `sort` — `DESC` (default, furthest-future `startAt` first) or `ASC` (soonest first, for a
  "what's coming up" view). Controls `startAt` ordering only.

**Deliberately no title, no host.** Only an opaque `eventId` (useful for support/debugging, not
for display), plan code, event type, start date, and quota.

```jsonc
{
  "content": [
    {
      "eventId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "planTierCode": "PRO",
      "eventType": "WEDDING",
      "startAt": "2026-09-20T17:00:00Z",
      "storageQuotaBytes": 21474836480,
      "guestQuotaMax": 500
    },
    {
      "eventId": "...",
      "planTierCode": "BASIC",
      "eventType": "BIRTHDAY",
      "startAt": "2026-09-18T12:00:00Z",
      "storageQuotaBytes": 2147483648,
      "guestQuotaMax": 50
    }
  ],
  "totalElements": 1522,
  "totalPages": 31,
  "number": 0,
  "size": 50
}
```

`storageQuotaBytes` / `guestQuotaMax` follow the existing "null means unenforced" convention (see
`billing-fe-guide.md` §2) — render `null` as "Unlimited", not `0` or blank.

```ts
export interface EventDashboardRowDto {
  eventId: string;
  planTierCode: string;
  eventType: string;
  startAt: string;          // ISO 8601
  storageQuotaBytes: number | null;
  guestQuotaMax: number | null;
}
```

Use Spring's standard `Page<T>` envelope (`content`, `totalElements`, `totalPages`, `number`,
`size`, ...) exactly as `admin-list-endpoints-pagination-fe-integration.md` documents for the
other paginated admin list endpoints — same shape, same pagination params.

## 2. `GET /api/admin/metrics/calendar` — day-by-day range summary

```
GET /api/admin/metrics/calendar?since=2026-09-01T00:00:00Z&until=2026-10-01T00:00:00Z
→ 200 CalendarSummaryResponseDto
```

Returns an **envelope**, not a bare array: the day summaries plus the effective load-coloring
thresholds, so the calendar's legend can never drift from what the backend actually applied.

One row per calendar day (UTC) in the half-open range `[since, until)` that has **at least one
event** — a day with no events is simply absent from the array, not a zero-count row. Both `since`
and `until` are **required** (unlike `/events`, this endpoint has no default range). `until` is
**exclusive**, same convention as `/events` (§1) — to cover the whole month of September, request
`until=2026-10-01T00:00:00Z` (midnight on October 1st), not `2026-09-30T00:00:00Z`, which would
drop September 30th entirely. The span between `since` and `until` is capped at 400 days — a wider
request gets a `400`. `until` before `since` is also a `400`.

This is the admin calendar month/range view: one glance at event volume, plan mix, and quota load
per day, without opening each day's event list.

```jsonc
{
  "days": [
    {
      "date": "2026-09-14T00:00:00Z",
      "eventCount": 3,
      "planMix": { "BASIC": 1, "PLUS": 2 },
      "storageBytesTotal": 6442450944,
      "guestCapTotal": 350,
      "hasUnlimitedStorageQuota": false,
      "hasUnlimitedGuestCap": false
    },
    {
      "date": "2026-09-15T00:00:00Z",
      "eventCount": 1,
      "planMix": { "PRO": 1 },
      "storageBytesTotal": 21474836480,
      "guestCapTotal": 500,
      "hasUnlimitedStorageQuota": false,
      "hasUnlimitedGuestCap": false
    }
  ],
  "thresholds": {
    "lowMax": 10,
    "mediumMax": 30,
    "highMax": 50
  }
}
```

- `date` is always UTC midnight for that calendar day — compare it as a date, not a precise instant.
- `planMix` keys are plan tier codes; a tier absent from the map had zero events that day.
- `storageBytesTotal` / `guestCapTotal` sum that day's events' plan quotas. **Events on an
  unenforced (null-limit) plan contribute nothing to these totals** — same "null means unenforced,
  not zero or infinite" convention as `/events`'s per-row quota fields (§1), just summed instead of
  per-row.
- **`hasUnlimitedStorageQuota` / `hasUnlimitedGuestCap` are `true` when at least one event that day
  is on such an unenforced plan.** This is what makes the totals above honest: without these flags,
  a day with one unlimited-storage event and nine 10 GiB events would show the exact same
  `storageBytesTotal` as if that tenth event didn't exist, with nothing to indicate the number is a
  floor, not the whole picture. Render the total as "≥ N" (or append a "+") whenever its matching
  flag is `true`, rather than presenting it as complete.
- **`thresholds` — the event-count cutoffs for a day's low/medium/high load color** (`eventCount <=
  lowMax` → low, `<= mediumMax` → medium, `<= highMax` → high, above `highMax` → an "overloaded" tier
  if the design calls for one). These are **backend config**
  (`CALENDAR_LOAD_LOW_MAX`/`CALENDAR_LOAD_MEDIUM_MAX`/`CALENDAR_LOAD_HIGH_MAX` env vars), not
  something to hardcode or read from a frontend `NEXT_PUBLIC_*` var — those bake into the client
  bundle at build time, so a threshold change would need a frontend rebuild and redeploy just to
  move a color boundary. **Read `thresholds` from every `/calendar` response and use it to both
  color the days and render the legend**, rather than hardcoding `10`/`30`/`50` client-side — that
  guarantees the legend can never disagree with the colors, even right after an operator changes a
  threshold with no frontend deploy at all. There is no admin endpoint to edit these values — they
  are read-only from the UI's side, config-only.

```ts
export interface CalendarDaySummaryDto {
  date: string;                    // ISO 8601, UTC midnight
  eventCount: number;
  planMix: Record<string, number>; // plan tier code -> event count
  storageBytesTotal: number;       // a floor, not exact, when hasUnlimitedStorageQuota is true
  guestCapTotal: number;           // a floor, not exact, when hasUnlimitedGuestCap is true
  hasUnlimitedStorageQuota: boolean;
  hasUnlimitedGuestCap: boolean;
}

export interface CalendarLoadThresholdsDto {
  lowMax: number;    // eventCount <= lowMax -> "low"
  mediumMax: number; // eventCount <= mediumMax -> "medium"
  highMax: number;   // eventCount <= highMax -> "high"; above highMax -> "overloaded" if used
}

export interface CalendarSummaryResponseDto {
  days: CalendarDaySummaryDto[];
  thresholds: CalendarLoadThresholdsDto;
}
```

## 3. `GET /api/admin/metrics/calendar/{date}/events` — day drawer

```
GET /api/admin/metrics/calendar/2026-09-14/events?page=0&size=50
→ 200 Page<EventDashboardRowDto>
```

The drawer behind a `/calendar` day cell: every event whose `startAt` falls on that UTC calendar
day, **soonest-first** (`startAt` ascending — always, no `sort` param here), same
`EventDashboardRowDto` shape and pagination envelope as `/events` (§1), including the same "no
title, no host" privacy shape and the same `storageQuotaBytes`/`guestQuotaMax` null-means-unenforced
convention. `date` is a path segment in `YYYY-MM-DD` form and is always interpreted as a UTC day —
the same UTC boundary `/calendar`'s `date` field uses, so a day cell's `date` value can be truncated
to `YYYY-MM-DD` and passed straight into this endpoint's path without a timezone conversion.

## 4. `GET /api/admin/metrics/timeline` — weekly volume + estimated cost by plan

```
GET /api/admin/metrics/timeline?weeks=12
→ 200 PlanTimelineRowDto[]
```

One row per `(planTierCode, weekStart)` combination that had at least one event, `weeks` back from
now (default 12, capped at 104). A tier with zero events in a given week simply has no row for that
week — don't assume every tier appears in every week's bucket.

**`weekStart` is the week the event was *created* (sold), not the week it happens.** An event's
`startAt` (the wedding/party date) is routinely weeks or months in the future relative to when it
was bought, so bucketing by `startAt` would scatter one week's sales across every future week those
events are scheduled for — the volume/cost trend would then include events from months out under
"this week," and a week's total would barely differ from a month's. Bucketing by `createdAt`
instead makes each event land in exactly one bucket — the week it actually became a sale — and
since `createdAt` can never be in the future, there's nothing to bound on the far end. If a
"what's coming up" view is needed instead, that's what `/events` is for (§1) — it's the
`startAt`-keyed one.

```jsonc
[
  { "planTierCode": "BASIC", "weekStart": "2026-08-24T00:00:00Z", "eventCount": 14, "estimatedCostMinor": 3542, "currency": "EUR" },
  { "planTierCode": "PLUS",  "weekStart": "2026-08-24T00:00:00Z", "eventCount": 6,  "estimatedCostMinor": 3390, "currency": "EUR" },
  { "planTierCode": "PRO",   "weekStart": "2026-08-31T00:00:00Z", "eventCount": 2,  "estimatedCostMinor": 4482, "currency": "EUR" }
]
```

This is the shape for a stacked bar / line chart of volume over time, and `estimatedCostMinor`
summed per week is the shape for a cost-over-time chart. **`estimatedCostMinor` is a self-computed
estimate, not an invoice figure** — see `costEstimationService`'s constants in
`docs/cost-tracking.md` if a "why does this number look off" question comes up; it will move when
those admin-configured constants change, independent of any code deploy.

```ts
export interface PlanTimelineRowDto {
  planTierCode: string;
  weekStart: string;        // ISO 8601, always a Monday — week the event was created, not startAt
  eventCount: number;
  estimatedCostMinor: number;
  currency: string;
}
```

## 5. `GET /api/admin/metrics/cost-summary` — estimated vs. actual

```
GET /api/admin/metrics/cost-summary
→ 200 CostSummaryResponseDto
```

```jsonc
{
  "weekEstimatedCostMinor": 6932,
  "monthEstimatedCostMinor": 28450,
  "currency": "EUR",
  "providerActuals": [
    {
      "provider": "STRIPE",
      "periodStart": "2026-09-01T00:00:00Z",
      "periodEnd": "2026-09-08T00:00:00Z",
      "amountMinor": 4120,
      "currency": "EUR",
      "detail": { "transactionCount": 47 },
      "fetchedAt": "2026-09-08T08:15:03Z"
    },
    {
      "provider": "BREVO",
      "periodStart": "2026-09-01T00:00:00Z",
      "periodEnd": "2026-09-08T00:00:00Z",
      "amountMinor": null,
      "currency": null,
      "detail": { "plan": { "type": "free" }, "email": "billing@example.com" },
      "fetchedAt": "2026-09-08T08:15:04Z"
    }
  ]
}
```

**`providerActuals` only contains providers that have actually been reconciled at least once** —
a provider whose token isn't configured yet is *absent from the array entirely*, not present with
a zero or null amount. Don't render a fixed five-row provider table; render whatever the array
contains, and treat a missing provider as "not yet configured" rather than "$0 spent."

**`amountMinor` can be `null` even for a provider that *is* present** — Cloudflare R2 and Brevo
don't expose a spend figure through their APIs. Cloudflare's `amountMinor` is a usage-derived
*estimate* (tagged as such in `detail.note`), and Brevo's is always `null` with plan/credit info in
`detail` instead. Render those two providers' cards differently (usage figures, not a $ total)
rather than expecting every provider to produce a comparable currency amount.

```ts
export interface ProviderActualDto {
  provider: string;               // "STRIPE" | "RAILWAY" | "VERCEL" | "CLOUDFLARE_R2" | "BREVO"
  periodStart: string;
  periodEnd: string;
  amountMinor: number | null;
  currency: string | null;
  detail: Record<string, unknown>;
  fetchedAt: string;
}

export interface CostSummaryResponseDto {
  weekEstimatedCostMinor: number;
  monthEstimatedCostMinor: number;
  currency: string;
  providerActuals: ProviderActualDto[];
}
```

## Notes

- All five endpoints are `ROLE_ADMIN`-only (`403` otherwise), same as the existing
  `GET /api/admin/metrics`.
- Every figure is computed live on each call, same tradeoff as the existing metrics snapshot — fine
  for a dashboard refresh, not something to poll on a tight interval.
- `/cost-summary` and `/timeline` never call out to Stripe/Railway/Vercel/Cloudflare/Brevo directly;
  they only read the `provider_cost_snapshots` rows the backend's weekly reconciliation job already
  wrote. A freshly deployed environment with no provider tokens configured yet will return an
  empty `providerActuals` array — that's the expected first-run state, not an error.
- Minor units throughout (`*Minor` fields = cents), same convention as every other billing figure
  in this API — see `billing-fe-guide.md` for the shared money-formatting helper.
- **Every `until` param in this API (`/events`, `/calendar`) is exclusive.** A half-open range
  `[since, until)`, consistently — get in the habit of passing the *next* boundary (next midnight,
  next day) rather than the last instant you want included.

## Checklist

- [ ] Build the "traffic" table/list from `/events`, rendering `storageQuotaBytes`/`guestQuotaMax`
      nulls as "Unlimited"; wire up `since`/`until`/`sort` if the list supports a date range or
      soonest/furthest toggle, remembering `until` is exclusive.
- [ ] Build the calendar month/range view from `/calendar` (note: response is `{ days, thresholds }`,
      not a bare array), rendering `planMix` per day cell, treating a day absent from `days` as zero
      events (not an error or a loading gap), and rendering `storageBytesTotal`/`guestCapTotal` as a
      floor ("≥ N") whenever `hasUnlimitedStorageQuota`/`hasUnlimitedGuestCap` is `true`.
- [ ] Color each day cell and render the legend from the response's own `thresholds` — never
      hardcode `10`/`30`/`50` client-side or read them from a `NEXT_PUBLIC_*` var; they're backend
      config and read-only from the UI.
- [ ] Wire the day-cell click-through to `/calendar/{date}/events` for the drawer, reusing the same
      row rendering as `/events` (§1) since the DTO shape is identical.
- [ ] Build the volume/cost-over-time chart from `/timeline`, grouping by `weekStart` on the x-axis
      and `planTierCode` as the series key; handle tiers with gaps in their weekly coverage.
- [ ] Build the cost-summary tile(s) from `/cost-summary`, rendering `providerActuals` as a
      variable-length list (not a fixed provider grid) and handling `amountMinor: null` as a
      usage-only card rather than "$0".
- [ ] No recipient/token settings UI needed — both are backend env-var config, not admin-editable
      through the API.
