# Occasion landing pages — design

2026-10-12. Source plan: the "StoryWall occasion pages: SEO roadmap" doc (https://claude.ai/code/artifact/78cd9871-bd8c-4b19-94da-f0397fc0ead2). Rules: [docs/seo-guidelines.md](../../seo-guidelines.md).

## Goal

One indexable, server-rendered landing page per event type and language, each targeting that occasion's searches, with dated campaigns and seasonal themes that change the page without a code change to the page itself.

## Decisions

| Topic | Decision |
| --- | --- |
| Occasions | All 8 event types get a registry entry. PR 1 ships Wedding and Baptism copy; later PRs add two occasions each (copy only). |
| Live gate | A page renders when its registry entry is `ready` **and** `/api/config` lists its event type as enabled. Otherwise `notFound()` and no sitemap entry. A failed config fetch does not hide a ready page. |
| Demo preview | Server-fetched demo snapshot, cached 300 s per type. Hidden when `hasDemo` is false or the fetch fails. One demo per type for both languages until the backend supports per-language demos. |
| Customization | Code config with date windows (no backend, no admin UI). |
| Campaigns | Can override the hero sentence, image and CTA label; show a banner; carry a discount code into the create flow. **The H1 never changes.** |
| Themes | Dated seasonal accent + decor sets, optionally limited to some occasions. |
| Discount code | New `code` param on `/events/new`; the wizard opens with the discount field filled. |
| Copy | Claude drafts EN and EL from the roadmap keywords; the owner reviews before merge. English pages are written for readers outside Greece, not translated from Greek. |
| Photos | Reuse `public/landing`; occasions without a photo use a brand hero until one is added. Share images are generated per occasion. |
| Routing | Option A below. |

## Slugs (final once live)

| Event type | English | Greek |
| --- | --- | --- |
| WEDDING | `/weddings` | `/el/gamos` |
| BAPTISM | `/baptisms` | `/el/vaptisi` |
| BIRTHDAY | `/birthdays` | `/el/genethlia` |
| BABY_SHOWER | `/baby-showers` | `/el/baby-shower` |
| GENDER_REVEAL | `/gender-reveal` | `/el/gender-reveal` |
| REUNION | `/reunions` | `/el/reunion` |
| PRIVATE_PARTY | `/private-parties` | `/el/idiotiko-parti` |
| SOCIAL_EVENT | `/social-events` | `/el/koinonikes-ekdiloseis` |

A slug in the wrong language (`/gamos`, `/el/weddings`) is a 404.

## Architecture

### 1. Registry — `lib/occasions/`

- `occasions.ts`: the typed list `OCCASIONS: Occasion[]` with `eventType`, `slugs: { en, el }`, `ready: boolean`, `heroImage` (path or null), `featureOrder` (feature keys in the order the page shows them) and `faqCount`.
- Helpers (pure, unit-tested): `occasionBySlug(locale, slug)`, `occasionPath(occasion, locale)`, `occasionLanguageAlternates(occasion)` (`en`, `el`, `x-default` → English), `readyOccasions()`.
- Every consumer — routes, sitemap, hreflang, homepage links, "other occasions" links — reads this list. Adding an occasion = one entry + its copy.

### 2. Routes — `app/(landing)/`

Next.js forbids two differently named dynamic segments at one level, so the existing `[locale]` is renamed `[slug]`:

- `[slug]/page.tsx`
  - `slug` is a non-default locale (`el`) → the Greek landing (current behaviour, including the `/en` → `/` 308).
  - `slug` is an English occasion slug → the English occasion page.
  - `generateStaticParams` returns the locales plus ready English slugs; `dynamicParams = false`.
- `[slug]/[occasion]/page.tsx` → `slug` must be a non-default locale and `occasion` that locale's slug, else 404. Same static params rule.
- Both pages stay thin: resolve the occasion, run the gate, render `<OccasionPage occasion locale />`.

`proxy.ts`: extend the public-locale header so `/weddings` resolves to `en` and `/el/<slug>` to `el` regardless of cookie. The `/` redirect logic is untouched. Occasion paths are not added to `PRIVATE_PATHS`.

### 3. Gate and data — server only

`OccasionPage` (async server component), modelled on `LandingPage`:

1. `serverPublicConfigGet` for `/api/config` (already used by the landing), seeded into the query cache under `appConfigKeys.all` and hydrated.
2. If the config loaded and the event type is not enabled → `notFound()`.
3. If `hasDemo` → fetch `GET /api/demo/{TYPE}` with `next: { revalidate: 300 }`. This keeps Spring at about one call per type per 5 minutes, well inside the 30/min per-IP limit, without the client-IP headers. Failure → no preview section.
4. Resolve the active campaign and theme for "now".

### 4. Template — `components/occasions/`

One file per section, each with a JSX section comment, reusing the landing shell, footer and `landing.css`:

1. `OccasionHero` — keyword H1, one sentence, CTA to create (with `type` and optional `code`), occasion photo.
2. `OccasionTimeline` — before / on the day / after.
3. `OccasionFeatures` — 4–6 features in `featureOrder`, each heading aimed at its own search.
4. `OccasionDemoPreview` — a few posts, photos and wishes from the snapshot as server HTML via `next/image`, plus "Try the live demo" (`/demo/<event-type-slug>`, still noindex).
5. `OccasionHowItWorks` — the three steps, occasion copy.
6. `OccasionPlans` — one line and a link to `/#pricing` (or `/el#pricing`); no second pricing table.
7. `OccasionFaq` — 5–8 Q&As.
8. `OccasionFinalCta`.
9. `OccasionLinks` — the other ready occasions and the homepage.

Plus `OccasionCampaignBanner` and `OccasionStructuredData`.

Copy lives in `messages/{en,el}.json` under `occasions.<eventType>.*` (hero, timeline, features, faq, metadata, image alts) and `occasions.common.*` for shared labels. The public message picker (`i18n/publicMessages.ts`) gets the namespaces the client parts need.

### 5. SEO

- `lib/occasionMetadata.ts`: `getOccasionMetadata(occasion, locale)` → title (<60 chars, keyword first, ends "StoryWall"), description (~150 chars), self-canonical via `absoluteUrl`, `alternates.languages` from the registry, OG/Twitter with `ogLocale`, `robots: index`.
- Share image: `opengraph-image.tsx` in both occasion route folders, rendering the occasion title over brand art (1200×630).
- JSON-LD: `Service` for StoryWall for that occasion, `BreadcrumbList` (Home → occasion) and `FAQPage` from the FAQ copy.
- `app/sitemap.ts`: add one entry per ready occasion and locale with its language alternates. Live-gated occasions (type disabled) are dropped when the config says so.
- Homepage: the Wedding and Baptism story rows link to their occasion pages; the footer gets an occasions link list from the registry.

### 6. Campaigns and themes — `lib/occasions/campaigns.ts`, `lib/occasions/themes.ts`

```ts
type OccasionCampaign = {
    id: string;                       // copy under occasionCampaigns.<id>.*
    occasions: EventTypeConvention[] | 'all';
    startsAt: string;                 // ISO, inclusive
    endsAt: string;                   // ISO, exclusive
    hero?: { image?: string };        // sentence + CTA label come from copy
    banner?: boolean;
    discountCode?: string;
};

type OccasionTheme = {
    id: string;                       // maps to [data-occasion-theme="<id>"] in landing.css
    occasions?: EventTypeConvention[];
    startsAt: string;
    endsAt: string;
};
```

- `activeCampaign(occasion, now)` and `activeTheme(occasion, now)` are pure; on overlaps the latest `startsAt` wins. Unit-tested at the window edges.
- The H1 never comes from a campaign.
- Themes are CSS variable sets (accent, surface tint, decor image) scoped by `data-occasion-theme` on the page wrapper; brand coral stays the primary action colour.
- Changes ship with a deploy.

### 7. Create-flow discount code

- `CREATE_EVENT_CODE_PARAM = 'code'` in `lib/createEventSteps.ts`.
- `useCreateEventFormController` reads it once: it opens the discount field with the code filled in. Closing the field still drops it.
- The param travels through the existing auth return path, so a signed-out visitor keeps it after sign-up.

## Error and empty states

- Config fetch fails → the page renders (ready pages are assumed enabled); the client config fetch runs as usual.
- Demo fetch fails or there is no demo → no preview section, no placeholder.
- No hero photo → brand hero art.
- No active campaign or theme → default copy and palette.

## Testing

- Unit: registry helpers, slug resolution incl. wrong-language slugs, gate, campaign/theme windows, metadata output (canonical, alternates), sitemap entries, `code` param prefill.
- Manual: `curl` each live URL for 200, one h1, copy in the HTML, canonical, hreflang, no noindex; `/gamos` and `/el/weddings` give 404; screenshots at mobile (primary) and desktop.

## Out of scope

- Admin-managed campaigns, campaign-only URLs.
- Per-language demo snapshots (backend).
- The six occasions after Wedding and Baptism (follow-up PRs, copy only).
- "Wishes" guide pages.
- Domain move to `.com`.
