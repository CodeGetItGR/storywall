# Wedding QR Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two indexable pages about the wedding QR code (`/el/qr-code-gamou` and `/wedding-qr-code`) and fix the landing's SEO gaps, including the plan prices missing from the server HTML.

**Architecture:** The new pages reuse the occasion-page stack: a server entry prefetches `/api/config` into the query cache, gates on the WEDDING event type and composes the landing sections (how it works, pricing, FAQ, final call to action, footer) around a new server-rendered guide. The hero frame is extracted from `OccasionHero` into a shared `KeywordHero`, and the occasion JSON-LD into a shared `servicePageGraph`, so both page kinds use one copy of each. URL helpers live next to the partner page's in `i18n/publicLocale.ts`, and SEO helpers in `lib/seo.ts`.

**Tech Stack:** Next.js 16 App Router, next-intl, TanStack Query 5, Tailwind, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-19-qr-wedding-page-design.md](../specs/2026-10-19-qr-wedding-page-design.md)

---

## Before you start

- Work in this worktree on branch `claude/qr-wedding-seo-analysis-2233c8` (cut from `staging`). The PR goes into `staging`.
- `node_modules` is a junction to the main checkout. Turbopack rejects it, so the dev server runs with webpack: `npx next dev --webpack -p 3101`. Port 3000 belongs to another session; leave it alone.
- `next dev` rewrites `AGENTS.md`. Never commit that change; run `git checkout AGENTS.md` before each commit if it shows up.
- Commands: `npx vitest run <file>` for one test file, `npm test` for all, `npm run type:check`, `npm run lint`.
- Commit messages follow the repo style (a plain sentence) and end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- JSX props and imports are sorted alphabetically in this repo. If lint complains about order, run `npx eslint --fix <files>`.

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `providers/AppConfigBootstrap.tsx` | Modify | Prefetch config in an effect so a page's server prefetch reaches the server render |
| `providers/AppConfigBootstrap.test.tsx` | Create | Regression test for the server render, plus mount and demo behaviour |
| `i18n/publicLocale.ts` (+ test) | Modify | `QR_WEDDING_PATHS`, `getQrWeddingPath`, `isQrWeddingPath`; `publicPageLocale` knows both URLs |
| `proxy.test.ts` | Modify | Both URLs render in their own language |
| `lib/signupSource.ts` (+ test) | Modify | `isLandingPath('/wedding-qr-code')` |
| `lib/seo.ts` (+ test) | Modify | `qrWeddingLanguageAlternates`, `buildQrWeddingMetadata` |
| `lib/qrWeddingPage.ts` (+ test) | Create | `qrWeddingPageLive` gate, guide section id, create link |
| `lib/qrWeddingPage.server.ts` (+ test) | Create | `loadQrWeddingPageLive` (config fetch, fails open) |
| `messages/el.json`, `messages/en.json` | Modify | `QrWeddingPage` namespace, footer link label, landing meta, Greek alt texts |
| `components/qrWedding/qrWeddingCopy.test.ts` | Create | Key parity, length limits, keywords, no "free" |
| `lib/structuredData.ts` (+ test) | Create | `faqPageNode`, `servicePageGraph` |
| `components/occasions/OccasionStructuredData.tsx` | Modify | Use `servicePageGraph` (same output) |
| `components/landing/KeywordHero.tsx` (+ test) | Create | Hero frame for pages written for one search |
| `components/occasions/OccasionHero.tsx` | Modify | Render through `KeywordHero` (same output, h1 id renamed) |
| `components/qrWedding/QrWeddingStructuredData.tsx` | Create | Service, breadcrumb and FAQ JSON-LD |
| `components/qrWedding/QrWeddingHero.tsx` | Create | Header links, keyword h1, included line, create button |
| `components/qrWedding/QrWeddingGuideRow.tsx` | Create | One guide question: h2 plus answer |
| `components/qrWedding/QrWeddingGuide.tsx` (+ test) | Create | The three guide questions |
| `components/qrWedding/QrWeddingContent.tsx` | Create | Section composition |
| `components/qrWedding/QrWeddingPage.tsx` | Create | Server entry: config prefetch, gate, hydration |
| `lib/qrWeddingMetadata.ts` | Create | Reads copy, calls `buildQrWeddingMetadata` |
| `i18n/publicMessages.test.ts` | Modify | Walk the new page's client islands |
| `app/(landing)/[slug]/qr-code-gamou/page.tsx` | Create | Greek route |
| `app/(landing)/wedding-qr-code/page.tsx` | Create | English route |
| `app/(landing)/[slug]/[occasion]/page.tsx` (+ test) | Modify | 308 from `/en/wedding-qr-code` |
| `app/sitemap.ts` (+ test) | Modify | Both URLs while WEDDING is on |
| `components/landing/LandingFooter.tsx` (+ test) | Modify | "QR γάμου" / "Wedding QR code" link |
| `components/landing/LandingStructuredData.tsx` (+ test) | Modify | `FAQPage` from the landing FAQ |

---

### Task 1: Plan prices in the server HTML

Root cause: `AppConfigBootstrap` sits above every page in `PublicProviders` and calls `useAppConfig()` during render. That creates the `['app-config']` query (empty) before the page's `HydrationBoundary` renders. TanStack Query hydrates queries that are new to the cache during render, but defers queries that already exist to an effect, and effects never run on the server. So the config the page prefetched never reaches the server render and `LandingPricing` returns null. The fix: the bootstrap prefetches in an effect instead of subscribing during render.

**Files:**
- Modify: `providers/AppConfigBootstrap.tsx`
- Create: `providers/AppConfigBootstrap.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `providers/AppConfigBootstrap.test.tsx`:

```tsx
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appConfigKeys, useAppConfig } from '@/hooks/useAppConfig';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { AppConfigBootstrap } from '@/providers/AppConfigBootstrap';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
const publicGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { publicGet: (...args: unknown[]) => publicGet(...args) } }));
vi.mock('@/lib/api/publicConfigActions', () => ({ revalidatePublicConfig: vi.fn() }));

const CONFIG = { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] } as unknown as AppConfigResponseDto;

function EventTypeCount() {
    const { data } = useAppConfig();
    return <span>{data ? `${data.eventTypes.length} types` : 'no config'}</span>;
}

