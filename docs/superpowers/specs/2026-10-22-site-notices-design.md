# Site notices — design

Date: 2026-10-22
Status: approved design; plans in `docs/superpowers/plans/2026-10-22-site-notices-{backend,frontend}.md`

## Changes made while planning

These replace the matching parts below:
- **Storage:** messages and link labels are stored as JSON maps (`message`, `link_label`, keyed `en`/`el`), not as separate columns.
- **Paths:** `/api/admin/site-notices` (GET, POST, PUT `{id}`, DELETE `{id}`) and public `GET /api/public/site-notices`.
- **Dismissals:** kept in a cookie (`site_notice_dismissed`, newest 20 `id:version` keys, one year), not localStorage. The layouts read it on the server, so a closed notice never flashes on load.
- **Mounting:**
  - The bar mounts once per root layout. `(landing)` uses `PUBLIC`.
  - `(main)` wraps the whole page in a frame and works out the area from the path, sign-in state and event role (`siteNoticeAreaFor` in `lib/siteNotices.ts`). Event pages use `PENDING`, which shows only `EVERYWHERE` notices, until the role is known. Pages whose area depends on sign-in (app, event, invite and post pages) also use `PENDING` until the session is known, since the server render has no session. Post pages stay on `PENDING`, because the URL doesn't name the event.
  - Story and slideshow views need no code, because their full-screen overlays cover the bar.
  - The fixed desktop nav rail moves down by `--site-notice-h`.
- **Admin hooks:** in `hooks/useAdminSiteNotices.ts`, next to the other admin hooks.

## Goal

A platform-wide notice bar that admins control, used to tell people about outages, offers, and anything else that matters. It sits at the top of the page, above the content.

Code name: **site notices** (`SiteNotice`, `site_notices`, `siteNotices`). The name "announcement" is already taken by the event host-to-guest tool (`tools/announcement`, `components/announcement/`), so it is not reused here.

## Decisions

| Topic | Decision |
|---|---|
| Placement | Each notice picks `EVERYWHERE` or any mix of the areas `PUBLIC`, `HOST`, `GUEST`, `ADMIN`. |
| Dismissing | Set per notice. A closed notice stays hidden in that browser until its content changes. |
| Content | Tone (`INFO`, `OFFER`, `WARNING`, `CRITICAL`), a message in English and Greek, and an optional link with a label in both languages. |
| Scheduling | Optional `starts_at` / `ends_at`, plus a manual `active` switch. |
| Several live at once | Only one bar shows: the highest tone wins (Critical > Warning > Offer > Info), then the newest `starts_at` (falling back to `created_at`). |
| Backend down | Vercel keeps serving the last good copy, and a built-in Critical notice shows when Spring can't be reached. |
| Admin alerts | An external uptime monitor. No code; covered by a setup doc. |

## 1. Data (Spring)

Repo: `C:\Users\User\IdeaProjects\event_social_media`. Migration `V177__site_notices.sql`. If V177 is taken by the time this is built, use the next free number.

Table `site_notices`:

| Column | Type | Rules |
|---|---|---|
| `id` | uuid / bigint (match existing tables) | PK |
| `tone` | varchar | `INFO`, `OFFER`, `WARNING`, `CRITICAL` |
| `message_en` | varchar(200) | required, trimmed, not blank |
| `message_el` | varchar(200) | required, trimmed, not blank |
| `link_url` | varchar(500) null | `https://` URL or a path starting with `/` |
| `link_label_en` | varchar(40) null | required when `link_url` is set |
| `link_label_el` | varchar(40) null | required when `link_url` is set |
| `areas` | varchar / array | `EVERYWHERE`, or a non-empty set of `PUBLIC`, `HOST`, `GUEST`, `ADMIN`. `EVERYWHERE` can't be combined with other values. |
| `dismissible` | boolean | default `true` |
| `starts_at` | timestamptz null | null = live as soon as it is active |
| `ends_at` | timestamptz null | null = no end. Must be after `starts_at` when both are set. |
| `active` | boolean | default `true` |
| `version` | int | starts at 1. Goes up when any of the message, link URL or link labels change. Tone, areas, schedule and `active` changes leave it as is. |
| `created_at`, `updated_at` | timestamptz | |

