# Business partner landing page — design

Date: 2026-10-10
Status: draft, awaiting review
Scope: spec 1 of 2. This spec covers the public page, the apply form and the Spring contract. Spec 2 (admin review of applications) is separate. A creator/influencer page comes later and is out of scope.

## Goal

A public, indexable page that turns wedding and baptism professionals (planners, venues, photographers, videographers, decoration, music) into StoryWall partners. The partner program already exists in the backend: collaboration codes (client discount + partner commission), tiered commission, the token partner portal (`/partners/[token]`) and partner feed branding. What is missing is a public page that explains it and collects applications.

Main traffic source at launch is outreach (Instagram DMs, email, print), not organic search. The page must convert that traffic and also be built to rank for partner and professional searches in Greek and English.

## Decisions already made

| Topic | Decision |
| --- | --- |
| Order | Businesses first. Creators later. |
| Markets | Greek and English from day one, like the main landing. |
| Sign-up | Apply → admin approves → admin creates the collaborator. |
| Business model | Referral (existing codes) now. Reselling in packages later, not on this page. |
| Rates | Not shown publicly. Shared after approval. |
| Occasions on the page | Weddings and baptisms at launch, driven by a config list so more can be added later (see "Occasions config"). |
| Founding partners | First 20 approved partners get the founding perk. The cap is real and enforced. |
| Free trial | Every approved partner gets one free event to use with a client (a 100% code created in admin). |
| Spots left | Live count from Spring. |
| Address | Subfolder on the main origin. `business.storywall.gr` is a 308 short link only. |
| Short link target | The Greek page. |
| Language hint | A small dismissible banner, never a modal or redirect. |
| Partners abroad | Applications accepted from anywhere. Payouts are by bank transfer in EUR to an IBAN account, against the partner's invoice (matches the collaborator payout fields: IBAN, legal name, VAT, address). Partners outside IBAN countries are told to apply anyway and are handled by hand. A second payout method is built only once the Country field shows the demand. |
| English page | Written for international professionals, not translated from Greek. Neutral English. Has a destination weddings section (not limited to Greece). |
| Apply backend | A new Spring endpoint. Applications are stored, not emailed. |

## Routes

| Locale | URL | File |
| --- | --- | --- |
| en (default) | `https://www.storywall.gr/for-business` | `app/(landing)/for-business/page.tsx` |
| el | `https://www.storywall.gr/el/epaggelmaties` | `app/(landing)/[locale]/epaggelmaties/page.tsx` |

- Both live in the `(landing)` route group so they get the public root layout, the trimmed message set and a full page load when the visitor moves into the app.
- `app/(landing)/[locale]/epaggelmaties/page.tsx` returns `notFound()` for any locale other than `el`. `/en/epaggelmaties` must not exist, and `/el/for-business` must not exist either.
- Slugs never change once live (SEO guidelines). A route helper in `lib/routes.ts` maps locale → path (`routes.forBusiness(locale)`), used by the sitemap, hreflang, the landing link and the language banner, so the two slugs are written once.
- The pages are static (no `headers()`/cookies in the render path). The spots count is fetched with `revalidate: 300`, so the page stays ISR and fast.
- `proxy.ts` is not changed. Its locale redirect applies only to `/`, so neither page ever redirects, and crawlers reach both versions by their own URL.
- `/partners/` stays private and in `PRIVATE_PATHS`. The new page must not live under it.

### Short link

`business.storywall.gr` → 308 → `https://www.storywall.gr/el/epaggelmaties`. This is set up as a domain redirect in Vercel, not in code. The short link is never used as a canonical, in the sitemap or in hreflang.

## SEO

### Keyword map

Search volumes are not verified. The web search tool used for this spec does not report volumes. Before launch, check these in Google Keyword Planner (Greece + global English) and adjust the title, h1 and h2 wording. After launch, read the real queries from Search Console and adjust.

What the research showed (2026-10-10):
- No Greek competitor has a partner page for these terms. The Greek results for "QR code φωτογραφίες γάμου" are generic QR-generator guides (QR Code Tiger).
- English competitors (Wedibox, POV, Festia, QRStuff, SnapBud) market to planners and venues, but few publish a partner program. LiveWall runs an affiliate program without public rates. The field is open, but volume is small.

**Greek page (`/el/epaggelmaties`) — main page for the Greek market**

