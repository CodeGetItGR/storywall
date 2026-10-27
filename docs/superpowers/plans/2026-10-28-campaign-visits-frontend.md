# Campaign Visits (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing pages report campaign arrivals and Create / Plans / plan clicks to Spring without cookies. The admin console shows them in a new Campaign overview section, in new Campaigns table columns and in each link's drawer.

**Architecture:** `lib/campaignVisits.ts` reads the utm values from the page URL, keeps "this visit's campaign" in module memory and sends `fetch(..., { keepalive: true })` to Spring. A small tracker mounted in `PublicProviders` sends the visit, and `trackLandingClick` sends the clicks. Admin reads `GET /api/admin/metrics/campaigns` (new columns) and `GET /api/admin/metrics/campaigns/overview` through React Query hooks that share `adminCampaignKeys`, so link writes refresh both.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, next-intl, Recharts (through `VisitorsDaily`), Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-28-campaign-visits-design.md`. **Backend plan:** `docs/superpowers/plans/2026-10-28-campaign-visits-backend.md`. Merge the backend first; until it's deployed, the browser's requests get a 404, which is swallowed.

**Repo:** this storywall worktree, branch `claude/campaigns-analytics-tracking-6c6605` (already on `origin/staging`, holding the spec and plans). PR into `staging`.

**Commands:** `npx vitest run <path>` for one test file; `npm run type:check`; `npm run lint`.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/campaignVisits.ts` | Read a campaign from a URL, remember it, page language, send visits/clicks |
| `hooks/useCampaignVisitTracking.ts` | Send the visit on each landing page load |
| `components/layout/CampaignVisitTracker.tsx` | Mounts the hook (render-nothing component) |
| `providers/PublicProviders.tsx` | Mounts the tracker |
| `lib/landingTracking.ts` | Clicks also go to `sendCampaignClick` |
| `lib/api/types.ts`, `lib/api/endpoints.ts` | New fields, DTO and endpoints |
| `hooks/useAdminCampaigns.ts` | `adminCampaignKeys.overview` + `useAdminCampaignOverview` |
| `lib/adminCampaignOverview.ts` | Funnel tile values and shares |
| `hooks/useCampaignOverview.ts` | Overview section: range + query + plain values |
| `components/admin/campaigns/overview/CampaignFunnelTiles.tsx` | The tile grid |
| `components/admin/campaigns/overview/CampaignSplits.tsx` | Language and device |
| `components/admin/campaigns/overview/CampaignOverviewContent.tsx` | Tiles + chart + splits (shared by panel and drawer) |
| `components/admin/campaigns/overview/CampaignOverviewPanel.tsx` | The new admin section |
| `components/admin/campaigns/CampaignLinkStats.tsx` | One link's overview inside the drawer |
| `components/admin/campaigns/CampaignsTable.tsx`, `CampaignLinkDrawer.tsx`, `CampaignsPanel.tsx` | Columns, stats block, range passed down |
| `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx` | New sidebar item |
| `messages/en.json`, `messages/el.json` | Copy |

---

### Task 0: Worktree setup

- [ ] **Step 1: Link `node_modules`**

The worktree has no `node_modules`. Compare the lockfiles with the main checkout's branch:

Run: `git -C C:/Users/User/WebstormProjects/storywall rev-parse --abbrev-ref HEAD`, then `git diff --stat HEAD <that branch> -- package.json package-lock.json`.
- If nothing differs, link it (PowerShell): `New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules`
- If something differs, stop and ask the user before installing.

- [ ] **Step 2: Check the baseline**

Run: `npx vitest run hooks/useLandingClickTracking.test.ts components/admin/visitors/VisitorsPanel.test.tsx`
Expected: PASS.

---

### Task 1: Types and endpoints

**Files:**
- Modify: `lib/api/types.ts` (next to `CampaignRowDto`, around line 2352)
- Modify: `lib/api/endpoints.ts`

- [ ] **Step 1: Add the fields and the overview DTO**

Replace `CampaignRowDto` with this, and add the new types right after it:

```ts
export interface CampaignRowDto {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    link: CampaignLinkDto | null;
    visits: number;
    visitors: number;
    createClicks: number;
    plansClicks: number;
    planPicks: number;
    signedUp: number;
    createdEvent: number;
    paidHost: number;
    revenueMinorByCurrency: Record<string, number>;
}

// GET /api/admin/metrics/campaigns/overview. Every saved link (or one with ?link=) over a range.
// daily lists every Athens day in the range, zeros included; empty when there's no visit at all.
export interface CampaignOverviewDto {
    visits: number;
    visitors: number;
    createClicks: number;
    plansClicks: number;
    planPicks: number;
    signedUp: number;
    paidHost: number;
    revenueMinorByCurrency: Record<string, number>;
    daily: { date: string; visits: number; visitors: number }[];
    devices: { device: VisitorDevice; visits: number }[];
    languages: { language: VisitorLanguage; visits: number }[];
}

// POST /api/public/campaign-visits. Spring always answers 204.
export type CampaignVisitKind = 'VISIT' | 'CREATE' | 'PLANS' | 'PLAN';

export interface CampaignVisitRequestDto {
    kind: CampaignVisitKind;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    language: VisitorLanguage;
}
```

`VisitorDevice` and `VisitorLanguage` are declared just below in the same file. TypeScript allows using them before their declaration.

- [ ] **Step 2: Add the endpoints**

In `lib/api/endpoints.ts`, after `contentNotices`:

```ts
    // Straight from the browser to Spring: no cookie, always 204.
    campaignVisits: { record: '/api/public/campaign-visits' },
```

In `admin.metrics`, after `campaigns`:

```ts
            campaignOverview: (since?: string | null, until?: string | null, linkId?: string | null) => {
                const params = [
                    since ? `since=${encodeURIComponent(since)}` : null,
                    until ? `until=${encodeURIComponent(until)}` : null,
                    linkId ? `link=${encodeURIComponent(linkId)}` : null,
                ].filter(Boolean);
                return `/api/admin/metrics/campaigns/overview${params.length ? `?${params.join('&')}` : ''}`;
            },
```

- [ ] **Step 3: Type-check**

Run: `npm run type:check`
Expected: no errors. Fixtures that build a `CampaignRowDto` would now miss fields: `git grep -n "signedUp:" -- '*.test.ts*' '__fixtures__'`. Add `visits: 0, visitors: 0, createClicks: 0, plansClicks: 0, planPicks: 0` to any that turn up.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts
git commit -m "feat(campaign-visits): add the campaign visit types and endpoints"
```

---

### Task 2: `lib/campaignVisits.ts`

**Files:**
- Create: `lib/campaignVisits.ts`
- Test: `lib/campaignVisits.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    campaignFromUrl,
    currentCampaign,
    pageLanguage,
    rememberCampaign,
    sendCampaignClick,
    sendCampaignVisit,
} from '@/lib/campaignVisits';

const CAMPAIGN = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'spring' };

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 })));

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    rememberCampaign(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function sentBody(call = 0) {
    const init = fetchMock.mock.calls[call][1] as RequestInit;
    return JSON.parse(String(init.body));
}

describe('campaignFromUrl', () => {
    it('needs all three utm values', () => {
        expect(campaignFromUrl('https://storywall.gr/el?utm_source=instagram&utm_medium=social&utm_campaign=spring')).toEqual(CAMPAIGN);
        expect(campaignFromUrl('https://storywall.gr/?utm_source=instagram&utm_medium=social')).toBeNull();
        expect(campaignFromUrl('https://storywall.gr/')).toBeNull();
    });

    it('trims and caps each value', () => {
        const long = 'x'.repeat(120);
        expect(campaignFromUrl(`https://storywall.gr/?utm_source=%20instagram%20&utm_medium=social&utm_campaign=${long}`)).toEqual({
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: 'x'.repeat(100),
        });
        expect(campaignFromUrl('https://storywall.gr/?utm_source=%20&utm_medium=social&utm_campaign=spring')).toBeNull();
    });
});

describe('pageLanguage', () => {
    it('is the locale segment, or English', () => {
        expect(pageLanguage('/el')).toBe('el');
        expect(pageLanguage('/el/gamos')).toBe('el');
        expect(pageLanguage('/')).toBe('en');
        expect(pageLanguage('/weddings')).toBe('en');
    });
});

describe('sending', () => {
    it('posts a visit straight to Spring without credentials', () => {
        sendCampaignVisit('VISIT', CAMPAIGN, 'el');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/\/api\/public\/campaign-visits$/);
        expect(init).toMatchObject({ method: 'POST', keepalive: true, credentials: 'omit' });
        expect(sentBody()).toEqual({ kind: 'VISIT', ...CAMPAIGN, language: 'el' });
    });

    it('swallows a failed request', async () => {
        fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('offline')));
        expect(() => sendCampaignVisit('VISIT', CAMPAIGN, 'en')).not.toThrow();
        await Promise.resolve();
    });

    it('sends a click only for a visit that came from a campaign', () => {
        window.history.replaceState(null, '', '/el');
        sendCampaignClick('CREATE');
        expect(fetchMock).not.toHaveBeenCalled();

        rememberCampaign(CAMPAIGN);
        expect(currentCampaign()).toEqual(CAMPAIGN);
        sendCampaignClick('CREATE');
        expect(sentBody()).toEqual({ kind: 'CREATE', ...CAMPAIGN, language: 'el' });
    });
});
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `npx vitest run lib/campaignVisits.test.ts`
Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Write the implementation**

```ts
import { defaultLocale, locales } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import type { CampaignVisitKind, CampaignVisitRequestDto, VisitorLanguage } from '@/lib/api/types';

// Campaign visits for Spring's own counter (no cookie, nothing stored on the device). Each arrival
// counts for the link in its own URL, apart from the sign-up source's "first visit wins" rule.

export type Campaign = Pick<CampaignVisitRequestDto, 'utmSource' | 'utmMedium' | 'utmCampaign'>;

// The cap matches Spring's CampaignVisitRules and lib/signupSource.ts.
const UTM_MAX = 100;

// This visit's campaign, for the clicks that follow. Module memory: gone on the next full page load.
let visitCampaign: Campaign | null = null;

function utmValue(params: URLSearchParams, name: string): string | null {
    return params.get(name)?.trim().slice(0, UTM_MAX) || null;
}

// The campaign a URL carries: all three utm values (saved links always have them), or null.
export function campaignFromUrl(href: string): Campaign | null {
    const params = new URL(href).searchParams;
    const utmSource = utmValue(params, 'utm_source');
    const utmMedium = utmValue(params, 'utm_medium');
    const utmCampaign = utmValue(params, 'utm_campaign');
    return utmSource && utmMedium && utmCampaign ? { utmSource, utmMedium, utmCampaign } : null;
}

export function rememberCampaign(campaign: Campaign | null) {
    visitCampaign = campaign;
}

export function currentCampaign(): Campaign | null {
    return visitCampaign;
}

// The landing page's language: its locale segment (/el/...), otherwise the default.
export function pageLanguage(pathname: string): VisitorLanguage {
    const segment = pathname.split('/')[1];
    return (locales as readonly string[]).includes(segment) ? (segment as VisitorLanguage) : defaultLocale;
}

// Best effort: keepalive lets a click that leaves the page still arrive; a failure is ignored.
export function sendCampaignVisit(kind: CampaignVisitKind, campaign: Campaign, language: VisitorLanguage) {
    const body: CampaignVisitRequestDto = { kind, ...campaign, language };
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${endpoints.campaignVisits.record}`, {
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => undefined);
}

