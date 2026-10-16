# Sign-up source tracking

## Goal

Know which channel (ads, social, search, …) each account came from, so the admin Funnel can show
which channels bring hosts who create events and pay. GA cannot answer this: it only sees visitors
who accepted analytics cookies, and it does not run inside the signed-in app.

## Decisions

- **Consent:** the source is always kept in page memory for the current visit (nothing stored on
  the device). With analytics consent it is also stored in a 30-day `sw_src` cookie.
- **Which visit:** the first visit wins. Only a gift page visit replaces an earlier source.
- **Invites and gifts:** an invite sign-up is always Invite (set by Spring from the invite token); a
  gift page visit is always Gift.
- **Where the channel is decided:** the browser sends raw facts; Spring classifies at sign-up and
  stores both the raw facts and the channel.
- **Admin:** a source filter over the whole Funnel, a "By source" table, and one line in the
  account drawer.

## 1. Capture in the browser (storywall)

### What is captured

`VisitSource`, every string trimmed and capped at 100 characters (255 for `landingPage`):

| Field | Value |
|---|---|
| `utmSource`, `utmMedium`, `utmCampaign` | the `utm_*` query values, or null |
| `adClick` | true if the URL has `gclid`, `gbraid` or `wbraid`; the id itself is never kept |
| `referrerHost` | the referrer's hostname only; null when empty or our own origin |
| `landingPage` | the route pattern via `pageRoute` (e.g. `/occasions/[slug]`), never the real URL |

### When

On every page load, on any route (the first-visit rule below decides what is kept). A UTM link
straight to `/register` is captured too.

### Where it is kept

- **Page memory** (module state), always. It survives in-app navigation; the Google and Apple
  sign-in flows are popups, so a same-visit sign-up keeps it.
- **In the link**, always. Going from a landing page (`app/(landing)`) into the app is a full page
  load between root layouts, which loses page memory. So a plain click on a same-site link out of
  the landing pages adds `src=<the source as JSON>` to the link. The app reads it, keeps it in page
  memory and removes it from the address bar.
- **`sw_src` cookie**, 30 days, `Path=/; SameSite=Lax; Secure` on https, written only while
  `consent.analytics === true`. Accepting analytics later in the visit writes the in-memory source.
  Withdrawing analytics consent deletes `sw_src` alongside the `_ga` cookies; page memory remains
  for the current visit.

### Rules

- If a source is already in page memory or `sw_src`, a new capture does not replace it.
- Exception: a visit whose page is `/gift/[token]` always replaces the stored source.
- A load with our own origin as referrer and no `utm_*`/ad click is not a new capture.
- A carried `src` is checked like any other input (same caps and patterns) and wins over the URL.

### Sending

`RegisterRequestDto` and `OAuthLoginRequestDto` get an optional `visitSource` object with the
fields above. The `/api/auth/register` and `/api/auth/oauth/[provider]` routes pass it through
unchanged.

### Files

- `lib/signupSource.ts`: build a `VisitSource` from a URL and referrer, the first-visit/gift rules,
  cookie read/write/clear.
- A hook mounted in both root providers (`PublicProviders`, `AppProviders`) that captures on each
  page, strips a carried `src`, writes the cookie when consent allows, and carries the source on
  landing-page clicks.
- `lib/consent.ts`: clear `sw_src` with the analytics cookies.
- `lib/api/authClient.ts` adds `visitSource` to `register` and `oauth`, the single place both go
  through.

## 2. Save and classify (Spring, guestwall-be)

### Storage

New nullable columns on `users`, set once at account creation and never updated:

`signup_channel` (enum, varchar), `signup_utm_source`, `signup_utm_medium`, `signup_utm_campaign`,
`signup_ad_click` (boolean), `signup_referrer_host`, `signup_landing_page`.

Existing accounts stay null and read as `UNKNOWN`.

### Channels

`SignupSourceRules`, a pure class. Values are compared lowercase; the first match wins.

| # | Channel | Rule |
|---|---|---|
| 1 | `INVITE` | the request has an invite token |
| 2 | `GIFT` | `landingPage` starts with `/gift/` |
| 3 | `ADS` | `adClick`, or `utm_medium` in cpc, ppc, paid, paid_social, display |
| 4 | `SOCIAL` | `utm_medium` in social, social_media; or `utm_source` / referrer host matches instagram, facebook, fb, tiktok, pinterest, linkedin, x.com, t.co, twitter, youtube |
| 5 | `EMAIL` | `utm_medium` in email, newsletter |
| 6 | `PARTNER` | `utm_medium` = partner |
| 7 | `SEARCH` | referrer host matches google., bing., duckduckgo., yahoo., ecosia. (no ad click, since rule 3 ran first) |
| 8 | `OTHER_SITE` | any other referrer host |
| 9 | `DIRECT` | a `visitSource` was sent but has no UTM, no ad click and no referrer |
| — | `UNKNOWN` | no `visitSource` was sent (stored as null) |

