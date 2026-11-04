# Discount campaigns — design

Date: 2026-11-03
Status: design and wording approved. Jira epic KAN-113.

## Goal

One switch that discounts every plan for a set time. While it runs, a banner and the guest card show the percent, a countdown and a link to the plans. Both disappear the moment it ends. Saving a campaign also creates tracked links for social posts and paid ads, so visits and sales can be measured per link.

Code name: **discount campaign** (`DiscountCampaign`, `discount_campaigns`). "Campaign" alone already means a tracked link (`CampaignLink`), and stays that way.

## Decisions

| Topic | Decision |
|---|---|
| Storage | One campaign record that pricing reads. Nothing is written onto the plans, so their own discounts are untouched. |
| Discount type | Percent only, up to two decimals, above 0 and below 100. |
| Overlap with a plan's own discount | The customer pays the lower price. The two never add up. |
| Applies to | Activations and upgrades of every plan. Never storage packs or extensions. Same as a plan's own discount. |
| Discount codes | Go on top, up to the existing combined cap. Same as a plan's own discount. |
| Schedule | Start is optional, end is required. Campaign dates can't overlap, so only one is ever live, and later ones can be queued. |
| Banner audience | `PUBLIC` and `HOST` areas. Not guests on event pages, not the admin console. |
| Closing the banner | Closable. Stays closed for that campaign in that browser. |
| Guest card | During a campaign, the campaign replaces the claim button. |
| Links | 8 per language. Greek created automatically on saving. Buttons generate either language on demand. |
| Sales tracking | Each order remembers the last link the buyer came through in the past 30 days, for new and existing accounts alike. |

## Campaign

### Data

Table `discount_campaigns` (next free migration number in `guestwall-be`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | varchar(50) | Admin only. Short enough that a link's name, `<name> · Instagram story · Paid · EL`, fits the links' 80 character limit. |
| `percent` | numeric(5,2) | Above 0, below 100. |
| `label` | varchar(100) null | Shown at checkout as the discount's name, like a plan's `discountLabel`. |
| `link_name` | varchar(60) | The links' base name, see "Links". Latin letters, digits, dot, dash, underscore. Unique, and fixed after creation. |
| `starts_at` | timestamptz | An empty start on the form saves as now. A live campaign keeps its start. |
| `ends_at` | timestamptz | Must be after `starts_at` and in the future when saved. |
| `active` | boolean | False once stopped. |

Status is derived, never stored, using the site notice words: `LIVE`, `SCHEDULED`, `ENDED`, `OFF`.

### Saving

A save is rejected when:
- its window overlaps another campaign that is not off;
- the percent would take any live duration of a public plan below the payment provider's minimum charge. The error names the plans.

An ended or stopped campaign can't be edited, and a stopped one can't be restarted.

The minimum price error comes from the server in the admin's language, because only the server knows which plans it names.

Every create, edit, stop and delete goes in the admin audit log. Only a campaign that has not started can be deleted. Stopping is immediate and goes through a confirmation modal.

### Admin

A **Discount campaigns** section in the admin console's Marketing group, following the admin design system: a table with status pills and a slide-over drawer per campaign. It needs the same permission as editing a plan's discount.

The drawer holds the fields above, the stop action, and the campaign's links with their copy buttons and numbers.

## Pricing

### Backend

`CheckoutService.activePlanDiscountPercent`, `activePromoPrice` and their callers (`PriceBreakdownService`, `CollaborationPreviewService`) move behind one `PlanPromotionResolver` bean, because the live campaign has to be read from the database and the existing methods are static. Every quote, preview and checkout goes through it, so they can't disagree.

For the line being priced, the resolver works out the plan's own price (promo price, else percent) and the price at the campaign percent, and returns the lower. A tie keeps the plan's own promotion.

The winner goes into the calculator as a plan promotion. `PriceBreakdown` keeps `DiscountSource.PLAN_PROMOTION`, with the campaign's `label` when the campaign won, so the snapshot, Stripe rows, emails and billing view need no changes. Prices are decided on the server at checkout, so an ended campaign can't be bought. A checkout already open keeps the price it was opened at.

### Frontend

Public plan responses (`GET /api/config`, `GET /api/plan-tiers`) gain `campaignDiscountPercent`, `campaignDiscountLabel`, `campaignDiscountStartsAt` and `campaignDiscountEndsAt`, filled from the campaign that is live or next up. They are null on admin endpoints.

`lib/billing.ts` applies the same rule as the resolver, with the same truncation. Every price on screen already goes through it, and it checks the dates in the browser, so prices switch on time despite the 5-minute catalog cache. Saving or stopping a campaign calls `revalidatePublicConfig`.

## Banner

`GET /api/public/discount-campaign` always answers 200 with `{"campaign": ...}`: the live campaign's `id`, `percent`, `startsAt` and `endsAt`, or `null` without one (never 204, because Next's data cache only stores 200s). The browser reads it through a cached `/api/discount-campaign` route, and both root layouts seed it, the same way as `/api/site-notices`.