// A landing page click, counted for the campaign this visit arrived from.
export function sendCampaignClick(kind: Exclude<CampaignVisitKind, 'VISIT'>) {
    const campaign = currentCampaign();
    if (campaign) sendCampaignVisit(kind, campaign, pageLanguage(window.location.pathname));
}
```

If `defaultLocale`'s type (`Locale`) isn't assignable to `VisitorLanguage`, both are `'en' | 'el'`, so cast with `defaultLocale as VisitorLanguage`.

- [ ] **Step 4: Run the test and check that it passes**

Run: `npx vitest run lib/campaignVisits.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/campaignVisits.ts lib/campaignVisits.test.ts
git commit -m "feat(campaign-visits): read and send campaign visits"
```

---

### Task 3: Send the visit on landing page loads

**Files:**
- Create: `hooks/useCampaignVisitTracking.ts`
- Create: `components/layout/CampaignVisitTracker.tsx`
- Modify: `providers/PublicProviders.tsx`
- Test: `hooks/useCampaignVisitTracking.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignVisitTracking } from '@/hooks/useCampaignVisitTracking';
import { currentCampaign, rememberCampaign } from '@/lib/campaignVisits';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 204 })));

function visit(path: string) {
    window.history.replaceState(null, '', path);
    navigation.pathname = new URL(path, window.location.origin).pathname;
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    rememberCampaign(null);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useCampaignVisitTracking', () => {
    it('sends one visit for a landing page reached from a campaign link and remembers it', () => {
        visit('/el?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({
            kind: 'VISIT',
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: 'spring',
            language: 'el',
        });
        expect(currentCampaign()?.utmCampaign).toBe('spring');
    });

    it('sends nothing without a campaign', () => {
        visit('/el');
        renderHook(() => useCampaignVisitTracking());
        expect(fetchMock).not.toHaveBeenCalled();
        expect(currentCampaign()).toBeNull();
    });

    it('sends nothing outside the landing pages', () => {
        visit('/register?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the campaign across an in-site navigation without utm values', () => {
        visit('/?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        const { rerender } = renderHook(() => useCampaignVisitTracking());
        visit('/weddings');
        rerender();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(currentCampaign()?.utmCampaign).toBe('spring');
    });

    it('writes no cookie and nothing to storage', () => {
        visit('/?utm_source=instagram&utm_medium=social&utm_campaign=spring');
        renderHook(() => useCampaignVisitTracking());
        expect(document.cookie).toBe('');
        expect(window.localStorage.length).toBe(0);
        expect(window.sessionStorage.length).toBe(0);
    });
});
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `npx vitest run hooks/useCampaignVisitTracking.test.tsx`
Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Write the hook, the tracker and the mount**

`hooks/useCampaignVisitTracking.ts`:

```ts
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

import { campaignFromUrl, pageLanguage, rememberCampaign, sendCampaignVisit } from '@/lib/campaignVisits';
import { isLandingPath } from '@/lib/signupSource';

// Counts an arrival from a campaign link on a landing page. A page without utm values keeps the
// campaign it already has, so later clicks still count for it. Spring ignores repeats in 30 minutes.
export function useCampaignVisitTracking() {
    const pathname = usePathname();

    const capture = useEffectEvent(() => {
        if (!isLandingPath(pathname)) return;
        const campaign = campaignFromUrl(window.location.href);
        if (!campaign) return;
        rememberCampaign(campaign);
        sendCampaignVisit('VISIT', campaign, pageLanguage(pathname));
    });

    useEffect(() => {
        capture();
    }, [pathname]);
}
```

`components/layout/CampaignVisitTracker.tsx`, matching `SignupSourceTracker.tsx` (open that file and copy its exact shape, comment style included). The expected content:

```tsx
'use client';

import { useCampaignVisitTracking } from '@/hooks/useCampaignVisitTracking';

export function CampaignVisitTracker() {
    useCampaignVisitTracking();
    return null;
}
```

`providers/PublicProviders.tsx`: import it and render `<CampaignVisitTracker />` right after `<SignupSourceTracker />`.

If `providers/PublicProviders.test.tsx` exists, mock the tracker there the way `AppProviders.test.tsx` mocks `SignupSourceTracker`:

```ts
vi.mock('@/components/layout/CampaignVisitTracker', () => ({ CampaignVisitTracker: () => null }));
```

- [ ] **Step 4: Run the tests and check that they pass**

Run: `npx vitest run hooks/useCampaignVisitTracking.test.tsx providers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useCampaignVisitTracking.ts hooks/useCampaignVisitTracking.test.tsx components/layout/CampaignVisitTracker.tsx providers/PublicProviders.tsx
git commit -m "feat(campaign-visits): send a visit on landing pages reached from a campaign"
```

---

### Task 4: Report Create / Plans / plan clicks

**Files:**
- Modify: `lib/landingTracking.ts` (`trackLandingClick`, around line 86)
- Test: `hooks/useLandingClickTracking.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `hooks/useLandingClickTracking.test.ts`. Put the mock at the top with the other mocks:

```ts
const { sendCampaignClick } = vi.hoisted(() => ({ sendCampaignClick: vi.fn() }));
vi.mock('@/lib/campaignVisits', () => ({ sendCampaignClick }));
```

Add `sendCampaignClick.mockClear();` to the existing `beforeEach`. Then add:

```ts
describe('campaign clicks', () => {
    it('reports create and plan clicks, and nothing for other clicks', () => {
        mountLanding();
        click('create');
        click('plan');
        click('nav');
        click('plain');

        expect(sendCampaignClick.mock.calls).toEqual([['CREATE'], ['PLAN']]);
    });
});
```

The markup in `mountLanding` has no `plans` link. Add one next to `#create`:

```ts
            <a href="#pricing" id="plans" ${attributes(landingClickAttributes({ event: 'plans', placement: 'hero' }))}>See plans</a>
```

and extend the test:

```ts
    it('reports the See plans button', () => {
        mountLanding();
        click('plans');
        expect(sendCampaignClick).toHaveBeenCalledWith('PLANS');
    });
```

Check that the new link doesn't break an existing assertion that counts `track` calls. If one does, update its count.

- [ ] **Step 2: Run the test and check that it fails**

Run: `npx vitest run hooks/useLandingClickTracking.test.ts`
Expected: the new tests FAIL, because `sendCampaignClick` is never called.

- [ ] **Step 3: Write the implementation**

In `lib/landingTracking.ts`, import `sendCampaignClick` from `@/lib/campaignVisits`. Add the map and extend `trackLandingClick`:

```ts
// The clicks Spring's campaign counter also counts, once per visitor and day.
const CAMPAIGN_CLICKS: Partial<Record<LandingClick['event'], 'CREATE' | 'PLANS' | 'PLAN'>> = {
    create: 'CREATE',
    plans: 'PLANS',
    plan: 'PLAN',
};

export function trackLandingClick(click: LandingClick) {
    const { event, ...properties } = click;
    sendLandingEvent(CLICK_EVENT_NAMES[event], properties);
    const campaignClick = CAMPAIGN_CLICKS[event];
    if (campaignClick) sendCampaignClick(campaignClick);
}
```

Update the file's top comment to: "Landing page clicks and scroll depth, sent as Vercel Web Analytics custom events and mirrored to Google Analytics (only with the visitor's Analytics consent). Create, Plans and plan clicks also go to the campaign counter (lib/campaignVisits.ts). Vercel's Pro plan keeps at most two properties per event, so no event here carries more."

