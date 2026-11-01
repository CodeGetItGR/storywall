# My business page — design

Date: 2026-11-01. Status: agreed with the user, waiting for spec review.

## Goal

Give every vendor one page across all their events: what they reached, the events they worked, the content they posted, what they offer, how guests see them, and a way to write to us. Today `/partner` shows earnings and reach to approved partners only, and the profile's vendor section is a logo with an Edit button.

## Decisions (user, 2026-11-01)

- New page **My business** / **Η επιχείρησή μου** at `/business`, for any account that has a vendor profile or has joined an event as a vendor. No "συντελεστής" in the page name.
- `/partner` redirects to `/business`. Partners see their earnings on the new page.
- The profile's vendor section and partner link become one link row to `/business`. The account drawer gets a **My business** entry.
- Each event's **My page** (`/events/{id}/tools/vendors/me`) stays for that event's work and links to `/business`.
- Partner rule (approved 2026-10-29: tools for every vendor, growth features for partners): every vendor gets their details, card previews, contact form, their events and basic counts. Partners also get full insights, earnings and guest inquiries. Other vendors see a short version and a **Become a partner** prompt.
- Insights: reach totals with a monthly trend, events with names, content they posted, card and inquiry counts.
- Card previews: the partner feed card and a sneak peek post. The sneak peek preview is always a sample.
- Services: profile details, print prices, and new packages with prices (any service they offer).
- Contact form: topic and message. Stored in a new admin console inbox, with a push to the Android admin app.
- Guest inquiries: a button on the vendor card in an event's vendors page. The vendor gets an email and an unread badge on the page.
- Website and Instagram taps are counted anonymously, like feed card taps.
- Two phases (below). Backend ships before frontend in each phase.

## Page layout

Mobile first, one column. From `lg`, two columns: main (left) and a narrower side column (right). Every section uses the vendor page surface (`VENDOR_SECTION_SURFACE`) and a colored icon tile in the style of `VendorToolIcon`.