describe('AppConfigBootstrap', () => {
    afterEach(() => {
        publicGet.mockReset();
        pathname.current = '/';
    });

    it('leaves a page-prefetched config readable in the server render', () => {
        const server = new QueryClient();
        server.setQueryData(appConfigKeys.all, CONFIG);

        const html = renderToString(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
                <HydrationBoundary state={dehydrate(server)}>
                    <EventTypeCount />
                </HydrationBoundary>
            </QueryClientProvider>,
        );

        expect(html).toContain('1 types');
    });

    it('loads the config once mounted', async () => {
        publicGet.mockResolvedValue(CONFIG);
        const client = new QueryClient();

        render(
            <QueryClientProvider client={client}>
                <AppConfigBootstrap />
            </QueryClientProvider>,
        );

        await waitFor(() => expect(client.getQueryData(appConfigKeys.all)).toEqual(CONFIG));
    });

    it('leaves the config alone on the demo', () => {
        pathname.current = '/demo/wedding/feed';

        render(
            <QueryClientProvider client={new QueryClient()}>
                <AppConfigBootstrap />
            </QueryClientProvider>,
        );

        expect(publicGet).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it and confirm the first test fails**

Run: `npx vitest run providers/AppConfigBootstrap.test.tsx`
Expected: FAIL on "leaves a page-prefetched config readable in the server render" (the HTML contains `no config`). The other two pass.

- [ ] **Step 3: Fix the bootstrap**

Replace `providers/AppConfigBootstrap.tsx` with:

```tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { APP_CONFIG_STALE_TIME, appConfigKeys, fetchAppConfig } from '@/hooks/useAppConfig';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';

// Warms the config cache after mount. Subscribing during render would create the query before a
// page's HydrationBoundary, which then hydrates it only in an effect: never on the server.
export function AppConfigBootstrap() {
    const queryClient = useQueryClient();
    const isDemoRoute = useIsDemoRoute();

    useEffect(() => {
        if (isDemoRoute) return;
        void queryClient.prefetchQuery({ queryKey: appConfigKeys.all, queryFn: fetchAppConfig, staleTime: APP_CONFIG_STALE_TIME });
    }, [isDemoRoute, queryClient]);

    return null;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run providers/`
Expected: PASS (including `providers/AppProviders.test.tsx`, which mocks the bootstrap).

- [ ] **Step 5: Commit**

```bash
git add providers/AppConfigBootstrap.tsx providers/AppConfigBootstrap.test.tsx
git commit -m "Render plan prices in the landing's server HTML" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Wedding QR URLs, proxy locale and landing path

**Files:**
- Modify: `i18n/publicLocale.ts`, `i18n/publicLocale.test.ts`
- Modify: `proxy.test.ts` (test only; `proxy.ts` already calls `publicPageLocale`)
- Modify: `lib/signupSource.ts`, `lib/signupSource.test.ts`

- [ ] **Step 1: Write the failing tests**

In `i18n/publicLocale.test.ts`, extend the import and add the new blocks:

```ts
import {
    getForBusinessPath,
    getQrWeddingPath,
    isForBusinessPath,
    isQrWeddingPath,
    publicPageLocale,
    publicTwinPath,
} from '@/i18n/publicLocale';
```

```ts
describe('getQrWeddingPath', () => {
    it('gives each locale its own slug', () => {
        expect(getQrWeddingPath('en')).toBe('/wedding-qr-code');
        expect(getQrWeddingPath('el')).toBe('/el/qr-code-gamou');
    });
});

describe('isQrWeddingPath', () => {
    it('matches only the two wedding QR URLs', () => {
        expect(isQrWeddingPath('/wedding-qr-code')).toBe(true);
        expect(isQrWeddingPath('/el/qr-code-gamou')).toBe(true);
        expect(isQrWeddingPath('/en/wedding-qr-code')).toBe(false);
        expect(isQrWeddingPath('/el/wedding-qr-code')).toBe(false);
        expect(isQrWeddingPath(null)).toBe(false);
    });
});
```

Inside the existing `describe('publicPageLocale', ...)`, add:

```ts
    it('reads the locale from the wedding QR URLs', () => {
        expect(publicPageLocale('/wedding-qr-code')).toBe('en');
        expect(publicPageLocale('/el/qr-code-gamou')).toBe('el');
        expect(publicPageLocale('/en/qr-code-gamou')).toBeNull();
    });
```

In `proxy.test.ts`, right after the test `'renders /for-business in English for a Greek browser, without redirecting'` (same `describe`, reusing `partnerRequest`), add:

```ts
    it('renders /el/qr-code-gamou in Greek for an English browser', async () => {
        const res = await proxy(partnerRequest('http://localhost/el/qr-code-gamou', 'en-US'));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('el');
    });

    it('renders /wedding-qr-code in English for a Greek browser, without redirecting', async () => {
        const res = await proxy(partnerRequest('http://localhost/wedding-qr-code', 'el-GR'));
        expect(res.status).toBe(200);
        expect(res.headers.get(`x-middleware-request-${PUBLIC_LOCALE_HEADER}`)).toBe('en');
    });
```

In `lib/signupSource.test.ts`, inside `it('knows the pages under app/(landing)', ...)`, after the `/for-business` line, add:

```ts
        expect(isLandingPath('/wedding-qr-code')).toBe(true);
        expect(isLandingPath('/el/qr-code-gamou')).toBe(true);
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run i18n/publicLocale.test.ts proxy.test.ts lib/signupSource.test.ts`
Expected: FAIL. `getQrWeddingPath`/`isQrWeddingPath` are not exported, the proxy sets no locale header for either URL, and `isLandingPath('/wedding-qr-code')` is false.

- [ ] **Step 3: Add the helpers**

In `i18n/publicLocale.ts`, after `isForBusinessPath`, add:

```ts
// The wedding QR page, one URL per language. Same rules as the partner page's slugs.
export const QR_WEDDING_PATHS: Record<Locale, string> = {
    en: '/wedding-qr-code',
    el: '/el/qr-code-gamou',
};

export function getQrWeddingPath(locale: Locale): string {
    return QR_WEDDING_PATHS[locale];
}

export function isQrWeddingPath(pathname: string | null): boolean {
    return locales.some((locale) => QR_WEDDING_PATHS[locale] === pathname);
}
```

Replace `publicPageLocale` with:

```ts
// The language a public page is written in, read from its URL alone so
// crawlers get the same language as visitors. Null for every other path.
export function publicPageLocale(pathname: string): Locale | null {
    return (
        locales.find(
            (locale) => pathname === getPublicLandingPath(locale) || pathname === FOR_BUSINESS_PATHS[locale] || pathname === QR_WEDDING_PATHS[locale],
        ) ?? null
    );
}
```

`publicTwinPath` stays as it is: the page hands `QR_WEDDING_PATHS` to the language switcher through `LandingHeader`'s `alternatePaths` (Task 8), as occasion pages do.

In `lib/signupSource.ts`, add `import { isQrWeddingPath } from '@/i18n/publicLocale';` to the imports (keep them sorted) and change the start of `isLandingPath`:

```ts
// Pages under app/(landing): `/`, `/for-business`, `/wedding-qr-code`, a locale's pages (`/el/...`) and
// the default locale's occasion pages (`/weddings`). Leaving one for any other page is a full page load
// (another root layout).
export function isLandingPath(pathname: string): boolean {
    if (pathname === '/' || pathname === '/for-business' || isQrWeddingPath(pathname)) return true;
```

(The rest of the function is unchanged.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run i18n/publicLocale.test.ts proxy.test.ts lib/signupSource.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add i18n/publicLocale.ts i18n/publicLocale.test.ts proxy.test.ts lib/signupSource.ts lib/signupSource.test.ts
git commit -m "Add the wedding QR page URLs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Wedding QR alternates and metadata builder

**Files:**
- Modify: `lib/seo.ts`, `lib/seo.test.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/seo.test.ts`, add `buildQrWeddingMetadata` and `qrWeddingLanguageAlternates` to the import from `@/lib/seo` (sorted), then add after the `buildForBusinessMetadata` block:

```ts
describe('qrWeddingLanguageAlternates', () => {
    it('lists both wedding QR URLs and sends x-default to the English one', () => {
        expect(qrWeddingLanguageAlternates()).toEqual({
            en: `${SITE_URL}/wedding-qr-code`,
            el: `${SITE_URL}/el/qr-code-gamou`,
            'x-default': `${SITE_URL}/wedding-qr-code`,
        });
    });
});

describe('buildQrWeddingMetadata', () => {
    const copy = { title: 'T', description: 'D', siteName: 'StoryWall', imageAlt: 'A', keywords: ['QR γάμου'] };

    it('gives each locale its own canonical and the shared alternates', () => {
        const el = buildQrWeddingMetadata('el', copy);
        expect(el.alternates?.canonical).toBe(`${SITE_URL}/el/qr-code-gamou`);
        expect(el.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
        expect(buildQrWeddingMetadata('en', copy).alternates?.canonical).toBe(`${SITE_URL}/wedding-qr-code`);
    });

    it('is indexable, keeps its keywords and uses the default share image', () => {
        const metadata = buildQrWeddingMetadata('el', copy);
        const openGraph = metadata.openGraph as { images?: { url: string }[] };
        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(metadata.keywords).toEqual(['QR γάμου']);
        expect(openGraph.images?.[0]?.url).toBe(`${SITE_URL}/opengraph-image`);
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run lib/seo.test.ts`
Expected: FAIL, the two functions are not exported.

- [ ] **Step 3: Implement**

In `lib/seo.ts`, change the `publicLocale` import to:

```ts
import { getForBusinessPath, getPublicLandingPath, getQrWeddingPath } from '@/i18n/publicLocale';
```

After `forBusinessLanguageAlternates`, add:

```ts
// Same shape again for the wedding QR page.
export function qrWeddingLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of locales) languages[locale] = absoluteUrl(getQrWeddingPath(locale));
    languages['x-default'] = absoluteUrl(getQrWeddingPath(defaultLocale));
    return languages;
}
```

After `buildForBusinessMetadata`, add:

```ts
// The wedding QR page shares the landing's OG image.
export function buildQrWeddingMetadata(locale: Locale, copy: PageMetadataCopy): Metadata {
    return buildIndexableMetadata({
        locale,
        path: getQrWeddingPath(locale),
        languages: qrWeddingLanguageAlternates(),
        imagePath: OG_IMAGE_PATH,
        copy,
    });
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/seo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/seo.ts lib/seo.test.ts
git commit -m "Add the wedding QR page's metadata builder" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Live gate, guide id and create link

**Files:**
- Create: `lib/qrWeddingPage.ts`, `lib/qrWeddingPage.test.ts`
- Create: `lib/qrWeddingPage.server.ts`, `lib/qrWeddingPage.server.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/qrWeddingPage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto } from '@/lib/api/types';
import { QR_WEDDING_CREATE_HREF, qrWeddingPageLive } from '@/lib/qrWeddingPage';

function config(eventTypes: { eventTypeKey: string; isEnabled: boolean }[]): AppConfigResponseDto {
    return { eventTypes } as unknown as AppConfigResponseDto;
}

describe('qrWeddingPageLive', () => {
    it('is live while weddings are on', () => {
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'WEDDING', isEnabled: true }]))).toBe(true);
    });

    it('is hidden while weddings are off or missing', () => {
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'WEDDING', isEnabled: false }]))).toBe(false);
        expect(qrWeddingPageLive(config([{ eventTypeKey: 'BAPTISM', isEnabled: true }]))).toBe(false);
    });

    it('stays live when the config is unknown', () => {
        expect(qrWeddingPageLive(null)).toBe(true);
    });
});

describe('QR_WEDDING_CREATE_HREF', () => {
    it('opens the create wizard on weddings', () => {
        expect(QR_WEDDING_CREATE_HREF).toBe('/events/new?type=wedding');
    });
});
```

Create `lib/qrWeddingPage.server.test.ts`:

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const serverPublicConfigGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: (...args: unknown[]) => serverPublicConfigGet(...args) }));

import { endpoints } from '@/lib/api/endpoints';
import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';

describe('loadQrWeddingPageLive', () => {
    afterEach(() => {
        serverPublicConfigGet.mockReset();
    });

    it('reads the wedding switch from the config', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: false }] });
        await expect(loadQrWeddingPageLive('el')).resolves.toBe(false);
        expect(serverPublicConfigGet).toHaveBeenCalledWith(endpoints.config.get, 'el');
    });

    it('stays live when the config cannot be read', async () => {
        serverPublicConfigGet.mockRejectedValue(new Error('down'));
        await expect(loadQrWeddingPageLive()).resolves.toBe(true);
    });
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx vitest run lib/qrWeddingPage.test.ts lib/qrWeddingPage.server.test.ts`
Expected: FAIL, the modules do not exist.

- [ ] **Step 3: Implement**

Create `lib/qrWeddingPage.ts`:

```ts
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { routes } from '@/lib/routes';

// The id of the guide section, linked from the page header.
export const QR_WEDDING_GUIDE_ID = 'guide';

export const QR_WEDDING_CREATE_HREF = routes.events.new({ type: eventTypeSlug('WEDDING') });

// The page is about weddings alone: live while the WEDDING type is on. Unknown (config failed) → live.
export function qrWeddingPageLive(config: AppConfigResponseDto | null): boolean {
    return !config || config.eventTypes.some((type) => type.eventTypeKey === 'WEDDING' && type.isEnabled);
}
```

Create `lib/qrWeddingPage.server.ts`:

```ts
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';

// Pass a locale where there is no request locale (the sitemap).
export async function loadQrWeddingPageLive(locale?: Locale): Promise<boolean> {
    try {
        return qrWeddingPageLive(await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get, locale));
    } catch {
        return qrWeddingPageLive(null);
    }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/qrWeddingPage.test.ts lib/qrWeddingPage.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/qrWeddingPage.ts lib/qrWeddingPage.test.ts lib/qrWeddingPage.server.ts lib/qrWeddingPage.server.test.ts
git commit -m "Gate the wedding QR page on the wedding event type" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Page copy in both languages

**Files:**
- Create: `components/qrWedding/qrWeddingCopy.test.ts`
- Modify: `messages/el.json`, `messages/en.json`

- [ ] **Step 1: Write the failing test**

Create `components/qrWedding/qrWeddingCopy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

type Json = Record<string, unknown>;
type QrWeddingCopy = {
    meta: { title: string; description: string; keywords: string[] };
    hero: { h1: string };
    faq: { q: string; a: string }[];
};

function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
    return [prefix];
}

const CATALOGS = { en: en as Json, el: el as Json };
const PAGES = Object.entries(CATALOGS).map(([locale, catalog]) => [locale, catalog.QrWeddingPage as QrWeddingCopy] as const);
// The searches each page is written for, as they must appear in its title and h1.
const KEYWORDS: Record<string, { title: string; h1: string }> = {
    en: { title: 'wedding qr code', h1: 'wedding qr code' },
    el: { title: 'qr code γάμου', h1: 'qr γάμου' },
};

describe('wedding QR copy', () => {
    it('has the same keys in English and Greek', () => {
        expect(keyPaths(CATALOGS.el.QrWeddingPage)).toEqual(keyPaths(CATALOGS.en.QrWeddingPage));
    });

    it.each(PAGES)('%s fits search result limits', (_, copy) => {
        expect([...copy.meta.title].length).toBeLessThanOrEqual(60);
        expect([...copy.meta.description].length).toBeLessThanOrEqual(160);
    });

    it.each(PAGES)('%s puts the main search in the title and h1', (locale, copy) => {
        expect(copy.meta.title.toLowerCase()).toContain(KEYWORDS[locale]!.title);
        expect(copy.hero.h1.toLowerCase()).toContain(KEYWORDS[locale]!.h1);
    });

    it.each(PAGES)('%s has at least five different questions', (_, copy) => {
        const questions = copy.faq.map((item) => item.q);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        expect(new Set(questions).size).toBe(questions.length);
    });

    it.each(PAGES)('%s never calls the QR code free', (locale, copy) => {
        expect(JSON.stringify(copy)).not.toMatch(locale === 'el' ? /δωρε/i : /\bfree\b/i);
    });

    it.each(Object.entries(CATALOGS))('%s gives the page a title no other page uses', (_, catalog) => {
        const occasions = Object.values(catalog.OccasionPages as Record<string, { meta?: { title?: string } }>);
        const others = [
            (catalog.LandingPage as { meta: { title: string } }).meta.title,
            (catalog.ForBusinessPage as { meta: { title: string } }).meta.title,
            ...occasions.map((page) => page.meta?.title),
        ];
        expect(others).not.toContain((catalog.QrWeddingPage as QrWeddingCopy).meta.title);
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run components/qrWedding/qrWeddingCopy.test.ts`
Expected: FAIL, `QrWeddingPage` is undefined.

- [ ] **Step 3: Add the Greek copy**

In `messages/el.json`, add a new top-level key right after the `OccasionPages` object:

```json
"QrWeddingPage": {
    "name": "QR γάμου",
    "meta": {
        "title": "QR Code Γάμου για Φωτογραφίες Καλεσμένων | StoryWall",
        "description": "Οι καλεσμένοι σκανάρουν το QR γάμου και ανεβάζουν φωτογραφίες και βίντεο σε ένα κοινό άλμπουμ. Χωρίς εφαρμογή. Περιλαμβάνεται σε κάθε πακέτο.",
        "keywords": [
            "QR γάμου",
            "QR code γάμου",
            "QR code για φωτογραφίες γάμου",
            "QR code για γάμο",
            "QR code για ανέβασμα φωτογραφιών",
            "φωτογραφίες γάμου από καλεσμένους",
            "κοινό άλμπουμ γάμου"
        ]
    },
    "nav": {
        "guide": "ΟΔΗΓΟΣ",
        "guideMobile": "Οδηγός"
    },
    "hero": {
        "h1": "QR γάμου για φωτογραφίες καλεσμένων",
        "headline": "Ένα QR στα τραπέζια. <b>Όλες οι φωτογραφίες σε ένα άλμπουμ.</b>",
        "lead": "Οι καλεσμένοι σκανάρουν και ανεβάζουν φωτογραφίες και βίντεο από το κινητό τους. Χωρίς εφαρμογή, χωρίς λογαριασμό.",
        "included": "Το QR γάμου περιλαμβάνεται σε κάθε πακέτο.",
        "cta": "Φτιάξε το QR του γάμου σου"
    },
    "howItWorksHeading": ["Ένα QR.", "Όλος ο γάμος."],
    "howItWorks": [
        { "title": "Δημιούργησε", "body": "Φτιάξε το StoryWall του γάμου σου σε λίγα λεπτά." },
        { "title": "Τύπωσε το QR", "body": "Βάλ' το στα τραπέζια, στην είσοδο ή στο μπαρ." },
        { "title": "Οι καλεσμένοι ανεβάζουν", "body": "Σκανάρουν με την κάμερα του κινητού και ανεβάζουν φωτογραφίες και βίντεο." }
    ],
    "guide": {
        "what": {
            "title": "Τι είναι το QR γάμου;",
            "body": "Ένας κωδικός που βάζεις στον χώρο του γάμου. Οι καλεσμένοι τον σκανάρουν με την κάμερα του κινητού και ανεβάζουν φωτογραφίες και βίντεο σε ένα κοινό άλμπουμ. Εσύ τα βλέπεις όλα σε ένα σημείο."
        },
        "where": {
            "title": "Πού να βάλετε το QR στον γάμο;",
            "places": [
                "Στην είσοδο της δεξίωσης",
                "Πάνω σε κάθε τραπέζι",
                "Στο μπαρ",
                "Δίπλα στο photo booth",
                "Στο ευχαριστήριο, για όσους στείλουν φωτογραφίες αργότερα"
            ]
        },
        "sign": {
            "title": "Τι να γράψετε στην πινακίδα;",
            "intro": "Γράψτε ένα από αυτά κάτω από το QR:",
            "texts": [
                "«Σκανάρετε και ανεβάστε τις φωτογραφίες σας από τον γάμο μας!»",
                "«Τραβήξατε κάτι ωραίο; Σκανάρετε το QR και μοιραστείτε το μαζί μας.»",
                "«Η δική σας ματιά στη μέρα μας. Ανεβάστε φωτογραφίες και βίντεο.»"
            ],
            "tip": "Αν έχετε καλεσμένους από το εξωτερικό, γράψτε το και στα αγγλικά."
        }
    },
    "pricingHeading": "Πόσο κοστίζει το QR γάμου;",
    "faqIntro": "Όσα ρωτούν τα ζευγάρια για το QR γάμου.",
    "faq": [
        { "q": "Χρειάζονται εφαρμογή ή λογαριασμό οι καλεσμένοι;", "a": "Όχι. Σκανάρουν το QR και ανεβάζουν από τον browser του κινητού." },
        { "q": "Ανεβαίνουν και βίντεο;", "a": "Ναι. Από το ίδιο QR ανεβαίνουν φωτογραφίες και βίντεο." },
        { "q": "Ποιος βλέπει τις φωτογραφίες;", "a": "Μόνο όσοι προσκαλείς. Το άλμπουμ του γάμου σου είναι ιδιωτικό." },
        { "q": "Μπορώ να κατεβάσω όλες τις φωτογραφίες;", "a": "Ναι. Στο άλμπουμ διαλέγεις πολλές μαζί και τις κατεβάζεις." },
        { "q": "Μέχρι πότε ανεβάζουν οι καλεσμένοι;", "a": "Όσο το StoryWall σου είναι online. Το πακέτο ορίζει για πόσο και μπορείς να το επεκτείνεις." },
        { "q": "Θα τα καταφέρουν οι μεγαλύτεροι καλεσμένοι;", "a": "Ναι. Ανοίγουν την κάμερα, σκανάρουν και πατούν ανέβασμα." }
    ],
    "finalCta": {
        "heading": ["Το QR του γάμου σου,", "έτοιμο σε λίγα λεπτά."],
        "copyStart": "Φτιάξε το StoryWall του γάμου σου και τύπωσε το QR",
        "copyStrong": "για τα τραπέζια.",
        "imageAlt": "Γαμήλια γιορτή στη Σαντορίνη"
    }
},
```

In `LandingPage.footer.exploreLinks`, after `"forBusiness"`, add `"qrWedding": "QR γάμου"`.

- [ ] **Step 4: Add the English copy**

In `messages/en.json`, add the same top-level key right after `OccasionPages`:

```json
"QrWeddingPage": {
    "name": "Wedding QR code",
    "meta": {
        "title": "Wedding QR Code for Guest Photos | StoryWall",
        "description": "Guests scan your wedding QR code and upload photos and videos to one shared album. No app, no sign-up. Included in every plan.",
        "keywords": [
            "wedding QR code",
            "QR code for wedding photos",
            "QR code upload wedding photos",
            "wedding photo sharing",
            "shared wedding album",
            "guest photo app"
        ]
    },
    "nav": {
        "guide": "GUIDE",
        "guideMobile": "Guide"
    },
    "hero": {
        "h1": "Wedding QR code for guest photos",
        "headline": "One QR code on the tables. <b>Every guest photo in one album.</b>",
        "lead": "Guests scan with their phone camera and upload photos and videos. No app, no account.",
        "included": "The QR code is included in every plan.",
        "cta": "Create your wedding QR code"
    },
    "howItWorksHeading": ["One QR code.", "The whole wedding."],
    "howItWorks": [
        { "title": "Create", "body": "Set up your wedding's StoryWall in a few minutes." },
        { "title": "Print the QR code", "body": "Put it on the tables, at the entrance or at the bar." },
        { "title": "Guests upload", "body": "They scan with their phone camera and add photos and videos." }
    ],
    "guide": {
        "what": {
            "title": "What is a wedding QR code?",
            "body": "A code you place around your venue. Guests scan it with their phone camera and upload photos and videos to one shared album, so you see every guest's photos in one place."
        },
        "where": {
            "title": "Where to put the QR code at your wedding",
            "places": [
                "At the reception entrance",
                "On every table",
                "At the bar",
                "Next to the photo booth",
                "On your thank-you cards, for photos that come in later"
            ]
        },
        "sign": {
            "title": "What to write on the QR sign",
            "intro": "Pick one for under the QR code:",
            "texts": [
                "\"Scan to share your photos from our wedding!\"",
                "\"Got a great shot? Scan the code and share it with us.\"",
                "\"Our day through your eyes. Upload your photos and videos here.\""
            ],
            "tip": "If some guests don't read English, add a line in their language."
        }
    },
    "pricingHeading": "How much does a wedding QR code cost?",
    "faqIntro": "What couples ask about the wedding QR code.",
    "faq": [
        { "q": "Do guests need an app or an account?", "a": "No. They scan the code and upload from their phone's browser." },
        { "q": "Can guests upload videos too?", "a": "Yes. The same QR code takes photos and videos." },
        { "q": "Who can see the photos?", "a": "Only the people you invite. Your wedding album is private." },
        { "q": "Can I download all the photos?", "a": "Yes. In the album, select as many as you like and download them." },
        { "q": "How long can guests keep uploading?", "a": "As long as your StoryWall is online. Your plan sets how long, and you can extend it." },
        { "q": "Will older guests manage?", "a": "Yes. They open the camera, scan and tap upload." }
    ],
    "finalCta": {
        "heading": ["Your wedding QR code,", "ready in minutes."],
        "copyStart": "Create your wedding's StoryWall and print the QR code",
        "copyStrong": "for the tables.",
        "imageAlt": "Wedding celebration in Santorini"
    }
},
```

In `LandingPage.footer.exploreLinks`, after `"forBusiness"`, add `"qrWedding": "Wedding QR code"`.

- [ ] **Step 5: Run the copy tests**

Run: `npx vitest run components/qrWedding/qrWeddingCopy.test.ts lib/occasions/occasionCopy.test.ts`
Expected: PASS. Both files must still parse; a JSON syntax error fails every test that imports messages.

- [ ] **Step 6: Commit**

```bash
git add messages/el.json messages/en.json components/qrWedding/qrWeddingCopy.test.ts
git commit -m "Add the wedding QR page copy in Greek and English" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Shared service JSON-LD

The occasion pages already emit Organization + Service + BreadcrumbList + FAQPage. Move that graph into a pure builder so the QR page (and the landing's FAQ) reuse it. Occasion output stays byte-identical.

**Files:**
- Create: `lib/structuredData.ts`, `lib/structuredData.test.ts`
- Modify: `components/occasions/OccasionStructuredData.tsx`
- Create: `components/qrWedding/QrWeddingStructuredData.tsx`

- [ ] **Step 1: Write the failing test**

Create `lib/structuredData.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/seo';
import { faqPageNode, servicePageGraph } from '@/lib/structuredData';

describe('faqPageNode', () => {
    it('turns each question and answer into a Question', () => {
        expect(faqPageNode([{ q: 'Q1', a: 'A1' }])).toEqual({
            '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
        });
    });
});

describe('servicePageGraph', () => {
    const url = `${SITE_URL}/el/qr-code-gamou`;
    const graph = servicePageGraph({
        locale: 'el',
        url,
        name: 'QR γάμου',
        title: 'T',
        description: 'D',
        home: { name: 'Αρχική', url: `${SITE_URL}/el` },
        faq: [{ q: 'Q1', a: 'A1' }],
    });

    it('names StoryWall as the provider of the service', () => {
        expect(graph['@graph']).toContainEqual({
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'StoryWall',
            url: SITE_URL,
            logo: `${SITE_URL}/apple-icon.png`,
        });
        expect(graph['@graph']).toContainEqual({
            '@type': 'Service',
            name: 'T',
            description: 'D',
            url,
            inLanguage: 'el',
            provider: { '@id': `${SITE_URL}/#organization` },
        });
    });

    it('leads the breadcrumb from home to the page', () => {
        expect(graph['@graph']).toContainEqual({
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Αρχική', item: `${SITE_URL}/el` },
                { '@type': 'ListItem', position: 2, name: 'QR γάμου', item: url },
            ],
        });
    });

    it('includes the FAQ and no offers', () => {
        expect(graph['@graph']).toContainEqual(faqPageNode([{ q: 'Q1', a: 'A1' }]));
        expect(JSON.stringify(graph)).not.toContain('Offer');
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run lib/structuredData.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement the builder**

Create `lib/structuredData.ts`:

```ts
import type { Locale } from '@/i18n/config';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export type FaqEntry = { q: string; a: string };

export function faqPageNode(items: FaqEntry[]) {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    };
}

type ServicePageGraphInput = {
    locale: Locale;
    // The page's canonical URL.
    url: string;
    // The page's name in the breadcrumb, after home.
    name: string;
    title: string;
    description: string;
    home: { name: string; url: string };
    faq: FaqEntry[];
};

// A page about one service: the organization, the service, a breadcrumb and the FAQ. No offers: prices come from config.
export function servicePageGraph({ locale, url, name, title, description, home, faq }: ServicePageGraphInput) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': ORGANIZATION_ID,
                name: 'StoryWall',
                url: absoluteUrl('/'),
                logo: absoluteUrl('/apple-icon.png'),
            },
            {
                '@type': 'Service',
                name: title,
                description,
                url,
                inLanguage: locale,
                provider: { '@id': ORGANIZATION_ID },
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: home.name, item: home.url },
                    { '@type': 'ListItem', position: 2, name, item: url },
                ],
            },
            faqPageNode(faq),
        ],
    };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/structuredData.test.ts`
Expected: PASS

- [ ] **Step 5: Move the occasion pages onto the builder**

Replace `components/occasions/OccasionStructuredData.tsx` with:

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { type FaqEntry, servicePageGraph } from '@/lib/structuredData';

// The service for this occasion, a breadcrumb and the FAQ.
export async function OccasionStructuredData({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(occasionPath(occasion, locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description'),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        faq: t.raw('faq') as FaqEntry[],
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
```

- [ ] **Step 6: Add the QR page's JSON-LD**

Create `components/qrWedding/QrWeddingStructuredData.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, getQrWeddingPath } from '@/i18n/publicLocale';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { type FaqEntry, servicePageGraph } from '@/lib/structuredData';

// The wedding QR service, a breadcrumb from the landing and the FAQ.
export async function QrWeddingStructuredData({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(getQrWeddingPath(locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description'),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        faq: t.raw('faq') as FaqEntry[],
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
```

- [ ] **Step 7: Type-check and commit**

Run: `npm run type:check`
Expected: no errors.

```bash
git add lib/structuredData.ts lib/structuredData.test.ts components/occasions/OccasionStructuredData.tsx components/qrWedding/QrWeddingStructuredData.tsx
git commit -m "Share the service JSON-LD between occasion and wedding QR pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Shared keyword hero

`OccasionHero` holds about 40 lines of hero frame (background, grid, h1, headline, lead, note, actions, visual). The QR page needs the same frame with different copy. Extract it, keep `OccasionHero`'s output the same apart from the h1 id (`occasion-hero-title` → `keyword-hero-title`; nothing else references it).

**Files:**
- Create: `components/landing/KeywordHero.tsx`, `components/landing/KeywordHero.test.tsx`
- Modify: `components/occasions/OccasionHero.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/landing/KeywordHero.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KeywordHero } from '@/components/landing/KeywordHero';

describe('KeywordHero', () => {
    afterEach(() => {
        cleanup();
    });

    it('makes the keyword the only h1 and names the section after it', () => {
        render(
            <KeywordHero
                actions={<a href="/events/new">Create</a>}
                h1="Wedding QR code"
                header={<nav>Header</nav>}
                headline={
                    <>
                        One QR code. <strong>Every photo.</strong>
                    </>
                }
                lead="Guests scan and upload."
                note="Included in every plan."
                visual={<div>Phone</div>}
            />,
        );

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('region', { name: 'Wedding QR code' })).toBeInTheDocument();
        expect(screen.getByText('Included in every plan.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/events/new');
        expect(screen.getByText('Phone')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run components/landing/KeywordHero.test.tsx`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Create the component**

Create `components/landing/KeywordHero.tsx` (the markup is moved verbatim from `OccasionHero`):

```tsx
import type { ReactNode } from 'react';
import { preload } from 'react-dom';

// Same file as the hero content's background class, which Tailwind needs written out in full.
const HERO_BACKGROUND = '/landing/hero-background-v75.webp';

type KeywordHeroProps = {
    actions: ReactNode;
    // The page's main search, as its only h1.
    h1: string;
    header: ReactNode;
    headline: ReactNode;
    lead: string;
    // A short line under the lead.
    note: string;
    visual: ReactNode;
};

// The hero of a page written for one search: occasion pages and the wedding QR page.
export function KeywordHero({ actions, h1, header, headline, lead, note, visual }: KeywordHeroProps) {
    preload(HERO_BACKGROUND, { as: 'image', fetchPriority: 'high' });

    return (
        <section aria-labelledby="keyword-hero-title" className="relative isolate overflow-hidden bg-white text-[#151313] min-[761px]:min-h-svh">
            {/* Header */}
            {header}

            {/* Hero content */}
            <div className="relative bg-[url('/landing/hero-background-v75.webp')] bg-cover bg-center pt-6 pb-21.5 min-[421px]:max-[760px]:pt-10.75 min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:py-0">
                <div className="relative mx-auto grid w-[calc(100%-40px)] max-w-305 grid-cols-1 items-center min-[761px]:min-h-[calc(100svh-112px)] min-[761px]:w-[calc(100%-64px)] min-[761px]:grid-cols-2">
                    <div className="relative z-20 self-center min-[761px]:py-2.5">
                        {/* Keyword: the page's h1 */}
                        <h1
                            className="m-0 max-w-135 bg-[linear-gradient(90deg,#d27b9b_0%,#e78274_40%,#f4905f_100%)] bg-clip-text text-[12px] leading-[1.45] font-black tracking-[0.16em] text-transparent uppercase min-[761px]:text-[13px]"
                            id="keyword-hero-title"
                        >
                            {h1}
                        </h1>

                        {/* Title */}
                        <p className="mt-4 mb-0 max-w-142.5 font-[Baskerville,Georgia,serif] text-[clamp(36px,10.5vw,52px)] leading-[.98] font-normal tracking-[-.05em] text-balance min-[761px]:text-[clamp(46px,3.6vw,68px)]">
                            {headline}
                        </p>

                        {/* Summary */}
                        <p className="mt-5 mb-0 max-w-135 text-[clamp(18px,1.35vw,22px)] leading-[1.35] text-balance">{lead}</p>
                        <p className="mt-3 mb-0 max-w-135 text-[clamp(14px,1vw,16px)] leading-snug text-[#151313]/70">{note}</p>

                        {/* Actions */}
                        {actions}
                    </div>

                    {/* Phone and floating posts */}
                    {visual}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/landing/KeywordHero.test.tsx`
Expected: PASS

- [ ] **Step 5: Render `OccasionHero` through it**

Replace `components/occasions/OccasionHero.tsx` with:

```tsx
import { getTranslations } from 'next-intl/server';

import { KeywordHero } from '@/components/landing/KeywordHero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import { type OccasionFeedCopy, OccasionPhoneFeed } from '@/components/occasions/OccasionPhoneFeed';
import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';
import type { OccasionHeroFeed } from '@/lib/occasions/occasionMedia';
import type { Occasion } from '@/lib/occasions/occasions';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';

type OccasionHeroProps = {
    alternatePaths: Record<Locale, string>;
    campaign: OccasionCampaign | null;
    createHref: string;
    // null → no demo for this type; the hero shows the create button only.
    demoHref: string | null;
    feed: OccasionHeroFeed | null;
    locale: Locale;
    occasion: Occasion;
};

export async function OccasionHero({ alternatePaths, campaign, createHref, demoHref, feed, locale, occasion }: OccasionHeroProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    // A campaign may swap the sentence, CTA label and the feed's cover. The H1 always stays the keyword.
    const c = campaign?.hero ? await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` }) : null;
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const links = [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${OCCASION_SECTION_IDS.features}`, label: nav[2]!, mobileLabel: mobileNav[2]! },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: landing('faq.eyebrow'), mobileLabel: landing('faq.eyebrow') },
    ];
    const cover = campaign?.hero?.image ?? feed?.cover;

    return (
        <KeywordHero
            actions={
                <LandingHeroActions
                    demoHref={demoHref ?? undefined}
                    demoLabel={demoHref ? landing('hero.demoCta') : undefined}
                    main={{ href: createHref, arrow: '↗', click: { event: 'create', placement: 'hero' } }}
                    mainLabel={c ? c('cta') : t('cta')}
                />
            }
            h1={t('h1')}
            header={
                <LandingHeader
                    alternatePaths={alternatePaths}
                    homeHref={getPublicLandingPath(locale)}
                    links={links}
                    loginLabel={nav.at(-1)!}
                    mobileLoginLabel={mobileNav.at(-1)!}
                />
            }
            headline={t.rich('headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
            lead={c ? c('lead') : t('lead')}
            note={t('promise')}
            visual={
                feed && cover ? (
                    <OccasionHeroVisual
                        feed={<OccasionPhoneFeed copy={t.raw('feed') as OccasionFeedCopy} media={{ ...feed, cover }} />}
                        posts={[
                            <OccasionPostCard avatar={feed.avatars[1]!} key="left" photo={feed.cards[0]} tilt="left" />,
                            <OccasionPostCard avatar={feed.avatars[2]!} key="right" photo={feed.cards[1]} tilt="right" />,
                        ]}
                    />
                ) : (
                    <OccasionHeroVisual />
                )
            }
        />
    );
}
```

- [ ] **Step 6: Check nothing else used the old id, then type-check**

Run: `git grep -n "occasion-hero-title"`
Expected: no output.

Run: `npm run type:check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/landing/KeywordHero.tsx components/landing/KeywordHero.test.tsx components/occasions/OccasionHero.tsx
git commit -m "Extract the keyword hero from the occasion hero" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The wedding QR page components

**Files:**
- Create: `components/qrWedding/QrWeddingGuideRow.tsx`
- Create: `components/qrWedding/QrWeddingGuide.tsx`, `components/qrWedding/QrWeddingGuide.test.tsx`
- Create: `components/qrWedding/QrWeddingHero.tsx`
- Create: `components/qrWedding/QrWeddingContent.tsx`
- Create: `components/qrWedding/QrWeddingPage.tsx`
- Create: `lib/qrWeddingMetadata.ts`
- Modify: `i18n/publicMessages.test.ts`

- [ ] **Step 1: Write the failing guide test**

Create `components/qrWedding/QrWeddingGuide.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrWeddingGuide } from '@/components/qrWedding/QrWeddingGuide';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => {
        const t = (key: string) => key;
        t.raw = (key: string) => (key === 'where.places' ? ['At the entrance', 'On every table'] : ['"Scan to share!"', '"Share it with us."']);
        return t;
    },
}));

describe('QrWeddingGuide', () => {
    afterEach(() => {
        cleanup();
    });

    it('asks each question as an h2', async () => {
        render(await QrWeddingGuide({ locale: 'en' }));

        expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
            'what.title',
            'where.title',
            'sign.title',
        ]);
    });

    it('lists the places and the sign texts', async () => {
        render(await QrWeddingGuide({ locale: 'en' }));

        expect(screen.getByText('On every table')).toBeInTheDocument();
        expect(screen.getByText('"Share it with us."')).toBeInTheDocument();
        expect(screen.getByText('sign.tip')).toBeInTheDocument();
    });

    it('can be linked to from the header', async () => {
        const { container } = render(await QrWeddingGuide({ locale: 'en' }));

        expect(container.querySelector('section#guide')).not.toBeNull();
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run components/qrWedding/QrWeddingGuide.test.tsx`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Create the guide row and guide**

Create `components/qrWedding/QrWeddingGuideRow.tsx`:

```tsx
import type { ReactNode } from 'react';

// One guide question: the question as an h2, the answer beside it from desktop up.
export function QrWeddingGuideRow({ children, title }: { children: ReactNode; title: string }) {
    return (
        <article className="grid gap-4 border-t border-[#151313]/[0.13] py-9 min-[761px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[761px]:gap-[5vw] min-[761px]:py-12">
            <h2 className="m-0 font-[Baskerville,Georgia,serif] text-[32px] leading-[1.02] font-normal tracking-[-0.04em] text-balance min-[761px]:text-[clamp(34px,3vw,48px)]">
                {title}
            </h2>
            <div className="text-[16px] leading-[1.55] min-[761px]:pt-2 min-[761px]:text-[18px]">{children}</div>
        </article>
    );
}
```

Create `components/qrWedding/QrWeddingGuide.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { QrWeddingGuideRow } from '@/components/qrWedding/QrWeddingGuideRow';
import type { Locale } from '@/i18n/config';
import { QR_WEDDING_GUIDE_ID } from '@/lib/qrWeddingPage';

// The questions people search for, answered in the server HTML.
export async function QrWeddingGuide({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.guide' });
    const places = t.raw('where.places') as string[];
    const signs = t.raw('sign.texts') as string[];

    return (
        <section
            className="bg-white px-5 pt-6 pb-14 text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-10 min-[761px]:pb-20"
            id={QR_WEDDING_GUIDE_ID}
        >
            <div className="mx-auto w-full max-w-295">
                {/* What it is */}
                <QrWeddingGuideRow title={t('what.title')}>
                    <p className="m-0">{t('what.body')}</p>
                </QrWeddingGuideRow>

                {/* Where to put it */}
                <QrWeddingGuideRow title={t('where.title')}>
                    <ul className="m-0 grid list-disc gap-2 pl-5">
                        {places.map((place) => (
                            <li key={place}>{place}</li>
                        ))}
                    </ul>
                </QrWeddingGuideRow>

                {/* What to write on the sign */}
                <QrWeddingGuideRow title={t('sign.title')}>
                    <p className="m-0">{t('sign.intro')}</p>
                    <ul className="mt-4 mb-0 grid list-none gap-3 p-0">
                        {signs.map((sign) => (
                            <li className="rounded-2xl bg-[#f4f0e8] px-5 py-4 font-[Baskerville,Georgia,serif] text-[20px] leading-snug" key={sign}>
                                {sign}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 mb-0 text-[14px] leading-snug text-[#151313]/70">{t('sign.tip')}</p>
                </QrWeddingGuideRow>
            </div>
        </section>
    );
}
```

- [ ] **Step 4: Run the guide test**

Run: `npx vitest run components/qrWedding/QrWeddingGuide.test.tsx`
Expected: PASS

- [ ] **Step 5: Create the hero**

Create `components/qrWedding/QrWeddingHero.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';

import { KeywordHero } from '@/components/landing/KeywordHero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { OccasionHeroVisual } from '@/components/occasions/OccasionHeroVisual';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, QR_WEDDING_PATHS } from '@/i18n/publicLocale';
import { OCCASION_SECTION_IDS } from '@/lib/occasions/occasionSections';
import { QR_WEDDING_CREATE_HREF, QR_WEDDING_GUIDE_ID } from '@/lib/qrWeddingPage';

// The only place the page says the QR code is included in every plan.
export async function QrWeddingHero({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const nav = landing.raw('hero.nav') as string[];
    const mobileNav = landing.raw('hero.mobileNav') as string[];
    const links = [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${QR_WEDDING_GUIDE_ID}`, label: t('nav.guide'), mobileLabel: t('nav.guideMobile') },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: landing('faq.eyebrow'), mobileLabel: landing('faq.eyebrow') },
    ];

    return (
        <KeywordHero
            actions={
                <LandingHeroActions
                    main={{ href: QR_WEDDING_CREATE_HREF, arrow: '↗', click: { event: 'create', placement: 'hero' } }}
                    mainLabel={t('hero.cta')}
                />
            }
            h1={t('hero.h1')}
            header={
                <LandingHeader
                    alternatePaths={QR_WEDDING_PATHS}
                    homeHref={getPublicLandingPath(locale)}
                    links={links}
                    loginLabel={nav.at(-1)!}
                    mobileLoginLabel={mobileNav.at(-1)!}
                />
            }
            headline={t.rich('hero.headline', { b: (chunks) => <strong className="font-bold">{chunks}</strong> })}
            lead={t('hero.lead')}
            note={t('hero.included')}
            visual={<OccasionHeroVisual />}
        />
    );
}
```

- [ ] **Step 6: Create the content composition**

Create `components/qrWedding/QrWeddingContent.tsx`:

```tsx
import '@/components/landing/landing.css';

import { getTranslations } from 'next-intl/server';

import { CookieConsent } from '@/components/consent/CookieConsent';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta, type LandingFinalCtaCopy } from '@/components/landing/LandingFinalCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { OccasionPageShell } from '@/components/occasions/OccasionPageShell';
import { QrWeddingGuide } from '@/components/qrWedding/QrWeddingGuide';
import { QrWeddingHero } from '@/components/qrWedding/QrWeddingHero';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { occasionMedia } from '@/lib/occasions/occasionMedia';
import { QR_WEDDING_CREATE_HREF } from '@/lib/qrWeddingPage';
import type { FaqEntry } from '@/lib/structuredData';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

type HowItWorksStep = { title: string; body: string };

// The landing's sections around the guide, with the wedding plans and the wedding photo.
export async function QrWeddingContent({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage' });
    const howItWorksHeading = t.raw('howItWorksHeading') as string[];
    const finalCta = { ...(t.raw('finalCta') as Omit<LandingFinalCtaCopy, 'cta'>), cta: t('hero.cta') };

    return (
        // The footer's motion toggle reads LandingMotionProvider.
        <LandingMotionProvider>
            <OccasionPageShell theme={null}>
                {/* Hero */}
                <QrWeddingHero locale={locale} />

                <div className="landing-page">
                    {/* How it works */}
                    <LandingHowItWorks
                        copy={{
                            headingStart: howItWorksHeading[0]!,
                            headingEnd: howItWorksHeading[1]!,
                            steps: (t.raw('howItWorks') as HowItWorksStep[]).map((step) => ({ title: step.title, description: step.body })),
                        }}
                    />

                    {/* Guide */}
                    <QrWeddingGuide locale={locale} />
                </div>

                {/* Plans for weddings */}
                <LandingPricing eventType="WEDDING" heading={t('pricingHeading')} />

                <div className="landing-page">
                    {/* FAQ */}
                    <LandingFaq
                        copy={{
                            heading: landing('faq.heading'),
                            intro: t('faqIntro'),
                            items: (t.raw('faq') as FaqEntry[]).map((item) => [item.q, item.a]),
                        }}
                    />

                    {/* Final call to action */}
                    <LandingFinalCta copy={finalCta} href={QR_WEDDING_CREATE_HREF} image={occasionMedia('WEDDING')?.finalImage} />

                    {/* Footer */}
                    <LandingFooter anchorBase={getPublicLandingPath(locale)} />
                </div>
            </OccasionPageShell>

            {/* Cookie consent */}
            <CookieConsent />
        </LandingMotionProvider>
    );
}
```

- [ ] **Step 7: Create the server entry**

Create `components/qrWedding/QrWeddingPage.tsx`:

```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { QrWeddingContent } from '@/components/qrWedding/QrWeddingContent';
import { QrWeddingStructuredData } from '@/components/qrWedding/QrWeddingStructuredData';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { makeQueryClient } from '@/lib/queryClient';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';

export async function QrWeddingPage({ locale }: { locale: Locale }) {
    const queryClient = makeQueryClient();
    let config: AppConfigResponseDto | null = null;

    try {
        config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort: the page still renders and useAppConfig() fetches on the client.
    }

    if (!qrWeddingPageLive(config)) notFound();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <QrWeddingStructuredData locale={locale} />
            <QrWeddingContent locale={locale} />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 8: Create the metadata loader**

Create `lib/qrWeddingMetadata.ts`:

```ts
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildQrWeddingMetadata } from '@/lib/seo';

// The site name and image alt come from the landing: the page shares its OG image.
export async function getQrWeddingMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.meta' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildQrWeddingMetadata(locale, {
        title: t('title'),
        description: t('description'),
        keywords: t.raw('keywords') as string[],
        siteName: landing('siteName'),
        imageAlt: landing('imageAlt'),
    });
}
```

- [ ] **Step 9: Cover the page's client islands in the message test**

In `i18n/publicMessages.test.ts`, add `'components/qrWedding/QrWeddingPage.tsx'` to the end of `ENTRY_FILES`.

Run: `npx vitest run i18n/publicMessages.test.ts`
Expected: PASS. The page only adds client islands already used by the landing (`LandingHeader`, `LandingPricing`, `OccasionHeroVisual`, `CookieConsent`). If it fails, add the missing namespace to `PUBLIC_CLIENT_NAMESPACES` in `i18n/publicMessages.ts`.

- [ ] **Step 10: Type-check, lint the new files and commit**

Run: `npm run type:check`
Expected: no errors.

Run: `npx eslint components/qrWedding lib/qrWeddingMetadata.ts`
Expected: no errors (use `--fix` for prop or import order).

```bash
git add components/qrWedding lib/qrWeddingMetadata.ts i18n/publicMessages.test.ts
git commit -m "Build the wedding QR page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Routes and the `/en` redirect

**Files:**
- Create: `app/(landing)/[slug]/qr-code-gamou/page.tsx`
- Create: `app/(landing)/wedding-qr-code/page.tsx`
- Modify: `app/(landing)/[slug]/[occasion]/page.tsx`
- Create: `app/(landing)/[slug]/[occasion]/page.test.ts`

- [ ] **Step 1: Write the failing redirect test**

Create `app/(landing)/[slug]/[occasion]/page.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/occasions/OccasionPage', () => ({ OccasionPage: () => null }));
vi.mock('@/lib/occasionMetadata', () => ({ getOccasionMetadata: vi.fn() }));

import LocalizedOccasionPage from '@/app/(landing)/[slug]/[occasion]/page';

function open(slug: string, occasion: string) {
    return LocalizedOccasionPage({ params: Promise.resolve({ slug, occasion }) });
}

describe('LocalizedOccasionPage', () => {
    it('sends /en/wedding-qr-code to /wedding-qr-code for good', async () => {
        await expect(open('en', 'wedding-qr-code')).rejects.toMatchObject({ digest: expect.stringContaining(';/wedding-qr-code;308;') });
    });

    it('has no wedding QR page under the Greek locale with the English slug', async () => {
        await expect(open('el', 'wedding-qr-code')).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    });
});
```

- [ ] **Step 2: Run and confirm the first test fails**

Run: `npx vitest run "app/(landing)/[slug]/[occasion]/page.test.ts"`
Expected: the redirect test FAILS (the digest is the 404 one); the 404 test passes.

- [ ] **Step 3: Add the redirect**

In `app/(landing)/[slug]/[occasion]/page.tsx`, add `import { getQrWeddingPath } from '@/i18n/publicLocale';` to the imports (sorted, after `@/i18n/config`), and change the `if (!resolved)` block to:

```tsx
    if (!resolved) {
        // `/en/weddings` → `/weddings`, as `/en` → `/`.
        const english = slug === defaultLocale ? findReadyOccasion(defaultLocale, occasion) : null;
        if (english) permanentRedirect(occasionPath(english, defaultLocale));
        // `/en/wedding-qr-code` → `/wedding-qr-code`.
        const qrWeddingPath = getQrWeddingPath(defaultLocale);
        if (slug === defaultLocale && `/${occasion}` === qrWeddingPath) permanentRedirect(qrWeddingPath);
        notFound();
    }
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "app/(landing)/[slug]/[occasion]/page.test.ts"`
Expected: PASS

- [ ] **Step 5: Create the Greek route**

Create `app/(landing)/[slug]/qr-code-gamou/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { QrWeddingPage } from '@/components/qrWedding/QrWeddingPage';
import { getQrWeddingMetadata } from '@/lib/qrWeddingMetadata';

type PageProps = { params: Promise<{ slug: string }> };

// Only /el/qr-code-gamou exists; /en/qr-code-gamou and any other slug 404.
// The English page lives at /wedding-qr-code. The segment is [slug] because it also
// serves English occasion pages (see ../page.tsx).
export function generateStaticParams() {
    return [{ slug: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    return slug === 'el' ? getQrWeddingMetadata('el') : {};
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    if (slug !== 'el') notFound();
    return <QrWeddingPage locale="el" />;
}
```

- [ ] **Step 6: Create the English route**

Create `app/(landing)/wedding-qr-code/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { QrWeddingPage } from '@/components/qrWedding/QrWeddingPage';
import { getQrWeddingMetadata } from '@/lib/qrWeddingMetadata';

// Public, indexable. The proxy pins this URL to English.
export function generateMetadata(): Promise<Metadata> {
    return getQrWeddingMetadata('en');
}

export default function Page() {
    return <QrWeddingPage locale="en" />;
}
```

- [ ] **Step 7: Type-check and commit**

Run: `npm run type:check`
Expected: no errors.

```bash
git add "app/(landing)/[slug]/qr-code-gamou/page.tsx" "app/(landing)/wedding-qr-code/page.tsx" "app/(landing)/[slug]/[occasion]/page.tsx" "app/(landing)/[slug]/[occasion]/page.test.ts"
git commit -m "Add the wedding QR page routes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Sitemap

**Files:**
- Modify: `app/sitemap.ts`, `app/sitemap.test.ts`

- [ ] **Step 1: Update the tests first**

In `app/sitemap.test.ts`, add `qrWeddingLanguageAlternates` to the `@/lib/seo` import, then:

Replace the first test's expectation with:

```ts
        expect(urls).toEqual([
            SITE_URL,
            `${SITE_URL}/el`,
            `${SITE_URL}/wedding-qr-code`,
            `${SITE_URL}/el/qr-code-gamou`,
            `${SITE_URL}/for-business`,
            `${SITE_URL}/el/epaggelmaties`,
            `${SITE_URL}/weddings`,
            `${SITE_URL}/el/gamos`,
        ]);
```

and rename it to `'lists the landing, wedding QR, partner and every enabled ready occasion page'`.

Replace the production test with:

```ts
    it('lists only the landing and the wedding QR pages on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual([SITE_URL, `${SITE_URL}/el`, `${SITE_URL}/wedding-qr-code`, `${SITE_URL}/el/qr-code-gamou`]);
    });
```

Add these two tests:

```ts
    it('gives the wedding QR pages their language alternates', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }] });
        const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));
        expect(byUrl.get(`${SITE_URL}/wedding-qr-code`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
        expect(byUrl.get(`${SITE_URL}/el/qr-code-gamou`)?.alternates?.languages).toEqual(qrWeddingLanguageAlternates());
    });

    it('leaves out the wedding QR pages while weddings are off', async () => {
        serverPublicConfigGet.mockResolvedValue({ eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: false }] });
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).not.toContain(`${SITE_URL}/wedding-qr-code`);
        expect(urls).not.toContain(`${SITE_URL}/el/qr-code-gamou`);
    });
```

In the last test (`'keeps every ready occasion when the config cannot be read'`), add:

```ts
        expect(urls).toContain(`${SITE_URL}/el/qr-code-gamou`);
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx vitest run app/sitemap.test.ts`
Expected: FAIL, no wedding QR URLs in the sitemap.

- [ ] **Step 3: Add the entries**

In `app/sitemap.ts`, update the imports:

```ts
import { getForBusinessPath, getPublicLandingPath, getQrWeddingPath } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';
import { absoluteUrl, forBusinessLanguageAlternates, landingLanguageAlternates, qrWeddingLanguageAlternates } from '@/lib/seo';
```

Change the top comment to `// Only the public landing, wedding QR, partner and occasion pages are indexable. ...` (rest unchanged), then after the `landing` block add:

```ts
    const qrWeddingLanguages = qrWeddingLanguageAlternates();
    const qrWedding: MetadataRoute.Sitemap = ((await loadQrWeddingPageLive(defaultLocale)) ? locales : []).map((locale) => ({
        url: absoluteUrl(getQrWeddingPath(locale)),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages: qrWeddingLanguages },
    }));
```

and change the return to:

```ts
    return [...landing, ...qrWedding, ...forBusiness, ...occasions];
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run app/sitemap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "List the wedding QR pages in the sitemap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Footer link

**Files:**
- Modify: `components/landing/LandingFooter.tsx`, `components/landing/LandingFooter.guidelines.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `components/landing/LandingFooter.guidelines.test.tsx`, after the existing `vi.mock` calls, add:

```tsx
const qrWeddingLive = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/lib/qrWeddingPage.server', () => ({ loadQrWeddingPageLive: () => qrWeddingLive() }));
```

Add these tests inside the `describe`:

```tsx
    it('links to the wedding QR page in the page language', async () => {
        render(await LandingFooter());

        expect(screen.getByRole('link', { name: 'exploreLinks.qrWedding' })).toHaveAttribute('href', '/el/qr-code-gamou');
    });

    it('leaves out the wedding QR link while weddings are off', async () => {
        qrWeddingLive.mockResolvedValueOnce(false);
        render(await LandingFooter());

        expect(screen.queryByRole('link', { name: 'exploreLinks.qrWedding' })).not.toBeInTheDocument();
    });
```

In the existing test `'leaves out the partner and occasion links on the production site before launch'`, add at the end:

```tsx
        expect(screen.getByRole('link', { name: 'exploreLinks.qrWedding' })).toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx vitest run components/landing/LandingFooter.guidelines.test.tsx`
Expected: FAIL, no `exploreLinks.qrWedding` link.

- [ ] **Step 3: Add the link**

In `components/landing/LandingFooter.tsx`:

- Change the `publicLocale` import to `import { getForBusinessPath, getQrWeddingPath } from '@/i18n/publicLocale';`
- Add `import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';` after the `occasions` imports.
- After `const occasions = await loadLiveOccasions();` add `const showsQrWedding = await loadQrWeddingPageLive();`
- In the Explore column, between the `EXPLORE_LINKS` map and the `showsForBusiness` link, add:

```tsx
                    {showsQrWedding && (
                        <a className={COLUMN_LINK} href={getQrWeddingPath(locale)}>
                            {t('exploreLinks.qrWedding')}
                        </a>
                    )}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/landing/LandingFooter.guidelines.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/landing/LandingFooter.tsx components/landing/LandingFooter.guidelines.test.tsx
git commit -m "Link the wedding QR page from the footer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Landing fixes (title, FAQ schema, Greek alt text)

**Files:**
- Modify: `components/landing/LandingStructuredData.tsx`
- Create: `components/landing/LandingStructuredData.test.tsx`
- Modify: `messages/el.json`, `messages/en.json`

- [ ] **Step 1: Write the failing test**

Create `components/landing/LandingStructuredData.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LandingStructuredData } from '@/components/landing/LandingStructuredData';

vi.mock('next-intl/server', () => ({
    getLocale: async () => 'el',
    getTranslations: async ({ namespace }: { namespace: string }) => {
        const t = (key: string) => `${namespace}.${key}`;
        t.raw = (key: string) => (namespace === 'LandingPage.faq' && key === 'items' ? [['Q1', 'A1']] : null);
        return t;
    },
}));

describe('LandingStructuredData', () => {
    it('lists the landing FAQ as an FAQPage', async () => {
        const { container } = render(await LandingStructuredData());
        const graph = JSON.parse(container.querySelector('script')!.textContent!)['@graph'] as unknown[];

        expect(graph).toContainEqual({
            '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
        });
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run components/landing/LandingStructuredData.test.tsx`
Expected: FAIL, the graph has no `FAQPage`.

- [ ] **Step 3: Add the FAQ to the landing graph**

In `components/landing/LandingStructuredData.tsx`:

- Add `import { faqPageNode } from '@/lib/structuredData';` after the `@/lib/seo` import.
- Update the comment above the function to: `// Only facts that stay true without maintenance: name, URL, logo, social profiles, description, category and the FAQ. Pricing is indicative and comes from config, so no offers.`
- After `const url = ...`, add:

```tsx
    const faq = await getTranslations({ locale, namespace: 'LandingPage.faq' });
    const faqItems = (faq.raw('items') as [string, string][]).map(([q, a]) => ({ q, a }));
```

- Add `faqPageNode(faqItems),` as the last entry of the `'@graph'` array.

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/landing/LandingStructuredData.test.tsx`
Expected: PASS

- [ ] **Step 5: Update the landing titles and Greek alt texts**

In `messages/el.json` under `LandingPage`:

- `meta.title` → `"Φωτογραφίες καλεσμένων με QR, χωρίς app | StoryWall"`
- `meta.description` → `"Οι καλεσμένοι σκανάρουν ένα QR και ανεβάζουν φωτογραφίες και βίντεο από το κινητό, για γάμο, βάπτιση ή πάρτι. Χωρίς εφαρμογή."`
- `demo.imageAlt` → `"Προεπισκόπηση του StoryWall σε δύο κινητά"`
- `finalCta.imageAlt` → `"Νιόπαντρο ζευγάρι σε γαμήλια γιορτή σε ελληνικό νησί"`

In `messages/en.json` under `LandingPage`:

- `meta.title` → `"Guest photos with a QR code, no app | StoryWall"`
- `meta.description` → `"Guests scan a QR code and upload photos and videos from their phone, for weddings, baptisms and parties. No app needed."`

- [ ] **Step 6: Run the message and SEO tests**

Run: `npx vitest run components/qrWedding/qrWeddingCopy.test.ts lib/seo.test.ts lib/occasions/occasionCopy.test.ts`
Expected: PASS (the QR title still differs from the new landing title).

- [ ] **Step 7: Commit**

```bash
git add components/landing/LandingStructuredData.tsx components/landing/LandingStructuredData.test.tsx messages/el.json messages/en.json
git commit -m "Add QR to the landing title and the landing FAQ to its structured data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Verify, check SEO rules and clean up

**Files:** none changed unless a check fails.

- [ ] **Step 1: Full checks**

Run: `npm run type:check`
Run: `npm run lint`
Run: `npm test`
Expected: all clean. Fix anything that fails before going on, then commit the fix.

- [ ] **Step 2: Start the dev server**

If it is not already running on :3101, start it in the background: `npx next dev --webpack -p 3101`. Wait for `Ready` in its output.

- [ ] **Step 3: curl both QR pages**

```bash
for url in http://localhost:3101/el/qr-code-gamou http://localhost:3101/wedding-qr-code; do
  echo "== $url $(curl -s -o /dev/null -w '%{http_code}' "$url")"
  html=$(curl -s "$url")
  echo "h1: $(grep -o '<h1' <<< "$html" | wc -l)"
  grep -o '<link rel="canonical"[^>]*>' <<< "$html"
  grep -o '<link rel="alternate" hrefLang="[^"]*"[^>]*>' <<< "$html"
  echo "noindex: $(grep -c 'noindex' <<< "$html")"
  grep -o '"@type":"FAQPage"' <<< "$html"
  grep -o 'id="pricing"' <<< "$html"
  echo "euro: $(grep -o '€' <<< "$html" | wc -l)"
done
```

Expected for each: `200`, `h1: 1`, a canonical on `https://www.storywall.gr/...` matching the URL (`SITE_URL`), hreflang `en`, `el` and `x-default`, noindex count `0`, `"@type":"FAQPage"`, `id="pricing"`, and a non-zero `€` count.

- [ ] **Step 4: curl the landing and the redirects**

```bash
for url in http://localhost:3101/ http://localhost:3101/el; do
  html=$(curl -s "$url" -H 'accept-language: en')
  echo "== $url"
  grep -o '<title>[^<]*</title>' <<< "$html"
  grep -o '"@type":"FAQPage"' <<< "$html"
  grep -o 'id="pricing"' <<< "$html"
  echo "euro: $(grep -o '€' <<< "$html" | wc -l)"
done
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3101/en/wedding-qr-code
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3101/en/qr-code-gamou
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3101/el/wedding-qr-code
curl -s http://localhost:3101/sitemap.xml | grep -o '<loc>[^<]*qr[^<]*</loc>'
```

Expected: the new titles, `FAQPage`, `id="pricing"` and `€` on both landings; `308 .../wedding-qr-code`; `404`; `404`; both QR URLs in the sitemap.

- [ ] **Step 5: Look at the pages**

Open the browser pane with `preview_start {url: "http://localhost:3101/el/qr-code-gamou"}` (never `preview_start {name}`). Check at 375 px (`resize_window` preset `mobile`) and on desktop (preset `desktop`), then repeat for `/wedding-qr-code` and one occasion page (`/el/gamos`, to confirm the extracted hero looks the same):

- one h1, the hero line "περιλαμβάνεται σε κάθε πακέτο" under the lead, the create button;
- how it works, the guide's three questions with clear separation, sign texts readable;
- the wedding plan cards with prices, the FAQ, the final call to action with the Santorini photo, the footer's "QR γάμου" link;
- the language switcher swaps between the two QR URLs;
- no horizontal scroll at 375 px.

Read the console (`read_console_messages`, `onlyErrors: true`) on a fresh load: there must be no hydration warning. Reset the viewport with preset `desktop` when done.

- [ ] **Step 6: SEO guidelines check**

Go through [docs/seo-guidelines.md](../../seo-guidelines.md) for both new routes and the landing. Every BLOCKER for indexable pages must hold: server-rendered content, one h1, unique localized title and description, canonical via `absoluteUrl`, hreflang with x-default, sitemap entry equal to the canonical, not noindexed or blocked. List anything that breaks as a **BLOCKER** in the hand-back and the PR description.

- [ ] **Step 7: Clean up**

Stop the dev server. Run `git checkout AGENTS.md` if `next dev` changed it. `git status` must show a clean tree (no `.env.local`, no `node_modules` junction staged).

---

## Launch checklist (owner)

- In admin, turn on QR upload for every wedding plan, START included. Then confirm in `/api/config` that every wedding plan includes it, before merging to `main`.
- The owner reviews the Greek and English copy in `messages/*.json` before merge.
- After deploy: `curl` the production URLs, request indexing for both in Search Console, check the sitemap lists them.