- [ ] **Step 4: Run the tests and check that they pass**

Run: `npx vitest run hooks/useLandingClickTracking.test.ts lib/googleAnalyticsEvents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/landingTracking.ts hooks/useLandingClickTracking.test.ts
git commit -m "feat(campaign-visits): count landing page Create and Plans clicks per campaign"
```

---

### Task 5: Admin data: overview query and tile values

**Files:**
- Modify: `hooks/useAdminCampaigns.ts`
- Create: `lib/adminCampaignOverview.ts`
- Create: `hooks/useCampaignOverview.ts`
- Test: `lib/adminCampaignOverview.test.ts`
- Create: `components/admin/campaigns/__fixtures__/campaignOverview.ts`

- [ ] **Step 1: Write the fixture**

`components/admin/campaigns/__fixtures__/campaignOverview.ts`:

```ts
import type { CampaignOverviewDto } from '@/lib/api/types';

export const campaignOverviewFixture: CampaignOverviewDto = {
    visits: 1240,
    visitors: 1000,
    createClicks: 150,
    plansClicks: 60,
    planPicks: 20,
    signedUp: 40,
    paidHost: 10,
    revenueMinorByCurrency: { EUR: 131000 },
    daily: [
        { date: '2027-03-01', visits: 40, visitors: 33 },
        { date: '2027-03-02', visits: 0, visitors: 0 },
    ],
    devices: [
        { device: 'PHONE', visits: 900 },
        { device: 'DESKTOP', visits: 340 },
    ],
    languages: [
        { language: 'el', visits: 1100 },
        { language: 'en', visits: 140 },
    ],
};

export const emptyCampaignOverviewFixture: CampaignOverviewDto = {
    visits: 0,
    visitors: 0,
    createClicks: 0,
    plansClicks: 0,
    planPicks: 0,
    signedUp: 3,
    paidHost: 0,
    revenueMinorByCurrency: {},
    daily: [],
    devices: [],
    languages: [],
};
```

- [ ] **Step 2: Write the failing test**

`lib/adminCampaignOverview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { campaignOverviewFixture, emptyCampaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { campaignFunnelTiles } from '@/lib/adminCampaignOverview';

describe('campaignFunnelTiles', () => {
    it('lists every count in funnel order, with shares of visitors after Visitors', () => {
        expect(campaignFunnelTiles(campaignOverviewFixture)).toEqual([
            { key: 'visits', value: 1240, share: null },
            { key: 'visitors', value: 1000, share: null },
            { key: 'createClicks', value: 150, share: 0.15 },
            { key: 'plansClicks', value: 60, share: 0.06 },
            { key: 'planPicks', value: 20, share: 0.02 },
            { key: 'signedUp', value: 40, share: 0.04 },
            { key: 'paidHost', value: 10, share: 0.01 },
        ]);
    });

    it('has no shares without visitors', () => {
        expect(campaignFunnelTiles(emptyCampaignOverviewFixture).every((tile) => tile.share === null)).toBe(true);
    });
});
```

- [ ] **Step 3: Run the test and check that it fails**

Run: `npx vitest run lib/adminCampaignOverview.test.ts`
Expected: FAIL, because the module isn't found.

- [ ] **Step 4: Write the helper**

`lib/adminCampaignOverview.ts`:

```ts
import { rateOf } from '@/lib/adminFunnel';
import type { CampaignOverviewDto } from '@/lib/api/types';

export type CampaignFunnelKey = 'visits' | 'visitors' | 'createClicks' | 'plansClicks' | 'planPicks' | 'signedUp' | 'paidHost';

export type CampaignFunnelTile = { key: CampaignFunnelKey; value: number; share: number | null };

const FUNNEL_KEYS: readonly CampaignFunnelKey[] = ['visits', 'visitors', 'createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost'];

// Every step after Visitors also shows its share of visitors.
const SHARE_OF_VISITORS = new Set<CampaignFunnelKey>(['createClicks', 'plansClicks', 'planPicks', 'signedUp', 'paidHost']);

export function campaignFunnelTiles(data: CampaignOverviewDto): CampaignFunnelTile[] {
    return FUNNEL_KEYS.map((key) => ({
        key,
        value: data[key],
        share: SHARE_OF_VISITORS.has(key) ? rateOf(data[key], data.visitors) : null,
    }));
}
```

- [ ] **Step 5: Add the query to `hooks/useAdminCampaigns.ts`**

Extend the key factory so `useRefreshCampaigns` (which invalidates `adminCampaignKeys.all`) also refreshes the overview. Add the hook below `useAdminCampaigns`:

```ts
export const adminCampaignKeys = {
    all: ['admin', 'campaigns'] as const,
    report: (since: string | null, until: string | null) => ['admin', 'campaigns', 'report', since, until] as const,
    overview: (since: string | null, until: string | null, linkId: string | null) =>
        ['admin', 'campaigns', 'overview', since, until, linkId] as const,
};
```

```ts
// Every saved link, or one with linkId.
export function useAdminCampaignOverview(
    since: string | null,
    until: string | null,
    linkId: string | null,
    options: { enabled?: boolean } = {},
) {
    return useQuery({
        queryKey: adminCampaignKeys.overview(since, until, linkId),
        queryFn: () => api.get<CampaignOverviewDto>(endpoints.admin.metrics.campaignOverview(since, until, linkId)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}
```

Update the file's top comment to mention the overview: "The admin Campaigns report (/api/admin/metrics/campaigns), its overview (/campaigns/overview) and its saved links (/api/admin/campaign-links). Every link write refetches both, since they list every saved link."

- [ ] **Step 6: Write the section hook**

`hooks/useCampaignOverview.ts`:

```ts
'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAdminCampaignOverview } from '@/hooks/useAdminCampaigns';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { dateTimeFormat } from '@/lib/format';

// The Campaign overview section: its own range, every saved link.
export function useCampaignOverview() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminCampaignOverview(since, until, null, { enabled: isValid });

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const refresh = useCallback(() => void refetch(), [refetch]);

    return {
        range,
        data: isValid ? query.data : undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        updatedAt,
        refresh,
    };
}
```

- [ ] **Step 7: Run the test and type-check**

Run: `npx vitest run lib/adminCampaignOverview.test.ts` and `npm run type:check`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add hooks/useAdminCampaigns.ts hooks/useCampaignOverview.ts lib/adminCampaignOverview.ts lib/adminCampaignOverview.test.ts components/admin/campaigns/__fixtures__/campaignOverview.ts
git commit -m "feat(campaign-visits): add the campaign overview query and tile values"
```

---

### Task 6: Copy

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add and change the English keys**

In `AdminPage.tabs`, add after `"campaigns"`: `"campaignOverview": "Campaign overview"`.

Add a new `AdminPage.campaignOverview` object (next to `AdminPage.campaigns`):

```json
"campaignOverview": {
    "title": "Campaign overview",
    "rangeNote": "Counts visits from saved links and sign-ups in this range.",
    "empty": "No campaign visits in this range.",
    "error": "Couldn't load the campaign overview.",
    "retry": "Try again",
    "tiles": {
        "title": "Funnel",
        "visits": "Visits",
        "visitors": "Visitors",
        "createClicks": "Create clicks",
        "plansClicks": "See plans clicks",
        "planPicks": "Plan picked",
        "signedUp": "Sign-ups",
        "paidHost": "Paid",
        "revenue": "Revenue",
        "share": "{rate} of visitors"
    },
    "splits": {
        "title": "Language and device",
        "language": "Language",
        "device": "Device"
    }
}
```

In `AdminPage.campaigns`:
- change `rangeNote` to `"Counts visits and sign-ups in this range."`;
- change `deleteBody` to `"The link keeps working. Its past numbers and new sign-ups still count, but new visits don't."`;
- add `"statsError": "Couldn't load this link's numbers."`;
- in `columns`, add `"visits": "Visits"`, `"visitors": "Visitors"`, `"createClicks": "Create"`, `"plansClicks": "Plans"`, `"planPicks": "Plan picked"`.

- [ ] **Step 2: Add and change the Greek keys**

Same keys in `messages/el.json`:
- `AdminPage.tabs.campaignOverview`: `"Επισκόπηση καμπανιών"`.
- `AdminPage.campaignOverview`:

```json
"campaignOverview": {
    "title": "Επισκόπηση καμπανιών",
    "rangeNote": "Μετράει επισκέψεις από αποθηκευμένους συνδέσμους και εγγραφές σε αυτό το διάστημα.",
    "empty": "Δεν υπάρχουν επισκέψεις καμπανιών σε αυτό το διάστημα.",
    "error": "Δεν φορτώθηκε η επισκόπηση καμπανιών.",
    "retry": "Δοκιμάστε ξανά",
    "tiles": {
        "title": "Πορεία επισκεπτών",
        "visits": "Επισκέψεις",
        "visitors": "Επισκέπτες",
        "createClicks": "Κλικ στη Δημιουργία",
        "plansClicks": "Κλικ στα Πλάνα",
        "planPicks": "Επιλογή πλάνου",
        "signedUp": "Εγγραφές",
        "paidHost": "Πλήρωσαν",
        "revenue": "Έσοδα",
        "share": "{rate} των επισκεπτών"
    },
    "splits": {
        "title": "Γλώσσα και συσκευή",
        "language": "Γλώσσα",
        "device": "Συσκευή"
    }
}
```

- `AdminPage.campaigns.rangeNote`: `"Μετράει επισκέψεις και εγγραφές σε αυτό το διάστημα."`
- `AdminPage.campaigns.deleteBody`: `"Ο σύνδεσμος συνεχίζει να λειτουργεί. Τα στοιχεία του και οι νέες εγγραφές μετράνε, αλλά οι νέες επισκέψεις όχι."`
- `AdminPage.campaigns.statsError`: `"Δεν φορτώθηκαν τα στοιχεία του συνδέσμου."`
- `AdminPage.campaigns.columns`: `"visits": "Επισκέψεις"`, `"visitors": "Επισκέπτες"`, `"createClicks": "Δημιουργία"`, `"plansClicks": "Πλάνα"`, `"planPicks": "Επιλογή πλάνου"`.

- [ ] **Step 3: Check the JSON and that the keys match**

Run: `node -e "const en=require('./messages/en.json').AdminPage, el=require('./messages/el.json').AdminPage; const keys=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v).map(s=>k+'.'+s):[k]); const a=keys(en.campaignOverview).join(), b=keys(el.campaignOverview).join(); console.log(a===b, keys(en.campaigns.columns).join()===keys(el.campaigns.columns).join())"`
Expected: `true true`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat(campaign-visits): add the campaign overview copy"
```