| Role | Keyword | Where it goes |
| --- | --- | --- |
| Primary | φωτογραφίες καλεσμένων γάμου με QR code | title, h1 wording, intro |
| Secondary | κέντρα δεξιώσεων / αίθουσες δεξιώσεων | "Who it's for" h2 + text |
| Secondary | wedding planner / διοργάνωση γάμου | "Who it's for", FAQ |
| Secondary | φωτογράφος γάμου | "Who it's for", the photographer FAQ |
| Secondary | βάπτιση, φωτογραφίες βάπτισης | intro, "What your clients get" |
| Secondary | ψηφιακό άλμπουμ γάμου | "What your clients get" |
| Partner intent | συνεργασία, πρόγραμμα συνεργατών, προμήθεια | "What you get" h2, FAQ |

**English page (`/for-business`) — international wedding professionals anywhere**

The English page is not a version of the Greek page. It is written for wedding professionals outside Greece and the way they search, talk and sell (see "English page: international audience" below).

| Role | Keyword | Where it goes |
| --- | --- | --- |
| Primary | wedding photo sharing app for vendors / guest photo sharing for wedding planners and venues | title, h1 wording, intro |
| Secondary | QR code wedding photo sharing | "What your clients get" |
| Secondary | disposable camera alternative for weddings | "What your clients get" |
| Secondary | live photo wall for weddings | "What your clients get" |
| Secondary | wedding vendor referral program / affiliate program for wedding planners | "What you get" h2, FAQ |
| Secondary | destination wedding photo sharing | destination weddings section |
| Secondary | baptism and christening photo sharing | "What your clients get", secondary to weddings |
| Long tail | how to collect guest photos at a wedding | FAQ question |
| Long tail | can guests upload photos without an app | FAQ question |
| Long tail | does guest photo sharing compete with the wedding photographer | FAQ question |

Rules:
- Each page has its own copy written for its language and searches. The Greek page is not a translation of the English one (SEO guidelines: no duplicate content).
- Keywords go in naturally: the title, one h1, the h2s, the intro and the FAQ questions. No keyword lists or hidden text.
- Title ≤ 60 characters, description ≤ 155 characters, both unique and localized. The final wording goes through the `design:ux-copy` skill, within the project's plain-copy rule.

### Metadata and indexing (BLOCKERs from `docs/seo-guidelines.md`)

- `generateMetadata` in each page: localized `title` and `description`, `alternates.canonical` via `absoluteUrl`.
- `alternates.languages`: `en` → `/for-business`, `el` → `/el/epaggelmaties`, `x-default` → `/for-business`. Both pages list both plus `x-default`. Add a helper next to `landingLanguageAlternates` in `lib/seo.ts` (for example `forBusinessLanguageAlternates()`) built from `routes.forBusiness`.
- `app/sitemap.ts`: add both URLs with the same alternates, `changeFrequency: 'monthly'`, `priority: 0.8`.
- One `<h1>`. All content (h1, copy, FAQ, form markup) is in the server HTML. Check with `curl` after deploy.
- Not in `PRIVATE_PATHS`, no `NO_INDEX`.

### Connections between pages (internal links)

- Landing → partner page: a "For professionals" link in the landing footer (and the header if it fits), with a plain `href` to the page in the visitor's locale.
- Partner page → landing: the logo and a "See how it works for couples" link, with a plain `href`.
- Partner page → demo: "Try the demo" as a secondary link. The demo stays noindex.
- Future occasion pages (wedding, baptism) link to the partner page, and the partner page links back, once they are live. This is noted here so the occasion roadmap picks it up.
- The landing footer's anchors (`#faq`, `#pricing`, …) must become `/#faq` (locale-aware) when the footer renders on the partner page. Otherwise they point at nothing.

### Structured data (JSON-LD)

One `@graph` per page:
- `WebPage` with `inLanguage`, `url` = canonical, `isPartOf` → `${SITE_URL}/#website`, `about` → `${SITE_URL}/#organization` (the same `@id`s as `LandingStructuredData`, so Google connects the page to the organization).
- `BreadcrumbList`: StoryWall (landing in that locale) › For professionals.
- `FAQPage` built from the same FAQ items the page renders. The text must match the visible text.
- No `Offer` and no rates, since rates are private.

### Open Graph

A dedicated OG image per locale (`opengraph-image.tsx` in each route folder): the brand card plus "For professionals". This is a must here, not a "should". The main channel is DMs and WhatsApp, so the link preview is the first thing a partner sees. Set `og:locale` with `ogLocale`.

### Performance

- No client fetch above the fold. The spots count is server-rendered.
- The "What your clients get" preview uses static `next/image` assets with explicit sizes and localized `alt`. The live MSW demo is never used.
- Fonts through `next/font`, as on the landing.

