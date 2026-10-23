# Business Partner Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public, indexable partner page for wedding and baptism professionals at `/for-business` (EN) and `/el/epaggelmaties` (EL), with a founding-spots counter and an apply form that posts to Spring.

**Architecture:** Two thin route files under `app/(landing)` render one server component tree (`components/forBusiness/`). The proxy gives both URLs a fixed locale, the same way it does for `/` and `/el`. Pure logic (paths, metadata, founding state, banner decision, form mapping, country list, occasions) lives in `lib/` and `i18n/` with unit tests. The only client islands are the apply form, the language banner and the existing language switcher and footer newsletter.

**Tech Stack:** Next.js 16 App Router, next-intl 4, React 19, Tailwind, Vitest + Testing Library, `next/og` for OG images.

**Spec:** [docs/superpowers/specs/2026-10-10-business-partner-landing-design.md](../specs/2026-10-10-business-partner-landing-design.md)

**Backend dependency:** two public Spring endpoints (Task 6 holds the contract). The frontend ships safely before them: the spots fetch falls back to "Limited to the first 20 partners", and the form shows the generic error until the POST exists. Do not announce the page until Spring is live.

---

## File map

| File | Responsibility |
| --- | --- |
| `i18n/publicLocale.ts` (modify) | Partner page paths per locale, `publicPageLocale`, `publicTwinPath` |
| `i18n/publicLocale.test.ts` (create) | Tests for the above |
| `proxy.ts` / `proxy.test.ts` (modify) | Fixed locale header for the partner page URLs |
| `components/LanguageSwitcher.tsx` (modify) | Switch between twin URLs on every public page |
| `lib/seo.ts` / `lib/seo.test.ts` (modify) | `buildPublicPageMetadata`, `forBusinessLanguageAlternates`, `buildForBusinessMetadata` |
| `app/sitemap.ts` / `app/sitemap.test.ts` | Partner URLs in the sitemap |
| `lib/api/types.ts`, `lib/api/endpoints.ts` (modify) | Spring contract types and paths |
| `lib/forBusinessOccasions.ts` (+ test) | Occasions config |
| `lib/forBusiness.ts` (+ test) | Founding block state, language banner decision |
| `lib/forBusinessApplication.ts` (+ test) | Country list, UTM, request mapping, error mapping |
| `lib/forBusinessServer.ts` | Server fetch of the founding summary |
| `hooks/useForBusinessApplication.ts` (+ test) | Apply form state and submit |
| `hooks/useLanguageBanner.ts` | Banner show/dismiss state |
| `messages/en.json`, `messages/el.json` (modify) | `ForBusinessPage` namespace, footer link |
| `i18n/publicMessages.ts` / test (modify) | Ship the apply form's messages to the client |
| `components/forBusiness/*.tsx` (create) | Page sections, form, banner, structured data |
| `components/landing/LandingFooter.tsx` (modify) | Off-landing anchors, "For professionals" link |
| `lib/og/ogImages.tsx` (modify) | `forBusinessOgImage` |
| `app/(landing)/for-business/page.tsx`, `opengraph-image.tsx` | EN route |
| `app/(landing)/[locale]/epaggelmaties/page.tsx`, `opengraph-image.tsx` | EL route |

---

### Task 0: Workspace

**Files:** none

- [ ] **Step 1: Confirm the branch is on top of `staging`**

Run: `git fetch origin staging && git log --oneline HEAD..origin/staging`
Expected: no output. If there are commits, stop and ask the user before rebasing.

- [ ] **Step 2: Link `node_modules` when the lockfiles match the main checkout**

Run (PowerShell):
```powershell
git -C C:\Users\User\WebstormProjects\storywall diff --stat HEAD -- package.json package-lock.json
```
If there's no output, link the main checkout's `node_modules`:
```powershell
New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules
```
If the lockfiles differ, stop and ask the user before installing.

- [ ] **Step 3: Baseline**

Run: `npm run type:check; npm test`
Expected: both pass. Note any failures that were already there, so they aren't blamed on this work.

---

### Task 1: Partner page paths and twins

**Files:**
- Modify: `i18n/publicLocale.ts`
- Create: `i18n/publicLocale.test.ts`

- [ ] **Step 1: Write the failing test**

`i18n/publicLocale.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { getForBusinessPath, isForBusinessPath, publicPageLocale, publicTwinPath } from '@/i18n/publicLocale';

describe('getForBusinessPath', () => {
    it('gives each locale its own slug', () => {
        expect(getForBusinessPath('en')).toBe('/for-business');
        expect(getForBusinessPath('el')).toBe('/el/epaggelmaties');
    });
});

describe('isForBusinessPath', () => {
    it('matches only the two partner page URLs', () => {
        expect(isForBusinessPath('/for-business')).toBe(true);
        expect(isForBusinessPath('/el/epaggelmaties')).toBe(true);
        expect(isForBusinessPath('/el/for-business')).toBe(false);
        expect(isForBusinessPath('/en/epaggelmaties')).toBe(false);
        expect(isForBusinessPath(null)).toBe(false);
    });
});

describe('publicPageLocale', () => {
    it('reads the locale from the landing and partner URLs', () => {
        expect(publicPageLocale('/')).toBe('en');
        expect(publicPageLocale('/el')).toBe('el');
        expect(publicPageLocale('/for-business')).toBe('en');
        expect(publicPageLocale('/el/epaggelmaties')).toBe('el');
    });

    it('is null everywhere else', () => {
        expect(publicPageLocale('/feed')).toBeNull();
        expect(publicPageLocale('/el/for-business')).toBeNull();
        expect(publicPageLocale('/partners/abc')).toBeNull();
    });
});

describe('publicTwinPath', () => {
    it('maps the landing to the landing', () => {
        expect(publicTwinPath('/', 'el')).toBe('/el');
        expect(publicTwinPath('/el', 'en')).toBe('/');
    });

    it('maps the partner page to the partner page', () => {
        expect(publicTwinPath('/for-business', 'el')).toBe('/el/epaggelmaties');
        expect(publicTwinPath('/el/epaggelmaties', 'en')).toBe('/for-business');
    });

    it('is null for any other page', () => {
        expect(publicTwinPath('/feed', 'el')).toBeNull();
        expect(publicTwinPath(null, 'el')).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run i18n/publicLocale.test.ts`
Expected: FAIL, because `getForBusinessPath` is not exported.

- [ ] **Step 3: Implement**

Replace `i18n/publicLocale.ts` with:
```ts
import { defaultLocale, type Locale, locales } from '@/i18n/config';

export function getPublicLandingPath(locale: Locale): string {
    return locale === defaultLocale ? '/' : `/${locale}`;
}

export function isPublicLandingPath(pathname: string | null): boolean {
    return pathname === '/' || locales.some((locale) => locale !== defaultLocale && pathname === `/${locale}`);
}

// The partner page for businesses. Each slug is in its page's language and
// never changes once live (docs/seo-guidelines.md).
const FOR_BUSINESS_PATHS: Record<Locale, string> = {
    en: '/for-business',
    el: '/el/epaggelmaties',
};

export function getForBusinessPath(locale: Locale): string {
    return FOR_BUSINESS_PATHS[locale];
}

export function isForBusinessPath(pathname: string | null): boolean {
    return locales.some((locale) => FOR_BUSINESS_PATHS[locale] === pathname);
}

// The language a public page is written in, read from its URL alone so
// crawlers get the same language as visitors. Null for every other path.
export function publicPageLocale(pathname: string): Locale | null {
    return locales.find((locale) => pathname === getPublicLandingPath(locale) || pathname === FOR_BUSINESS_PATHS[locale]) ?? null;
}

// The same public page in another language; null when the page has no twin.
export function publicTwinPath(pathname: string | null, target: Locale): string | null {
    if (isPublicLandingPath(pathname)) return getPublicLandingPath(target);
    if (isForBusinessPath(pathname)) return getForBusinessPath(target);
    return null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run i18n/publicLocale.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add i18n/publicLocale.ts i18n/publicLocale.test.ts
git commit -m "feat(i18n): partner page paths and twin URLs"
```

---

### Task 2: Proxy gives the partner URLs their locale

`i18n/request.ts` reads the locale from the `PUBLIC_LOCALE_HEADER` the proxy sets. Today that header is only set for `/` and `/el`, so without this change `/el/epaggelmaties` would render in whatever language the cookie or browser asks for, and Googlebot would see English on the Greek URL.