---

### Task 7: Overview components and the new section

**Files:**
- Create: `components/admin/campaigns/overview/CampaignFunnelTiles.tsx`
- Create: `components/admin/campaigns/overview/CampaignSplits.tsx`
- Create: `components/admin/campaigns/overview/CampaignOverviewContent.tsx`
- Create: `components/admin/campaigns/overview/CampaignOverviewPanel.tsx`
- Modify: `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx`
- Test: `components/admin/campaigns/overview/CampaignOverviewPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignOverviewFixture, emptyCampaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { CampaignOverviewPanel } from '@/components/admin/campaigns/overview/CampaignOverviewPanel';
import messages from '@/messages/en.json';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignOverviewPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CampaignOverviewPanel', () => {
    it('shows the funnel tiles, the daily chart and the splits for every link', async () => {
        apiGet.mockResolvedValue(campaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('Create clicks')).toBeTruthy();
        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/campaigns/overview');
        expect(screen.getByText('1,240')).toBeTruthy();
        expect(screen.getAllByText(/of visitors$/)).toHaveLength(5);
        expect(screen.getByText(messages.AdminPage.visitors.daily.title)).toBeTruthy();
        expect(screen.getByText('Language and device')).toBeTruthy();
        expect(screen.getByText('Greek')).toBeTruthy();
    });

    it('keeps the tiles and says so when there are no visits', async () => {
        apiGet.mockResolvedValue(emptyCampaignOverviewFixture);
        renderPanel();

        expect(await screen.findByText('No campaign visits in this range.')).toBeTruthy();
        expect(screen.getByText('Sign-ups')).toBeTruthy();
        expect(screen.queryByText('Language and device')).toBeNull();
    });

    it('offers a retry after an error', async () => {
        apiGet.mockRejectedValue(new Error('down'));
        renderPanel();

        await waitFor(() => expect(screen.getByText("Couldn't load the campaign overview.")).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run the test and check that it fails**

Run: `npx vitest run components/admin/campaigns/overview/CampaignOverviewPanel.test.tsx`
Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Write the tiles**

`CampaignFunnelTiles.tsx`. It sits inside a container query wrapper, so it fits both the full section and the narrower drawer:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { campaignFunnelTiles } from '@/lib/adminCampaignOverview';
import { EMPTY_VALUE } from '@/lib/adminFunnel';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignFunnelTiles({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview.tiles');
    const format = useFunnelFormat();
    const revenue = Object.entries(data.revenueMinorByCurrency);

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="@container">
                <div className="grid grid-cols-2 gap-4 @xl:grid-cols-4">
                    {campaignFunnelTiles(data).map((tile) => (
                        <PlatformMetricFigure
                            key={tile.key}
                            label={t(tile.key)}
                            value={format.count(tile.value)}
                            hint={tile.share === null ? undefined : t('share', { rate: format.rate(tile.share) })}
                        />
                    ))}
                    {/* Revenue */}
                    <PlatformMetricFigure
                        label={t('revenue')}
                        value={revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
                    />
                </div>
            </div>
        </FunnelGroup>
    );
}
```

If `PlatformMetricFigure` renders `hint` somewhere the test's `/of visitors$/` doesn't match (inside a tooltip, say), open it and adjust the test to how the hint is actually shown. Don't change the component.

- [ ] **Step 4: Write the splits**

`CampaignSplits.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { deviceRows, languageRows } from '@/lib/adminVisitors';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignSplits({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview.splits');
    const v = useTranslations('AdminPage.visitors');

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="grid gap-5 @xl:grid-cols-2">
                {/* Language */}
                <FunnelBreakdown title={t('language')} rows={languageRows(data.languages)} labels={{ el: v('languages.el'), en: v('languages.en') }} />
                {/* Device */}
                <FunnelBreakdown
                    title={t('device')}
                    rows={deviceRows(data.devices)}
                    labels={{ PHONE: v('devices.PHONE'), DESKTOP: v('devices.DESKTOP'), TABLET: v('devices.TABLET') }}
                />
            </div>
        </FunnelGroup>
    );
}
```

