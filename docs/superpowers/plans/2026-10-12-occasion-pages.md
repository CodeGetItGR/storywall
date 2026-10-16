# Occasion landing pages — implementation plan (PR 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-rendered, indexable occasion pages (`/weddings`, `/el/gamos`, `/baptisms`, `/el/vaptisi`) built from one occasion registry, with dated campaigns and seasonal themes in code config.

**Architecture:** A typed registry in `lib/occasions/` drives routes, sitemap, hreflang and links. The existing `app/(landing)/[locale]` segment becomes `[slug]` so English occasion slugs and `/el` share it; `[slug]/[occasion]` serves Greek occasion pages. `OccasionPage` (async server component) gates on `/api/config`, loads a cached demo preview, resolves the active campaign/theme and renders small section components with copy from `messages/*.json` → `OccasionPages`.

**Tech Stack:** Next.js 16 App Router, next-intl 4, TanStack Query hydration, Tailwind, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-12-occasion-pages-design.md](../specs/2026-10-12-occasion-pages-design.md)

**Commands:** tests `npx vitest run <path>`, types `npm run type:check`, lint `npm run lint`. All run from the worktree root.

---

## File map

| File | Responsibility |
| --- | --- |
| `lib/occasions/occasions.ts` (new) | Registry, slug lookup, paths, hreflang alternates, proxy locale lookup |
| `lib/occasions/campaigns.ts` (new) | Campaign config + `activeCampaign` |
| `lib/occasions/themes.ts` (new) | Theme config + `activeTheme` |
| `lib/occasions/demoPreview.ts` (new) | Pure `pickDemoPreview(snapshot)` |
| `lib/occasions/demoPreview.server.ts` (new) | Cached server load of the preview |
| `lib/occasions/occasionSeo.ts` (new) | Pure `buildOccasionMetadata` |
| `lib/occasionMetadata.ts` (new) | `getOccasionMetadata` (reads copy) |
| `lib/seo.ts` (modify) | `jsonLdHtml` escape helper, shared `buildIndexableMetadata` |
| `lib/routes.ts`, `lib/createEventSteps.ts`, `hooks/useCreateEventRun.ts`, `hooks/useCreateEventFormController.ts` (modify) | `code` param |
| `lib/api/types.ts` (modify) | `hasDemo` on `AppEventTypeResponseDto` |
| `proxy.ts` (modify) | Public locale header on occasion paths |
| `components/LanguageSwitcher.tsx` (modify) | `alternatePaths` prop |
| `components/occasions/*` (new) | Page sections |
| `app/(landing)/[slug]/page.tsx` (moved from `[locale]`) | `/el` landing or English occasion |
| `app/(landing)/[slug]/[occasion]/page.tsx` (new) | Greek occasion |
| `app/(landing)/[slug]/opengraph-image.tsx`, `app/(landing)/[slug]/[occasion]/opengraph-image.tsx` (new) | Share images |
| `lib/og/ogImages.tsx` (modify) | `occasionOgImage(title)` |
| `app/sitemap.ts` (modify) | Occasion entries |
| `components/landing/LandingFooter.tsx`, `LandingStoryRow.tsx`, `LandingStoryCopy.tsx`, `lib/landingMedia.ts` (modify) | Homepage links |
| `components/landing/landing.css` (modify) | Occasion theme tokens |
| `messages/en.json`, `messages/el.json` (modify) | `OccasionPages`, footer label |

---

### Task 1: Occasion registry

**Files:**
- Create: `lib/occasions/occasions.ts`
- Test: `lib/occasions/occasions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
    findReadyOccasion,
    OCCASIONS,
    occasionLanguageAlternates,
    occasionLocaleForPath,
    occasionPath,
    readyOccasions,
} from '@/lib/occasions/occasions';
import { SITE_URL } from '@/lib/seo';

const wedding = OCCASIONS.find((occasion) => occasion.eventType === 'WEDDING')!;

describe('occasion registry', () => {
    it('lists every event type once with unique slugs per locale', () => {
        expect(OCCASIONS.map((occasion) => occasion.eventType).sort()).toEqual(
            ['BABY_SHOWER', 'BAPTISM', 'BIRTHDAY', 'GENDER_REVEAL', 'PRIVATE_PARTY', 'REUNION', 'SOCIAL_EVENT', 'WEDDING'],
        );
        expect(new Set(OCCASIONS.map((occasion) => occasion.slugs.en)).size).toBe(OCCASIONS.length);
        expect(new Set(OCCASIONS.map((occasion) => occasion.slugs.el)).size).toBe(OCCASIONS.length);
    });

    it('ships wedding and baptism as ready', () => {
        expect(readyOccasions().map((occasion) => occasion.eventType)).toEqual(['WEDDING', 'BAPTISM']);
    });

    it('finds a ready occasion only by its own language slug', () => {
        expect(findReadyOccasion('en', 'weddings')?.eventType).toBe('WEDDING');
        expect(findReadyOccasion('el', 'gamos')?.eventType).toBe('WEDDING');
        expect(findReadyOccasion('el', 'weddings')).toBeNull();
        expect(findReadyOccasion('en', 'gamos')).toBeNull();
        expect(findReadyOccasion('en', 'birthdays')).toBeNull();
    });

    it('builds paths and alternates', () => {
        expect(occasionPath(wedding, 'en')).toBe('/weddings');
        expect(occasionPath(wedding, 'el')).toBe('/el/gamos');
        expect(occasionLanguageAlternates(wedding)).toEqual({
            en: `${SITE_URL}/weddings`,
            el: `${SITE_URL}/el/gamos`,
            'x-default': `${SITE_URL}/weddings`,
        });
    });

    it('resolves the locale of a ready occasion path', () => {
        expect(occasionLocaleForPath('/weddings')).toBe('en');
        expect(occasionLocaleForPath('/el/vaptisi')).toBe('el');
        expect(occasionLocaleForPath('/el/weddings')).toBeNull();
        expect(occasionLocaleForPath('/birthdays')).toBeNull();
        expect(occasionLocaleForPath('/feed')).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/occasions/occasions.test.ts`
Expected: FAIL, cannot resolve `@/lib/occasions/occasions`.

- [ ] **Step 3: Implement**

```ts
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';
import { absoluteUrl } from '@/lib/seo';

export type OccasionImage = { src: string; width: number; height: number };

export type Occasion = {
    eventType: EventTypeConvention;
    // Latin letters only; never change once live (docs/seo-guidelines.md).
    slugs: Record<Locale, string>;
    // Copy exists in both languages. A page goes live only when ready and the type is enabled.
    ready: boolean;
    // null → the brand hero art.
    heroImage: OccasionImage | null;
    // Keys under OccasionPages.<eventType>.features, in page order.
    features: readonly string[];
};

// One list drives the routes, sitemap, hreflang and every link to an occasion page.
export const OCCASIONS: readonly Occasion[] = [
    {
        eventType: 'WEDDING',
        slugs: { en: 'weddings', el: 'gamos' },
        ready: true,
        heroImage: { src: '/landing/wedding-party-celebrating-with-social-storywall-overlays.webp', width: 2048, height: 1152 },
        features: ['invitation', 'rsvp', 'qrPhotos', 'wishbook', 'gifts', 'music'],
    },
    {
        eventType: 'BAPTISM',
        slugs: { en: 'baptisms', el: 'vaptisi' },
        ready: true,
        heroImage: { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', width: 1536, height: 1024 },
        features: ['invitation', 'rsvp', 'wishbook', 'qrPhotos', 'gifts'],
    },
    { eventType: 'BIRTHDAY', slugs: { en: 'birthdays', el: 'genethlia' }, ready: false, heroImage: null, features: [] },
    { eventType: 'BABY_SHOWER', slugs: { en: 'baby-showers', el: 'baby-shower' }, ready: false, heroImage: null, features: [] },
    {
        eventType: 'GENDER_REVEAL',
        slugs: { en: 'gender-reveal', el: 'gender-reveal' },
        ready: false,
        heroImage: { src: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp', width: 1536, height: 1024 },
        features: [],
    },
    { eventType: 'REUNION', slugs: { en: 'reunions', el: 'reunion' }, ready: false, heroImage: null, features: [] },
    { eventType: 'PRIVATE_PARTY', slugs: { en: 'private-parties', el: 'idiotiko-parti' }, ready: false, heroImage: null, features: [] },
    { eventType: 'SOCIAL_EVENT', slugs: { en: 'social-events', el: 'koinonikes-ekdiloseis' }, ready: false, heroImage: null, features: [] },
];

export function readyOccasions(): Occasion[] {
    return OCCASIONS.filter((occasion) => occasion.ready);
}

export function findReadyOccasion(locale: Locale, slug: string): Occasion | null {
    return readyOccasions().find((occasion) => occasion.slugs[locale] === slug) ?? null;
}

export function findOccasion(eventType: EventTypeConvention): Occasion | null {
    return OCCASIONS.find((occasion) => occasion.eventType === eventType) ?? null;
}

export function occasionPath(occasion: Occasion, locale: Locale): string {
    return locale === defaultLocale ? `/${occasion.slugs[locale]}` : `/${locale}/${occasion.slugs[locale]}`;
}

export function occasionAlternatePaths(occasion: Occasion): Record<Locale, string> {
    return Object.fromEntries(locales.map((locale) => [locale, occasionPath(occasion, locale)])) as Record<Locale, string>;
}

// Every language version plus x-default → the default-locale page, like the landing.
export function occasionLanguageAlternates(occasion: Occasion): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(occasionPath(occasion, locale));
    languages['x-default'] = absoluteUrl(occasionPath(occasion, defaultLocale));
    return languages;
}

// The locale a ready occasion page renders in, read by proxy.ts. Null for any other path.
export function occasionLocaleForPath(pathname: string): Locale | null {
    for (const occasion of readyOccasions()) {
        for (const locale of locales) {
            if (occasionPath(occasion, locale) === pathname) return locale;
        }
    }
    return null;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/occasions/occasions.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/occasions/occasions.ts lib/occasions/occasions.test.ts
git commit -m "feat(occasions): occasion registry"
```

---

### Task 2: Campaigns and themes

**Files:**
- Create: `lib/occasions/campaigns.ts`, `lib/occasions/themes.ts`
- Test: `lib/occasions/campaigns.test.ts`, `lib/occasions/themes.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/occasions/campaigns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { activeCampaign, type OccasionCampaign } from '@/lib/occasions/campaigns';

const summer: OccasionCampaign = {
    id: 'summer-weddings',
    occasions: ['WEDDING'],
    startsAt: '2027-05-01T00:00:00+03:00',
    endsAt: '2027-09-01T00:00:00+03:00',
    banner: true,
    discountCode: 'SUMMER27',
};
const everywhere: OccasionCampaign = { id: 'launch', occasions: 'all', startsAt: '2027-06-01T00:00:00Z', endsAt: '2027-06-08T00:00:00Z' };

describe('activeCampaign', () => {
    it('is active from startsAt (inclusive) to endsAt (exclusive)', () => {
        expect(activeCampaign('WEDDING', new Date('2027-04-30T20:59:59Z'), [summer])).toBeNull();
        expect(activeCampaign('WEDDING', new Date('2027-04-30T21:00:00Z'), [summer])?.id).toBe('summer-weddings');
        expect(activeCampaign('WEDDING', new Date('2027-08-31T21:00:00Z'), [summer])).toBeNull();
    });

    it('only applies to its occasions', () => {
        expect(activeCampaign('BAPTISM', new Date('2027-07-01T00:00:00Z'), [summer])).toBeNull();
        expect(activeCampaign('BAPTISM', new Date('2027-06-02T00:00:00Z'), [everywhere])?.id).toBe('launch');
    });

    it('picks the latest start when campaigns overlap', () => {
        expect(activeCampaign('WEDDING', new Date('2027-06-02T00:00:00Z'), [summer, everywhere])?.id).toBe('launch');
    });
});
```