| Order | Section | Who | Column (lg) |
|---|---|---|---|
| 1 | **Top card**: logo, business name, type, Partner pill, Edit. Partners: owed amount and commission (today's `PartnerHero`). | All; money for partners | Full width |
| 2 | **Inquiries**: newest first, unread count in the title. Opens one inquiry in a sheet. Phase 2. | Partners; others see a Become a partner row | Main |
| 3 | **Insights**: count strip, monthly views chart, card / website / Instagram taps. | Short version for all; full for partners | Main |
| 4 | **Your events**: name, date, type, guests, views; each row opens that event's My page. | All; views for partners | Main |
| 5 | **Your content**: photos and videos uploaded, sneak peeks, storage used. | All with a Pro album type | Main |
| 6 | **Services**: packages with a "from" price. Add / edit in a sheet. Phase 2. | All | Side |
| 7 | **Print prices**: a row that opens the existing print price editor. | Approved partner photographers (today's rule) | Side |
| 8 | **How guests see you**: feed card preview, sneak peek sample. | Feed card: partners with branding on. Sneak peek: types with a Pro album | Side |
| 9 | **Contact us**: a row that opens the contact sheet. | All | Side |

A section with no content for this account is left out, not shown empty. A count lives in one place only: the Insights strip owns totals, the events list owns per-event numbers.

States:
- Loading: a skeleton in the page's shape.
- Not a vendor (no profile, no vendor rows): a short message and a link back to the profile.
- A failed section shows its own retry; the rest of the page still renders.

## Phase 1

### Backend (guestwall-be)

1. **`GET /api/me/business`** — one overview for the signed-in account (403 code when not a vendor).
   - `partner: boolean`, `vendorType` (from the profile).
   - `totals`: `events`, `guests`, `listTaps` for all; `proViews`, `postViewers`, `cardTaps` for partners only (absent otherwise, like `VendorReachDto`).
   - `trend`: views per calendar month (Athens time), last 6 months, Pro views plus post views. Partners only.
   - `content`: `proItems`, `sneakPeeks`, `proUsedBytes` summed across events. Absent for types without a Pro album.
   - Reuses `PartnerReachService` queries, keyed by the account's user id instead of the partner's contact email.
2. **`GET /api/me/business/events?page=`** — paged, newest first: `eventId`, `title`, `startAt`, `vendorType`, `guests`, `views` (partners only), `open` (false once access ended or the vendor was removed; such rows don't link).
3. **Partner branding for the preview** — add the partner's feed card fields (display name, logo, cover, text, link, enabled) to `GET /api/partners/me`, so the preview uses the real card.
4. **Contact messages**
   - Table `vendor_contact_messages`: id, user id, topic (`QUESTION`, `PROBLEM`, `PARTNERSHIP`, `OTHER`), message (≤ 2,000 chars), status (`NEW`, `ANSWERED`), created at, answered at.
   - `POST /api/me/business/messages` — vendors only, at most 5 a day per account.
   - `GET /api/admin/vendor-messages?status=&page=` and `PATCH /api/admin/vendor-messages/{id}` (status).
   - New `AdminAlertType.VENDOR_MESSAGE` (`#vendor-messages`, not urgent, admins only) with the topic in its data.
5. **`isVendor`** on the signed-in user DTO (next to `partner`), so the drawer and profile can show the entry without another request.

### Frontend (storywall)

- Route `app/(main)/(app)/business/page.tsx` with server prefetch of the overview, first events page and (partners) `partners/me`, per the Data Fetching rules; `loading.tsx` skeleton.
- `components/business/*` per section; hooks in `hooks/` (`useBusinessOverview`, `useBusinessEvents`, `useBusinessContact`); helpers in `lib/business.ts`.
- Reuse: `PartnerHero`/`PartnerTierProgress` (money), `MetricStrip`, `VendorProfileSheet` (Edit), `ServicesSection` + `ServiceSheet` (print prices), `PartnerFeedCard` (preview), `BecomePartnerSheet`.
- Sneak peek sample: built client-side from the vendor's name and logo with placeholder photos. No backend.
- Contact sheet: topic as a segmented control, message textarea, send. Success shows a short confirmation in the sheet.
- `/partner` → `/business` redirect. Remove `PartnerPortalBoundary`/`Frame`/`Skeleton`/`Blocked` and `PartnerReachSection` once nothing uses them.
- Profile: one **My business** link row replaces `ProfileVendorSection` and `ProfilePartnerSection`.
- Account drawer: **My business** entry when `isVendor || partner`.
- Event **My page**: the Print prices editor moves to `/business`; the event page keeps its "prints included" row and gets a **My business** link.
- `robots.ts`: add `/business` to private paths; the page is `noindex` like other signed-in pages.
- All copy in `messages/en.json` and `messages/el.json`. Greek: "Η επιχείρησή μου"; no "συντελεστής" in the page name.

### Admin console (storywall)

- New **Vendor messages** panel under Operations, following the admin design system: table (date, vendor, topic pill, status pill), right-side drawer with the message, the vendor's email as a reply link, and **Mark answered**.

### Android admin app (storywall-admin-android)

- New `PushMessage.VendorMessage(topic, link)` so `VENDOR_MESSAGE` pushes show a notification ("New vendor message: Problem") that opens the console's `#vendor-messages`. Today unknown types are dropped.

### Release order

guestwall-be → storywall-admin-android (can ship alongside) → storywall.

## Phase 2 (own spec and plan later)

- **Packages with prices**: `vendor_offerings` (title, description, from price, currency, order) under `/api/me/vendor-profile/offerings`; shown in Services and on the guest vendor card.
- **Guest inquiries**: **Send a message** on the vendor card (partners' cards only); fields name, email or phone, message; email to the vendor in their language; list, read state and unread badge on `/business` and the drawer entry.
- **Website and Instagram taps**: anonymous `vendor_link_clicks` (event, vendor, kind, time), counted in Insights.

## Testing

- Backend: controller tests for each endpoint (vendor, partner, non-vendor, admin), rate limit on messages, alert published after commit.
- Frontend: Vitest for hooks and `lib/business.ts`; component tests for partner vs non-partner sections, empty / failed sections, the contact sheet; redirect test for `/partner`.
- Visual check at mobile and desktop widths, signed in as a partner and as a plain vendor.

## Open items

- Jira: create a ticket per phase under KAN-17, or one ticket for phase 1 — to confirm with the user before branching.