- [ ] **Step 5: Write the shared content**

`CampaignOverviewContent.tsx`. The section and the drawer both render this:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CampaignFunnelTiles } from '@/components/admin/campaigns/overview/CampaignFunnelTiles';
import { CampaignSplits } from '@/components/admin/campaigns/overview/CampaignSplits';
import { VisitorsDaily } from '@/components/admin/visitors/VisitorsDaily';
import type { CampaignOverviewDto } from '@/lib/api/types';

export function CampaignOverviewContent({ data }: { data: CampaignOverviewDto }) {
    const t = useTranslations('AdminPage.campaignOverview');

    return (
        <div className="@container space-y-5">
            {/* Funnel */}
            <CampaignFunnelTiles data={data} />

            {data.visits === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <>
                    {/* Visitors over time */}
                    <VisitorsDaily daily={data.daily} />

                    {/* Language and device */}
                    <CampaignSplits data={data} />
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 6: Write the panel**

`CampaignOverviewPanel.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CampaignOverviewContent } from '@/components/admin/campaigns/overview/CampaignOverviewContent';
import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { VisitorsSkeleton } from '@/components/admin/visitors/VisitorsSkeleton';
import { useCampaignOverview } from '@/hooks/useCampaignOverview';

// Every saved link together: the funnel, visitors per day, and language and device.
export function CampaignOverviewPanel() {
    const t = useTranslations('AdminPage.campaignOverview');
    const { range, data, isLoading, isFetching, error, updatedAt, refresh } = useCampaignOverview();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('title')} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range */}
                <FunnelRangeControl range={range} note={t('rangeNote')} />

                {/* States */}
                {isLoading && <VisitorsSkeleton />}
                {Boolean(error) && (
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-status-danger">{t('error')}</p>
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={isFetching}
                            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('retry')}
                        </button>
                    </div>
                )}

                {/* Content */}
                {data && <CampaignOverviewContent data={data} />}
            </div>
        </div>
    );
}
```

- [ ] **Step 7: Add the sidebar item**

`components/admin/AdminNavigationContext.tsx`:
- import `ChartLine` from `lucide-react` (keep the list alphabetical: it goes after `CalendarDays`);
- in `AdminTab`, add `| 'campaignOverview'` right before `| 'campaigns'`;
- in `HASH_TO_TAB`, add `'#campaign-overview': 'campaignOverview',` before `'#campaigns'`;
- in `TAB_TO_HASH`, add `campaignOverview: '#campaign-overview',` before `campaigns`;
- in the `tabs` list, add `{ key: 'campaignOverview', label: t('campaignOverview'), icon: ChartLine },` right before the `campaigns` item.

`components/admin/AdminShellNav.tsx`: in `TAB_GROUP`, add `campaignOverview: 'marketing',` before `campaigns`.

`components/admin/AdminConsole.tsx`: import `CampaignOverviewPanel` and add `if (tab === 'campaignOverview') return <CampaignOverviewPanel />;` before the `campaigns` line.

- [ ] **Step 8: Run the tests and type-check**

Run: `npx vitest run components/admin` and `npm run type:check`
Expected: PASS. If a navigation test lists every tab or hash, add `campaignOverview` / `#campaign-overview` to it.

- [ ] **Step 9: Commit**

```bash
git add components/admin/campaigns/overview components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx
git commit -m "feat(campaign-visits): add the Campaign overview admin section"
```

---

### Task 8: Campaigns table columns and the link drawer's stats

**Files:**
- Modify: `components/admin/campaigns/CampaignsTable.tsx`
- Create: `components/admin/campaigns/CampaignLinkStats.tsx`
- Modify: `components/admin/campaigns/CampaignLinkDrawer.tsx`, `components/admin/campaigns/CampaignsPanel.tsx`
- Test: `components/admin/campaigns/CampaignsTable.test.tsx`, `components/admin/campaigns/CampaignLinkStats.test.tsx`

- [ ] **Step 1: Write the failing tests**

`CampaignsTable.test.tsx`:

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignsTable } from '@/components/admin/campaigns/CampaignsTable';
import type { CampaignRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: CampaignRowDto = {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'spring',
    link: { id: 'l1', name: 'Spring bio', destinationPath: '/', utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'spring', createdAt: '2027-03-01T10:00:00Z' },
    visits: 620,
    visitors: 510,
    createClicks: 88,
    plansClicks: 40,
    planPicks: 12,
    signedUp: 21,
    createdEvent: 9,
    paidHost: 5,
    revenueMinorByCurrency: { EUR: 72000 },
};

afterEach(cleanup);

describe('CampaignsTable', () => {
    it('shows the visit columns before Sign-ups', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <CampaignsTable rows={[ROW]} onLinkAction={vi.fn()} />
            </NextIntlClientProvider>,
        );

        const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
        expect(headers).toEqual(['Name', 'Source / medium', 'Campaign', 'Visits', 'Visitors', 'Create', 'Plans', 'Plan picked', 'Sign-ups', 'Created an event', 'Paid', 'Revenue']);
        const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell').map((cell) => cell.textContent);
        expect(cells.slice(3, 8)).toEqual(['620', '510', '88', '40', '12']);
    });
});
```

`CampaignLinkStats.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignOverviewFixture } from '@/components/admin/campaigns/__fixtures__/campaignOverview';
import { CampaignLinkStats } from '@/components/admin/campaigns/CampaignLinkStats';
import messages from '@/messages/en.json';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CampaignLinkStats', () => {
    it("asks for this link's overview in the table's range", async () => {
        apiGet.mockResolvedValue(campaignOverviewFixture);
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                    <CampaignLinkStats linkId="l1" bounds={{ since: '2027-03-01T00:00:00.000+02:00', until: null, isValid: true }} />
                </NextIntlClientProvider>
            </QueryClientProvider>,
        );

        expect(await screen.findByText('Create clicks')).toBeTruthy();
        expect(apiGet).toHaveBeenCalledWith(
            `/api/admin/metrics/campaigns/overview?since=${encodeURIComponent('2027-03-01T00:00:00.000+02:00')}&link=l1`,
        );
    });
});
```

- [ ] **Step 2: Run the tests and check that they fail**

Run: `npx vitest run components/admin/campaigns/CampaignsTable.test.tsx components/admin/campaigns/CampaignLinkStats.test.tsx`
Expected: FAIL. The table has no Visits header yet, and `CampaignLinkStats` doesn't exist.

- [ ] **Step 3: Add the table columns**

In `CampaignsTable.tsx`, widen the table to `min-w-[1080px]`. Add these headers after the Campaign header:

```tsx
                        <th className="px-3 py-3 text-right font-bold">{t('columns.visits')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.visitors')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.createClicks')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.plansClicks')}</th>
                        <th className="px-3 py-3 text-right font-bold">{t('columns.planPicks')}</th>
