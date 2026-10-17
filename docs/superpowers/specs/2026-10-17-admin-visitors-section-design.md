# Admin Visitors section

## Goal

Show Google Analytics numbers for the public pages inside the admin console, in plain terms, next
to the sign-ups they turn into. GA's own reports are hard to read; this page answers "how many
people visited, from where, what they did on the landing page, and how many signed up".

This is part 1 of the analytics plan. Part 2, the plain-language summary, gets its own spec once
this page shows real numbers. Part 3, sign-up source tracking, is done (storywall#65,
guestwall-be#35).

## Decisions

- **Order:** Visitors first; the summary is designed later.
- **GA access:** a Google Cloud service account with Viewer access on the GA4 property.
- **Blocks:** visitors and sources; pages, language and device; landing page behaviour; visitors
  to sign-ups.
- **Freshness:** Spring asks GA when the page opens and caches the answer for an hour per range.
  Refresh skips the cache. Nothing is stored in the database.
- **Placement:** its own "Visitors" sidebar item under Overview, after Growth.
- **Source names:** our sign-up channels (Ads, Social, Search, Email, Partner, Other site, Direct),
  sorted by the same rules as sign-ups, so visitors and sign-ups line up per channel.
- **How Spring talks to GA:** plain REST calls to the GA4 Data API with the existing `RestClient`
  and a service-account token from `google-auth-library-oauth2-http`. No gRPC client.

## Limits to keep in mind

- GA runs only on the public pages and checkout success, and only for visitors who allowed
  analytics cookies. Visitor numbers are lower than real traffic, and sign-ups per visit look
  higher than they really are. The page says so in one line.
- One visitor can arrive through two channels in the same range, so per-channel visitor counts
  can add up to more than the total. Channels therefore show **visits** (sessions); visitors appear
  only as the total.
- GA is usually a few hours behind. Today's numbers are partial.
- The landing event details (section, placement, plan, question) count only from the day they are
  registered as custom dimensions in GA. Before that those lists are empty.

## 1. Spring (guestwall-be)

### Configuration

| Setting | Env var | Meaning |
|---|---|---|
| `analytics.ga.property-id` | `GA_PROPERTY_ID` | the numeric GA4 property id |
| `analytics.ga.credentials` | `GA_SERVICE_ACCOUNT_JSON` | the service account key JSON |
| `analytics.ga.start-date` | `GA_START_DATE` | the day GA went live (ISO date); "all time" starts here |

All three set → connected. Any missing → the endpoint answers `configured: false` and makes no GA
call. Only production sets them; local and preview stay off.

### `GoogleAnalyticsClient`

- Loads `GoogleCredentials` from the JSON once, scoped to
  `https://www.googleapis.com/auth/analytics.readonly`, and refreshes the token when needed.
- `batchRunReports(List<ReportRequest>)` posts to
  `https://analyticsdata.googleapis.com/v1beta/properties/{id}:batchRunReports` (at most 5
  reports per call) and returns plain rows: dimension values and metric values as strings.
- Timeouts: 5 s connect, 15 s read. No retries.
- Any non-2xx or I/O failure → `GoogleAnalyticsUnavailableException`. The response body is logged
  at WARN without the credentials.

### Reports

Every report uses the same date range (`since`..`until`, inclusive, in the property's time zone).

| # | Dimensions | Metrics | Used for |
|---|---|---|---|
| 1 | `date` | `totalUsers`, `sessions` | daily line |
| 2 | — | `totalUsers`, `sessions` | totals (users can't be summed from days) |
| 3 | `sessionSource`, `sessionMedium` | `sessions` | visits per channel |
| 4 | `landingPage`, `deviceCategory` | `sessions` | pages, language, device |
| 5 | `eventName`, `customEvent:section`, `customEvent:placement`, `customEvent:plan`, `customEvent:question` | `eventCount`, `totalUsers` | landing events; filter `eventName` begins with `landing_` |

Reports 1–5 go in one `batchRunReports` call. Rows are capped at 1000 per report (`limit`).

### `GaSourceMapping`

Turns one GA `sessionSource` / `sessionMedium` pair into the `VisitSourceDto` that
`SignupSourceRules.classify(visit, false)` already takes, so both pages use one set of rules:

| GA medium | Becomes |
|---|---|
| `(none)` with source `(direct)` | nothing set → Direct |
| `organic` | `referrerHost` = the source as a host (`google` → `google.com`) → Search |
| `referral` | `referrerHost` = the source (`instagram.com`) → Social / Search / Other site |
| `cpc`, `ppc`, `paid`, `display`, `paid_social` | `utmSource` = source, `utmMedium` = medium, `adClick` true for `google / cpc` → Ads |
| anything else (`email`, `social`, a campaign medium…) | `utmSource` = source, `utmMedium` = medium → whatever the rules say |
| `(not set)` | Unknown |

Tested row by row against `SignupSourceRules`, so a rule change shows up in both places.

### `VisitorMetricsService`

- `visitors(since, until, fresh)`:
  - Not configured → `VisitorMetricsDto(configured = false)`, everything else empty.
  - `since` null ("all time") → `analytics.ga.start-date`. `until` null → today.
  - Runs the batch, then builds the DTO:
    - totals and the daily line from reports 1–2;
    - visits per channel from report 3 via `GaSourceMapping`, summed per channel;
    - sign-ups per channel from `FunnelMetricsService.channels(since, until)` for the same range;
    - landing pages from report 4: top 10 by visits, the rest summed as "Other";
    - language from report 4: a landing page under `/el` is Greek, everything else English;
    - device from report 4: `mobile` → Phone, `desktop` → Desktop, `tablet` → Tablet;
    - landing events from report 5, grouped by event: sections (with visitors reaching each, in
      page order), clicks per event and placement, plan clicks per plan, FAQ opens per question.
- Cached in a new Caffeine cache `gaVisitors` declared in `CacheConfig`: key `(since, until)`,
  1-hour expiry, at most 50 entries. `fresh = true` evicts the key before reading.
- `GoogleAnalyticsUnavailableException` is not cached.

### Endpoint

`GET /api/admin/metrics/visitors?since=YYYY-MM-DD&until=YYYY-MM-DD&fresh=true` on
`PlatformMetricsAdminController`, admin only like the other metrics. `since`/`until` optional,
`fresh` defaults to false. GA failure → `503` with the standard error body.

### DTO

```
VisitorMetricsDto
  configured: boolean
  since, until: LocalDate                  // the range actually used
  updatedAt: Instant                       // when GA was asked (the cached answer keeps it)
  visitors: long, visits: long, signups: long
  daily: [{ date, visitors, visits }]
  channels: [{ channel: SignupChannel, visits, signups }]   // every channel with visits or sign-ups
  pages: [{ page: String | null (null = Other), visits }]
  languages: [{ language: "el" | "en", visits }]
  devices: [{ device: "PHONE" | "DESKTOP" | "TABLET", visits }]
  landing:
    sections: [{ section, visitors }]
    clicks: [{ event: "create" | "plans" | "demo" | "login" | "nav", placement, count }]
    plans: [{ plan, count }]
    faq: [{ question: int, count }]
```

### Tests

- `GaSourceMappingTest`: every table row, run through `SignupSourceRules.classify`.
- `GoogleAnalyticsClientTest` with `MockRestServiceServer`: request body shape, bearer token
  header, 4xx/5xx/timeout → `GoogleAnalyticsUnavailableException`.
- `VisitorMetricsServiceTest`: not configured → no call; all time → start date; GA rows → DTO
  (top 10 + Other, language, device, landing groups, channel visits plus sign-ups); cache hit,
  `fresh` eviction, failure not cached.
- Controller test: admin only, 503 on GA failure, query params bound.

## 2. Front end (storywall)

### Data

- `lib/api/types.ts`: `VisitorMetricsDto` and its row types.
- `lib/api/endpoints.ts`: `admin.metrics.visitors(since, until, fresh)`, in the same
  `encodeURIComponent` array style as `funnel`.
- `hooks/useAdmin.ts`: `adminKeys.visitors(since, until)` and `useAdminVisitors(since, until)`,
  `placeholderData: keepPreviousData`. Refresh calls the endpoint with `fresh=true` and writes the
  result into the same key.
- Client fetch only. The admin console picks its section from the URL hash, which the server never
  sees, so there is nothing to prefetch (the Funnel works the same way).

### Placement

A "Visitors" item under Overview in the admin sidebar, after Growth, hash `#visitors`. The panel
is `components/admin/visitors/VisitorsPanel.tsx`, composed from small files in that folder; its
logic lives in hooks (`useVisitorsDashboard`) and `lib/adminVisitors.ts`.

### Layout (desktop first, admin slate look)

1. **Header:** title, "Updated hh:mm", Refresh — as on Growth. The Funnel's range control
   (All time, 30 days, 90 days, Year, Custom) reused as is. Under it, one line:
   "Counts only visitors who allowed analytics cookies."
2. **Totals:** one compact row — Visitors · Visits · Sign-ups · Sign-ups per 100 visits.
3. **Visitors over time:** a small daily line of visitors. No numbers around it that the totals
   already show.
4. **By source:** table Channel · Visits · Sign-ups · Sign-ups per 100 visits, channel names from
   `AdminPage.signupChannel`. A row with fewer than 50 visits gets a "Few visits" tag and no rate.
5. **Pages:** top landing pages with visits (route patterns, "Other" last). Beside it two
   percentage bars: Greek / English and Phone / Desktop / Tablet.
6. **Landing page:** four plain lists — how far visitors scroll (each section with the share of
   landing visitors who reached it, in page order), button clicks per placement, plan clicks per
   plan, FAQ opens per question. An empty list says "No data yet".

At phone width the blocks stack and tables scroll inside their own box.

### States

- Loading: skeletons in the block shapes.
- `configured: false`: one line, "Google Analytics isn't connected."
- Error (503 or network): "Couldn't load visitor numbers" with Retry.
- A range with no visits: the totals show 0 and every list shows "No data yet".

### Copy

All visible text in `messages/en.json` and `messages/el.json` under `AdminPage.visitors`, inserted
as text so the files keep their formatting.

### Tests

- `lib/adminVisitors.test.ts`: rate per 100 visits, "Few visits" rule, section order, percentages.
- `hooks/useAdminVisitors` test: key, endpoint, `fresh` on Refresh.
- `VisitorsPanel.test.tsx` with fixtures: loaded, not connected, error and Retry, empty lists,
  "Few visits" tag.
- Admin navigation test: the sidebar item opens `#visitors`.

## 3. Setup (done once by the owner)

1. In Google Cloud, create a service account (no roles needed) and a JSON key for it.
2. In GA4 Admin → Property access management, add the service account's email as **Viewer**.
3. In GA4 Admin → Custom definitions, add four event-scoped custom dimensions with these event
   parameters: `section`, `placement`, `plan`, `question`.
4. Enable the "Google Analytics Data API" in the same Google Cloud project.
5. In Railway (production), set `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON` and `GA_START_DATE`.

## Out of scope

- The plain-language summary (its own spec).
- Storing GA history in the database.
- Signed-in app traffic (GA does not run there).
- Real-time visitors.