`lib/occasions/themes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { activeTheme, type OccasionTheme } from '@/lib/occasions/themes';

const winter: OccasionTheme = { id: 'winter', startsAt: '2026-12-01T00:00:00+02:00', endsAt: '2027-01-08T00:00:00+02:00' };
const weddingSpring: OccasionTheme = { id: 'winter', occasions: ['WEDDING'], startsAt: '2027-03-01T00:00:00Z', endsAt: '2027-04-01T00:00:00Z' };

describe('activeTheme', () => {
    it('applies inside its window', () => {
        expect(activeTheme('BAPTISM', new Date('2026-12-24T12:00:00Z'), [winter])).toBe('winter');
        expect(activeTheme('BAPTISM', new Date('2027-01-08T00:00:00+02:00'), [winter])).toBeNull();
    });

    it('respects an occasion filter', () => {
        expect(activeTheme('BAPTISM', new Date('2027-03-10T00:00:00Z'), [weddingSpring])).toBeNull();
        expect(activeTheme('WEDDING', new Date('2027-03-10T00:00:00Z'), [weddingSpring])).toBe('winter');
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/occasions/campaigns.test.ts lib/occasions/themes.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement**

`lib/occasions/campaigns.ts`:

```ts
import type { EventTypeConvention } from '@/lib/api/types';

// A dated campaign on occasion pages. Copy lives in messages under
// OccasionPages.campaigns.<id> (lead, cta, banner). It never changes the H1.
export type OccasionCampaign = {
    id: string;
    occasions: readonly EventTypeConvention[] | 'all';
    // ISO with offset. startsAt inclusive, endsAt exclusive.
    startsAt: string;
    endsAt: string;
    // Swaps the hero sentence and CTA label (from copy) and, if set, the image.
    hero?: { image?: { src: string; width: number; height: number } };
    banner?: boolean;
    // Carried to /events/new?code=… by every create link on the page.
    discountCode?: string;
};

export const OCCASION_CAMPAIGNS: readonly OccasionCampaign[] = [];

function appliesTo(campaign: { occasions?: readonly EventTypeConvention[] | 'all' }, eventType: EventTypeConvention): boolean {
    return !campaign.occasions || campaign.occasions === 'all' || campaign.occasions.includes(eventType);
}

export function isWithinWindow(window: { startsAt: string; endsAt: string }, now: Date): boolean {
    const time = now.getTime();
    return Date.parse(window.startsAt) <= time && time < Date.parse(window.endsAt);
}

// The newest-starting campaign live for this occasion right now, if any.
export function activeCampaign(
    eventType: EventTypeConvention,
    now: Date,
    campaigns: readonly OccasionCampaign[] = OCCASION_CAMPAIGNS,
): OccasionCampaign | null {
    return (
        campaigns
            .filter((campaign) => appliesTo(campaign, eventType) && isWithinWindow(campaign, now))
            .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0] ?? null
    );
}

```

`lib/occasions/themes.ts`:

```ts
import type { EventTypeConvention } from '@/lib/api/types';
import { isWithinWindow } from '@/lib/occasions/campaigns';

// Each id has a [data-occasion-theme="<id>"] token set in components/landing/landing.css.
export const OCCASION_THEME_IDS = ['winter'] as const;
export type OccasionThemeId = (typeof OCCASION_THEME_IDS)[number];

export type OccasionTheme = {
    id: OccasionThemeId;
    // Omitted → every occasion.
    occasions?: readonly EventTypeConvention[];
    startsAt: string;
    endsAt: string;
};

export const OCCASION_THEMES: readonly OccasionTheme[] = [];

export function activeTheme(eventType: EventTypeConvention, now: Date, themes: readonly OccasionTheme[] = OCCASION_THEMES): OccasionThemeId | null {
    return (
        themes
            .filter((theme) => (!theme.occasions || theme.occasions.includes(eventType)) && isWithinWindow(theme, now))
            .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0]?.id ?? null
    );
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run lib/occasions/campaigns.test.ts lib/occasions/themes.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/occasions/campaigns.ts lib/occasions/themes.ts lib/occasions/campaigns.test.ts lib/occasions/themes.test.ts
git commit -m "feat(occasions): dated campaigns and seasonal themes"
```

---

### Task 3: SEO helpers

**Files:**
- Modify: `lib/seo.ts`, `components/landing/LandingStructuredData.tsx:44-46`
- Create: `lib/occasionMetadata.ts`
- Test: `lib/seo.test.ts`

The landing's JSON-LD escape `.replace(/</g, '\u003c')` is a no-op (`'\u003c'` is `<` in a JS string). Fix it with a shared helper.

- [ ] **Step 1: Add failing tests to `lib/seo.test.ts`**

```ts
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';
import { OCCASIONS } from '@/lib/occasions/occasions';
import { jsonLdHtml } from '@/lib/seo';