```

In the row, replace the `{/* Counts */}` comment and the cells under it with:

```tsx
                                {/* Visits */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.visits)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.visitors)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.createClicks)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.plansClicks)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.planPicks)}</td>
                                {/* Sign-ups */}
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.signedUp)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.createdEvent)}</td>
                                <td className="px-3 py-3 text-right font-mono tabular-nums">{format.count(row.paidHost)}</td>
```

- [ ] **Step 4: Write the stats block**

`components/admin/campaigns/CampaignLinkStats.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CampaignOverviewContent } from '@/components/admin/campaigns/overview/CampaignOverviewContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminCampaignOverview } from '@/hooks/useAdminCampaigns';
import type { FunnelBounds } from '@/lib/adminFunnel';

// One saved link's funnel, visitors per day, and language and device, in the table's range.
export function CampaignLinkStats({ linkId, bounds }: { linkId: string; bounds: FunnelBounds }) {
    const t = useTranslations('AdminPage.campaigns');
    const query = useAdminCampaignOverview(bounds.since, bounds.until, linkId, { enabled: bounds.isValid });

    if (query.isLoading) return <LoadingState className="justify-start py-4" />;
    if (query.error) return <p className="text-sm text-status-danger">{t('statsError')}</p>;
    return query.data ? <CampaignOverviewContent data={query.data} /> : null;
}
```

- [ ] **Step 5: Put it in the drawer and pass the range**

`CampaignLinkDrawer.tsx`:
- add `bounds: FunnelBounds` to the props (`{ open, link, bounds, onCloseAction }`), importing `FunnelBounds` from `@/lib/adminFunnel` and `CampaignLinkStats`;
- replace the opening `<form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">` with:

```tsx
                <div className="space-y-6">
                    {/* Stats */}
                    <CampaignLinkStats linkId={link.id} bounds={bounds} />

                    <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
```

- replace the closing `</form>` (just before `</AdminDrawer>`) with `</form>` followed by `</div>`. Re-indent the form by four spaces so the JSX nesting reads right; `npx prettier --write` on the file does it.

`CampaignsPanel.tsx`: pass `bounds={d.range.bounds}` to `<CampaignLinkDrawer ...>`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run components/admin/campaigns`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/admin/campaigns
git commit -m "feat(campaign-visits): show visits in the campaigns table and each link's drawer"
```

---

### Task 9: Full check, visual check and PR

- [ ] **Step 1: Types, lint and every test**

Run: `npm run type:check`, `npm run lint`, `npm test`
Expected: all clean. Fix every lint error before going on.

- [ ] **Step 2: Look for stale references**

Run: `git grep -n "Counts accounts that signed up in this range\|It only loses its name here" -- messages`
Expected: nothing.

- [ ] **Step 3: Visual check**

Signed-in admin UI needs the local backend (with the backend plan merged locally) and the dev server on port 3000. The local backend only allows CORS from `:3000`. In the worktree, start it with `npx next dev --webpack -p 3000`, because Turbopack rejects the `node_modules` junction. Never use `preview_start {name}`. Open it with `preview_start {url: "http://localhost:3000/"}`. Ask the user for the local admin test login and sign in yourself.
- Create a saved link in Campaigns, then open its URL (with the utm values) in the browser pane, and click Create.
- **Desktop (primary for admin):** Campaign overview shows tiles with shares, the chart, and the splits. The Campaigns table shows the new columns and scrolls sideways inside its card. The drawer shows the stats block above the name.
- **Phone width (375px):** tiles sit two per row, nothing overlaps, and the drawer's stats stack.
- In the network panel, the visit request goes to `NEXT_PUBLIC_API_BASE_URL` + `/api/public/campaign-visits` and returns 204. A reload within 30 minutes adds no visit.

- [ ] **Step 4: SEO check**

No new public routes and no change to any landing page's markup or metadata. Check that against `docs/seo-guidelines.md` and note "No SEO impact" in the PR.

- [ ] **Step 5: Push and open the PR into `staging`**

```bash
git push -u origin claude/campaigns-analytics-tracking-6c6605
gh pr create --base staging --title "Count campaign visits and show a campaign overview" --body "<summary; link the backend PR; note it must deploy first; privacy policy line is an owner action; No SEO impact; end with the Claude Code line>"
```