**Files:**
- Modify: `proxy.ts:111`
- Modify: `proxy.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `proxy.test.ts`:
```ts
describe('proxy partner page locale', () => {
    function partnerRequest(url: string, acceptLanguage: string) {
        return new NextRequest(url, { headers: { 'accept-language': acceptLanguage } });
    }

    it('renders /el/epaggelmaties in Greek for an English browser', async () => {
        const res = await proxy(partnerRequest('http://localhost/el/epaggelmaties', 'en-US'));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
    });

    it('renders /for-business in English for a Greek browser, without redirecting', async () => {
        const res = await proxy(partnerRequest('http://localhost/for-business', 'el-GR'));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('en');
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run proxy.test.ts`
Expected: the two new tests FAIL (the header is `null`).

- [ ] **Step 3: Implement**

In `proxy.ts`, change the import from `@/i18n/publicLocale` to:
```ts
import { getPublicLandingPath, publicPageLocale } from '@/i18n/publicLocale';
```
Replace:
```ts
    const publicLocale = pathname === '/' ? defaultLocale : locales.find((locale) => pathname === `/${locale}`);
```
with:
```ts
    const publicLocale = publicPageLocale(pathname);
```
If `defaultLocale` or `locales` are now unused in `proxy.ts`, remove them from the `@/i18n/config` import (lint will flag it).

- [ ] **Step 4: Run the whole proxy suite**

Run: `npx vitest run proxy.test.ts`
Expected: PASS, including every existing landing redirect test.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts proxy.test.ts
git commit -m "feat(proxy): fixed locale for the partner page URLs"
```

---

### Task 3: Language switcher swaps twin URLs

**Files:**
- Modify: `components/LanguageSwitcher.tsx`

- [ ] **Step 1: Implement**

Change the import:
```ts
import { publicTwinPath } from '@/i18n/publicLocale';
```
In `handleChange`, replace the `if (isPublicLandingPath(pathname)) { ... }` block header and the `router.push` inside it:
```ts
            const twin = publicTwinPath(pathname, next);
            if (twin) {
                // Public pages in each language are sibling routes under the same root
                // layout, so a plain router.push leaves the layout (and its
                // NextIntlClientProvider messages) mounted with the old locale.
                // router.refresh() forces the server components, including the layout,
                // to re-render with the new locale.
                document.cookie = `${localeCookieName}=${encodeURIComponent(next)}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;

                startTransition(() => {
                    router.push(twin);
                    router.refresh();
                });
```
Leave the rest of that block (the `isAuthenticated` patch and `return`) unchanged.

- [ ] **Step 2: Type check and lint**

Run: `npm run type:check; npx eslint components/LanguageSwitcher.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/LanguageSwitcher.tsx
git commit -m "feat(i18n): language switcher swaps partner page twins"
```

---

### Task 4: SEO metadata helpers

**Files:**
- Modify: `lib/seo.ts`
- Modify: `lib/seo.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/seo.test.ts` (and add `buildForBusinessMetadata, forBusinessLanguageAlternates` to its import):
```ts
describe('forBusinessLanguageAlternates', () => {
    it('lists both partner URLs plus x-default on English', () => {
        expect(forBusinessLanguageAlternates()).toEqual({
            en: `${SITE_URL}/for-business`,
            el: `${SITE_URL}/el/epaggelmaties`,
            'x-default': `${SITE_URL}/for-business`,
        });
    });
});

describe('buildForBusinessMetadata', () => {
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A' };

    it('gives each locale its own canonical and the shared alternates', () => {
        const el = buildForBusinessMetadata('el', copy);
        expect(el.alternates?.canonical).toBe(`${SITE_URL}/el/epaggelmaties`);
        expect(el.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(buildForBusinessMetadata('en', copy).alternates?.canonical).toBe(`${SITE_URL}/for-business`);
    });

    it('is indexable and keeps the Open Graph url on the canonical', () => {
        const metadata = buildForBusinessMetadata('en', copy);
        const openGraph = metadata.openGraph as { url?: string };
        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(openGraph.url).toBe(metadata.alternates?.canonical);
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/seo.test.ts`
Expected: FAIL, because the functions are not exported.

- [ ] **Step 3: Implement**

In `lib/seo.ts`, change the publicLocale import to:
```ts
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
```
Add after `landingLanguageAlternates`:
```ts
// Same shape as the landing's: every partner URL plus x-default on the default locale.
export function forBusinessLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getForBusinessPath(locale));
    languages['x-default'] = absoluteUrl(getForBusinessPath(defaultLocale));
    return languages;
}
```
Rename `LandingMetadataCopy` to `PublicPageMetadataCopy` and replace `buildLandingMetadata` with:
```ts
type PublicPageMetadataCopy = {
    title: string;
    description: string;
    siteName: string;
    imageAlt: string;
};

type PublicPageMetadataInput = {
    locale: Locale;
    path: string;
    languages: Record<string, string>;
    imagePath: string;
    copy: PublicPageMetadataCopy;
};

// An indexable public page with a self-referential canonical and its language twins.
function buildPublicPageMetadata({ locale, path, languages, imagePath, copy }: PublicPageMetadataInput): Metadata {
    const canonical = absoluteUrl(path);
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

export function buildLandingMetadata(locale: Locale, copy: PublicPageMetadataCopy): Metadata {
    return buildPublicPageMetadata({
        locale,
        path: getPublicLandingPath(locale),
        languages: landingLanguageAlternates(),
        imagePath: OG_IMAGE_PATH,
        copy,
    });
}

// The partner page's OG image is the opengraph-image.tsx in its own route folder.
export function buildForBusinessMetadata(locale: Locale, copy: PublicPageMetadataCopy): Metadata {
    const path = getForBusinessPath(locale);
    return buildPublicPageMetadata({
        locale,
        path,
        languages: forBusinessLanguageAlternates(),
        imagePath: `${path}/opengraph-image`,
        copy,
    });
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run lib/seo.test.ts`
Expected: PASS, including the existing landing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/seo.ts lib/seo.test.ts
git commit -m "feat(seo): metadata and hreflang for the partner page"
```

---

### Task 5: Sitemap

**Files:**
- Modify: `app/sitemap.ts`
- Create: `app/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

`app/sitemap.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { forBusinessLanguageAlternates, landingLanguageAlternates, SITE_URL } from '@/lib/seo';

import sitemap from './sitemap';

describe('sitemap', () => {
    it('lists the landing and partner pages with their alternates', () => {
        const entries = sitemap();
        const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

        expect(byUrl.get(SITE_URL)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el`)?.alternates?.languages).toEqual(landingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/for-business`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/epaggelmaties`)?.alternates?.languages).toEqual(forBusinessLanguageAlternates());
        expect(entries).toHaveLength(4);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/sitemap.test.ts`
Expected: FAIL, because the partner URLs are missing.

- [ ] **Step 3: Implement**

Replace `app/sitemap.ts` with:
```ts
import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, forBusinessLanguageAlternates, landingLanguageAlternates } from '@/lib/seo';

// Only the public landing and partner pages are indexable. Every other route is
// either behind a session or a tokenised guest link, so it stays out on purpose.
export default function sitemap(): MetadataRoute.Sitemap {
    const landingLanguages = landingLanguageAlternates();
    const forBusinessLanguages = forBusinessLanguageAlternates();

    return [
        ...locales.map((locale) => ({
            url: absoluteUrl(getPublicLandingPath(locale)),
            changeFrequency: 'weekly' as const,
            priority: 1,
            alternates: { languages: landingLanguages },
        })),
        ...locales.map((locale) => ({
            url: absoluteUrl(getForBusinessPath(locale)),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
            alternates: { languages: forBusinessLanguages },
        })),
    ];
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run app/sitemap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(seo): partner pages in the sitemap"
```

---

### Task 6: Spring contract types and endpoints

**Files:**
- Modify: `lib/api/types.ts` (after `PartnerBrandingVariantRowDto`)
- Modify: `lib/api/endpoints.ts` (next to `newsletter`)

- [ ] **Step 1: Add the types**

In `lib/api/types.ts`, after the partner branding block:
```ts
// --- Public partner program (2026-10-10-business-partner-landing-design.md) ---

// GET /api/public/partner-program — public, the same for everyone.
export interface PartnerProgramSummaryDto {
    foundingSpotsTotal: number;
    // Never negative; 0 once every founding spot is taken.
    foundingSpotsLeft: number;
}

// POST /api/public/partner-applications — public.
// 201 PartnerApplicationResponseDto; 400 field errors; 409 a pending application
// already exists for this email; 429 rate limited per IP.
export interface PartnerApplicationRequestDto {
    name: string;
    businessName: string;
    role: PartnerRole;
    email: string;
    // A website URL or an @handle.
    link: string;
    // ISO 3166-1 alpha-2.
    countryCode: string;
    phone: string | null;
    locale: string;
    consent: true;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    // Honeypot: always '' from a person. Spring answers 201 and stores nothing when it isn't.
    website: string;
}

export interface PartnerApplicationResponseDto {
    id: string;
}
```

- [ ] **Step 2: Add the endpoints**

In `lib/api/endpoints.ts`, after the `newsletter` block:
```ts
    partnerProgram: {
        summary: '/api/public/partner-program',
        applications: '/api/public/partner-applications',
    },
```

- [ ] **Step 3: Type check**

Run: `npm run type:check`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts
git commit -m "feat(api): public partner program contract"
```

- [ ] **Step 5: Hand the contract to the backend**

Post the two DTO blocks above to the user as the Spring contract. Points to include:
- Both endpoints are public.
- `foundingSpotsLeft` = 20 − collaborators flagged as founding (the flag comes from spec 2).
- 409 for a duplicate pending email.
- Per-IP rate limit.
- A filled `website` honeypot returns 201 and stores nothing.
- `consent` must be `true`.
- `role` is a `PartnerRole`.
- `countryCode` is ISO alpha-2.
- `phone` is optional.

Do not wait for it; continue.

---

### Task 7: Occasions config

**Files:**
- Create: `lib/forBusinessOccasions.ts`
- Create: `lib/forBusinessOccasions.test.ts`

The test reads the message catalogs, so it is written now and passes after Task 11 adds the copy. Step 2 expects the catalog assertions to fail until then.

- [ ] **Step 1: Write the test**

`lib/forBusinessOccasions.test.ts`:
```ts
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FOR_BUSINESS_OCCASIONS, occasionsFor } from '@/lib/forBusinessOccasions';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const catalogs = { en, el } as Record<string, unknown>;

function occasionCopy(locale: string, key: string): Record<string, unknown> | undefined {
    const page = (catalogs[locale] as { ForBusinessPage?: { occasions?: Record<string, Record<string, unknown>> } }).ForBusinessPage;
    return page?.occasions?.[key];
}

describe('FOR_BUSINESS_OCCASIONS', () => {
    it('starts with weddings', () => {
        expect(FOR_BUSINESS_OCCASIONS[0].eventTypeKey).toBe('WEDDING');
    });

    it.each(FOR_BUSINESS_OCCASIONS.map((occasion) => [occasion.eventTypeKey, occasion] as const))('%s has its image and its copy in every listed locale', (key, occasion) => {
        expect(existsSync(path.join(process.cwd(), 'public', occasion.imageSrc))).toBe(true);
        for (const locale of occasion.locales) {
            const copy = occasionCopy(locale, key);
            expect(copy?.name, `${locale}.${key}.name`).toEqual(expect.any(String));
            expect(copy?.line, `${locale}.${key}.line`).toEqual(expect.any(String));
            expect(copy?.alt, `${locale}.${key}.alt`).toEqual(expect.any(String));
        }
    });
});

describe('occasionsFor', () => {
    it('keeps the list order and filters by locale', () => {
        expect(occasionsFor('en').map((occasion) => occasion.eventTypeKey)).toEqual(['WEDDING', 'BAPTISM']);
        expect(occasionsFor('el').map((occasion) => occasion.eventTypeKey)).toEqual(['WEDDING', 'BAPTISM']);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/forBusinessOccasions.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

`lib/forBusinessOccasions.ts`:
```ts
import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';

// The occasions the partner page talks about. Adding one: an entry here, its
// copy under ForBusinessPage.occasions.<KEY> in each listed locale, an image in
// public/, and the keyword map in the spec. Only list an occasion once its event
// type is live in the app with a working demo in that language
// (docs/seo-guidelines.md, occasion pages).
export type ForBusinessOccasion = {
    eventTypeKey: EventTypeConvention;
    imageSrc: string;
    locales: readonly Locale[];
};

// List order is display order in every locale.
export const FOR_BUSINESS_OCCASIONS: readonly ForBusinessOccasion[] = [
    { eventTypeKey: 'WEDDING', imageSrc: '/landing/04-wedding-reception-santorini.webp', locales: ['en', 'el'] },
    { eventTypeKey: 'BAPTISM', imageSrc: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', locales: ['en', 'el'] },
];

export function occasionsFor(locale: Locale): ForBusinessOccasion[] {
    return FOR_BUSINESS_OCCASIONS.filter((occasion) => occasion.locales.includes(locale));
}
```

- [ ] **Step 4: Run it**

Run: `npx vitest run lib/forBusinessOccasions.test.ts`
Expected: the order and `occasionsFor` tests PASS. The per-occasion copy test FAILS until Task 11. That's expected; it is the guard.

- [ ] **Step 5: Commit**

```bash
git add lib/forBusinessOccasions.ts lib/forBusinessOccasions.test.ts
git commit -m "feat(for-business): occasions config"
```

---

### Task 8: Founding block state and language banner decision

**Files:**
- Create: `lib/forBusiness.ts`
- Create: `lib/forBusiness.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/forBusiness.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { FOUNDING_SPOTS_FALLBACK_TOTAL, foundingBlock, shouldSuggestTwin } from '@/lib/forBusiness';

describe('foundingBlock', () => {
    it('shows the live count while spots are left', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: 7 })).toEqual({ kind: 'count', left: 7, total: 20 });
    });

    it('hides the block once every spot is taken', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: 0 })).toEqual({ kind: 'hidden' });
    });

    it('falls back to the plain limit when Spring did not answer', () => {
        expect(foundingBlock(null)).toEqual({ kind: 'limited', total: FOUNDING_SPOTS_FALLBACK_TOTAL });
    });

    it('never shows a negative count', () => {
        expect(foundingBlock({ foundingSpotsTotal: 20, foundingSpotsLeft: -2 })).toEqual({ kind: 'hidden' });
    });
});

describe('shouldSuggestTwin', () => {
    it('suggests English on the Greek page to a browser with no Greek', () => {
        expect(shouldSuggestTwin('el', ['en-US', 'de'])).toBe(true);
        expect(shouldSuggestTwin('el', ['en-US', 'el'])).toBe(false);
        expect(shouldSuggestTwin('el', ['el-GR'])).toBe(false);
    });

    it('suggests Greek on the English page when Greek is the first choice', () => {
        expect(shouldSuggestTwin('en', ['el-GR', 'en'])).toBe(true);
        expect(shouldSuggestTwin('en', ['en', 'el'])).toBe(false);
    });

    it('stays quiet when the browser reports nothing', () => {
        expect(shouldSuggestTwin('el', [])).toBe(false);
        expect(shouldSuggestTwin('en', [])).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/forBusiness.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

`lib/forBusiness.ts`:
```ts
import type { Locale } from '@/i18n/config';
import type { PartnerProgramSummaryDto } from '@/lib/api/types';

// Shown without a count when Spring can't be reached. Must match the real cap.
export const FOUNDING_SPOTS_FALLBACK_TOTAL = 20;

export type FoundingBlock = { kind: 'count'; left: number; total: number } | { kind: 'limited'; total: number } | { kind: 'hidden' };

export function foundingBlock(summary: PartnerProgramSummaryDto | null): FoundingBlock {
    if (!summary) return { kind: 'limited', total: FOUNDING_SPOTS_FALLBACK_TOTAL };
    if (summary.foundingSpotsLeft <= 0) return { kind: 'hidden' };
    return { kind: 'count', left: summary.foundingSpotsLeft, total: summary.foundingSpotsTotal };
}

function isGreek(tag: string): boolean {
    return tag.toLowerCase().split('-')[0] === 'el';
}

// The banner pointing at the page's twin. The Greek page offers English to
// anyone without Greek; the English page offers Greek only when it is the
// browser's first language, since most Greeks also read English.
export function shouldSuggestTwin(pageLocale: Locale, browserLanguages: readonly string[]): boolean {
    if (browserLanguages.length === 0) return false;
    if (pageLocale === 'el') return !browserLanguages.some(isGreek);
    return isGreek(browserLanguages[0]);
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run lib/forBusiness.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/forBusiness.ts lib/forBusiness.test.ts
git commit -m "feat(for-business): founding block state and banner decision"
```

---

### Task 9: Application mapping (countries, UTM, request, errors)

**Files:**
- Create: `lib/forBusinessApplication.ts`
- Create: `lib/forBusinessApplication.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/forBusinessApplication.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import {
    applicationRequestFromFormData,
    COUNTRY_CODES,
    countryOptions,
    defaultCountryCode,
    readUtm,
    toApplicationError,
} from '@/lib/forBusinessApplication';

function formData(values: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
}

describe('COUNTRY_CODES', () => {
    it('holds every ISO 3166-1 alpha-2 code once', () => {
        expect(COUNTRY_CODES).toHaveLength(249);
        expect(new Set(COUNTRY_CODES).size).toBe(249);
        expect(COUNTRY_CODES).toContain('GR');
        expect(COUNTRY_CODES).toContain('US');
    });
});

describe('countryOptions', () => {
    it('names countries in the page language, sorted by name', () => {
        const options = countryOptions('en');
        expect(options.find((option) => option.code === 'GR')?.name).toBe('Greece');
        const names = options.map((option) => option.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    });
});

describe('defaultCountryCode', () => {
    it('preselects Greece only on the Greek page', () => {
        expect(defaultCountryCode('el')).toBe('GR');
        expect(defaultCountryCode('en')).toBe('');
    });
});

describe('readUtm', () => {
    it('reads the three UTM params and nulls the rest', () => {
        expect(readUtm('?utm_source=instagram&utm_campaign=founding')).toEqual({
            utmSource: 'instagram',
            utmMedium: null,
            utmCampaign: 'founding',
        });
    });

    it('caps each value at 100 characters', () => {
        expect(readUtm(`?utm_source=${'a'.repeat(150)}`).utmSource).toHaveLength(100);
    });
});

describe('applicationRequestFromFormData', () => {
    it('trims, lowercases the email and nulls an empty phone', () => {
        const body = applicationRequestFromFormData(
            formData({
                name: ' Maria ',
                businessName: ' Studio M ',
                role: 'PHOTOGRAPHER',
                email: ' Maria@Example.com ',
                link: ' @studiom ',
                countryCode: 'GR',
                phone: ' ',
                website: '',
            }),
            { locale: 'el', search: '?utm_source=ig' },
        );
        expect(body).toEqual({
            name: 'Maria',
            businessName: 'Studio M',
            role: 'PHOTOGRAPHER',
            email: 'maria@example.com',
            link: '@studiom',
            countryCode: 'GR',
            phone: null,
            locale: 'el',
            consent: true,
            utmSource: 'ig',
            utmMedium: null,
            utmCampaign: null,
            website: '',
        });
    });
});

describe('toApplicationError', () => {
    it('maps statuses to the form errors', () => {
        expect(toApplicationError(new ApiError(409, null))).toBe('exists');
        expect(toApplicationError(new ApiError(400, null))).toBe('invalid');
        expect(toApplicationError(new ApiError(429, null))).toBe('rateLimited');
        expect(toApplicationError(new Error('offline'))).toBe('failed');
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/forBusinessApplication.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

`lib/forBusinessApplication.ts`:
```ts
import type { Locale } from '@/i18n/config';
import { ApiError } from '@/lib/api/client';
import { isRateLimitedError } from '@/lib/api/errors';
import type { PartnerApplicationRequestDto, PartnerRole } from '@/lib/api/types';

// The order the role select shows them in.
export const APPLICATION_ROLES: readonly PartnerRole[] = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER'];

// ISO 3166-1 alpha-2, every officially assigned code.
// prettier-ignore
export const COUNTRY_CODES: readonly string[] = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ ' +
    'BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
    'DE DJ DK DM DO DZ ' +
    'EC EE EG EH ER ES ET ' +
    'FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY ' +
    'HK HM HN HR HT HU ' +
    'ID IE IL IM IN IO IQ IR IS IT ' +
    'JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ ' +
    'LA LB LC LI LK LR LS LT LU LV LY ' +
    'MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
    'NA NC NE NF NG NI NL NO NP NR NU NZ ' +
    'OM ' +
    'PA PE PF PG PH PK PL PM PN PR PS PT PW PY ' +
    'QA ' +
    'RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
    'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
    'UA UG UM US UY UZ ' +
    'VA VC VE VG VI VN VU ' +
    'WF WS ' +
    'YE YT ' +
    'ZA ZM ZW'
).split(' ');

export type CountryOption = { code: string; name: string };

// Built on the server and passed to the form, so server and browser never
// disagree on a country's name during hydration.
export function countryOptions(locale: string): CountryOption[] {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function defaultCountryCode(locale: Locale): string {
    return locale === 'el' ? 'GR' : '';
}

const UTM_MAX_LENGTH = 100;

export function readUtm(search: string): Pick<PartnerApplicationRequestDto, 'utmSource' | 'utmMedium' | 'utmCampaign'> {
    const params = new URLSearchParams(search);
    const read = (key: string) => params.get(key)?.trim().slice(0, UTM_MAX_LENGTH) || null;
    return { utmSource: read('utm_source'), utmMedium: read('utm_medium'), utmCampaign: read('utm_campaign') };
}

function text(formData: FormData, key: string): string {
    return String(formData.get(key) ?? '').trim();
}

// consent is a required checkbox, so a submitted form always carries it.
export function applicationRequestFromFormData(formData: FormData, context: { locale: string; search: string }): PartnerApplicationRequestDto {
    return {
        name: text(formData, 'name'),
        businessName: text(formData, 'businessName'),
        role: text(formData, 'role') as PartnerRole,
        email: text(formData, 'email').toLowerCase(),
        link: text(formData, 'link'),
        countryCode: text(formData, 'countryCode'),
        phone: text(formData, 'phone') || null,
        locale: context.locale,
        consent: true,
        ...readUtm(context.search),
        website: String(formData.get('website') ?? ''),
    };
}

export type ApplicationError = 'invalid' | 'exists' | 'rateLimited' | 'failed';

export function toApplicationError(error: unknown): ApplicationError {
    if (isRateLimitedError(error)) return 'rateLimited';
    if (error instanceof ApiError && error.status === 409) return 'exists';
    if (error instanceof ApiError && error.status === 400) return 'invalid';
    return 'failed';
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run lib/forBusinessApplication.test.ts`
Expected: PASS. If `new ApiError(409, null)` needs more constructor args in this codebase, pass `undefined` for the rest; the signature is `(status, body, message?, retryAfterHeader?)`.

- [ ] **Step 5: Commit**

```bash
git add lib/forBusinessApplication.ts lib/forBusinessApplication.test.ts
git commit -m "feat(for-business): application mapping, countries and UTM"
```

---

### Task 10: Apply form hook

**Files:**
- Create: `hooks/useForBusinessApplication.ts`
- Create: `hooks/useForBusinessApplication.test.ts`

- [ ] **Step 1: Write the failing test**

`hooks/useForBusinessApplication.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { ApiError } from '@/lib/api/client';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => post(...args) } };
});
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

function submitEvent(): SubmitEvent<HTMLFormElement> {
    const form = document.createElement('form');
    for (const [name, value] of Object.entries({ name: 'Ann', businessName: 'Ann Events', role: 'PLANNER', email: 'ann@x.com', link: '@ann', countryCode: 'US', website: '' })) {
        const input = document.createElement('input');
        input.name = name;
        input.value = value;
        form.appendChild(input);
    }
    return { preventDefault: () => {}, currentTarget: form } as unknown as SubmitEvent<HTMLFormElement>;
}

beforeEach(() => post.mockReset());

describe('useForBusinessApplication', () => {
    it('posts the application and ends in the sent state', async () => {
        post.mockResolvedValue({ id: 'a1' });
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(post).toHaveBeenCalledWith('/api/public/partner-applications', expect.objectContaining({ email: 'ann@x.com', locale: 'en' }));
        expect(result.current.isSent).toBe(true);
    });

    it('keeps the form and shows "exists" on 409', async () => {
        post.mockRejectedValue(new ApiError(409, null));
        const { result } = renderHook(() => useForBusinessApplication());
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.isSent).toBe(false);
        expect(result.current.error).toBe('exists');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run hooks/useForBusinessApplication.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

`hooks/useForBusinessApplication.ts`:
```ts
'use client';

import { useLocale } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getFieldErrors } from '@/lib/api/errors';
import type { PartnerApplicationResponseDto } from '@/lib/api/types';
import { type ApplicationError, applicationRequestFromFormData, toApplicationError } from '@/lib/forBusinessApplication';

// The partner apply form. UTM params are read at submit time from the address
// bar, so the page needs no useSearchParams (and no client-render bailout).
export function useForBusinessApplication() {
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<ApplicationError | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (isSubmitting) return;
            setError(null);
            setFieldErrors({});
            setIsSubmitting(true);

            try {
                const body = applicationRequestFromFormData(new FormData(event.currentTarget), { locale, search: window.location.search });
                await api.post<PartnerApplicationResponseDto>(endpoints.partnerProgram.applications, body);
                setIsSent(true);
            } catch (submitError) {
                setError(toApplicationError(submitError));
                setFieldErrors(getFieldErrors(submitError) ?? {});
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, locale],
    );

    return { error, fieldErrors, handleSubmit, isSent, isSubmitting };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run hooks/useForBusinessApplication.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useForBusinessApplication.ts hooks/useForBusinessApplication.test.ts
git commit -m "feat(for-business): apply form hook"
```

---

### Task 11: Copy (en + el)

Load the `design:ux-copy` skill before this task. The copy below is the draft. Keep it at least this plain (CLAUDE.md: simple, direct, no decorative text). The two pages are written separately: the English page speaks to international professionals, and the Greek page to Greek ones. Neither is a translation of the other.

**Files:**
- Modify: `messages/en.json` (new top-level `ForBusinessPage`, and `LandingPage.footer.exploreLinks.forBusiness`)
- Modify: `messages/el.json` (same keys)

- [ ] **Step 1: Add the English copy**

Add to `messages/en.json` as a new top-level key:
```json
"ForBusinessPage": {
    "meta": {
        "title": "Guest photo sharing for wedding planners & venues",
        "description": "Give your couples every guest photo on one live wall. No app, just a QR code. Earn on every event you refer.",
        "siteName": "StoryWall",
        "imageAlt": "StoryWall for wedding professionals",
        "ogEyebrow": "FOR WEDDING PROFESSIONALS",
        "ogHeadline": "Every guest photo, one live wall."
    },
    "breadcrumb": "For professionals",
    "header": { "home": "StoryWall home", "apply": "Apply" },
    "hero": {
        "title": "The wedding photo sharing app for planners, venues and vendors",
        "lead": "Guests scan a QR code and their photos land on one live wall. Your couples love it, and you earn on every event.",
        "apply": "Apply to partner",
        "demo": "Try the demo"
    },
    "clients": {
        "heading": "What your couples get",
        "steps": ["Guests scan one QR code. No app to install.", "Every photo and video lands in one place, live.", "The couple keeps it all. No chasing guests for photos afterwards."],
        "disposable": "A simpler alternative to disposable cameras on the tables."
    },
    "occasions": {
        "WEDDING": { "name": "Weddings", "line": "From the ceremony to the last dance.", "alt": "Wedding reception at sunset" },
        "BAPTISM": { "name": "Baptisms and christenings", "line": "The whole family's photos in one place.", "alt": "Family celebrating a baptism outside a church" }
    },
    "benefits": {
        "heading": "What you get",
        "items": {
            "discount": { "title": "A discount for your clients", "body": "Your own code gives your couples a better price." },
            "earn": { "title": "Earn on every event", "body": "You earn commission each time a couple uses your code." },
            "brand": { "title": "Your brand in front of every guest", "body": "Your card appears in the event feed. Guests planning their own wedding see who made this one happen." },
            "portal": { "title": "Track your earnings", "body": "A private page shows your events and what you've earned." }
        },
        "cardCaption": "How your card looks in the event feed."
    },
    "sampleCard": {
        "name": "Your business",
        "tagline": "Weddings that feel like you",
        "services": "Planning · Coordination · Design"
    },
    "destination": {
        "heading": "Made for destination weddings",
        "body": "Guests fly in from everywhere. They all scan the same QR code, need no app, and every photo ends up in one place for the couple."
    },
    "founding": {
        "heading": "Founding partners",
        "spotsLeft": "{left} of {total} spots left",
        "limited": "Limited to the first {total} partners.",
        "body": "Founding partners get our best terms, kept for as long as they partner with us.",
        "freeEvent": "Every approved partner also gets one free event to try with a client."
    },
    "freeEvent": {
        "title": "One free event",
        "body": "Try it with a client before you recommend it."
    },
    "steps": {
        "heading": "How it works",
        "items": ["Apply. It takes a minute.", "We set up your code and your page.", "Share your code with your couples.", "Earn on every event."]
    },
    "roles": {
        "heading": "Who it's for",
        "items": {
            "PLANNER": "Wedding planners",
            "VENUE": "Venues",
            "PHOTOGRAPHER": "Photographers",
            "VIDEOGRAPHER": "Videographers",
            "DECORATION": "Decorators and florists",
            "CATERING": "Caterers",
            "MUSIC": "Bands and DJs"
        }
    },
    "faq": {
        "heading": "FAQ",
        "items": [
            ["What does it cost to join?", "Nothing. Partnering is free."],
            ["Can I join from outside Greece?", "Yes. Partners can be anywhere in the world."],
            ["How do I get paid?", "By bank transfer in EUR to an IBAN account, against your invoice. Outside an IBAN country? Apply anyway and we'll work it out with you."],
            ["How do you know a couple came from me?", "They use your code when they set up their event."],
            ["Does this compete with the photographer?", "No. Guests capture the moments a photographer can't be at. The professional photos stay the photographer's."],
            ["Can guests upload without an app?", "Yes. They scan the QR code and upload from their phone's browser."],
            ["How do wedding planners collect guest photos with it?", "Put the QR code on the tables, the invitation or a sign. Guest photos collect on the live wall during the event."],
            ["Which events does it cover?", "{occasions}."],
            ["What happens after I apply?", "We review your application and reply by email."]
        ]
    },
    "apply": {
        "heading": "Apply to partner",
        "fields": {
            "name": "Your name",
            "businessName": "Business name",
            "role": "What you do",
            "email": "Email",
            "link": "Website or Instagram",
            "country": "Country",
            "phone": "Phone (optional)"
        },
        "rolePlaceholder": "Choose one",
        "countryPlaceholder": "Choose your country",
        "roles": {
            "PLANNER": "Wedding planner",
            "VENUE": "Venue",
            "PHOTOGRAPHER": "Photographer",
            "VIDEOGRAPHER": "Videographer",
            "DECORATION": "Decoration or flowers",
            "CATERING": "Catering",
            "MUSIC": "Music",
            "OTHER": "Something else"
        },
        "consent": "I agree to the <link>privacy policy</link>.",
        "submit": "Send application",
        "sent": "Thanks. We'll reply by email.",
        "errors": {
            "invalid": "Check the highlighted fields.",
            "exists": "We already have your application. We'll reply by email.",
            "rateLimited": "Too many tries. Wait a moment and try again.",
            "failed": "Something went wrong. Try again."
        }
    },
    "languageBanner": {
        "en": { "text": "This page is in English too.", "link": "View in English", "dismiss": "Close" },
        "el": { "text": "Η σελίδα υπάρχει και στα ελληνικά.", "link": "Δείτε τη στα ελληνικά", "dismiss": "Κλείσιμο" }
    },
    "links": { "couples": "See how it works for couples" }
}
```
Add `"forBusiness": "For professionals"` inside `LandingPage.footer.exploreLinks`.

The FAQ answer `"{occasions}."` is filled at render time with the localized occasion names joined (Task 13). This keeps the FAQ in step with the occasions config.

- [ ] **Step 2: Add the Greek copy**

Add to `messages/el.json`:
```json
"ForBusinessPage": {
    "meta": {
        "title": "Φωτογραφίες καλεσμένων γάμου με QR code για επαγγελματίες",
        "description": "Όλες οι φωτογραφίες των καλεσμένων σε έναν ζωντανό τοίχο, με ένα QR code. Για wedding planners, κέντρα δεξιώσεων και φωτογράφους γάμου και βάπτισης.",
        "siteName": "StoryWall",
        "imageAlt": "StoryWall για επαγγελματίες γάμου και βάπτισης",
        "ogEyebrow": "ΓΙΑ ΕΠΑΓΓΕΛΜΑΤΙΕΣ ΓΑΜΟΥ ΚΑΙ ΒΑΠΤΙΣΗΣ",
        "ogHeadline": "Όλες οι φωτογραφίες των καλεσμένων, σε ένα σημείο."
    },
    "breadcrumb": "Για επαγγελματίες",
    "header": { "home": "Αρχική StoryWall", "apply": "Αίτηση" },
    "hero": {
        "title": "Φωτογραφίες καλεσμένων με QR code, για επαγγελματίες γάμου και βάπτισης",
        "lead": "Οι καλεσμένοι σκανάρουν ένα QR code και οι φωτογραφίες τους εμφανίζονται σε έναν ζωντανό τοίχο. Οι πελάτες σας το λατρεύουν και εσείς κερδίζετε από κάθε εκδήλωση.",
        "apply": "Κάντε αίτηση συνεργασίας",
        "demo": "Δείτε το demo"
    },
    "clients": {
        "heading": "Τι παίρνουν οι πελάτες σας",
        "steps": ["Οι καλεσμένοι σκανάρουν ένα QR code. Χωρίς εφαρμογή.", "Κάθε φωτογραφία και βίντεο μπαίνει ζωντανά σε ένα σημείο.", "Το ζευγάρι ή οι γονείς κρατούν όλο το ψηφιακό άλμπουμ."],
        "disposable": "Οι φωτογραφίες όλων των καλεσμένων, χωρίς να τις ζητάτε μία μία μετά."
    },
    "occasions": {
        "WEDDING": { "name": "Γάμοι", "line": "Από το μυστήριο μέχρι το τελευταίο τραγούδι στη δεξίωση.", "alt": "Δεξίωση γάμου στο ηλιοβασίλεμα" },
        "BAPTISM": { "name": "Βαπτίσεις", "line": "Οι φωτογραφίες όλης της οικογένειας σε ένα σημείο.", "alt": "Οικογένεια γιορτάζει βάπτιση έξω από εκκλησία" }
    },
    "benefits": {
        "heading": "Τι κερδίζετε",
        "items": {
            "discount": { "title": "Έκπτωση για τους πελάτες σας", "body": "Με τον δικό σας κωδικό, οι πελάτες σας παίρνουν καλύτερη τιμή." },
            "earn": { "title": "Προμήθεια σε κάθε εκδήλωση", "body": "Κερδίζετε κάθε φορά που ένας πελάτης χρησιμοποιεί τον κωδικό σας." },
            "brand": { "title": "Η επιχείρησή σας μπροστά σε κάθε καλεσμένο", "body": "Η κάρτα σας εμφανίζεται μέσα στην εκδήλωση. Οι καλεσμένοι που οργανώνουν τον δικό τους γάμο βλέπουν ποιος έκανε αυτόν." },
            "portal": { "title": "Βλέπετε τα κέρδη σας", "body": "Μια ιδιωτική σελίδα δείχνει τις εκδηλώσεις και τα κέρδη σας." }
        },
        "cardCaption": "Έτσι εμφανίζεται η κάρτα σας μέσα στην εκδήλωση."
    },
    "sampleCard": {
        "name": "Η επιχείρησή σας",
        "tagline": "Γάμοι που σας μοιάζουν",
        "services": "Οργάνωση · Συντονισμός · Διακόσμηση"
    },
    "destination": {
        "heading": "Για destination weddings",
        "body": "Οι καλεσμένοι έρχονται από παντού. Σκανάρουν όλοι το ίδιο QR code, χωρίς εφαρμογή, και κάθε φωτογραφία καταλήγει σε ένα σημείο για το ζευγάρι."
    },
    "founding": {
        "heading": "Ιδρυτικοί συνεργάτες",
        "spotsLeft": "Απομένουν {left} από {total} θέσεις",
        "limited": "Μόνο για τους πρώτους {total} συνεργάτες.",
        "body": "Οι ιδρυτικοί συνεργάτες έχουν τους καλύτερους όρους μας, για όσο συνεργαζόμαστε.",
        "freeEvent": "Κάθε εγκεκριμένος συνεργάτης παίρνει επίσης μία δωρεάν εκδήλωση για να το δοκιμάσει με πελάτη."
    },
    "freeEvent": {
        "title": "Μία δωρεάν εκδήλωση",
        "body": "Δοκιμάστε το με έναν πελάτη πριν το προτείνετε."
    },
    "steps": {
        "heading": "Πώς λειτουργεί",
        "items": ["Κάνετε αίτηση. Παίρνει ένα λεπτό.", "Ετοιμάζουμε τον κωδικό και τη σελίδα σας.", "Δίνετε τον κωδικό στους πελάτες σας.", "Κερδίζετε από κάθε εκδήλωση."]
    },
    "roles": {
        "heading": "Για ποιους είναι",
        "items": {
            "PLANNER": "Wedding planners και διοργανωτές",
            "VENUE": "Κέντρα και αίθουσες δεξιώσεων",
            "PHOTOGRAPHER": "Φωτογράφοι γάμου και βάπτισης",
            "VIDEOGRAPHER": "Βιντεογράφοι",
            "DECORATION": "Διακόσμηση και ανθοπωλεία",
            "CATERING": "Catering",
            "MUSIC": "Μουσικοί και DJ"
        }
    },
    "faq": {
        "heading": "Συχνές ερωτήσεις",
        "items": [
            ["Κοστίζει κάτι η συνεργασία;", "Όχι. Η συνεργασία είναι δωρεάν."],
            ["Πώς πληρώνομαι;", "Με τραπεζική μεταφορά σε ευρώ σε λογαριασμό IBAN, με έκδοση τιμολογίου."],
            ["Πώς ξέρετε ότι ένας πελάτης ήρθε από εμένα;", "Χρησιμοποιεί τον κωδικό σας όταν φτιάχνει την εκδήλωσή του."],
            ["Ανταγωνίζεται τον φωτογράφο;", "Όχι. Οι καλεσμένοι τραβούν στιγμές όπου ο φωτογράφος δεν μπορεί να είναι. Οι επαγγελματικές φωτογραφίες μένουν του φωτογράφου."],
            ["Χρειάζονται οι καλεσμένοι εφαρμογή;", "Όχι. Σκανάρουν το QR code και ανεβάζουν από τον browser του κινητού τους."],
            ["Για ποιες εκδηλώσεις είναι;", "{occasions}."],
            ["Τι γίνεται αφού κάνω αίτηση;", "Εξετάζουμε την αίτησή σας και σας απαντάμε με email."]
        ]
    },
    "apply": {
        "heading": "Αίτηση συνεργασίας",
        "fields": {
            "name": "Ονοματεπώνυμο",
            "businessName": "Επωνυμία επιχείρησης",
            "role": "Τι κάνετε",
            "email": "Email",
            "link": "Website ή Instagram",
            "country": "Χώρα",
            "phone": "Τηλέφωνο (προαιρετικό)"
        },
        "rolePlaceholder": "Επιλέξτε",
        "countryPlaceholder": "Επιλέξτε χώρα",
        "roles": {
            "PLANNER": "Wedding planner",
            "VENUE": "Κέντρο δεξιώσεων",
            "PHOTOGRAPHER": "Φωτογράφος",
            "VIDEOGRAPHER": "Βιντεογράφος",
            "DECORATION": "Διακόσμηση ή λουλούδια",
            "CATERING": "Catering",
            "MUSIC": "Μουσική",
            "OTHER": "Κάτι άλλο"
        },
        "consent": "Συμφωνώ με την <link>πολιτική απορρήτου</link>.",
        "submit": "Αποστολή αίτησης",
        "sent": "Ευχαριστούμε. Θα σας απαντήσουμε με email.",
        "errors": {
            "invalid": "Ελέγξτε τα πεδία που επισημαίνονται.",
            "exists": "Έχουμε ήδη την αίτησή σας. Θα σας απαντήσουμε με email.",
            "rateLimited": "Πολλές προσπάθειες. Περιμένετε λίγο και δοκιμάστε ξανά.",
            "failed": "Κάτι πήγε στραβά. Δοκιμάστε ξανά."
        }
    },
    "languageBanner": {
        "en": { "text": "This page is in English too.", "link": "View in English", "dismiss": "Close" },
        "el": { "text": "Η σελίδα υπάρχει και στα ελληνικά.", "link": "Δείτε τη στα ελληνικά", "dismiss": "Κλείσιμο" }
    },
    "links": { "couples": "Δείτε πώς λειτουργεί για τα ζευγάρια" }
}
```
Add `"forBusiness": "Για επαγγελματίες"` inside `LandingPage.footer.exploreLinks`.

Note the deliberate differences:
- **Greek FAQ:** no "outside Greece" question; the payout answer names the invoice.
- **Greek roles:** "Κέντρα και αίθουσες δεξιώσεων".
- **Greek emphasis:** weddings and baptisms are equal headlines.
- **Destination section:** its Greek copy exists for catalog parity, but only the English page renders it (Task 13).

- [ ] **Step 3: Validate the JSON and rerun the occasions test**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/el.json'))"; npx vitest run lib/forBusinessOccasions.test.ts`
Expected: no JSON error; the occasions test now fully PASSES.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat(for-business): page copy in English and Greek"
```

---

### Task 12: Client messages and the server fetch

**Files:**
- Modify: `i18n/publicMessages.ts`
- Modify: `i18n/publicMessages.test.ts`
- Create: `lib/forBusinessServer.ts`

- [ ] **Step 1: Ship the apply form's messages to the client**

In `i18n/publicMessages.ts`, add to `PUBLIC_CLIENT_NAMESPACES` (after `'NewsletterForm'`):
```ts
    'ForBusinessPage.apply',
```

- [ ] **Step 2: Walk the partner page in the namespace test**

In `i18n/publicMessages.test.ts`:
- Change `ENTRY_FILES` to `['app/(landing)/layout.tsx', 'components/landing/LandingPage.tsx', 'components/forBusiness/ForBusinessPage.tsx']`.
- In the `pickPublicMessages` test, change the expected top-level keys to `['AccountDrawer', 'Durations', 'ForBusinessPage', 'LandingPage', 'LanguageSwitcher', 'Modules', 'NewsletterForm']`.

The walk will fail until Task 13 creates `ForBusinessPage.tsx`. That's expected; it is rerun in Task 13.

- [ ] **Step 3: Server fetch of the founding summary**

`lib/forBusinessServer.ts`:
```ts
import 'server-only';

import { endpoints } from '@/lib/api/endpoints';
import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { PartnerProgramSummaryDto } from '@/lib/api/types';

const SUMMARY_REVALIDATE_SECONDS = 300;

// Best-effort, like serverGet: a failure (Spring down, endpoint not deployed
// yet) gives null and the page shows the plain "limited" line instead.
export async function fetchPartnerProgramSummary(): Promise<PartnerProgramSummaryDto | null> {
    try {
        return await serverPublicCachedGet<PartnerProgramSummaryDto>(endpoints.partnerProgram.summary, SUMMARY_REVALIDATE_SECONDS);
    } catch {
        return null;
    }
}
```
Check `server-only` is used elsewhere (`grep -rn "import 'server-only'" lib | head -1`). If it isn't installed, drop that line.

- [ ] **Step 4: Commit**

```bash
git add i18n/publicMessages.ts i18n/publicMessages.test.ts lib/forBusinessServer.ts
git commit -m "feat(for-business): client messages and founding summary fetch"
```

---

### Task 13: Page sections

Load `design:design-system` and `frontend-design:frontend-design` before this task. The page reuses the landing's look: the `landing-page` CSS scope (`--editorial`, `--ink`, `--coral`, `--paper`), the same horizontal padding (`px-5`, `min-[761px]:px-[clamp(24px,7vw,120px)]`), the editorial h2 style from `LandingFaq`, and `max-w-295` content width.
- **Mobile-first:** every section stacks on small screens.
- **Section boundaries:** each one gets a JSX comment, set apart by background tone (white / `bg-[#f4f0e8]`) and spacing, not borders.
- **Primary action:** one per screen, Apply.

**Files (all create, under `components/forBusiness/`):**
`ForBusinessPage.tsx`, `ForBusinessHeader.tsx`, `ForBusinessHero.tsx`, `ForBusinessClients.tsx`, `ForBusinessBenefits.tsx`, `ForBusinessDestination.tsx`, `ForBusinessFounding.tsx`, `ForBusinessSteps.tsx`, `ForBusinessRoles.tsx`, `ForBusinessFaq.tsx`, `ForBusinessApply.tsx`, `ForBusinessApplyForm.tsx`, `ForBusinessLanguageBanner.tsx`, `ForBusinessStructuredData.tsx`, `forBusinessStyles.ts`; plus `hooks/useLanguageBanner.ts`.

- [ ] **Step 1: Shared class names**

`components/forBusiness/forBusinessStyles.ts`:
```ts
// The landing's section rhythm, shared so every partner section lines up.
export const SECTION = 'px-5 py-14 min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:py-20';
export const INNER = 'mx-auto w-full max-w-295';
export const H2 = 'm-0 [font-family:var(--editorial)] text-[44px] leading-[0.9] font-normal tracking-[-0.05em] min-[761px]:text-[clamp(52px,5vw,80px)]';
export const BODY = 'text-[15px] leading-[1.55] text-[#151313]/80 min-[761px]:text-base';
export const PRIMARY_BUTTON =
    'inline-flex min-h-12 items-center justify-center rounded-full bg-[#151313] px-6 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-85';
export const SECONDARY_LINK = 'text-sm font-semibold text-[#151313] underline underline-offset-4 hover:opacity-70';
```

- [ ] **Step 2: Header**

`components/forBusiness/ForBusinessHeader.tsx`:
```tsx
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

export async function ForBusinessHeader() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage.header');

    return (
        <header className="flex h-18 items-center justify-between gap-4 px-5 min-[761px]:h-22 min-[761px]:px-[clamp(24px,7vw,120px)]">
            {/* Logo */}
            <Link href={getPublicLandingPath(locale)} aria-label={t('home')} className="w-36 min-[761px]:w-44">
                <ProtectedImage unoptimized alt="" src="/landing/storywall-2.webp" width={600} height={119} className="block h-auto w-full invert" />
            </Link>
            {/* Actions */}
            <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <a href="#apply" className="hidden min-h-10 items-center rounded-full bg-[#151313] px-4 text-sm font-semibold text-white no-underline min-[761px]:inline-flex">
                    {t('apply')}
                </a>
            </div>
        </header>
    );
}
```
`storywall-2.webp` is the footer's white logo; `invert` makes it dark on the white header. If the landing hero uses a dark logo asset, use that instead (check `components/landing/LandingHero.tsx`).

- [ ] **Step 3: Hero**

`components/forBusiness/ForBusinessHero.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { BODY, PRIMARY_BUTTON, SECONDARY_LINK } from '@/components/forBusiness/forBusinessStyles';
import { routes } from '@/lib/routes';

export async function ForBusinessHero() {
    const t = await getTranslations('ForBusinessPage.hero');

    return (
        /* Hero */
        <section className="px-5 pt-8 pb-14 min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-14 min-[761px]:pb-22">
            <div className="mx-auto w-full max-w-295">
                <h1 className="m-0 max-w-[16ch] [font-family:var(--editorial)] text-[48px] leading-[0.92] font-normal tracking-[-0.055em] min-[761px]:text-[clamp(64px,7vw,112px)]">
                    {t('title')}
                </h1>
                <p className={`mt-5 max-w-[52ch] ${BODY}`}>{t('lead')}</p>
                <div className="mt-7 flex flex-wrap items-center gap-5">
                    <a href="#apply" className={PRIMARY_BUTTON}>
                        {t('apply')}
                    </a>
                    <a href={routes.demo} className={SECONDARY_LINK}>
                        {t('demo')}
                    </a>
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 4: What clients get (occasions)**

`components/forBusiness/ForBusinessClients.tsx`:
```tsx
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import { occasionsFor } from '@/lib/forBusinessOccasions';

export async function ForBusinessClients() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const steps = t.raw('clients.steps') as string[];

    return (
        /* What clients get */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('clients.heading')}</h2>
                <ol className="mt-8 grid list-none gap-4 p-0 min-[761px]:grid-cols-3 min-[761px]:gap-8">
                    {steps.map((step, index) => (
                        <li key={step} className={BODY}>
                            <span className="mb-2 block [font-family:var(--editorial)] text-2xl text-[#d87d8f]">{String(index + 1).padStart(2, '0')}</span>
                            {step}
                        </li>
                    ))}
                </ol>
                <p className={`mt-6 ${BODY}`}>{t('clients.disposable')}</p>
                {/* Occasions */}
                <div className="mt-10 grid gap-6 min-[761px]:grid-cols-2">
                    {occasionsFor(locale).map((occasion) => (
                        <figure key={occasion.eventTypeKey} className="m-0">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                                <Image src={occasion.imageSrc} alt={t(`occasions.${occasion.eventTypeKey}.alt`)} fill sizes="(min-width: 761px) 50vw, 100vw" className="object-cover" />
                            </div>
                            <figcaption className="mt-3">
                                <span className="block [font-family:var(--editorial)] text-2xl">{t(`occasions.${occasion.eventTypeKey}.name`)}</span>
                                <span className={BODY}>{t(`occasions.${occasion.eventTypeKey}.line`)}</span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 5: Benefits with the real partner card**

`components/forBusiness/ForBusinessBenefits.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';

const BENEFITS = ['discount', 'earn', 'brand', 'portal'] as const;

export async function ForBusinessBenefits({ showFreeEvent }: { showFreeEvent: boolean }) {
    const t = await getTranslations('ForBusinessPage');
    const card = await getTranslations('PartnerCard');

    // A sample of the real feed card, unlinked (href null), as the admin preview renders it.
    const sample: PartnerBrandingCardContent = {
        href: null,
        name: t('sampleCard.name'),
        roleLabel: card('roles.PLANNER'),
        partnerLabel: card('partner'),
        tagline: t('sampleCard.tagline'),
        services: t('sampleCard.services'),
        logoUrl: null,
        coverUrl: '/landing/04-wedding-reception-santorini.webp',
        newTabLabel: card('newTab'),
        visitLabel: card('visit'),
    };

    return (
        /* What you get */
        <section className={SECTION}>
            <div className={`${INNER} grid gap-10 min-[761px]:grid-cols-[1.1fr_0.9fr] min-[761px]:items-start`}>
                <div>
                    <h2 className={H2}>{t('benefits.heading')}</h2>
                    <dl className="mt-8 grid gap-6">
                        {BENEFITS.map((key) => (
                            <div key={key}>
                                <dt className="text-lg font-semibold">{t(`benefits.items.${key}.title`)}</dt>
                                <dd className={`m-0 mt-1 ${BODY}`}>{t(`benefits.items.${key}.body`)}</dd>
                            </div>
                        ))}
                        {showFreeEvent && (
                            <div>
                                <dt className="text-lg font-semibold">{t('freeEvent.title')}</dt>
                                <dd className={`m-0 mt-1 ${BODY}`}>{t('freeEvent.body')}</dd>
                            </div>
                        )}
                    </dl>
                </div>
                {/* Card preview */}
                <figure className="m-0">
                    <div className="pointer-events-none" aria-hidden="true">
                        <PartnerCardVariant variant="FEATURE_CARD" content={sample} />
                    </div>
                    <figcaption className={`mt-3 ${BODY}`}>{t('benefits.cardCaption')}</figcaption>
                </figure>
            </div>
        </section>
    );
}
```
`PartnerCardVariant` is a client component. Only plain props cross the boundary, and its own client imports may pull a namespace into the client walk. If the Task 12 namespace test then reports `PartnerCard` missing, add `'PartnerCard'` to `PUBLIC_CLIENT_NAMESPACES` and to the expected keys in that test.

- [ ] **Step 6: Destination (English only), founding, steps, roles**

`components/forBusiness/ForBusinessDestination.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

export async function ForBusinessDestination() {
    const t = await getTranslations('ForBusinessPage.destination');

    return (
        /* Destination weddings */
        <section className={`${SECTION} bg-[#151313] text-white`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <p className={`mt-5 max-w-[56ch] ${BODY} text-white/80`}>{t('body')}</p>
            </div>
        </section>
    );
}
```

`components/forBusiness/ForBusinessFounding.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, PRIMARY_BUTTON, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { FoundingBlock } from '@/lib/forBusiness';

export async function ForBusinessFounding({ block }: { block: Exclude<FoundingBlock, { kind: 'hidden' }> }) {
    const t = await getTranslations('ForBusinessPage.founding');
    const apply = await getTranslations('ForBusinessPage.hero');

    return (
        /* Founding partners */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <p className="mt-5 text-2xl font-semibold">
                    {block.kind === 'count' ? t('spotsLeft', { left: block.left, total: block.total }) : t('limited', { total: block.total })}
                </p>
                <p className={`mt-3 max-w-[56ch] ${BODY}`}>{t('body')}</p>
                <p className={`mt-2 max-w-[56ch] ${BODY}`}>{t('freeEvent')}</p>
                <a href="#apply" className={`mt-7 ${PRIMARY_BUTTON}`}>
                    {apply('apply')}
                </a>
            </div>
        </section>
    );
}
```

`components/forBusiness/ForBusinessSteps.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { BODY, H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

export async function ForBusinessSteps() {
    const t = await getTranslations('ForBusinessPage.steps');
    const items = t.raw('items') as string[];

    return (
        /* How it works */
        <section className={SECTION}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <ol className="mt-8 grid list-none gap-5 p-0 min-[761px]:grid-cols-4">
                    {items.map((item, index) => (
                        <li key={item} className={BODY}>
                            <span className="mb-2 block [font-family:var(--editorial)] text-3xl text-[#d87d8f]">{index + 1}</span>
                            {item}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
```

`components/forBusiness/ForBusinessRoles.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';

import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';

const ROLES = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC'] as const;

export async function ForBusinessRoles() {
    const t = await getTranslations('ForBusinessPage.roles');

    return (
        /* Who it's for */
        <section className={`${SECTION} bg-[#f4f0e8]`}>
            <div className={INNER}>
                <h2 className={H2}>{t('heading')}</h2>
                <ul className="mt-8 flex list-none flex-wrap gap-3 p-0">
                    {ROLES.map((role) => (
                        <li key={role} className="rounded-full bg-white px-4 py-2 text-sm font-semibold">
                            {t(`items.${role}`)}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
```

- [ ] **Step 7: FAQ with live occasion names**

`components/forBusiness/ForBusinessFaq.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';

import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import { LandingFaqItem } from '@/components/landing/LandingFaqItem';
import type { Locale } from '@/i18n/config';
import { occasionsFor } from '@/lib/forBusinessOccasions';

type FaqItem = [question: string, answer: string];

// The FAQ text, shared with the FAQPage JSON-LD so both always match.
export async function forBusinessFaqItems(): Promise<FaqItem[]> {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const occasions = new Intl.ListFormat(locale, { type: 'conjunction' }).format(occasionsFor(locale).map((occasion) => t(`occasions.${occasion.eventTypeKey}.name`)));
    return (t.raw('faq.items') as FaqItem[]).map(([question, answer]) => [question, answer.replace('{occasions}', occasions)]);
}

export async function ForBusinessFaq() {
    const t = await getTranslations('ForBusinessPage.faq');
    const items = await forBusinessFaqItems();

    return (
        /* FAQ */
        <section className={SECTION} id="faq">
            <div className={INNER}>
                <h2 className={`${H2} mb-7`}>{t('heading')}</h2>
                <div className="border-t border-[rgb(21_19_19/26%)]">
                    {items.map(([question, answer], index) => (
                        <LandingFaqItem answer={answer} index={index} key={question} question={question} />
                    ))}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 8: Apply section and form**

`components/forBusiness/ForBusinessApply.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { H2, INNER, SECTION } from '@/components/forBusiness/forBusinessStyles';
import type { Locale } from '@/i18n/config';
import { countryOptions, defaultCountryCode } from '@/lib/forBusinessApplication';

export async function ForBusinessApply() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage.apply');

    return (
        /* Apply */
        <section className={SECTION} id="apply">
            <div className={`${INNER} max-w-160`}>
                <h2 className={H2}>{t('heading')}</h2>
                <ForBusinessApplyForm countries={countryOptions(locale)} defaultCountry={defaultCountryCode(locale)} />
            </div>
        </section>
    );
}
```

`components/forBusiness/ForBusinessApplyForm.tsx`:
```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PRIMARY_BUTTON } from '@/components/forBusiness/forBusinessStyles';
import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { APPLICATION_ROLES, type CountryOption } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const FIELD = 'mt-1.5 min-h-12 w-full rounded-xl border border-[#151313]/20 bg-white px-4 text-base outline-none focus:border-[#151313]/60 aria-invalid:border-red-600';
const LABEL = 'block text-sm font-semibold';

type Props = { countries: CountryOption[]; defaultCountry: string };

export function ForBusinessApplyForm({ countries, defaultCountry }: Props) {
    const t = useTranslations('ForBusinessPage.apply');
    const form = useForBusinessApplication();

    if (form.isSent) {
        return (
            <p role="status" className="mt-8 text-lg">
                {t('sent')}
            </p>
        );
    }

    const fieldError = (name: string) => form.fieldErrors[name];

    return (
        <form onSubmit={form.handleSubmit} className="mt-8 grid gap-5" noValidate={false}>
            {/* Identity */}
            <label className={LABEL}>
                {t('fields.name')}
                <input name="name" required maxLength={200} autoComplete="name" className={FIELD} aria-invalid={!!fieldError('name')} />
                {fieldError('name') && <span className="mt-1 block text-xs text-red-600">{fieldError('name')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.businessName')}
                <input name="businessName" required maxLength={200} autoComplete="organization" className={FIELD} aria-invalid={!!fieldError('businessName')} />
                {fieldError('businessName') && <span className="mt-1 block text-xs text-red-600">{fieldError('businessName')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.role')}
                <select name="role" required defaultValue="" className={FIELD} aria-invalid={!!fieldError('role')}>
                    <option value="" disabled>
                        {t('rolePlaceholder')}
                    </option>
                    {APPLICATION_ROLES.map((role) => (
                        <option key={role} value={role}>
                            {t(`roles.${role}`)}
                        </option>
                    ))}
                </select>
            </label>
            {/* Contact */}
            <label className={LABEL}>
                {t('fields.email')}
                <input name="email" type="email" required maxLength={254} autoComplete="email" className={FIELD} aria-invalid={!!fieldError('email')} />
                {fieldError('email') && <span className="mt-1 block text-xs text-red-600">{fieldError('email')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.link')}
                <input name="link" required maxLength={500} autoComplete="url" className={FIELD} aria-invalid={!!fieldError('link')} />
                {fieldError('link') && <span className="mt-1 block text-xs text-red-600">{fieldError('link')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.country')}
                <select name="countryCode" required defaultValue={defaultCountry} autoComplete="country" className={FIELD} aria-invalid={!!fieldError('countryCode')}>
                    <option value="" disabled>
                        {t('countryPlaceholder')}
                    </option>
                    {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                            {country.name}
                        </option>
                    ))}
                </select>
            </label>
            <label className={LABEL}>
                {t('fields.phone')}
                <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={FIELD} aria-invalid={!!fieldError('phone')} />
                {fieldError('phone') && <span className="mt-1 block text-xs text-red-600">{fieldError('phone')}</span>}
            </label>
            {/* Honeypot: hidden from people and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            {/* Consent */}
            <label className="flex items-start gap-3 text-sm">
                <input name="consent" type="checkbox" required className="mt-0.5 size-5" />
                <span>
                    {t.rich('consent', {
                        link: (chunks) => (
                            <a href={routes.legal.privacy()} target="_blank" rel="noopener" className="underline underline-offset-2">
                                {chunks}
                            </a>
                        ),
                    })}
                </span>
            </label>
            {/* Submit */}
            <button type="submit" disabled={form.isSubmitting} className={cn(PRIMARY_BUTTON, 'border-0 disabled:opacity-60')}>
                {form.isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : t('submit')}
            </button>
            {form.error && (
                <p role="alert" className="text-sm text-red-600">
                    {t(`errors.${form.error}`)}
                </p>
            )}
        </form>
    );
}
```
The native `<select>` jumps to a country as you type its first letters, on desktop and mobile. That covers "searchable" without a custom combobox. If the user wants a filter-as-you-type box, that's a follow-up.

- [ ] **Step 9: Language banner**

`hooks/useLanguageBanner.ts`:
```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { shouldSuggestTwin } from '@/lib/forBusiness';

const DISMISS_KEY = 'storywall.forBusiness.languageBannerDismissed';

function readDismissed(): boolean {
    try {
        return window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

// Decided after hydration from the browser's languages, so the server HTML
// (what crawlers read) never contains the banner.
export function useLanguageBanner(pageLocale: Locale) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only read after hydration
        setVisible(!readDismissed() && shouldSuggestTwin(pageLocale, navigator.languages ?? []));
    }, [pageLocale]);

    const dismiss = useCallback(() => {
        setVisible(false);
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // Storage blocked: the banner just shows again next visit.
        }
    }, []);

    return { visible, dismiss };
}
```
If lint does not know the `react-hooks/set-state-in-effect` rule, remove that disable comment.

`components/forBusiness/ForBusinessLanguageBanner.tsx`:
```tsx
'use client';

import { X } from 'lucide-react';

import { useLanguageBanner } from '@/hooks/useLanguageBanner';
import { type Locale, localeCookieMaxAge, localeCookieName } from '@/i18n/config';

type Props = { pageLocale: Locale; target: Locale; href: string; text: string; link: string; dismiss: string };

// Fixed to the bottom so it never shifts the layout or covers the content.
export function ForBusinessLanguageBanner({ pageLocale, target, href, text, link, dismiss }: Props) {
    const banner = useLanguageBanner(pageLocale);
    if (!banner.visible) return null;

    const rememberChoice = () => {
        document.cookie = `${localeCookieName}=${encodeURIComponent(target)}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;
    };

    return (
        <div lang={target} role="region" aria-label={text} className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-[#151313] px-4 py-3 text-sm text-white shadow-lg">
            <span className="flex-1">{text}</span>
            <a href={href} onClick={rememberChoice} className="font-semibold text-white underline underline-offset-4">
                {link}
            </a>
            <button type="button" onClick={banner.dismiss} aria-label={dismiss} className="flex size-9 items-center justify-center rounded-full hover:bg-white/10">
                <X className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}
```
The link is a plain `<a href>`, so the visit is a full page load into the twin. The cookie keeps the next visit to `/` in that language too, the same way the switcher does.

- [ ] **Step 10: Structured data**

`components/forBusiness/ForBusinessStructuredData.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';

import { forBusinessFaqItems } from '@/components/forBusiness/ForBusinessFaq';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

// Ties the page to the organization and website the landing declares (same @ids).
export async function ForBusinessStructuredData() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const url = absoluteUrl(getForBusinessPath(locale));
    const faq = await forBusinessFaqItems();

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: t('meta.title'),
                description: t('meta.description'),
                inLanguage: locale,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: { '@id': `${SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: t('meta.siteName'), item: absoluteUrl(getPublicLandingPath(locale)) },
                    { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: url },
                ],
            },
            {
                '@type': 'FAQPage',
                '@id': `${url}#faq`,
                inLanguage: locale,
                mainEntity: faq.map(([question, answer]) => ({
                    '@type': 'Question',
                    name: question,
                    acceptedAnswer: { '@type': 'Answer', text: answer },
                })),
            },
        ],
    };

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }} />;
}
```
Check how `LandingStructuredData` renders its `<script>` and match it exactly, including the escaping.

- [ ] **Step 11: The page composition**

`components/forBusiness/ForBusinessPage.tsx`:
```tsx
import '@/components/landing/landing.css';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLocale, getTranslations } from 'next-intl/server';

import { ForBusinessApply } from '@/components/forBusiness/ForBusinessApply';
import { ForBusinessBenefits } from '@/components/forBusiness/ForBusinessBenefits';
import { ForBusinessClients } from '@/components/forBusiness/ForBusinessClients';
import { ForBusinessDestination } from '@/components/forBusiness/ForBusinessDestination';
import { ForBusinessFaq } from '@/components/forBusiness/ForBusinessFaq';
import { ForBusinessFounding } from '@/components/forBusiness/ForBusinessFounding';
import { ForBusinessHeader } from '@/components/forBusiness/ForBusinessHeader';
import { ForBusinessHero } from '@/components/forBusiness/ForBusinessHero';
import { ForBusinessLanguageBanner } from '@/components/forBusiness/ForBusinessLanguageBanner';
import { ForBusinessRoles } from '@/components/forBusiness/ForBusinessRoles';
import { ForBusinessSteps } from '@/components/forBusiness/ForBusinessSteps';
import { ForBusinessStructuredData } from '@/components/forBusiness/ForBusinessStructuredData';
import { SECONDARY_LINK } from '@/components/forBusiness/forBusinessStyles';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { type Locale, locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { foundingBlock } from '@/lib/forBusiness';
import { fetchPartnerProgramSummary } from '@/lib/forBusinessServer';
import { makeQueryClient } from '@/lib/queryClient';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

// The destination weddings section is written for international professionals.
const DESTINATION_LOCALES: readonly Locale[] = ['en'];

export async function ForBusinessPage() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const twin = locales.find((other) => other !== locale) ?? locale;
    const queryClient = makeQueryClient();

    // Best-effort, as on the landing: the footer newsletter reads the app config.
    try {
        queryClient.setQueryData(appConfigKeys.all, await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get));
    } catch {
        // useAppConfig() fetches normally on the client.
    }

    const founding = foundingBlock(await fetchPartnerProgramSummary());

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ForBusinessStructuredData />
            <LandingMotionProvider>
                <main id="top" className="landing-page overflow-x-clip bg-white text-[#151313]">
                    {/* Header */}
                    <ForBusinessHeader />
                    {/* Hero */}
                    <ForBusinessHero />
                    {/* What clients get */}
                    <ForBusinessClients />
                    {/* What you get */}
                    <ForBusinessBenefits showFreeEvent={founding.kind === 'hidden'} />
                    {/* Destination weddings */}
                    {DESTINATION_LOCALES.includes(locale) && <ForBusinessDestination />}
                    {/* Founding partners */}
                    {founding.kind !== 'hidden' && <ForBusinessFounding block={founding} />}
                    {/* How it works */}
                    <ForBusinessSteps />
                    {/* Who it's for */}
                    <ForBusinessRoles />
                    {/* FAQ */}
                    <ForBusinessFaq />
                    {/* Apply */}
                    <ForBusinessApply />
                    {/* Back to the couples' page */}
                    <p className="px-5 pb-14 text-center">
                        <a href={getPublicLandingPath(locale)} className={SECONDARY_LINK}>
                            {t('links.couples')}
                        </a>
                    </p>
                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} topHref="#top" />
                </main>
                {/* Language hint */}
                <ForBusinessLanguageBanner
                    pageLocale={locale}
                    target={twin}
                    href={getForBusinessPath(twin)}
                    text={t(`languageBanner.${twin}.text`)}
                    link={t(`languageBanner.${twin}.link`)}
                    dismiss={t(`languageBanner.${twin}.dismiss`)}
                />
            </LandingMotionProvider>
        </HydrationBoundary>
    );
}
```

- [ ] **Step 12: Type check, lint, and the namespace test**

Run: `npm run type:check; npx eslint components/forBusiness hooks/useLanguageBanner.ts; npx vitest run i18n/publicMessages.test.ts`
Expected:
- **Type check:** clean, except `LandingFooter` doesn't take `anchorBase`/`topHref` yet. That's fixed in Task 14, so run the type check again after it.
- **Namespace test:** PASS. If it reports `PartnerCard`, apply the note from Step 5.

- [ ] **Step 13: Commit**

```bash
git add components/forBusiness hooks/useLanguageBanner.ts i18n/publicMessages.ts i18n/publicMessages.test.ts
git commit -m "feat(for-business): page sections, apply form and language banner"
```

---

### Task 14: Footer works off the landing and links to the partner page

**Files:**
- Modify: `components/landing/LandingFooter.tsx`

- [ ] **Step 1: Implement**

Add the imports:
```tsx
import { getLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getForBusinessPath } from '@/i18n/publicLocale';
```
Change the signature and the start of the function:
```tsx
// anchorBase prefixes the in-page anchors when the footer renders on a page
// other than the landing (e.g. '/el' turns '#faq' into '/el#faq').
export async function LandingFooter({ anchorBase = '', topHref = TOP_HREF }: { anchorBase?: string; topHref?: string } = {}) {
    const t = await getTranslations('LandingPage.footer');
    const locale = (await getLocale()) as Locale;
```
In the Explore column, change `href={href}` to `href={`${anchorBase}${href}`}`. After the `EXPLORE_LINKS.map(...)`, add:
```tsx
                    <a
                        className={`${COLUMN_ITEM} no-underline transition-[opacity,transform] duration-250 ease-[ease] hover:translate-x-0.75 hover:opacity-[0.62] motion-reduce:transition-none`}
                        href={getForBusinessPath(locale)}
                    >
                        {t('exploreLinks.forBusiness')}
                    </a>
```
Change the back-to-top link's `href={TOP_HREF}` to `href={topHref}`.

- [ ] **Step 2: Type check and lint**

Run: `npm run type:check; npx eslint components/landing/LandingFooter.tsx components/forBusiness`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/landing/LandingFooter.tsx
git commit -m "feat(landing): footer link to the partner page, anchors that work off the landing"
```

---

### Task 15: Routes and OG images

**Files:**
- Modify: `lib/og/ogImages.tsx`
- Create: `app/(landing)/for-business/page.tsx`
- Create: `app/(landing)/for-business/opengraph-image.tsx`
- Create: `app/(landing)/[locale]/epaggelmaties/page.tsx`
- Create: `app/(landing)/[locale]/epaggelmaties/opengraph-image.tsx`
- Create: `lib/forBusinessMetadata.ts`

- [ ] **Step 1: OG image for the partner page**

Add to `lib/og/ogImages.tsx` after `brandOgImage`:
```tsx
// The partner page's preview. Uses Alegreya for the text because the built-in
// font has no Greek; falls back to the default font if Google Fonts is down.
export async function forBusinessOgImage(copy: { eyebrow: string; headline: string }) {
    const logoSrc = await logoDataUri();
    const font = await loadTitleFont(`${copy.eyebrow}${copy.headline}`);

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
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot render inside ImageResponse */}
            <img alt="" height={64} src={logoSrc} width={268} />
            {/* Headline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ fontSize: 30, letterSpacing: 6, color: CORAL }}>{copy.eyebrow}</div>
                <div style={{ fontSize: 84, lineHeight: 1.04, maxWidth: 1000 }}>{copy.headline}</div>
            </div>
        </div>,
        { ...OG_IMAGE_SIZE, fonts: font ? [{ name: TITLE_FONT, data: font, weight: 700, style: 'normal' }] : undefined },
    );
}
```

- [ ] **Step 2: Metadata loader**

`lib/forBusinessMetadata.ts`:
```ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildForBusinessMetadata } from '@/lib/seo';

export async function getForBusinessMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return buildForBusinessMetadata(locale, {
        title: t('title'),
        description: t('description'),
        siteName: t('siteName'),
        imageAlt: t('imageAlt'),
    });
}

export async function getForBusinessOgCopy(locale: Locale): Promise<{ eyebrow: string; headline: string; alt: string }> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return { eyebrow: t('ogEyebrow'), headline: t('ogHeadline'), alt: t('imageAlt') };
}
```

- [ ] **Step 3: English route**

`app/(landing)/for-business/page.tsx`:
```tsx
import type { Metadata } from 'next';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';

// Public, indexable. The proxy pins this URL to English.
export function generateMetadata(): Promise<Metadata> {
    return getForBusinessMetadata('en');
}

export default function Page() {
    return <ForBusinessPage />;
}
```

`app/(landing)/for-business/opengraph-image.tsx`:
```tsx
import { getForBusinessOgCopy } from '@/lib/forBusinessMetadata';
import { forBusinessOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const alt = 'StoryWall for wedding professionals';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function OpenGraphImage() {
    return forBusinessOgImage(await getForBusinessOgCopy('en'));
}
```

- [ ] **Step 4: Greek route**

`app/(landing)/[locale]/epaggelmaties/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';

type PageProps = { params: Promise<{ locale: string }> };

// Only /el/epaggelmaties exists; /en/epaggelmaties and any other locale 404.
// The English page lives at /for-business.
export function generateStaticParams() {
    return [{ locale: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    if (locale !== 'el') return {};
    return getForBusinessMetadata('el');
}

export default async function Page({ params }: PageProps) {
    const { locale } = await params;
    if (locale !== 'el') notFound();
    return <ForBusinessPage />;
}
```

`app/(landing)/[locale]/epaggelmaties/opengraph-image.tsx`:
```tsx
import { getForBusinessOgCopy } from '@/lib/forBusinessMetadata';
import { forBusinessOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const alt = 'StoryWall για επαγγελματίες γάμου και βάπτισης';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function OpenGraphImage() {
    return forBusinessOgImage(await getForBusinessOgCopy('el'));
}
```

- [ ] **Step 5: Full checks**

Run: `npm run type:check; npm run lint; npm test`
Expected: all clean and passing, apart from any failures already noted in Task 0.

- [ ] **Step 6: Commit**

```bash
git add lib/og/ogImages.tsx lib/forBusinessMetadata.ts "app/(landing)/for-business" "app/(landing)/[locale]/epaggelmaties"
git commit -m "feat(for-business): EN and EL routes with metadata and OG images"
```

---

### Task 16: Verify in the browser and with curl

Memory: never `preview_start {name}` in this repo (it breaks the shared `.next`). Ask the user to run the dev server on :3000 (or confirm it's running), then open it with `preview_start {url: "http://localhost:3000/"}`.

- [ ] **Step 1: Server HTML (the SEO BLOCKERs)**

With the dev server running on :3000 (the user's), run:
```bash
curl -s http://localhost:3000/for-business | grep -o '<h1[^>]*>[^<]*' | head -3
curl -s http://localhost:3000/el/epaggelmaties | grep -o '<h1[^>]*>[^<]*' | head -3
curl -s http://localhost:3000/el/epaggelmaties | grep -oE '<link rel="(canonical|alternate)"[^>]*>'
curl -s http://localhost:3000/for-business | grep -c 'application/ld+json'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/en/epaggelmaties
curl -s http://localhost:3000/sitemap.xml | grep -E 'for-business|epaggelmaties'
```
Expected:
- **h1:** exactly one per page, in the page's language. The Greek page is in Greek, even though curl sends no Accept-Language.
- **Links:** the canonical plus `en`, `el` and `x-default` alternates.
- **JSON-LD:** 1 block.
- **`/en/epaggelmaties`:** 404.
- **Sitemap:** both URLs present.
- **No noindex:** `curl -s http://localhost:3000/for-business | grep -c noindex` prints `0`.

- [ ] **Step 2: Visual check, mobile first**

In the browser pane, open `/el/epaggelmaties` and `/for-business` at mobile (375px) and desktop. Check:
- The sections are clearly separated, nothing overlaps, and text isn't cramped.
- The Apply buttons scroll to the form.
- With Spring's summary endpoint missing, the founding block shows "Limited to the first 20 partners".
- The FAQ answer for "Which events" reads "Weddings and Baptisms and christenings" / "Γάμοι και Βαπτίσεις". If the English list reads awkwardly, change `occasions.BAPTISM.name` copy.
- The footer's Explore links on the partner page go to `/#faq` etc. on the landing.
- The language switcher swaps `/for-business` ↔ `/el/epaggelmaties`.
- The banner shows on `/el/epaggelmaties` for an English browser (`navigator.languages` is the pane's). Dismissing it keeps it gone after a reload.
- `/opengraph-image` renders under each route, with Greek text readable on the Greek one.

- [ ] **Step 3: Form behavior**

Submitting with Spring's POST missing shows the "failed" error, keeps the inputs, and doesn't crash. Once Spring is live: a real submit shows "sent", a second submit with the same email shows "exists", and a submit with `?utm_source=test` in the URL sends `utmSource: 'test'` (check the network request in the pane).

- [ ] **Step 4: Landing regression**

`/` and `/el` look unchanged, apart from the new "For professionals" footer link. The landing's language switcher and footer anchors still work.

---

### Task 17: PR into `staging`

- [ ] **Step 1: SEO checklist in the PR description**

Go through `docs/seo-guidelines.md` and list each item as met.
- Call out the `proxy.ts` locale change, which the guidelines flag. Crawlers still reach every language version by its own URL, and Step 1 of Task 16 proves it.
- List any unmet rule as a **BLOCKER**.

- [ ] **Step 2: Note the follow-ups in the PR**

- **Spring:** the two endpoints from Task 6.
- **Spec 2:** admin review of applications and the founding flag.
- **Vercel:** add `business.storywall.gr` as a domain that 308-redirects to `https://www.storywall.gr/el/epaggelmaties` (user action).
- **After deploy:** request indexing for both URLs in Search Console, and validate the JSON-LD in the Rich Results Test.

- [ ] **Step 3: Open the PR into `staging`** (never `main`), ending the body with the attribution line from the session's system reminder.