A notice is **live** when `active` is true, `starts_at` is null or in the past, and `ends_at` is null or in the future.

### Endpoints

- Admin (platform-admin auth, same guard as the other `/admin/**` routes):
  - `GET /admin/site-notices`: all notices, newest first, each with a derived `status` of `LIVE`, `SCHEDULED`, `ENDED` or `OFF`
  - `POST /admin/site-notices`
  - `PUT /admin/site-notices/{id}`
  - `DELETE /admin/site-notices/{id}`
- Public (no auth): `GET /public/site-notices/live`. Returns only live notices with the fields the bar needs (`id`, `version`, `tone`, both messages, link fields, `areas`, `dismissible`, `startsAt`, `createdAt`). Unsorted; the client picks which one to show.

Validation errors use the backend's existing error shape.

## 2. Areas

An area describes the **viewer on a page**, not just the URL, because hosts and guests share event pages such as the feed.

| Area | Covers |
|---|---|
| `PUBLIC` | `(landing)` pages, login, register, forgot/reset password, verify email, legal, partners, contact, newsletter, gift, report-content, and the signed-out invite page |
| `HOST` | `/home`, `/profile`, `/notifications`, `/feed`, and any `/events/[eventId]/…` page when the viewer is a host or co-host |
| `GUEST` | `/events/[eventId]/…` when the viewer isn't a host or co-host, plus the signed-in invite flow |
| `ADMIN` | `/admin` |

`EVERYWHERE` matches every area.

The bar is **never shown** in:
- the demo shell (`/demo`)
- full-screen story and slideshow views

Each layout declares its own area instead of the bar parsing the URL:
- `(landing)` layout and public pages → `PUBLIC`
- `(admin)` layout → `ADMIN`
- `(app)` layout → `HOST` by default
- `(event)` layout → `HOST` or `GUEST` from the viewer's role. Use the role data that layout already loads where it has it. Until the role is known, show only `EVERYWHERE` notices so a guest never briefly sees a host-only offer.

A small `SiteNoticeArea` value (props, or one tiny provider at the layout level) carries the area down to the bar. The matching logic lives in `lib/siteNotices.ts` as a pure function: `pickSiteNotice(notices, area, dismissed) → notice | null`.

## 3. Delivery

### Next route handler

`app/api/site-notices/route.ts`:
- Fetches `GET /public/site-notices/live` from Spring with `next: { revalidate: 60 }`.
- If Spring errors or times out (3s), it returns the last good copy kept in module memory (per server instance) and otherwise an empty list. It never returns an error to the client.
- Response headers: `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`, so the Vercel CDN keeps serving notices for up to 10 minutes after the last good fetch.

### Server prefetch

The `(main)` and `(landing)` root layouts read the same cached data through a shared server helper (`lib/siteNotices.server.ts`) and seed React Query with `siteNoticeKeys.live()`. They hydrate through `HydrationBoundary`. As with every other prefetch, failures are swallowed. Because this data is public and the same for everyone, it is fetched on every request, not only on full page loads.

### Client hook

`hooks/useSiteNotices.ts`:
- `useQuery` on `siteNoticeKeys.live()` against `/api/site-notices`
- `staleTime` 60s, `refetchOnWindowFocus: true`, `refetchInterval` 5 min
- exports `siteNoticeKeys`

### Built-in "backend down" notice

- The shared API client (`lib/api/client.ts`) reports request outcomes to a tiny store (`lib/apiHealth.ts`).
- Two failures in a row that are either a network error (no response) or a 502/503/504 set `apiDown = true`. Any successful response sets it back to `false`.
- `useApiHealth()` exposes the flag. While it is true, the bar shows a built-in notice instead of anything from the list:
  - tone `CRITICAL`, area `EVERYWHERE`, not dismissible, no link
  - copy (final wording to go through the UX copy pass): EN "We're having some issues. We're working on a fix." / EL equivalent
  - stored as translation keys in `messages/en.json` and `messages/el.json`, not in the database
- The flag only reflects what this browser is seeing. It doesn't poll Spring on its own.

## 4. The bar