The banner is **generated from the campaign, not stored as a site notice**, so there is no notice to create or delete and it can't outlive the discount.

`useSiteNoticeBar` adds the campaign as an `OFFER` candidate for `PUBLIC` and `HOST`:
- It ranks above other `OFFER` notices and below `WARNING` and `CRITICAL`. The built-in outage notice also takes priority.
- Closing it uses the existing dismissal cookie, under the key `<id>:1`, the format that cookie accepts.
- `SiteNoticeBanner` gains an optional countdown, using `hooks/useCountdown.ts`.
- The link goes to the viewer's language landing page plus `#pricing`. That page doesn't redirect signed-in users, so it works for hosts too. Its plan buttons open the event creation form.

**Timing**
- **Scheduled end:** the browser removes the banner at `endsAt`, whatever the cache says.
- **Start:** the banner can take a few minutes to appear. Prices start on time.
- **Stopped early:** checkout changes at once. The banner and on-screen prices can linger in open tabs for a few minutes, until they refetch.

The server render leaves the countdown out, and it appears after mount, so server and browser markup always match. The ticking text is hidden from screen readers, which get the end date once instead.

## Guest card

`GuestOfferCard` reads the same live campaign. When the guest would see the claim button and a campaign is live:
- The line becomes the campaign sentence with the countdown.
- The two buttons become one, **See plans**, linking to the landing page with `#pricing` and the existing `guest-offer` UTM values. It reports the same "discovered" activity.

These stay as they are:
- A guest who already claimed a code sees the normal card with their code, and no campaign line.
- A guest who closed the card doesn't see it, and nobody does when the guest offer is off.
- At `endsAt` the card goes back to the claim button without a reload.

## Links

### The set

| Link | `utm_source` | `utm_medium` | `utm_campaign` |
|---|---|---|---|
| Instagram post | `instagram` | `social` | `<link_name>-post-<lang>` |
| Instagram story | `instagram` | `social` | `<link_name>-story-<lang>` |
| Facebook post | `facebook` | `social` | `<link_name>-post-<lang>` |
| TikTok post | `tiktok` | `social` | `<link_name>-post-<lang>` |
| Instagram post, paid | `instagram` | `paid_social` | `<link_name>-post-<lang>` |
| Instagram story, paid | `instagram` | `paid_social` | `<link_name>-story-<lang>` |
| Facebook post, paid | `facebook` | `paid_social` | `<link_name>-post-<lang>` |
| TikTok post, paid | `tiktok` | `paid_social` | `<link_name>-post-<lang>` |

Placement and language go in `utm_campaign`, so every link is already unique under the existing source + medium + campaign rule, and the visit and sign-up reports work with no schema change.

`link_name` is its own field because Greek letters are not valid UTM values, so a Greek campaign name can't produce one.

### Changes to `campaign_links`

- `link_group` (varchar null): the `link_name`, so a set's rows can be listed and summed together.
- `destination_anchor` (varchar null, only `pricing`): `campaignUrl` adds `#pricing` after the query. `destination_path` keeps its no-fragment rule. Hand-made links are unaffected.

### Generating

`POST /api/admin/campaign-links/sets` with `{ name, linkName, language }` creates whichever of the 8 are missing, in one transaction, and returns the whole set. Existing links are left alone, so a repeat click creates no duplicates. A deleted link comes back only when a button is clicked.

- **Automatic:** creating a discount campaign generates the Greek set in the same transaction, so URLs are ready before it goes live. Later edits don't regenerate it.
- **Buttons:** **English links** and **Greek links** appear in the campaign drawer and in the Campaign links panel. In the panel, a name and link name are asked for first, for a campaign with no discount attached.

The set uses the campaign link permission. English links point at `/` and Greek links at `/el`. A visitor whose saved language or browser is Greek still gets redirected from `/` to `/el`, as they do today, and the link's tracking comes along.

Links outlive the campaign and keep their numbers. A late click shows normal prices.

## Sales tracking

### Browser

A new cookie, `sw_campaign`, holds the source, medium and campaign of the latest arrival with all three UTM values, and is replaced by each new one. It lasts 30 days and is written only with analytics consent. The existing `sw_src` cookie is separate and stays first-visit-wins for sign-ups.

`hooks/useBilling.ts` and `hooks/useCreateEventFormController.ts` send it as an optional `attribution` on activation and upgrade checkouts.

### Backend

`event_orders` gains `attribution_utm_source`, `attribution_utm_medium` and `attribution_utm_campaign`, all null. They are set when the order is created, and only when the values match a saved campaign link, because the browser's values can't be trusted. A reissued checkout session keeps them. Storage packs and extensions are not credited.