describe('jsonLdHtml', () => {
    it('escapes < so copy cannot close the script tag', () => {
        expect(jsonLdHtml({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}');
    });
});

describe('buildOccasionMetadata', () => {
    const wedding = OCCASIONS.find((occasion) => occasion.eventType === 'WEDDING')!;
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A' };

    it('uses the occasion page as canonical and lists both languages', () => {
        const metadata = buildOccasionMetadata(wedding, 'el', copy);
        expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/el/gamos`);
        expect(metadata.alternates?.languages).toEqual({
            en: `${SITE_URL}/weddings`,
            el: `${SITE_URL}/el/gamos`,
            'x-default': `${SITE_URL}/weddings`,
        });
        expect((metadata.openGraph as { url?: string }).url).toBe(`${SITE_URL}/el/gamos`);
        expect(metadata.robots).toEqual({ index: true, follow: true });
    });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/seo.test.ts` → FAIL (`jsonLdHtml` / `buildOccasionMetadata` not exported).

- [ ] **Step 3: Implement**

In `lib/seo.ts`:

Refactor `buildLandingMetadata` into a shared builder and add the two exports. Replace the existing `buildLandingMetadata` function with:

```ts
type PageMetadataCopy = {
    title: string;
    description: string;
    siteName: string;
    imageAlt: string;
};

function buildIndexableMetadata(
    locale: Locale,
    canonicalPath: string,
    languages: Record<string, string>,
    imagePath: string,
    copy: PageMetadataCopy,
): Metadata {
    const canonical = absoluteUrl(canonicalPath);
    const image = { url: absoluteUrl(imagePath), ...OG_IMAGE_SIZE, alt: copy.imageAlt };

    return {
        metadataBase: new URL(SITE_URL),
        title: copy.title,
        description: copy.description,
        alternates: { canonical, languages },
        openGraph: {
            type: 'website',
            url: canonical,
            siteName: copy.siteName,
            title: copy.title,
            description: copy.description,
            locale: ogLocale(locale),
            alternateLocale: locales.filter((other) => other !== locale).map(ogLocale),
            images: [image],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: [image],
        },
        robots: { index: true, follow: true },
    };
}

export function buildLandingMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata(locale, getPublicLandingPath(locale), landingLanguageAlternates(), OG_IMAGE_PATH, copy);
}

// JSON-LD for a <script> tag: `<` is escaped so a `</script>` in copy can't close it.
export function jsonLdHtml(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

Export `buildIndexableMetadata` and `PageMetadataCopy` (add `export` to both) and delete the old `LandingMetadataCopy` type. `lib/seo.ts` must not import from `lib/occasions/` — `occasions.ts` already imports `absoluteUrl` from it, and the occasion builder lives in `lib/occasionMetadata.ts` (Step 4) to keep the imports one-way.

In `components/landing/LandingStructuredData.tsx` replace the last two statements with:

```tsx
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
```

and add `jsonLdHtml` to its `@/lib/seo` import.

Create `lib/occasions/occasionSeo.ts` (pure, so it is unit-testable without next-intl; mirrors the `lib/seo.ts` / `lib/landingMetadata.ts` split):

```ts
import type { Metadata } from 'next';

import type { Locale } from '@/i18n/config';
import { type Occasion, occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { buildIndexableMetadata, type PageMetadataCopy } from '@/lib/seo';

// Each occasion page has its own share image next to it (opengraph-image.tsx).
export function buildOccasionMetadata(occasion: Occasion, locale: Locale, copy: PageMetadataCopy): Metadata {
    const path = occasionPath(occasion, locale);
    return buildIndexableMetadata(locale, path, occasionLanguageAlternates(occasion), `${path}/opengraph-image`, copy);
}
```

- [ ] **Step 4: Create `lib/occasionMetadata.ts`**

```ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';
import type { Occasion } from '@/lib/occasions/occasions';

export async function getOccasionMetadata(occasion: Occasion, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.meta` });
    const common = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildOccasionMetadata(occasion, locale, {
        title: t('title'),
        description: t('description'),
        siteName: common('siteName'),
        imageAlt: t('imageAlt'),
    });
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run lib/seo.test.ts` → PASS (existing landing tests still pass).

- [ ] **Step 6: Commit**

```bash
git add lib/seo.ts lib/seo.test.ts lib/occasions/occasionSeo.ts lib/occasionMetadata.ts components/landing/LandingStructuredData.tsx
git commit -m "feat(seo): occasion metadata builder; fix JSON-LD escaping"
```

---

### Task 4: Proxy locale for occasion paths

**Files:**
- Modify: `proxy.ts` (the `publicLocale` line in `proxy()`)
- Test: `proxy.test.ts`

- [ ] **Step 1: Add failing tests to the `describe('proxy')` block**

```ts
    it('renders an English occasion page in English whatever the cookie says', async () => {
        const req = request({}, 'http://localhost/weddings');
        req.cookies.set(localeCookieName, 'el');
        const res = await proxy(req);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('en');
    });

    it('renders a Greek occasion page in Greek', async () => {
        const res = await proxy(request({}, 'http://localhost/el/gamos'));
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
    });
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run proxy.test.ts` → the two new tests FAIL (header null).

- [ ] **Step 3: Implement**

In `proxy.ts` add `import { occasionLocaleForPath } from '@/lib/occasions/occasions';` and change:

```ts
    const publicLocale = pathname === '/' ? defaultLocale : locales.find((locale) => pathname === `/${locale}`);
```

to:

```ts
    const publicLocale =
        pathname === '/' ? defaultLocale : (locales.find((locale) => pathname === `/${locale}`) ?? occasionLocaleForPath(pathname));
```

The `/` redirect above it is untouched.

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run proxy.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts proxy.test.ts
git commit -m "feat(occasions): occasion pages render in their own language"
```

---

### Task 5: `code` param on the create flow

**Files:**
- Modify: `lib/createEventSteps.ts:43-46`, `lib/routes.ts` (`events.new`), `hooks/useCreateEventRun.ts`, `hooks/useCreateEventFormController.ts:99`
- Test: `lib/routes.test.ts` (create if absent), `hooks/useCreateEventRun.test.tsx` if it exists

- [ ] **Step 1: Failing test** — in `lib/routes.test.ts` (create the file with this content if it doesn't exist; otherwise add the `it`):

```ts
import { describe, expect, it } from 'vitest';

import { routes } from '@/lib/routes';

describe('routes.events.new', () => {
    it('carries a discount code', () => {
        expect(routes.events.new({ type: 'wedding', code: 'SUMMER27' })).toBe('/events/new?type=wedding&code=SUMMER27');
    });
});
```

- [ ] **Step 2: Run** `npx vitest run lib/routes.test.ts` → FAIL (type error / code dropped).

- [ ] **Step 3: Implement**

`lib/createEventSteps.ts`, after `CREATE_EVENT_OPTION_PARAM`:

```ts
// A discount code a link opens the wizard with (e.g. an occasion page campaign).
export const CREATE_EVENT_CODE_PARAM = 'code';
```

`lib/routes.ts`, the `events.new` signature:

```ts
        new: (
            params: {
                step?: string | null;
                run?: string | null;
                type?: string | null;
                plan?: string | null;
                option?: string | null;
                code?: string | null;
            } = {},
        ) => withQuery('/events/new', params),
```

`hooks/useCreateEventRun.ts`: import `CREATE_EVENT_CODE_PARAM`, read it next to `option`:

```ts
    const code = searchParams.get(CREATE_EVENT_CODE_PARAM);
```

pass it through the URL rewrite:

```ts
            const write = window.setTimeout(() => replacePageUrl(routes.events.new({ step, run: newCreateEventRunId(), type, plan, option, code })));
```

and add `code` to the effect's dependency array. Update the comment above `type` to "…opens on the linked type, plan, duration and code."

`hooks/useCreateEventFormController.ts`: import `CREATE_EVENT_CODE_PARAM` and change

```ts
    const [checkoutCode, setCheckoutCode] = useState('');
```

to

```ts
    // A link may carry a discount code (?code=); the field opens with it filled (EventOverviewDiscountCode).
    const [checkoutCode, setCheckoutCode] = useState(() => searchParams.get(CREATE_EVENT_CODE_PARAM)?.trim() ?? '');
```

The field already opens when `checkoutCode` starts non-empty (`useDisclosure(Boolean(checkoutCode))`), and the host still presses Apply.

- [ ] **Step 4: Run** `npx vitest run lib/routes.test.ts hooks/useCreateEventRun.test.tsx hooks/useCreateEventFormController.test.tsx` (skip files that don't exist) → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/createEventSteps.ts lib/routes.ts lib/routes.test.ts hooks/useCreateEventRun.ts hooks/useCreateEventFormController.ts
git commit -m "feat(create): open the wizard with a linked discount code"
```

---

### Task 6: Demo preview

**Files:**
- Modify: `lib/api/types.ts` (`AppEventTypeResponseDto`)
- Create: `lib/occasions/demoPreview.ts`, `lib/occasions/demoPreview.server.ts`
- Test: `lib/occasions/demoPreview.test.ts`

- [ ] **Step 1: Add `hasDemo`** to `AppEventTypeResponseDto` after `imageUrl`:

```ts
    // GET /api/demo/{eventTypeKey} would answer 200 right now (app-config-fe-integration.md, 2026-10-02).
    hasDemo: boolean;
```

Run `npm run type:check`; fix any test fixtures that build an `AppEventTypeResponseDto` literal by adding `hasDemo: false`.

- [ ] **Step 2: Failing test** `lib/occasions/demoPreview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { DemoSnapshotDto, MediaResponseDto, PostResponseDto, WishbookEntryResponseDto } from '@/lib/api/types';
import { pickDemoPreview } from '@/lib/occasions/demoPreview';

function media(id: string, overrides: Partial<MediaResponseDto> = {}): MediaResponseDto {
    return {
        id,
        mediaType: 'IMAGE',
        status: 'READY',
        mediaUrl: `https://media/${id}.jpg`,
        thumbnailUrl: `https://media/${id}-t.jpg`,
        width: 1200,
        height: 800,
        ...overrides,
    } as MediaResponseDto;
}

function post(id: string, content: string | null, items: MediaResponseDto[]): PostResponseDto {
    return { id, content, media: items, author: { displayName: `Guest ${id}` } } as PostResponseDto;
}

function wish(id: string, highlighted: boolean | null): WishbookEntryResponseDto {
    return { id, guestName: `Guest ${id}`, message: `Wish ${id}`, highlighted } as WishbookEntryResponseDto;
}

describe('pickDemoPreview', () => {
    it('keeps posts with text and a ready photo, photos and wishes, starred wishes first', () => {
        const snapshot = {
            presignedUrlsValidUntil: '2026-10-12T10:15:00Z',
            posts: [
                post('p1', 'Hello', [media('m1')]),
                post('p2', null, [media('m2')]),
                post('p3', 'Video only', [media('m3', { mediaType: 'VIDEO' })]),
                post('p4', 'Two', [media('m4'), media('m5')]),
            ],
            media: [media('m1'), media('m2'), media('m3', { mediaType: 'VIDEO' }), media('m6', { status: 'PROCESSING' })],
            wishbookEntries: [wish('w1', false), wish('w2', true), wish('w3', null)],
        } as unknown as DemoSnapshotDto;

        const preview = pickDemoPreview(snapshot);

        expect(preview.posts.map((p) => p.id)).toEqual(['p1', 'p4']);
        expect(preview.posts[0]).toEqual({
            id: 'p1',
            author: 'Guest p1',
            content: 'Hello',
            photo: { src: 'https://media/m1-t.jpg', width: 1200, height: 800 },
        });
        expect(preview.photos.map((photo) => photo.src)).toEqual(['https://media/m1-t.jpg', 'https://media/m2-t.jpg']);
        expect(preview.wishes.map((w) => w.id)).toEqual(['w2', 'w1', 'w3']);
    });

    it('caps each list', () => {
        const many = Array.from({ length: 12 }, (_, i) => media(`m${i}`));
        const snapshot = {
            presignedUrlsValidUntil: null,
            posts: many.map((m, i) => post(`p${i}`, 'x', [m])),
            media: many,
            wishbookEntries: Array.from({ length: 9 }, (_, i) => wish(`w${i}`, false)),
        } as unknown as DemoSnapshotDto;

        const preview = pickDemoPreview(snapshot);
        expect(preview.posts).toHaveLength(3);
        expect(preview.photos).toHaveLength(6);
        expect(preview.wishes).toHaveLength(3);
    });
});
```

- [ ] **Step 3: Run** `npx vitest run lib/occasions/demoPreview.test.ts` → FAIL.

- [ ] **Step 4: Implement `lib/occasions/demoPreview.ts`**

```ts
import type { DemoSnapshotDto, MediaResponseDto } from '@/lib/api/types';

export type DemoPreviewPhoto = { src: string; width: number; height: number };
export type DemoPreviewPost = { id: string; author: string; content: string; photo: DemoPreviewPhoto };
export type DemoPreviewWish = { id: string; guestName: string; message: string };
export type DemoPreview = { posts: DemoPreviewPost[]; photos: DemoPreviewPhoto[]; wishes: DemoPreviewWish[] };

const POST_LIMIT = 3;
const PHOTO_LIMIT = 6;
const WISH_LIMIT = 3;

function previewPhoto(media: MediaResponseDto): DemoPreviewPhoto | null {
    const src = media.thumbnailUrl ?? media.mediaUrl;
    if (media.mediaType !== 'IMAGE' || media.status !== 'READY' || !src) return null;
    return { src, width: media.width ?? 1200, height: media.height ?? 900 };
}

// The few real posts, photos and wishes an occasion page shows from its demo event.
export function pickDemoPreview(snapshot: DemoSnapshotDto): DemoPreview {
    const posts: DemoPreviewPost[] = [];
    for (const post of snapshot.posts) {
        if (posts.length === POST_LIMIT) break;
        const photo = post.media.map(previewPhoto).find((candidate) => candidate !== null);
        const content = post.content?.trim();
        if (photo && content) posts.push({ id: post.id, author: post.author?.displayName ?? '', content, photo });
    }

    const photos = snapshot.media
        .map(previewPhoto)
        .filter((photo) => photo !== null)
        .slice(0, PHOTO_LIMIT);

    const wishes = [...snapshot.wishbookEntries]
        .sort((a, b) => Number(b.highlighted === true) - Number(a.highlighted === true))
        .slice(0, WISH_LIMIT)
        .map(({ id, guestName, message }) => ({ id, guestName, message }));

    return { posts, photos, wishes };
}
```

- [ ] **Step 5: Implement `lib/occasions/demoPreview.server.ts`**

```ts
import { unstable_cache } from 'next/cache';

import type { Locale } from '@/i18n/config';
import type { DemoSnapshotDto, EventTypeConvention } from '@/lib/api/types';
import { demoSnapshotPath } from '@/lib/demo/snapshotClient';
import { type DemoPreview, pickDemoPreview } from '@/lib/occasions/demoPreview';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const PREVIEW_WINDOW_MS = 5 * 60 * 1000;

// The demo endpoint is rate-limited per caller IP and every server fetch shares this server's
// address, so the snapshot is read at most once per type, language and 5-minute window. The
// window is part of the cache key rather than a revalidate: a stale entry would carry media
// links that expire 15 minutes after the snapshot. Only the small preview is cached; the full
// snapshot can be larger than the data cache's 2 MB item limit.
const loadPreview = unstable_cache(
    async (eventType: EventTypeConvention, locale: Locale, _window: number): Promise<DemoPreview | null> => {
        const res = await fetch(`${API_BASE_URL}${demoSnapshotPath(eventType)}`, {
            headers: { Accept: 'application/json', 'Accept-Language': locale },
            cache: 'no-store',
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Demo snapshot for ${eventType} failed with status ${res.status}`);
        return pickDemoPreview((await res.json()) as DemoSnapshotDto);
    },
    ['occasion-demo-preview'],
    { revalidate: PREVIEW_WINDOW_MS / 1000 },
);

// Best-effort: null hides the section.
export async function loadOccasionDemoPreview(eventType: EventTypeConvention, locale: Locale): Promise<DemoPreview | null> {
    try {
        return await loadPreview(eventType, locale, Math.floor(Date.now() / PREVIEW_WINDOW_MS));
    } catch {
        return null;
    }
}
```

Also update the comment on `fetchDemoSnapshot` in `lib/demo/snapshotClient.ts` — append: `The one server-side reader is lib/occasions/demoPreview.server.ts, cached so Spring sees about one call per type every 5 minutes.`

- [ ] **Step 6: Run** `npx vitest run lib/occasions/demoPreview.test.ts` → PASS; `npm run type:check` → no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/api/types.ts lib/occasions/demoPreview.ts lib/occasions/demoPreview.server.ts lib/occasions/demoPreview.test.ts lib/demo/snapshotClient.ts
git commit -m "feat(occasions): cached server demo preview"
```

(Add any fixture files changed in Step 1.)

---

### Task 7: Copy

**Files:**
- Modify: `messages/en.json`, `messages/el.json`
- Test: `lib/occasions/occasionCopy.test.ts`

Copy is a draft for the owner's review. Keywords come from the roadmap doc.

- [ ] **Step 1: Failing test** `lib/occasions/occasionCopy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import el from '@/messages/el.json';
import en from '@/messages/en.json';
import { readyOccasions } from '@/lib/occasions/occasions';

type Json = Record<string, unknown>;

function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
    return [prefix];
}

describe('occasion copy', () => {
    it('has the same keys in English and Greek', () => {
        expect(keyPaths((el as Json).OccasionPages)).toEqual(keyPaths((en as Json).OccasionPages));
    });

    it.each(readyOccasions().map((occasion) => [occasion.eventType, occasion] as const))('%s has copy for every listed feature', (eventType, occasion) => {
        for (const catalog of [en, el] as Json[]) {
            const copy = (catalog.OccasionPages as Json)[eventType] as Json;
            expect(Object.keys(copy.features as Json)).toEqual([...occasion.features]);
            expect(((copy.meta as Json).title as string).length).toBeLessThanOrEqual(60);
            expect((copy.faq as unknown[]).length).toBeGreaterThanOrEqual(5);
        }
    });

    it('gives each occasion a unique title', () => {
        for (const catalog of [en, el] as Json[]) {
            const titles = readyOccasions().map((occasion) => (((catalog.OccasionPages as Json)[occasion.eventType] as Json).meta as Json).title);
            expect(new Set(titles).size).toBe(titles.length);
        }
    });
});
```

- [ ] **Step 2: Run** `npx vitest run lib/occasions/occasionCopy.test.ts` → FAIL (`OccasionPages` undefined).

- [ ] **Step 3: Write the English copy.** Save as `C:/…/scratchpad/occasions.en.json` (the session scratchpad):

```json
{
    "common": {
        "nav": { "home": "StoryWall home", "signIn": "Sign in", "create": "Create your StoryWall" },
        "breadcrumbHome": "Home",
        "timelineHeading": "Before, on the day, after",
        "featuresHeading": "What you get",
        "demo": {
            "heading": "See a real StoryWall",
            "postsLabel": "Posts from guests",
            "photosLabel": "Photos",
            "wishesLabel": "Wishes",
            "tryDemo": "Try the live demo"
        },
        "howItWorksHeading": "How it works",
        "plans": { "line": "Plans start with everything you need for one event.", "link": "See plans" },
        "faqHeading": "Questions",
        "finalCta": "Create your StoryWall",
        "linksHeading": "Other occasions",
        "linksHome": "All of StoryWall"
    },
    "campaigns": {},
    "WEDDING": {
        "name": "Weddings",
        "meta": {
            "title": "Wedding Website & Guest Photo Sharing | StoryWall",
            "description": "One private wedding website for your invitation, RSVPs, guest photos by QR code, wishes and song requests. No app for guests to install.",
            "imageAlt": "StoryWall for weddings"
        },
        "hero": {
            "h1": "Wedding website and guest photo sharing",
            "lead": "Send the invitation, collect RSVPs and gather every guest photo in one private space, before, during and after the day.",
            "cta": "Create your wedding StoryWall",
            "imageAlt": "Wedding guests celebrating with photos shared on StoryWall"
        },
        "timeline": [
            { "title": "Before", "body": "Guests get one link with the date, schedule and maps. They RSVP, suggest songs and follow the plans." },
            { "title": "On the day", "body": "Guests scan the QR code on the tables and add photos and videos. No app, no account needed to upload." },
            { "title": "After", "body": "Photos, stories and wishes stay together, from the preparations to the honeymoon." }
        ],
        "features": {
            "invitation": { "title": "Digital wedding invitation", "body": "Date, schedule, ceremony and reception with maps, all on your guests' phones." },
            "rsvp": { "title": "Online wedding RSVP", "body": "Guests answer from the link. You see who is coming, with notes and plus-ones, in one list." },
            "qrPhotos": { "title": "QR code wedding photos", "body": "Put the QR code on the tables. Guests scan it and add their photos and videos straight from the camera roll." },
            "wishbook": { "title": "Digital wedding guestbook", "body": "Guests leave their wishes in one book you can keep and read again." },
            "gifts": { "title": "Wedding gift list", "body": "Share a gift list or gift account on the same page as the invitation." },
            "music": { "title": "Wedding song requests", "body": "Guests suggest the songs they want to hear, so the DJ knows the room before the party." }
        },
        "howItWorks": [
            { "title": "Create", "body": "Pick a plan and add your date, venues and schedule." },
            { "title": "Share", "body": "Send the invitation link and print the QR code for the tables." },
            { "title": "The story begins", "body": "Guests RSVP, post and add photos. Everything lands in one private feed." }
        ],
        "faq": [
            { "q": "Do guests need to install an app?", "a": "No. Everything opens in the phone's browser from the invitation link or the QR code." },
            { "q": "How do guests upload photos at the reception?", "a": "They scan the QR code on the table and pick photos or videos. Uploading through the QR code doesn't need an account." },
            { "q": "Can older guests use it?", "a": "Yes. They open a link or scan a code, the same as any website." },
            { "q": "Who can see our photos?", "a": "Only the people you invite. Your StoryWall is private and isn't listed anywhere." },
            { "q": "How long does it stay online?", "a": "Your plan sets how long your event stays open. You can extend it from your event's settings." },
            { "q": "Can it replace the paper invitation?", "a": "Yes. Many couples send the link instead, or add the QR code to their printed invitation." },
            { "q": "Does it replace our photographer?", "a": "No. It collects the moments your guests capture, alongside your photographer's work." }
        ],
        "finalCta": { "heading": "Start your wedding StoryWall", "body": "Set it up in a few minutes and share it with your guests today." }
    },
    "BAPTISM": {
        "name": "Baptisms",
        "meta": {
            "title": "Digital Baptism Invitation & Photo Sharing | StoryWall",
            "description": "A private page for your baptism or christening: invitation with maps, RSVPs, guest photos by QR code and a book of wishes for your child.",
            "imageAlt": "StoryWall for baptisms"
        },
        "hero": {
            "h1": "Digital baptism invitation and photo sharing",
            "lead": "One private space for the christening day, with the photos and wishes kept for your child to read when they grow up.",
            "cta": "Create your baptism StoryWall",
            "imageAlt": "Family and guests celebrating a baptism outside a church"
        },
        "timeline": [
            { "title": "Before", "body": "Guests get the church, reception and schedule in one link, with maps. They RSVP from there." },
            { "title": "On the day", "body": "Guests scan the QR code and add their photos from the church and the reception." },
            { "title": "After", "body": "The photos and the book of wishes stay together, ready for your child one day." }
        ],
        "features": {
            "invitation": { "title": "Digital baptism invitation", "body": "Church, reception, schedule and maps on every guest's phone." },
            "rsvp": { "title": "Baptism RSVP", "body": "Guests answer from the link and you see who is coming in one list." },
            "wishbook": { "title": "A book of wishes for your child", "body": "Godparents, grandparents and friends write their christening wishes in one book your child can read one day." },
            "qrPhotos": { "title": "Christening photo sharing", "body": "Guests scan the QR code and add their photos to one album, without installing anything." },
            "gifts": { "title": "Christening gift list", "body": "Share a gift list or gift account next to the invitation." }
        },
        "howItWorks": [
            { "title": "Create", "body": "Pick a plan and add the church, reception and time." },
            { "title": "Share", "body": "Send the link to your guests and print the QR code for the reception." },
            { "title": "The story begins", "body": "Guests RSVP, add photos and write their wishes for your child." }
        ],
        "faq": [
            { "q": "Do guests need to install an app?", "a": "No. The invitation and the QR code open in the phone's browser." },
            { "q": "Can grandparents use it easily?", "a": "Yes. They tap a link or scan a code. Nothing to install." },
            { "q": "Who can see the photos of our child?", "a": "Only the guests you invite. Your StoryWall is private." },
            { "q": "How long does it stay online?", "a": "Your plan sets how long your event stays open. You can extend it from your event's settings." },
            { "q": "Can we keep the wishes?", "a": "Yes. The book of wishes stays with the event, together with the photos." },
            { "q": "Does it replace the paper invitation?", "a": "It can. Send the link on its own, or add the QR code to your printed invitation." }
        ],
        "finalCta": { "heading": "Start your baptism StoryWall", "body": "Set it up in a few minutes and send it to your guests." }
    }
}
```

- [ ] **Step 4: Write the Greek copy.** Save as `scratchpad/occasions.el.json`:

```json
{
    "common": {
        "nav": { "home": "Αρχική StoryWall", "signIn": "Σύνδεση", "create": "Δημιούργησε το StoryWall σου" },
        "breadcrumbHome": "Αρχική",
        "timelineHeading": "Πριν, την ημέρα, μετά",
        "featuresHeading": "Τι περιλαμβάνει",
        "demo": {
            "heading": "Δες ένα πραγματικό StoryWall",
            "postsLabel": "Αναρτήσεις καλεσμένων",
            "photosLabel": "Φωτογραφίες",
            "wishesLabel": "Ευχές",
            "tryDemo": "Δοκίμασε το demo"
        },
        "howItWorksHeading": "Πώς λειτουργεί",
        "plans": { "line": "Τα πακέτα περιλαμβάνουν ό,τι χρειάζεσαι για μία εκδήλωση.", "link": "Δες τα πακέτα" },
        "faqHeading": "Ερωτήσεις",
        "finalCta": "Δημιούργησε το StoryWall σου",
        "linksHeading": "Άλλες περιστάσεις",
        "linksHome": "Όλο το StoryWall"
    },
    "campaigns": {},
    "WEDDING": {
        "name": "Γάμος",
        "meta": {
            "title": "Ψηφιακό Προσκλητήριο & Φωτογραφίες Γάμου | StoryWall",
            "description": "Ψηφιακό προσκλητήριο γάμου με χάρτη, RSVP, φωτογραφίες καλεσμένων με QR code, βιβλίο ευχών και τραγούδια. Χωρίς εφαρμογή για τους καλεσμένους.",
            "imageAlt": "Το StoryWall για γάμους"
        },
        "hero": {
            "h1": "Ψηφιακό προσκλητήριο και φωτογραφίες γάμου από τους καλεσμένους",
            "lead": "Στείλε το προσκλητήριο, μάζεψε τις επιβεβαιώσεις και όλες τις φωτογραφίες των καλεσμένων σε έναν ιδιωτικό χώρο, πριν, κατά και μετά τον γάμο.",
            "cta": "Δημιούργησε το StoryWall του γάμου σου",
            "imageAlt": "Καλεσμένοι γάμου γιορτάζουν με φωτογραφίες στο StoryWall"
        },
        "timeline": [
            { "title": "Πριν", "body": "Οι καλεσμένοι παίρνουν ένα link με την ημερομηνία, το πρόγραμμα και τους χάρτες. Επιβεβαιώνουν παρουσία και προτείνουν τραγούδια." },
            { "title": "Την ημέρα", "body": "Σκανάρουν το QR code στα τραπέζια και ανεβάζουν φωτογραφίες και βίντεο. Χωρίς εφαρμογή, χωρίς λογαριασμό." },
            { "title": "Μετά", "body": "Φωτογραφίες, stories και ευχές μένουν μαζί, από τις ετοιμασίες μέχρι τον μήνα του μέλιτος." }
        ],
        "features": {
            "invitation": { "title": "Ηλεκτρονικό προσκλητήριο γάμου με χάρτη", "body": "Ημερομηνία, πρόγραμμα, εκκλησία και δεξίωση με χάρτες, στο κινητό κάθε καλεσμένου." },
            "rsvp": { "title": "RSVP γάμου", "body": "Οι καλεσμένοι επιβεβαιώνουν παρουσία από το link και εσύ βλέπεις ποιος έρχεται σε μία λίστα." },
            "qrPhotos": { "title": "QR code για φωτογραφίες γάμου", "body": "Βάλε το QR code στα τραπέζια. Οι καλεσμένοι το σκανάρουν και ανεβάζουν φωτογραφίες και βίντεο στο κοινό άλμπουμ του γάμου." },
            "wishbook": { "title": "Ψηφιακό βιβλίο ευχών γάμου", "body": "Οι ευχές των καλεσμένων μένουν σε ένα βιβλίο που μπορείς να ξαναδιαβάζεις." },
            "gifts": { "title": "Λίστα γάμου online", "body": "Μοιράσου τη λίστα γάμου ή τον λογαριασμό δώρων δίπλα στο προσκλητήριο." },
            "music": { "title": "Τραγούδια γάμου από τους καλεσμένους", "body": "Οι καλεσμένοι προτείνουν τα τραγούδια που θέλουν να ακούσουν, για να ξέρει ο DJ τι θα παίξει." }
        },
        "howItWorks": [
            { "title": "Δημιούργησε", "body": "Διάλεξε πακέτο και πρόσθεσε ημερομηνία, χώρους και πρόγραμμα." },
            { "title": "Μοιράσου", "body": "Στείλε το link του προσκλητηρίου και τύπωσε το QR code για τα τραπέζια." },
            { "title": "Η ιστορία ξεκινά", "body": "Οι καλεσμένοι επιβεβαιώνουν, γράφουν και ανεβάζουν φωτογραφίες σε ένα ιδιωτικό feed." }
        ],
        "faq": [
            { "q": "Χρειάζεται εφαρμογή για τους καλεσμένους;", "a": "Όχι. Όλα ανοίγουν στον browser του κινητού από το link ή το QR code." },
            { "q": "Πώς ανεβάζουν φωτογραφίες οι καλεσμένοι στη δεξίωση;", "a": "Σκανάρουν το QR code στο τραπέζι και διαλέγουν φωτογραφίες ή βίντεο. Για το ανέβασμα με QR code δεν χρειάζεται λογαριασμός." },
            { "q": "Μπορούν να το χρησιμοποιήσουν οι μεγαλύτεροι καλεσμένοι;", "a": "Ναι. Ανοίγουν ένα link ή σκανάρουν έναν κωδικό, όπως σε κάθε ιστοσελίδα." },
            { "q": "Ποιος βλέπει τις φωτογραφίες μας;", "a": "Μόνο όσοι προσκαλείς. Το StoryWall σου είναι ιδιωτικό." },
            { "q": "Για πόσο καιρό μένει online;", "a": "Το πακέτο σου ορίζει για πόσο μένει ανοιχτή η εκδήλωση. Μπορείς να το επεκτείνεις από τις ρυθμίσεις της." },
            { "q": "Αντικαθιστά το έντυπο προσκλητήριο;", "a": "Ναι. Πολλά ζευγάρια στέλνουν μόνο το link ή βάζουν το QR code στο έντυπο προσκλητήριο." },
            { "q": "Αντικαθιστά τον φωτογράφο;", "a": "Όχι. Μαζεύει τις στιγμές που τραβούν οι καλεσμένοι, δίπλα στη δουλειά του φωτογράφου." }
        ],
        "finalCta": { "heading": "Ξεκίνα το StoryWall του γάμου σου", "body": "Στήσ' το σε λίγα λεπτά και στείλ' το στους καλεσμένους σου." }
    },
    "BAPTISM": {
        "name": "Βάπτιση",
        "meta": {
            "title": "Ψηφιακό Προσκλητήριο & Φωτογραφίες Βάπτισης | StoryWall",
            "description": "Ηλεκτρονικό προσκλητήριο βάπτισης με χάρτη, RSVP, φωτογραφίες καλεσμένων με QR code και βιβλίο ευχών για το παιδί σου.",
            "imageAlt": "Το StoryWall για βαπτίσεις"
        },
        "hero": {
            "h1": "Ψηφιακό προσκλητήριο και φωτογραφίες βάπτισης",
            "lead": "Ένας ιδιωτικός χώρος για τη βάπτιση, με τις φωτογραφίες και τις ευχές να μένουν για να τις διαβάσει το παιδί σου όταν μεγαλώσει.",
            "cta": "Δημιούργησε το StoryWall της βάπτισης",
            "imageAlt": "Οικογένεια και καλεσμένοι γιορτάζουν μια βάπτιση έξω από την εκκλησία"
        },
        "timeline": [
            { "title": "Πριν", "body": "Οι καλεσμένοι παίρνουν σε ένα link την εκκλησία, τη δεξίωση και το πρόγραμμα με χάρτες, και επιβεβαιώνουν παρουσία." },
            { "title": "Την ημέρα", "body": "Σκανάρουν το QR code και ανεβάζουν φωτογραφίες από την εκκλησία και τη δεξίωση." },
            { "title": "Μετά", "body": "Οι φωτογραφίες και το βιβλίο ευχών μένουν μαζί, για το παιδί σου." }
        ],
        "features": {
            "invitation": { "title": "Ηλεκτρονικό προσκλητήριο βάπτισης με χάρτη", "body": "Εκκλησία, δεξίωση, πρόγραμμα και χάρτες στο κινητό κάθε καλεσμένου." },
            "rsvp": { "title": "RSVP βάπτισης", "body": "Οι καλεσμένοι επιβεβαιώνουν από το link και βλέπεις ποιος έρχεται σε μία λίστα." },
            "wishbook": { "title": "Βιβλίο ευχών βάπτισης", "body": "Νονοί, παππούδες και φίλοι γράφουν τις ευχές τους σε ένα βιβλίο που θα διαβάσει το παιδί μια μέρα." },
            "qrPhotos": { "title": "QR code για φωτογραφίες βάπτισης", "body": "Οι καλεσμένοι σκανάρουν το QR code και ανεβάζουν τις φωτογραφίες τους σε ένα άλμπουμ βάπτισης." },
            "gifts": { "title": "Λίστα δώρων βάπτισης", "body": "Μοιράσου τη λίστα δώρων ή τον λογαριασμό δώρων δίπλα στο προσκλητήριο." }
        },
        "howItWorks": [
            { "title": "Δημιούργησε", "body": "Διάλεξε πακέτο και πρόσθεσε εκκλησία, δεξίωση και ώρα." },
            { "title": "Μοιράσου", "body": "Στείλε το link στους καλεσμένους και τύπωσε το QR code για τη δεξίωση." },
            { "title": "Η ιστορία ξεκινά", "body": "Οι καλεσμένοι επιβεβαιώνουν, ανεβάζουν φωτογραφίες και γράφουν ευχές για το παιδί." }
        ],
        "faq": [
            { "q": "Χρειάζεται εφαρμογή για τους καλεσμένους;", "a": "Όχι. Το προσκλητήριο και το QR code ανοίγουν στον browser του κινητού." },
            { "q": "Μπορούν να το χρησιμοποιήσουν εύκολα οι παππούδες;", "a": "Ναι. Πατούν ένα link ή σκανάρουν έναν κωδικό. Τίποτα για εγκατάσταση." },
            { "q": "Ποιος βλέπει τις φωτογραφίες του παιδιού μας;", "a": "Μόνο οι καλεσμένοι σου. Το StoryWall σου είναι ιδιωτικό." },
            { "q": "Για πόσο καιρό μένει online;", "a": "Το πακέτο σου ορίζει για πόσο μένει ανοιχτή η εκδήλωση. Μπορείς να το επεκτείνεις από τις ρυθμίσεις της." },
            { "q": "Μπορούμε να κρατήσουμε τις ευχές;", "a": "Ναι. Το βιβλίο ευχών μένει στην εκδήλωση, μαζί με τις φωτογραφίες." },
            { "q": "Αντικαθιστά το έντυπο προσκλητήριο;", "a": "Μπορεί. Στείλε μόνο το link ή βάλε το QR code στο έντυπο προσκλητήριο." }
        ],
        "finalCta": { "heading": "Ξεκίνα το StoryWall της βάπτισης", "body": "Στήσ' το σε λίγα λεπτά και στείλ' το στους καλεσμένους σου." }
    }
}
```

- [ ] **Step 5: Merge both into the catalogs and add the footer label**

```bash
node -e "
const fs=require('fs');
for (const [lang, file] of [['en','occasions.en.json'],['el','occasions.el.json']]) {
  const path='messages/'+lang+'.json';
  const catalog=JSON.parse(fs.readFileSync(path,'utf8'));
  catalog.OccasionPages=JSON.parse(fs.readFileSync(process.argv[1]+'/'+file,'utf8'));
  catalog.LandingPage.footer.occasions = lang==='en' ? 'OCCASIONS' : 'ΠΕΡΙΣΤΑΣΕΙΣ';
  fs.writeFileSync(path, JSON.stringify(catalog,null,4)+'\n');
}" "<scratchpad dir>"
```

Then run `git diff --stat messages/` — only additions expected. If the files used different indentation, re-run with the original indent so the diff stays small (check `head -3 messages/en.json`).

- [ ] **Step 6: Run** `npx vitest run lib/occasions/occasionCopy.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/el.json lib/occasions/occasionCopy.test.ts
git commit -m "feat(occasions): wedding and baptism copy (EN, EL)"
```

---

### Task 8: LanguageSwitcher `alternatePaths`

**Files:**
- Modify: `components/LanguageSwitcher.tsx`

- [ ] **Step 1: Implement.** Add the prop and use it before the landing check:

```tsx
export function LanguageSwitcher({
    alternatePaths,
    className,
    variant = 'default',
}: {
    // The page's own URL in each language (occasion pages). Switching goes there.
    alternatePaths?: Partial<Record<Locale, string>>;
    className?: string;
    variant?: LanguageSwitcherVariant;
}) {
```

Inside `handleChange`, replace `if (isPublicLandingPath(pathname)) {` and the `router.push(getPublicLandingPath(next));` inside it with:

```tsx
            const publicPath = alternatePaths?.[next] ?? (isPublicLandingPath(pathname) ? getPublicLandingPath(next) : null);
            if (publicPath) {
```

```tsx
                    router.push(publicPath);
```

Update the comment to mention occasion pages: "Public pages have one URL per language, and are sibling routes under the same root layout, so …". Add `alternatePaths` to the `useCallback` dependency list.

- [ ] **Step 2: Run** `npx vitest run components/LanguageSwitcher` (if a test exists) and `npm run type:check` → pass.

- [ ] **Step 3: Commit**

```bash
git add components/LanguageSwitcher.tsx
git commit -m "feat(i18n): language switch to a page's own alternate URL"
```

---

### Task 9: Theme tokens

**Files:**
- Modify: `components/landing/landing.css` (append)

- [ ] **Step 1: Append**

```css
/* Occasion pages: palette tokens. A dated theme (lib/occasions/themes.ts) swaps them.
   Brand coral stays on primary actions. */
.occasion-page {
    --occasion-accent: #e78274;
    --occasion-tint: #fff7f1;
    --occasion-decor: none;
}

.occasion-page[data-occasion-theme='winter'] {
    --occasion-accent: #5b7fa6;
    --occasion-tint: #f3f6fa;
    --occasion-decor: url('/landing/decor-07.webp');
}
```

Before committing, open `public/landing/decor-07.webp` and confirm it reads as wintry/festive; if not, pick another `decor-*.webp` that does, or set `none`.

- [ ] **Step 2: Commit**

```bash
git add components/landing/landing.css
git commit -m "feat(occasions): theme tokens"
```

---

### Task 10: Page sections

**Files (all new, under `components/occasions/`):** `OccasionHeader.tsx`, `OccasionCampaignBanner.tsx`, `OccasionHero.tsx`, `OccasionTimeline.tsx`, `OccasionFeatures.tsx`, `OccasionDemoPreview.tsx`, `OccasionHowItWorks.tsx`, `OccasionPlans.tsx`, `OccasionFaq.tsx`, `OccasionFinalCta.tsx`, `OccasionLinks.tsx`, `OccasionStructuredData.tsx`; plus `lib/occasions/occasionLinks.ts` (+ test)

All are server components that take `locale` and read copy with `getTranslations({ locale, namespace })`. Mobile-first; `min-[761px]:` is the landing's desktop breakpoint.

- [ ] **Step 1: `lib/occasions/occasionLinks.ts`**

```ts
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { routes } from '@/lib/routes';

// Every create link on an occasion page opens the wizard on that type, with the campaign's code.
export function occasionCreateHref(occasion: Occasion, campaign: OccasionCampaign | null): string {
    return routes.events.new({ type: eventTypeSlug(occasion.eventType), code: campaign?.discountCode ?? null });
}
```

Test `lib/occasions/occasionLinks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { OCCASIONS } from '@/lib/occasions/occasions';

const wedding = OCCASIONS[0];

describe('occasionCreateHref', () => {
    it('links to the wizard on the type, with a campaign code when there is one', () => {
        expect(occasionCreateHref(wedding, null)).toBe('/events/new?type=wedding');
        expect(occasionCreateHref(wedding, { id: 'x', occasions: 'all', startsAt: '', endsAt: '', discountCode: 'C1' })).toBe(
            '/events/new?type=wedding&code=C1',
        );
    });
});
```

Run it: write test → FAIL → implement → PASS.

- [ ] **Step 2: `OccasionHeader.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { routes } from '@/lib/routes';

type OccasionHeaderProps = { alternatePaths: Record<Locale, string>; createHref: string; locale: Locale };

export async function OccasionHeader({ alternatePaths, createHref, locale }: OccasionHeaderProps) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.nav' });

    return (
        <header className="flex items-center justify-between gap-4 px-5 py-4 min-[761px]:px-[5vw] min-[761px]:py-6">
            {/* Brand */}
            <a aria-label={t('home')} href={getPublicLandingPath(locale)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
                <img alt="" className="h-6 w-auto min-[761px]:h-7" height={28} src="/assets/LogoText.svg" width={140} />
            </a>
            {/* Actions */}
            <nav className="flex items-center gap-4 text-sm font-bold">
                <LanguageSwitcher alternatePaths={alternatePaths} className="hidden min-[761px]:inline-flex" />
                <a className="hidden min-[761px]:inline" href={routes.login}>
                    {t('signIn')}
                </a>
                <a className="rounded-full bg-[#151313] px-4 py-2.5 text-xs tracking-wide text-white uppercase no-underline" href={createHref}>
                    {t('create')}
                </a>
            </nav>
        </header>
    );
}
```

The mobile language switch lives in the footer area (Step 11) so the header stays one row on a phone.

- [ ] **Step 3: `OccasionCampaignBanner.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';

export async function OccasionCampaignBanner({ campaign, locale }: { campaign: OccasionCampaign; locale: Locale }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` });

    return (
        <p className="m-0 bg-[var(--occasion-accent)] px-5 py-2.5 text-center text-[13px] font-bold text-white">
            {t('banner')}
            {campaign.discountCode ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 font-mono">{campaign.discountCode}</span> : null}
        </p>
    );
}
```

- [ ] **Step 4: `OccasionHero.tsx`**

```tsx
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionHeroProps = { campaign: OccasionCampaign | null; createHref: string; locale: Locale; occasion: Occasion };

export async function OccasionHero({ campaign, createHref, locale, occasion }: OccasionHeroProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    // A campaign may swap the sentence, CTA label and image. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const image = campaign?.hero?.image ?? occasion.heroImage;

    return (
        <section className="grid gap-8 px-5 pt-6 pb-12 min-[761px]:grid-cols-[1fr_1fr] min-[761px]:items-center min-[761px]:px-[5vw] min-[761px]:pb-20">
            {/* Copy */}
            <div>
                <h1 className="m-0 [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[0.95] font-normal tracking-[-0.05em] text-balance min-[761px]:text-[clamp(56px,5.6vw,92px)]">
                    {t('h1')}
                </h1>
                <p className="mt-5 max-w-140 text-base leading-[1.55] text-pretty">{c ? c('lead') : t('lead')}</p>
                <a
                    className="mt-7 inline-flex min-h-13 items-center rounded-full bg-[#151313] px-6 text-xs font-black tracking-[0.08em] text-white uppercase no-underline"
                    href={createHref}
                >
                    {c ? c('cta') : t('cta')}
                </a>
            </div>
            {/* Photo */}
            {image ? (
                <Image
                    priority
                    alt={t('imageAlt')}
                    className="h-auto w-full rounded-br-[42px] object-cover"
                    height={image.height}
                    sizes="(min-width: 761px) 45vw, 100vw"
                    src={image.src}
                    width={image.width}
                />
            ) : (
                <div aria-hidden="true" className="aspect-[4/3] w-full rounded-br-[42px] bg-[linear-gradient(135deg,#d27b9b_0%,#e78274_28%,#f4905f_58%,#fcba63_100%)]" />
            )}
        </section>
    );
}
```

- [ ] **Step 5: `OccasionTimeline.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; body: string };

export async function OccasionTimeline({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('timeline') as Step[];

    return (
        <section className="bg-[var(--occasion-tint)] px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('timelineHeading')}
            </h2>
            <ol className="mt-8 grid list-none gap-8 p-0 min-[761px]:grid-cols-3">
                {steps.map((step) => (
                    <li key={step.title}>
                        <h3 className="m-0 text-sm font-black tracking-[0.12em] text-[var(--occasion-accent)] uppercase">{step.title}</h3>
                        <p className="mt-2 text-[15px] leading-[1.55]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
```

- [ ] **Step 6: `OccasionFeatures.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function OccasionFeatures({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.features` });

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('featuresHeading')}
            </h2>
            <div className="mt-8 grid gap-x-12 gap-y-8 min-[761px]:grid-cols-2">
                {occasion.features.map((key) => (
                    <div key={key}>
                        <h3 className="m-0 text-lg font-bold">{t(`${key}.title`)}</h3>
                        <p className="mt-2 text-[15px] leading-[1.55] text-[var(--ink)]">{t(`${key}.body`)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 7: `OccasionDemoPreview.tsx`**

```tsx
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { DemoPreview } from '@/lib/occasions/demoPreview';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import type { Occasion } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';

export async function OccasionDemoPreview({ locale, occasion, preview }: { locale: Locale; occasion: Occasion; preview: DemoPreview }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.demo' });

    return (
        <section className="bg-[#151313] px-5 py-12 text-white min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {t('heading')}
            </h2>

            {/* Posts */}
            {preview.posts.length > 0 ? (
                <div className="mt-8" aria-label={t('postsLabel')} role="group">
                    <div className="grid gap-5 min-[761px]:grid-cols-3">
                        {preview.posts.map((post) => (
                            <article className="overflow-hidden rounded-2xl bg-white text-[#151313]" key={post.id}>
                                <Image alt="" className="aspect-[4/3] h-auto w-full object-cover" height={post.photo.height} sizes="(min-width: 761px) 30vw, 100vw" src={post.photo.src} width={post.photo.width} />
                                <div className="p-4">
                                    <p className="m-0 text-xs font-bold">{post.author}</p>
                                    <p className="mt-1 line-clamp-3 text-sm leading-[1.5]">{post.content}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Photos */}
            {preview.photos.length > 0 ? (
                <div className="mt-8 grid grid-cols-3 gap-1.5 min-[761px]:grid-cols-6" aria-label={t('photosLabel')} role="group">
                    {preview.photos.map((photo) => (
                        <Image alt="" className="aspect-square h-auto w-full object-cover" height={photo.height} key={photo.src} sizes="(min-width: 761px) 16vw, 33vw" src={photo.src} width={photo.width} />
                    ))}
                </div>
            ) : null}

            {/* Wishes */}
            {preview.wishes.length > 0 ? (
                <ul className="mt-8 grid list-none gap-5 p-0 min-[761px]:grid-cols-3" aria-label={t('wishesLabel')}>
                    {preview.wishes.map((wish) => (
                        <li key={wish.id}>
                            <blockquote className="m-0 [font-family:var(--editorial)] text-xl leading-[1.35]">{wish.message}</blockquote>
                            <p className="mt-2 text-xs font-bold text-white/70">{wish.guestName}</p>
                        </li>
                    ))}
                </ul>
            ) : null}

            <a className="mt-10 inline-flex min-h-13 items-center rounded-full bg-white px-6 text-xs font-black tracking-[0.08em] text-[#151313] uppercase no-underline" href={routes.demoEventType(eventTypeSlug(occasion.eventType))}>
                {t('tryDemo')}
            </a>
        </section>
    );
}
```

Demo photos are decorative here (`alt=""`): they're guest content without alt text, and the surrounding copy carries the meaning.

- [ ] **Step 8: `OccasionHowItWorks.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type Step = { title: string; body: string };

export async function OccasionHowItWorks({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const steps = t.raw('howItWorks') as Step[];

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('howItWorksHeading')}
            </h2>
            <ol className="mt-8 grid list-none gap-8 p-0 min-[761px]:grid-cols-3">
                {steps.map((step, index) => (
                    <li key={step.title}>
                        <span aria-hidden="true" className="[font-family:var(--editorial)] text-5xl text-[var(--occasion-accent)]">
                            {index + 1}
                        </span>
                        <h3 className="mt-2 mb-0 text-lg font-bold">{step.title}</h3>
                        <p className="mt-2 text-[15px] leading-[1.55]">{step.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
```

- [ ] **Step 9: `OccasionPlans.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// One line and a link: pricing lives on the homepage only.
export async function OccasionPlans({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'OccasionPages.common.plans' });

    return (
        <section className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--occasion-tint)] px-5 py-8 min-[761px]:px-[5vw]">
            <p className="m-0 text-[15px]">{t('line')}</p>
            <a className="text-[15px] font-bold" href={`${getPublicLandingPath(locale)}#pricing`}>
                {t('link')}
            </a>
        </section>
    );
}
```

- [ ] **Step 10: `OccasionFaq.tsx`** (native `<details>`, so answers are in the HTML)

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export type OccasionFaqItem = { q: string; a: string };

export async function OccasionFaq({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const items = t.raw('faq') as OccasionFaqItem[];

    return (
        <section className="px-5 py-12 min-[761px]:px-[5vw] min-[761px]:py-20">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(30px,8vw,40px)] font-normal tracking-[-0.04em] min-[761px]:text-[56px]">
                {common('faqHeading')}
            </h2>
            <div className="mt-6 max-w-200 divide-y divide-black/10">
                {items.map((item) => (
                    <details className="group py-4" key={item.q}>
                        <summary className="cursor-pointer list-none text-base font-bold">{item.q}</summary>
                        <p className="mt-2 mb-0 text-[15px] leading-[1.55]">{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
```

- [ ] **Step 11: `OccasionFinalCta.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

type OccasionFinalCtaProps = { alternatePaths: Record<Locale, string>; createHref: string; locale: Locale; occasion: Occasion };

export async function OccasionFinalCta({ alternatePaths, createHref, locale, occasion }: OccasionFinalCtaProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.finalCta` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });

    return (
        <section className="bg-[linear-gradient(135deg,#ffc969_0%,#f9a462_48%,#f39a72_100%)] px-5 py-14 min-[761px]:px-[7vw] min-[761px]:py-24">
            <h2 className="m-0 [font-family:var(--editorial)] text-[clamp(40px,11vw,56px)] leading-[0.9] font-normal tracking-[-0.05em] min-[761px]:text-[88px]">
                {t('heading')}
            </h2>
            <p className="mt-4 max-w-140 text-base leading-[1.55]">{t('body')}</p>
            <a className="mt-7 inline-flex min-h-14 items-center rounded-full bg-white px-6 text-xs font-black tracking-[0.08em] text-[#151313] uppercase no-underline" href={createHref}>
                {common('finalCta')}
            </a>
            {/* Language (mobile) */}
            <LanguageSwitcher alternatePaths={alternatePaths} className="mt-8 flex min-[761px]:hidden" />
        </section>
    );
}
```

- [ ] **Step 12: `OccasionLinks.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath, readyOccasions } from '@/lib/occasions/occasions';

export async function OccasionLinks({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const pages = await getTranslations({ locale, namespace: 'OccasionPages' });
    const others = readyOccasions().filter((other) => other.eventType !== occasion.eventType);

    return (
        <nav aria-label={common('linksHeading')} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm min-[761px]:px-[5vw]">
            <span className="font-black tracking-[0.12em] uppercase">{common('linksHeading')}</span>
            {others.map((other) => (
                <a href={occasionPath(other, locale)} key={other.eventType}>
                    {pages(`${other.eventType}.name`)}
                </a>
            ))}
            <a href={getPublicLandingPath(locale)}>{common('linksHome')}</a>
        </nav>
    );
}
```

- [ ] **Step 13: `OccasionStructuredData.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';

import type { OccasionFaqItem } from '@/components/occasions/OccasionFaq';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml, SITE_URL } from '@/lib/seo';

// The service for this occasion, a breadcrumb and the FAQ. No offers: prices come from config.
export async function OccasionStructuredData({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const url = absoluteUrl(occasionPath(occasion, locale));
    const faq = t.raw('faq') as OccasionFaqItem[];

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Service',
                name: t('meta.title'),
                description: t('meta.description'),
                url,
                inLanguage: locale,
                provider: { '@id': `${SITE_URL}/#organization` },
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: common('breadcrumbHome'), item: absoluteUrl(getPublicLandingPath(locale)) },
                    { '@type': 'ListItem', position: 2, name: t('name'), item: url },
                ],
            },
            {
                '@type': 'FAQPage',
                mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
            },
        ],
    };

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
```

`provider` points at the `Organization` node, which only exists in the homepage's graph. Include the same Organization node here so the reference resolves: add to `@graph`:

```ts
            { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'StoryWall', url: absoluteUrl('/'), logo: absoluteUrl('/apple-icon.png') },
```

- [ ] **Step 14: Type-check, lint, commit**

Run: `npm run type:check && npx eslint components/occasions lib/occasions` → clean.

```bash
git add components/occasions lib/occasions/occasionLinks.ts lib/occasions/occasionLinks.test.ts
git commit -m "feat(occasions): page sections"
```

---

### Task 11: `OccasionPage` composition

**Files:**
- Create: `components/occasions/OccasionPage.tsx`, `components/occasions/OccasionContent.tsx`
- Modify: `i18n/publicMessages.test.ts` (`ENTRY_FILES`)

- [ ] **Step 1: `OccasionPage.tsx`** (data + gate, like `LandingPage`)

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionStructuredData } from '@/components/occasions/OccasionStructuredData';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { activeCampaign } from '@/lib/occasions/campaigns';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import type { Occasion } from '@/lib/occasions/occasions';
import { activeTheme } from '@/lib/occasions/themes';
import { makeQueryClient } from '@/lib/queryClient';

export async function OccasionPage({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const queryClient = makeQueryClient();
    let config: AppConfigResponseDto | null = null;

    try {
        config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort: the page still renders and useAppConfig() fetches on the client.
    }

    // Live only while the event type is on. Unknown (config failed) → render.
    const eventType = config?.eventTypes.find((candidate) => candidate.eventTypeKey === occasion.eventType);
    if (config && !eventType?.isEnabled) notFound();

    const preview = eventType?.hasDemo ? await loadOccasionDemoPreview(occasion.eventType, locale) : null;
    const now = new Date();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OccasionStructuredData locale={locale} occasion={occasion} />
            <OccasionContent
                campaign={activeCampaign(occasion.eventType, now)}
                locale={locale}
                occasion={occasion}
                preview={preview}
                theme={activeTheme(occasion.eventType, now)}
            />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 2: `OccasionContent.tsx`**

```tsx
import '@/components/landing/landing.css';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { OccasionCampaignBanner } from '@/components/occasions/OccasionCampaignBanner';
import { OccasionDemoPreview } from '@/components/occasions/OccasionDemoPreview';
import { OccasionFaq } from '@/components/occasions/OccasionFaq';
import { OccasionFeatures } from '@/components/occasions/OccasionFeatures';
import { OccasionFinalCta } from '@/components/occasions/OccasionFinalCta';
import { OccasionHeader } from '@/components/occasions/OccasionHeader';
import { OccasionHero } from '@/components/occasions/OccasionHero';
import { OccasionHowItWorks } from '@/components/occasions/OccasionHowItWorks';
import { OccasionLinks } from '@/components/occasions/OccasionLinks';
import { OccasionPlans } from '@/components/occasions/OccasionPlans';
import { OccasionTimeline } from '@/components/occasions/OccasionTimeline';
import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { DemoPreview } from '@/lib/occasions/demoPreview';
import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { type Occasion, occasionAlternatePaths } from '@/lib/occasions/occasions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type OccasionContentProps = {
    campaign: OccasionCampaign | null;
    locale: Locale;
    occasion: Occasion;
    preview: DemoPreview | null;
    theme: OccasionThemeId | null;
};

export function OccasionContent({ campaign, locale, occasion, preview, theme }: OccasionContentProps) {
    const createHref = occasionCreateHref(occasion, campaign);
    const alternatePaths = occasionAlternatePaths(occasion);
    const hasPreview = preview && (preview.posts.length > 0 || preview.photos.length > 0 || preview.wishes.length > 0);

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <main className="occasion-page overflow-x-clip bg-white text-[#151313]" data-occasion-theme={theme ?? undefined}>
                {/* Campaign banner */}
                {campaign?.banner ? <OccasionCampaignBanner campaign={campaign} locale={locale} /> : null}

                {/* Header */}
                <OccasionHeader alternatePaths={alternatePaths} createHref={createHref} locale={locale} />

                {/* Hero */}
                <OccasionHero campaign={campaign} createHref={createHref} locale={locale} occasion={occasion} />

                {/* Before, during, after */}
                <OccasionTimeline locale={locale} occasion={occasion} />

                {/* Features */}
                <OccasionFeatures locale={locale} occasion={occasion} />

                {/* Demo preview */}
                {hasPreview ? <OccasionDemoPreview locale={locale} occasion={occasion} preview={preview} /> : null}

                {/* How it works */}
                <OccasionHowItWorks locale={locale} occasion={occasion} />

                {/* Plans */}
                <OccasionPlans locale={locale} />

                {/* FAQ */}
                <OccasionFaq locale={locale} occasion={occasion} />

                {/* Final call to action */}
                <OccasionFinalCta alternatePaths={alternatePaths} createHref={createHref} locale={locale} occasion={occasion} />

                {/* Other occasions */}
                <OccasionLinks locale={locale} occasion={occasion} />

                {/* Footer */}
                <LandingFooter />
            </main>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
```

`LandingFooter`'s "Explore" links are in-page anchors (`#pricing`, …) that only exist on the homepage. Give `LandingFooter` an optional `anchorBase?: string` prop (default `''`) and render `href={`${anchorBase}${href}`}` for `EXPLORE_LINKS` only. In `OccasionContent`, render `<LandingFooter anchorBase={getPublicLandingPath(locale)} />` (import from `@/i18n/publicLocale`) and add `id="top-preview"` to the `<main>` so the footer's "back to top" link (`TOP_HREF`, unprefixed) still works.

`LandingFooter` uses `getTranslations('LandingPage.footer')` without a locale; it resolves the request locale, which proxy sets for occasion paths (Task 4), so it renders in the right language.

- [ ] **Step 3: Keep the public message picker honest.** In `i18n/publicMessages.test.ts`, change `ENTRY_FILES` to:

```ts
const ENTRY_FILES = ['app/(landing)/layout.tsx', 'components/landing/LandingPage.tsx', 'components/occasions/OccasionPage.tsx'];
```

Run `npx vitest run i18n/publicMessages.test.ts`. If it reports a missing namespace, add it to `PUBLIC_CLIENT_NAMESPACES` (expected: none new — the occasion sections are server components; `LanguageSwitcher` and `CookieConsent` are already listed).

- [ ] **Step 4: Commit**

```bash
git add components/occasions/OccasionPage.tsx components/occasions/OccasionContent.tsx components/landing/LandingFooter.tsx i18n/publicMessages.test.ts
git commit -m "feat(occasions): occasion page composition and gate"
```

---

### Task 12: Routes and share images

**Files:**
- Move: `app/(landing)/[locale]/page.tsx` → `app/(landing)/[slug]/page.tsx`
- Create: `app/(landing)/[slug]/[occasion]/page.tsx`, `app/(landing)/[slug]/opengraph-image.tsx`, `app/(landing)/[slug]/[occasion]/opengraph-image.tsx`
- Modify: `lib/og/ogImages.tsx`, `components/LanguageSwitcher.tsx` comment (`/[locale]` → `/[slug]`)

- [ ] **Step 1: Move the folder**

```bash
git mv "app/(landing)/[locale]" "app/(landing)/[slug]"
```

- [ ] **Step 2: Rewrite `app/(landing)/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { LandingPage } from '@/components/landing/LandingPage';
import { OccasionPage } from '@/components/occasions/OccasionPage';
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getLandingMetadata } from '@/lib/landingMetadata';
import { getOccasionMetadata } from '@/lib/occasionMetadata';
import { findReadyOccasion } from '@/lib/occasions/occasions';

// One segment for two kinds of page: `/el` (a locale's landing) and `/weddings` (an English
// occasion page). Next.js allows only one dynamic segment name per level.
type SlugPageProps = {
    params: Promise<{ slug: string }>;
};

function isSupportedLocale(slug: string): slug is Locale {
    return (locales as readonly string[]).includes(slug);
}

export function generateStaticParams() {
    return locales.filter((locale) => locale !== defaultLocale).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
    const { slug } = await params;
    if (isSupportedLocale(slug)) return slug === defaultLocale ? {} : getLandingMetadata(slug);
    const occasion = findReadyOccasion(defaultLocale, slug);
    return occasion ? getOccasionMetadata(occasion, defaultLocale) : {};
}

export default async function SlugPage({ params }: SlugPageProps) {
    const { slug } = await params;

    // `/en` is a duplicate of `/`; a permanent redirect keeps crawlers on the canonical URL.
    if (slug === defaultLocale) permanentRedirect('/');
    if (isSupportedLocale(slug)) return <LandingPage />;

    const occasion = findReadyOccasion(defaultLocale, slug);
    if (!occasion) notFound();
    return <OccasionPage locale={defaultLocale} occasion={occasion} />;
}
```

- [ ] **Step 3: `app/(landing)/[slug]/[occasion]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OccasionPage } from '@/components/occasions/OccasionPage';
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getOccasionMetadata } from '@/lib/occasionMetadata';
import { findReadyOccasion, type Occasion } from '@/lib/occasions/occasions';

// `/el/gamos`: an occasion page in a non-default locale.
type LocalizedOccasionPageProps = {
    params: Promise<{ slug: string; occasion: string }>;
};

function resolve(slug: string, occasionSlug: string): { locale: Locale; occasion: Occasion } | null {
    const locale = locales.find((candidate) => candidate === slug && candidate !== defaultLocale);
    if (!locale) return null;
    const occasion = findReadyOccasion(locale, occasionSlug);
    return occasion ? { locale, occasion } : null;
}

export async function generateMetadata({ params }: LocalizedOccasionPageProps): Promise<Metadata> {
    const { slug, occasion } = await params;
    const resolved = resolve(slug, occasion);
    return resolved ? getOccasionMetadata(resolved.occasion, resolved.locale) : {};
}

export default async function LocalizedOccasionPage({ params }: LocalizedOccasionPageProps) {
    const { slug, occasion } = await params;
    const resolved = resolve(slug, occasion);
    if (!resolved) notFound();
    return <OccasionPage locale={resolved.locale} occasion={resolved.occasion} />;
}
```

- [ ] **Step 4: `occasionOgImage` in `lib/og/ogImages.tsx`.** Add a function that renders the brand canvas with a title, reusing the file's `CANVAS`, `INK`, `CORAL`, `logoDataUri` and `loadTitleFont`:

```tsx
// An occasion page's share image: the brand canvas with the occasion's H1.
export async function occasionOgImage(title: string): Promise<Response> {
    const [logoSrc, font] = await Promise.all([logoDataUri(), loadTitleFont(title)]);
    const titleSize = title.length > 48 ? 64 : 80;

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 88px',
                background: CANVAS,
                color: INK,
                fontFamily: font ? TITLE_FONT : 'sans-serif',
            }}
        >
            {/* Corner accent */}
            <div style={{ position: 'absolute', right: -140, top: -140, width: 460, height: 460, borderRadius: 9999, background: CORAL, opacity: 0.18 }} />
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
            <img alt="" height={56} src={logoSrc} width={280} />
            {/* Title */}
            <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 960 }}>{title}</div>
        </div>,
        {
            ...OG_IMAGE_SIZE,
            fonts: font ? [{ name: TITLE_FONT, data: font, weight: 700, style: 'normal' }] : undefined,
        },
    );
}
```

Before writing it, read the full `brandOgImage` and `eventOgImage` in that file and match how they size the logo and pass `fonts`; adjust the snippet to the same values rather than the ones above if they differ.

- [ ] **Step 5: Share image routes**

`app/(landing)/[slug]/opengraph-image.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { defaultLocale } from '@/i18n/config';
import { brandOgImage, occasionOgImage } from '@/lib/og/ogImages';
import { findReadyOccasion } from '@/lib/occasions/occasions';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';
export const alt = 'StoryWall';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const occasion = findReadyOccasion(defaultLocale, slug);
    if (!occasion) return brandOgImage();
    const t = await getTranslations({ locale: defaultLocale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    return occasionOgImage(t('h1'));
}
```

`app/(landing)/[slug]/[occasion]/opengraph-image.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { type Locale, locales } from '@/i18n/config';
import { brandOgImage, occasionOgImage } from '@/lib/og/ogImages';
import { findReadyOccasion } from '@/lib/occasions/occasions';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';
export const alt = 'StoryWall';

export default async function Image({ params }: { params: Promise<{ slug: string; occasion: string }> }) {
    const { slug, occasion: occasionSlug } = await params;
    const locale = locales.find((candidate) => candidate === slug) as Locale | undefined;
    const occasion = locale ? findReadyOccasion(locale, occasionSlug) : null;
    if (!locale || !occasion) return brandOgImage();
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    return occasionOgImage(t('h1'));
}
```

Note: `app/(landing)/[slug]/opengraph-image.tsx` also applies to `/el`. Today `/el` uses the root `/opengraph-image`; its metadata (`buildLandingMetadata`) sets the image URL explicitly to `/opengraph-image`, so the new file only adds an unused `/el/opengraph-image` route that serves the brand image. Acceptable.

- [ ] **Step 6: Verify the build**

Run: `npm run type:check` → clean. Then `npx next build` (or `npm run build`) and check the route table lists `/[slug]`, `/[slug]/[occasion]` and both `opengraph-image` routes without errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(landing)" lib/og/ogImages.tsx components/LanguageSwitcher.tsx
git commit -m "feat(occasions): occasion routes and share images"
```

---

### Task 13: Sitemap

**Files:**
- Modify: `app/sitemap.ts`
- Test: `app/sitemap.test.ts`

- [ ] **Step 1: Failing test** `app/sitemap.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import sitemap from '@/app/sitemap';
import { SITE_URL } from '@/lib/seo';

describe('sitemap', () => {
    it('lists the landing pages and every enabled ready occasion with its alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`, `${SITE_URL}/weddings`, `${SITE_URL}/el/gamos`]);
    });

    it('keeps every ready occasion when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toContain(`${SITE_URL}/baptisms`);
        expect(urls).toContain(`${SITE_URL}/el/vaptisi`);
    });
});
```

- [ ] **Step 2: Run** `npx vitest run app/sitemap.test.ts` → FAIL.

- [ ] **Step 3: Implement `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { occasionLanguageAlternates, occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { absoluteUrl, landingLanguageAlternates } from '@/lib/seo';

// The enabled event types, or null when the config can't be read (then every ready occasion is listed).
async function enabledEventTypes(): Promise<Set<EventTypeConvention> | null> {
    try {
        const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        return new Set(config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey));
    } catch {
        return null;
    }
}

// Only the public landing and occasion pages are indexable. Every other route is either
// behind a session or a tokenised guest link, so it stays out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const landingLanguages = landingLanguageAlternates();
    const landing: MetadataRoute.Sitemap = locales.map((locale) => ({
        url: absoluteUrl(getPublicLandingPath(locale)),
        changeFrequency: 'weekly',
        priority: 1,
        alternates: { languages: landingLanguages },
    }));

    const enabled = await enabledEventTypes();
    const occasions: MetadataRoute.Sitemap = readyOccasions()
        .filter((occasion) => !enabled || enabled.has(occasion.eventType))
        .flatMap((occasion) => {
            const languages = occasionLanguageAlternates(occasion);
            return locales.map((locale) => ({
                url: absoluteUrl(occasionPath(occasion, locale)),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
                alternates: { languages },
            }));
        });

    return [...landing, ...occasions];
}
```

`serverPublicConfigGet` calls `getLocale()` (next-intl). If the sitemap route errors at build or request time because there's no request locale, give `serverPublicConfigGet` an optional `locale` argument and pass `defaultLocale` here; check this in Step 5.

- [ ] **Step 4: Run** `npx vitest run app/sitemap.test.ts` → PASS.

- [ ] **Step 5: Check the real route** — with the dev server running (Task 15), `curl -s http://localhost:3000/sitemap.xml` lists the 6 URLs with `xhtml:link` alternates.

- [ ] **Step 6: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(seo): occasion pages in the sitemap"
```

---

### Task 14: Homepage links

**Files:**
- Modify: `lib/landingMedia.ts`, `components/landing/LandingStoryRow.tsx`, `components/landing/LandingStoryCopy.tsx`, `components/landing/LandingStories.tsx`, `components/landing/LandingFooter.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Tag story rows with their occasion.** In `lib/landingMedia.ts` add to `LandingStoryMedia`:

```ts
    // The occasion page this row links to, when it is live (lib/occasions/occasions.ts).
    occasion?: EventTypeConvention;
```

(import `EventTypeConvention` from `@/lib/api/types`) and set `occasion: 'WEDDING'` on the first entry and `occasion: 'BAPTISM'` on the baptism entry (the one whose `main` is the baptism photo).

- [ ] **Step 2: Link label copy.** Add `LandingPage.stories.occasionLink`: en `"Learn more"`, el `"Μάθε περισσότερα"`.

- [ ] **Step 3: Pass the link down.** In `LandingStories.tsx` read the locale (`const locale = (await getLocale()) as Locale;`) and pass `occasionLabel={t('occasionLink')}` and `locale` to each `LandingStoryRow`. In `LandingStoryRow.tsx`:

```tsx
    const occasion = media.occasion ? findOccasion(media.occasion) : null;
    const more = occasion?.ready ? { href: occasionPath(occasion, locale), label: occasionLabel } : undefined;
```

and pass `more` to `LandingStoryCopy`. In `LandingStoryCopy.tsx` add `more?: { href: string; label: string }` and render, after the demo link:

```tsx
            {/* Occasion page link */}
            {more ? (
                <a className="mt-4 ml-1 inline-block text-[13px] font-bold text-[var(--ink)] underline underline-offset-4 min-[761px]:ml-5" href={more.href}>
                    {more.label}
                </a>
            ) : null}
```

- [ ] **Step 4: Footer occasions column.** In `LandingFooter.tsx`, after the Explore column, add:

```tsx
                {/* Occasions */}
                <div className="flex flex-col items-start">
                    <div className={COLUMN_HEADING}>{t('occasions')}</div>
                    {readyOccasions().map((occasion) => (
                        <a className={COLUMN_LINK} href={occasionPath(occasion, locale)} key={occasion.eventType}>
                            {pages(`${occasion.eventType}.name`)}
                        </a>
                    ))}
                </div>
```

with `const locale = (await getLocale()) as Locale;` and `const pages = await getTranslations('OccasionPages');` at the top of the component, and change the desktop grid to four columns: `min-[761px]:grid-cols-[1.65fr_0.75fr_0.75fr_0.75fr]`.

- [ ] **Step 5: Run** `npx vitest run components/landing` and `npm run type:check` → pass (update `LandingFooter.guidelines.test.tsx` if it mocks translations and now needs `OccasionPages` names / `getLocale`).

- [ ] **Step 6: Commit**

```bash
git add lib/landingMedia.ts components/landing messages/en.json messages/el.json
git commit -m "feat(landing): link the homepage to occasion pages"
```

---

### Task 15: Verify

- [ ] **Step 1: Full checks**

Run: `npm run type:check && npm run lint && npm test` → all pass. Fix every lint error.

- [ ] **Step 2: Server HTML.** The user's dev server runs on :3000 from the main checkout (memory: never start one with `preview_start {name}` here). Ask the user to run this branch's dev server, or run `npx next dev -p 3100` from the worktree in the background. Then:

```bash
for p in /weddings /el/gamos /baptisms /el/vaptisi; do
  curl -s "http://localhost:3100$p" | grep -oE '<h1[^>]*>[^<]+|rel="canonical" href="[^"]+"|hreflang="[^"]+"|noindex' | sort -u
done
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/gamos
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/el/weddings
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/birthdays
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/en
```

Expected: each page has exactly one h1, its own canonical, `en`/`el`/`x-default` hreflang, no `noindex`; the three wrong slugs give 404; `/en` gives 308.

- [ ] **Step 3: Visual check.** Open `/weddings` and `/el/vaptisi` in the browser pane at mobile (375×812, primary) and desktop. Check section separation, the language switch goes to the paired page, and the create link carries `?type=`.

- [ ] **Step 4: Campaign and theme smoke test.** Temporarily add to `OCCASION_CAMPAIGNS` a campaign covering today with `banner: true`, `discountCode: 'TEST10'`, `hero: {}` and copy under `OccasionPages.campaigns.test` (`lead`, `cta`, `banner`, both languages), and a `winter` theme covering today. Check the banner, hero lead/CTA swap, unchanged H1, `?code=TEST10` on create links (opens the wizard with the code filled), and the winter tokens. Then revert these temporary edits (`git checkout -- lib/occasions messages`).

- [ ] **Step 5: SEO checklist.** Walk `docs/seo-guidelines.md` "Indexable pages" and "Occasion pages" for the four URLs and list any BLOCKER in the PR description.

- [ ] **Step 6: PR into `staging`** with the copy flagged for owner review, and the follow-ups: per-language demos (backend), the other six occasions, Search Console requests after launch.