`components/siteNotices/`:
- `SiteNoticeBar.tsx`: reads `useSiteNotices`, `useApiHealth`, the area and dismissals, then renders `SiteNoticeBanner` or nothing
- `SiteNoticeBanner.tsx`: presentational; takes tone, message, link and an `onDismiss` callback (optional). The admin preview reuses it.
- `useSiteNoticeDismissals` (in `hooks/`): reads and writes localStorage key `siteNotices:dismissed` as a list of `id:version`, every access wrapped in try/catch. If storage isn't available, nothing is remembered and the bar still renders.

Behavior:
- Renders above the page content and pushes it down. Not sticky, not overlaid.
- Shows the message in the current locale, and the link inline after it (internal paths with `next/link`, external URLs open in a new tab with `rel="noopener noreferrer"`).
- Tone sets the colors and icon. The screenshot's dark bar with amber text is the reference for `WARNING`/`CRITICAL`. `OFFER` and `INFO` use calmer brand-consistent tones. The admin console keeps its slate palette, and the bar keeps the same tone colors there.
- Mobile first: the text wraps, the link stays inline, and the × is at least 44×44px.
- Accessibility: `role="status"` for Info/Offer, `role="alert"` for Warning/Critical. The × has a localized `aria-label`.
- Closing a dismissible notice adds `id:version` to the dismissed list and hides it. If the admin later edits the text or link, `version` goes up and the notice shows again.

## 5. Admin console

Follows the admin design system (the Paid Services Console reference): left sidebar, data table, right-side drawer, slate palette.

- New sidebar item **"Site notices"** under Operations. Panel: `components/admin/siteNotices/SiteNoticesPanel.tsx`.
- **Table** (`SiteNoticesTable.tsx`): tone pill, message (EN, truncated), areas pills, status pill (Live / Scheduled / Ended / Off), schedule (start–end, dates in mono). A "New notice" primary action sits above the table.
- **Drawer** (`SiteNoticeDrawer.tsx`), one notice at a time, used for both create and edit:
  - Preview: `SiteNoticeBanner` with the current form values, with an EN/EL toggle
  - Tone: segmented control
  - Message: EN and EL fields with a character count (max 200)
  - Link: URL plus EN and EL labels (optional)
  - Where: segmented control "Everywhere / Choose areas", with area checkboxes when "Choose areas" is selected
  - Can be closed: switch
  - Schedule: start and end date-time pickers (optional)
  - Active: switch
  - Danger: "Delete notice" opens a confirmation modal
- Data hooks under `hooks/admin/` (match the existing admin hook layout): list query plus create/update/delete mutations that invalidate the admin list and `siteNoticeKeys.live()`.
- All admin copy is localized.

## 6. Admin alerts (no code)

`docs/uptime-monitoring.md`: how to set up Better Stack or UptimeRobot (free tier) to:
- check Spring's `/actuator/health` (already exposed) every minute
- alert by email and phone push after 2 failed checks
- optionally also check the Vercel site's home page

The user creates the account. The doc only gives the steps and values.

## 7. Testing

- **Spring:** repository/service tests for the live query (active flag, before start, after end, open-ended) and the version bump rules. Controller tests for validation (link labels required with a URL, `EVERYWHERE` exclusive, `ends_at` after `starts_at`) and for admin-only access.
- **Frontend unit:** `pickSiteNotice` (area matching, tone priority, newest wins, dismissed `id:version` skipped, an edited version shows again). `apiHealth` (two failures flip it, one success clears it, 4xx is ignored).
- **Frontend component:** `SiteNoticeBar` covering dismissal, non-dismissible notices, the API-down notice overriding the list, and storage throwing.
- **Visual:** phone width first, then desktop, on a public page, a host page, a guest event page and the admin console, with long Greek copy.

## 8. Delivery plan

Two PRs, both into `staging`:
1. **Backend** (`event_social_media`): migration, entity, admin and public endpoints, tests.
2. **Frontend** (this repo): route handler, prefetch, hook, bar, API health, admin panel, translations, uptime doc.

The backend ships first; the frontend's empty-list fallback means it is safe even if it lands before the backend is deployed.

## Out of scope

- Syncing dismissals across devices or accounts
- Discount codes inside notices
- Targeting by plan, locale, or specific event
- Push notifications or in-app alerting from the app itself