### Reporting

`GET /api/admin/metrics/campaigns` rows gain:
- `sales`: paid orders credited to the link, with `paid_at` in the range.
- `salesRevenueMinorByCurrency`: what those orders paid. Marketing gets this as null, like the existing revenue.

Both use the existing paid filter (`status = 'PAID'`, `settled_by is null`, `amount_minor > 0`). The existing columns keep their meaning: **Paid** and **Revenue** still describe accounts that signed up through the link. The campaign table gains **Sales** and **Sales revenue**, and the discount campaign drawer shows the set's rows with a total.

### Limits

- Only orders placed after this ships are counted.
- Purchases by people who declined analytics aren't credited to any link. Their visits still count, because the visit counter stores nothing on the device.

## Copy

All new strings. No existing text changes, and no landing page or SEO copy changes. Greek uses "πλάνα", the app's usual word, and the polite plural, as the guest card does.

| Where | English | Greek |
|---|---|---|
| Banner and guest card sentence | {percent}% off all plans. Ends in {countdown}. | {percent}% έκπτωση σε όλα τα πλάνα. Λήγει σε {countdown}. |
| Banner link and guest card button | See plans | Δείτε τα πλάνα |
| Countdown, an hour or more | 2d 5h 12m | 2ημ 5ώ 12λ |
| Countdown, under an hour | 12m 30s | 12λ 30δ |
| Screen reader end date | Ends on {date} | Λήγει στις {date} |
| Admin section | Discount campaigns | Εκπτωτικές καμπάνιες |
| Admin create button | New discount campaign | Νέα εκπτωτική καμπάνια |
| Field: name | Name | Όνομα |
| Field: percent | Discount % | Έκπτωση % |
| Field: label | Name at checkout | Όνομα στην πληρωμή |
| Field: link name | Link name | Όνομα συνδέσμων |
| Fields: dates | Starts / Ends | Έναρξη / Λήξη |
| Link buttons | English links / Greek links | Αγγλικοί σύνδεσμοι / Ελληνικοί σύνδεσμοι |
| Stop button | Stop campaign | Διακοπή καμπάνιας |
| Stop modal | Stop this campaign? Prices go back to normal now. | Διακοπή της καμπάνιας; Οι τιμές επιστρέφουν στο κανονικό τώρα. |
| Stop modal buttons | Stop campaign / Keep it running | Διακοπή καμπάνιας / Να συνεχιστεί |
| Table columns | Sales / Sales revenue | Πωλήσεις / Έσοδα πωλήσεων |
| Overlap error | Another campaign runs during these dates. | Άλλη καμπάνια τρέχει αυτές τις ημερομηνίες. |
| Minimum price error | This percent makes {plans} too cheap to charge. | Με αυτό το ποσοστό, {plans} δεν μπορούν να χρεωθούν. |

## Testing

**`guestwall-be`**
- Resolver: campaign beats a smaller percent; a bigger plan percent beats the campaign; a promo price below the campaign price wins; tie; before start, after end, stopped.
- Pricing paths: activation, new event and upgrade get the campaign; storage packs and extensions don't. A code stacks up to the cap. Quote, preview and checkout return the same figure.
- Saving: overlap, minimum charge, end before start, duplicate link name.
- Link sets: creates 8, repeat creates none, restores a deleted link, runs in one transaction.
- Attribution: stored when it matches a saved link, dropped when it doesn't, kept on a reissued session, and counted by date range. Marketing gets no revenue.

**Frontend**
- `lib/billing.ts` matches the backend on the same cases, truncation included.
- Banner: shown to `PUBLIC` and `HOST`, not to `GUEST` or `ADMIN`; outranked by warnings; stays closed per campaign; removed at `endsAt` with stale cached data.
- Guest card: campaign view, claimed code, return to claim at `endsAt`.
- `sw_campaign`: latest arrival wins, no cookie without consent, `sw_src` unchanged.
- `campaignUrl` puts `#pricing` after the query.
- Visual check at mobile and desktop widths for the banner and card, in both languages. The admin console is checked at desktop first.

## Release

Backend first, then the frontend. The new fields are optional in both directions, so neither side breaks during the gap. Nothing shows until a campaign is created.

The work can land in three steps, each with its own backend and frontend PRs:
1. Campaign, pricing, banner and guest card.
2. Link sets and buttons.
3. Sales tracking.

Step 2 should reach production before the first real campaign, and step 3 before its first ads, because orders placed earlier can't be credited.

## Out of scope

- A fixed-amount discount.
- Different percents per plan within one campaign.
- Tracking clicks on the banner itself.
- Crediting storage packs and extensions.
- Purchases from before this ships.
- The warnings on the discount code form (`CodeDiscountWarnings`), which keep reading only the plan's own discount.