## Page structure (mobile-first)

Every section gets a JSX comment marking its boundary. Copy stays short and plain (project rule). All text uses translation keys under a new `ForBusinessPage` namespace, included in `pickPublicMessages`.

1. **Hero:** h1, one-sentence benefit, primary button "Apply" (scrolls to `#apply`), secondary link "Try the demo".
2. **What your clients get:** QR → guests upload → live wall, using a static preview image. The occasions come from the occasions config (weddings and baptisms at launch).
3. **What you get:** four items with no numbers:
   - your clients get a discount with your code
   - you earn on every event
   - your brand appears in the event feed (screenshot of the partner card)
   - a portal shows your earnings
3b. **Destination weddings (English page only):** see "English page: international audience".
4. **Founding partners:** "X of 20 spots left" from Spring, plus "one free event to try with a client". Fallback and sold-out rules are below.
5. **How it works:** 4 steps: apply → we set up your code → share it with clients → earn.
6. **Who it's for:** planners, venues (reception venues on the Greek page), photographers, videographers, decoration, catering, music. These match `PartnerRole` minus `OTHER`, which the form still accepts.
7. **FAQ:** at least these questions:
   - What does it cost? (nothing)
   - How and when do I get paid?
   - How do you track my clients? (their code)
   - Does this compete with the photographer?
   - Which events does it cover? (weddings, baptisms)
   - What happens after I apply?
8. **Apply form (`#apply`):** see below.

## Occasions config

The occasions the page talks about come from one list, so adding one later does not touch the components.

- `lib/forBusinessOccasions.ts` exports an ordered list. Each entry has:
  - `eventTypeKey`: the existing event type key, e.g. `WEDDING`, `BAPTISM`
  - a translation key prefix for its copy (name, short line, alt text), with separate copy per locale
  - its static preview image path
  - `locales`: the locales it shows in, so an occasion can go live in one language first
- Sections that mention occasions map over the list: "What your clients get", the hero line naming the occasions, and the FAQ answer "Which events does it cover?".
- Adding an occasion means: a list entry, its translations in both locales, an image, and updating the keyword map in this spec. Nothing else changes.
- The SEO occasion rule applies here too: only list an occasion once the event type is enabled in the app and has a working demo in that language.
- The list order is the display order in both locales. Weddings come first. How strongly each page emphasizes an occasion is a copy choice, not a config field.
- A unit test checks that every entry has its translation keys in both locales it lists, and an image.

## English page: international audience

The two pages share the same structure and components, but not their copy, emphasis or FAQ. Partners anywhere in the world can join and are paid in EUR.

**Wording**
- Neutral international English. Where the US and UK term differ, use both once and then the shorter one: "vendors and suppliers", "baptisms and christenings". US spelling where a word has to pick one. No country-specific idioms.
- Weddings lead. Baptisms and christenings appear as a secondary use, not a headline. In Greece they are a main market; abroad they are not.
- No Greek wedding concepts (κέντρα δεξιώσεων, very large guest lists, church plus reception as the default).

**What foreign professionals care about, and where the page answers it**

| Concern | Answered in |
| --- | --- |
| A better experience for their couples, a reason to choose them | Hero, "What your clients get" |
| Replacing disposable cameras and chasing guests for photos afterwards | "What your clients get" |
| Extra income from referrals | "What you get" |
| Being seen by guests, who are future clients | "What you get" (the partner card in the feed) |
| Guests from many places, no app to install | Destination weddings section |
| Joining and getting paid from outside Greece | FAQ |

**Destination weddings section (English page only)**
- Placed after "What you get". For planners and venues running destination weddings anywhere, not only in Greece.
- Message: guests travel from many places; everyone scans one QR code, needs no app, and every photo ends up in one place for the couple.
- It does not claim support for languages the app does not have (the app is English and Greek).

**FAQ differences**
- English page adds: "Can I join from outside Greece?" (yes) and "How do I get paid?": by bank transfer in EUR to an IBAN account, against your invoice. Outside an IBAN country, apply anyway and we'll work it out with you.
- The Greek page's payout answer says the same in Greek, mentioning the invoice (τιμολόγιο).
- English page adds: "Can guests upload without an app?" (yes).
- English page leaves out Greece-specific questions.

**Greek page**
- Written for Greek professionals: reception venues, the planner and venue relationship, weddings and baptisms as equal headlines.
- No destination weddings section by default. A Greek line for businesses that serve foreign couples can be added later if outreach shows a need.