### Behaviour

- `visitSource` is optional. A malformed one (over-long field, control characters, a referrer that is
  not a bare host, a landing page that is not a path) is rejected with a 400. The browser trims to
  the same rules, so this only happens to tampered requests.
- Register: classify and save on creation.
- OAuth: classify and save only when the call creates the account; ignore it on a login.
- Raw facts are kept so a later rule change can re-classify old rows with a migration.

## 3. Admin Funnel

### Source filter

A select next to `FunnelRangeControl`: "All sources" plus each channel (including Unknown). It
narrows every Funnel section: steps, stuck, activity, time to convert, guest to host, cohorts, paid
events and revenue. Paid events and revenue are counted by the payer's sign-up channel.

Backend: optional `channel` query parameter on `GET /api/admin/metrics/funnel` and
`GET /api/admin/metrics/funnel/cohorts`, applied in the shared `ACCOUNTS` CTE of
`FunnelMetricsRepository` (and the payer join for paid events and revenue).

### "By source" table

A new section right after the Funnel steps. One row per channel, sorted by sign-ups:

| Channel | Sign-ups | Created an event | Paid | Revenue |
|---|---|---|---|---|

- Every column is about accounts that signed up in the selected range: how many, how many of them
  created an event, how many paid, and their total paid revenue (same "paid" definition as the
  Funnel).
- It ignores the source filter and always lists every channel with sign-ups.
- A row with fewer than 20 sign-ups gets a "Few sign-ups" tag.
- Backend: `GET /api/admin/metrics/funnel/channels?since&until`.

### Account drawer

One read-only line in the account detail drawer, e.g. "Source: Social · instagram / bio-link",
built from the saved channel and raw facts. Unknown when null.

### Copy

All labels in `messages/en.json` and `messages/el.json`. Admin console style: table, compact channel
badge.

## Privacy

- Saved data: channel, UTM values, an ad-click yes/no, a hostname and a route pattern. No full URLs,
  click ids, tokens or pre-sign-up identifiers.
- **Release blocker (content, not code):** publish new versions of the Cookie Policy (`sw_src`:
  analytics category, 30 days, what it holds) and the Privacy Policy (how the account was found is
  saved with it). The wording is for the owner or their legal contact.

## Edge cases

| Case | Result |
|---|---|
| OAuth login to an existing account | `visitSource` ignored |
| Invite sign-up | `INVITE`, whatever was captured |
| Gift page visit | replaces the stored source |
| Analytics consent withdrawn | `sw_src` deleted; page memory still used this visit |
| Declined cookies, sign-up on a later visit | `UNKNOWN` (accepted trade-off) |
| UTM link straight to `/register` | captured |
| Own-site referrer, e.g. after a reload | ignored |
| Landing page → app link | source carried in `src`, removed on arrival |
| Junk or over-long values | trimmed by the browser; a tampered request gets a 400 |
| Accounts from before release | `UNKNOWN` |

## Testing

- **Spring:** `SignupSourceRules` unit tests (each rule and the rule order); register and
  OAuth tests (saved on creation only, malformed input gets a 400); Postgres tests for the `channel`
  filter and `/funnel/channels` next to `FunnelMetricsPostgresTest`.
- **Front end:** `lib/signupSource.ts` tests (first visit wins, gift replaces, own-site referrer
  ignored, cookie only with consent, cleared on withdrawal, field caps); request-body tests for
  `authClient` register and OAuth, the tracker hook (carry and strip `src`); component tests for the filter, the table with the few-sign-ups tag
  and the account line.
- **Manual:** sign up locally from `?utm_source=instagram&utm_medium=social` once with cookies
  declined and once accepted; check the account drawer and the Funnel.

## Order of work

1. Spring: migration, classifier, register/OAuth, Funnel `channel` filter, `/funnel/channels`.
2. Front end: capture, cookie and consent, request field.
3. Front end: admin filter, "By source" table, account line.
4. Before release: new Cookie Policy and Privacy Policy versions.

## Out of scope

The GA Visitors section and the plain-language summary (separate specs), and partner-code
attribution, which the collaborations feature already tracks at checkout.