### Founding block states

| Spring result | Block shows |
| --- | --- |
| `foundingSpotsLeft > 0` | "X of 20 spots left" plus the free event |
| `foundingSpotsLeft === 0` | No founding block. The free event moves into "What you get". |
| Fetch failed | "Limited to the first 20 partners" without a count, plus the free event |

The fetch is best-effort, like `serverGet`: a failure never breaks the page.

## Apply form

Visible fields:
- name
- business name
- role (select: `PartnerRole`)
- email
- website or Instagram (one field, URL or `@handle`)
- country (required, searchable select of ISO 3166-1 alpha-2 codes, with localized names from `Intl.DisplayNames`, preselected from the page locale: `GR` on the Greek page, empty on the English page)
- phone (optional)
- consent checkbox linking to the privacy policy

Hidden fields:
- honeypot (an empty text field hidden from people)
- locale
- `utm_source`, `utm_medium` and `utm_campaign`, read from the URL on mount

Behavior:
- Form logic lives in a hook (`useForBusinessApplication`). The component is a render shell. The submit handler uses `React.SubmitEvent`.
- Client validation matches Spring's rules. Spring field errors map onto the fields through the existing `getFieldErrors`.
- Success replaces the form with a plain line ("Thanks. We'll reply by email."). No redirect.
- 409 (already applied with this email): a plain line saying the application is already in.
- 429 or network failure: a plain error with retry.
- The form is in the server HTML (inputs present), so the page is complete without JS. Submitting needs JS. That is acceptable.

## Language banner

- Client-only component, rendered after hydration, fixed to the bottom of the viewport so it does not push content (no layout shift, no intrusive interstitial).
- On `/el/epaggelmaties`: shows when no entry in `navigator.languages` starts with `el`. Text: "This page is in English too." Link: "View in English" → `/for-business`.
- On `/for-business`: shows when the first entry in `navigator.languages` starts with `el`. The text is in Greek and links to `/el/epaggelmaties`.
- Following the link sets the locale cookie the same way the existing language switcher does.
- Dismissing hides it, and the dismissal is remembered in `localStorage` (wrapped in try/catch). With storage unavailable it simply shows again next visit.
- Never redirects, never blocks content, and is not in the server HTML, so crawlers do not see it.

## Spring contract

Both endpoints are public (no session) and live under the existing public API conventions. Types go in `lib/api/types.ts` and paths in `lib/api/endpoints.ts`.

### `GET /api/public/partner-program`

```ts
export interface PartnerProgramSummaryDto {
    foundingSpotsTotal: number; // 20
    foundingSpotsLeft: number;  // never negative
}
```

`foundingSpotsLeft` = total − collaborators flagged as founding (the flag is set in spec 2). Called from the server page with `revalidate: 300`.

### `POST /api/public/partner-applications`

```ts
export interface PartnerApplicationRequestDto {
    name: string;
    businessName: string;
    role: PartnerRole;
    email: string;
    link: string;          // website URL or @handle
    countryCode: string;   // ISO 3166-1 alpha-2
    phone: string | null;  // optional
    locale: Locale;
    consent: true;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    website: string;       // honeypot; Spring drops the request silently (201) when non-empty
}
// 201 { id: string }
// 400 field errors (existing error shape)
// 409 a pending application already exists for this email (new error code)
// 429 rate limited per IP
```

Spring stores the application as `PENDING`. Review, approve and reject are spec 2.

## Out of scope

- Admin review of applications, the founding flag, and turning an application into a collaborator (spec 2).
- The creator/influencer page.
- Reselling or bulk purchase for partners.
- Publishing rates.
- Email notifications on new applications (spec 2 decides).

## Testing and checks

- Unit tests:
  - the apply hook (validation, error mapping, UTM capture)
  - the founding block state picker (`> 0`, `0`, failed)
  - the language banner decision (pure function of `navigator.languages` + current locale)
  - the route helper and alternates helper
- A sitemap test that both URLs are present with matching alternates.
- `tsc` and lint clean.
- Visual check on mobile (primary) and desktop, in both locales.
- After deploy: `curl` both URLs and check:
  - 200
  - one h1 and the copy are in the HTML
  - canonical, hreflang (en, el, x-default)
  - no noindex
  - JSON-LD validates in the Rich Results Test
- Request indexing in Search Console and confirm the sitemap.
- Check `business.storywall.gr` returns 308 to `/el/epaggelmaties`.
