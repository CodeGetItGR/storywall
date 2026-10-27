# Admin Visitors Section — Front-end Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Visitors" section to the admin console that shows the Google Analytics numbers from `GET /api/admin/metrics/visitors`, and send real landing page paths to GA.

**Architecture:** A new sidebar item (`#visitors`, Overview group, after Growth) renders `components/admin/visitors/VisitorsPanel.tsx`. Data is fetched on the client (the console picks its section from the URL hash, so there is nothing to prefetch on the server, same as Growth). `useVisitorsDashboard` reuses Growth's `useFunnelRange`; the blocks reuse `FunnelGroup`, `FunnelHeader`, `FunnelRangeControl`, `FunnelBreakdown` and `PlatformMetricFigure`. Pure helpers live in `lib/adminVisitors.ts`.

**Tech Stack:** Next.js App Router, React Query, next-intl, recharts, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-17-admin-visitors-section-design.md`

**Depends on:** the backend plan (`2026-10-17-admin-visitors-backend.md`). The front end can be built and tested against fixtures before the backend ships.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/googleAnalytics.ts` (+ test) | landing pages keep their real path |
| `lib/api/types.ts` | `VisitorMetricsDto` and row types |
| `lib/api/endpoints.ts` | `admin.metrics.visitors(since, until, fresh)` |
| `hooks/useAdmin.ts` | `adminKeys.visitors`, `useAdminVisitors`, `useRefreshAdminVisitors` |
| `lib/adminVisitors.ts` (+ test) | per-100 rate, few-visits rule, breakdown rows |
| `hooks/useVisitorsDashboard.ts` | range, query, refresh, updated time |
| `components/admin/funnel/FunnelWindowTag.tsx` | new window `'visit'` |
| `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx` | the sidebar item and route |
| `components/admin/visitors/VisitorsPanel.tsx` | page composition and states |
| `components/admin/visitors/VisitorsSkeleton.tsx` | loading shapes |
| `components/admin/visitors/VisitorsTotals.tsx` | totals row |
| `components/admin/visitors/VisitorsDaily.tsx` | daily line |
| `components/admin/visitors/VisitorsChannels.tsx` | by-source table |
| `components/admin/visitors/VisitorsCountTable.tsx` | a titled two-column count table, or "No data yet" |
| `components/admin/visitors/VisitorsPages.tsx` | pages, language, device |
| `components/admin/visitors/VisitorsLanding.tsx` | sections, clicks, plans, FAQ |
| `components/admin/visitors/__fixtures__/visitorMetrics.ts` | test data |
| `components/admin/visitors/VisitorsPanel.test.tsx` | panel tests |
| `components/admin/AdminNavigationContext.visitors.test.tsx` | `#visitors` opens the section |
| `messages/en.json`, `messages/el.json` | copy |

---

### Task 1: Branch

- [ ] **Step 1: Branch from the latest staging**

```bash
git fetch origin
git switch -c claude/admin-visitors origin/staging
```

The spec and both plans are on `claude/visitors-section-design`; if that branch is merged first, they are already in staging. If not, they stay on their own branch; this one carries only code.

---

### Task 2: Real landing paths in GA

**Files:**
- Modify: `lib/googleAnalytics.ts`
- Test: `lib/googleAnalytics.test.ts`

- [ ] **Step 1: Write the failing test** — add inside `describe('analyticsPageLocation', …)`:

```ts
    it('keeps the real path of a landing page', () => {
        expect(analyticsPageLocation('https://storywall.gr/el/gamos?utm_source=ig', { slug: 'el', occasion: 'gamos' })).toBe(
            'https://storywall.gr/el/gamos?utm_source=ig',
        );
        expect(analyticsPageLocation('https://storywall.gr/weddings', { slug: 'weddings' })).toBe('https://storywall.gr/weddings');
        expect(analyticsPageLocation('https://storywall.gr/el', { slug: 'el' })).toBe('https://storywall.gr/el');
    });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/googleAnalytics.test.ts`
Expected: FAIL, the landing paths come back as `/[slug]/[occasion]` and `/[slug]`.

- [ ] **Step 3: Use the real path for landing pages** — in `lib/googleAnalytics.ts` add the import and replace the comment and return line of `analyticsPageLocation`:

```ts
import { isLandingPath } from '@/lib/signupSource';
```

```ts
// The page under its route (`/events/[eventId]/checkout/success`), never an id
// or token from the real URL, with only the campaign parameters kept. Landing
// pages keep their real path (`/el/gamos`): their slugs are only locales and
// occasion names, and the admin Visitors section needs to tell them apart.
export function analyticsPageLocation(href: string, params: RouteParams): string {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, name) => {
        if (isCampaignParam(name)) kept.append(name, value);
    });
    const query = kept.toString();
    const path = isLandingPath(url.pathname) ? url.pathname : pageRoute(url.pathname, params);
    return `${url.origin}${path}${query ? `?${query}` : ''}`;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/googleAnalytics.test.ts lib/signupSource.test.ts`
Expected: PASS. (If `lib/signupSource.ts` imports `lib/googleAnalytics.ts`, the import is circular: move `isLandingPath` into `lib/landingPaths.ts`, re-export it from `lib/signupSource.ts`, and import it from there instead.)

- [ ] **Step 5: Commit**

```bash
git add lib/googleAnalytics.ts lib/googleAnalytics.test.ts
git commit -m "Send real landing page paths to Google Analytics"
```

---

### Task 3: Types, endpoint and query hooks

**Files:**
- Modify: `lib/api/types.ts` (after `FunnelChannelRowDto`)
- Modify: `lib/api/endpoints.ts` (after `funnelChannels`)
- Modify: `hooks/useAdmin.ts`

- [ ] **Step 1: Add the types** — after `FunnelChannelRowDto` in `lib/api/types.ts`:

```ts
// GET /api/admin/metrics/visitors. Google Analytics numbers for the public pages over a range.
export type VisitorLanguage = 'el' | 'en';
export type VisitorDevice = 'PHONE' | 'DESKTOP' | 'TABLET';
export type VisitorClickEvent = 'create' | 'plans' | 'demo' | 'login' | 'nav';

export interface VisitorMetricsDto {
    // False when Google Analytics isn't set up on this server; everything else is empty.
    configured: boolean;
    since: string | null;
    until: string | null;
    updatedAt: string | null;
    visitors: number;
    visits: number;
    signups: number;
    daily: { date: string; visitors: number; visits: number }[];
    channels: { channel: SignupChannel; visits: number; signups: number }[];
    // A null page is all the pages outside the top ten.
    pages: { page: string | null; visits: number }[];
    languages: { language: VisitorLanguage; visits: number }[];
    devices: { device: VisitorDevice; visits: number }[];
    landing: {
        sections: { section: string; visitors: number }[];
        clicks: { event: VisitorClickEvent; placement: string; count: number }[];
        plans: { plan: string; count: number }[];
        faq: { question: number; count: number }[];
    };
}
```

- [ ] **Step 2: Add the endpoint** — after `funnelChannels` in `lib/api/endpoints.ts`:

```ts
            visitors: (since?: string | null, until?: string | null, fresh = false) => {
                const params = [
                    since ? `since=${encodeURIComponent(since)}` : null,
                    until ? `until=${encodeURIComponent(until)}` : null,
                    fresh ? 'fresh=true' : null,
                ].filter(Boolean);
                return `/api/admin/metrics/visitors${params.length ? `?${params.join('&')}` : ''}`;
            },
```

- [ ] **Step 3: Add the key and hooks** — in `hooks/useAdmin.ts`, add `VisitorMetricsDto` to the `@/lib/api/types` import, add the key after `funnelChannels` in `adminKeys`:

```ts
    visitors: (since: string | null, until: string | null) => ['admin', 'metrics', 'visitors', since, until] as const,
```

and the hooks after `useAdminFunnelChannels`:

```ts
export function useAdminVisitors(since: string | null, until: string | null, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: adminKeys.visitors(since, until),
        queryFn: () => api.get<VisitorMetricsDto>(endpoints.admin.metrics.visitors(since, until)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}

// Spring caches the GA answer for an hour; Refresh asks GA again and puts the answer in the same key.
export function useRefreshAdminVisitors() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ since, until }: { since: string | null; until: string | null }) =>
            api.get<VisitorMetricsDto>(endpoints.admin.metrics.visitors(since, until, true)),
        onSuccess: (data, { since, until }) => queryClient.setQueryData(adminKeys.visitors(since, until), data),
    });
}
```

- [ ] **Step 4: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add lib/api/types.ts lib/api/endpoints.ts hooks/useAdmin.ts
git commit -m "Add the admin visitors endpoint and query hooks"
```

---

### Task 4: `lib/adminVisitors.ts`

**Files:**
- Create: `lib/adminVisitors.ts`
- Test: `lib/adminVisitors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { deviceRows, FEW_VISITS, formatPer100, isFewVisits, languageRows, sectionRows, signupsPer100Visits } from '@/lib/adminVisitors';

describe('signupsPer100Visits', () => {
    it('is sign-ups per 100 visits, or null without visits', () => {
        expect(signupsPer100Visits(3, 200)).toBe(1.5);
        expect(signupsPer100Visits(3, 0)).toBeNull();
    });
});

describe('formatPer100', () => {
    it('keeps one decimal at most and shows — for no value', () => {
        expect(formatPer100('en', 1.5)).toBe('1.5');
        expect(formatPer100('en', 2)).toBe('2');
        expect(formatPer100('en', null)).toBe('—');
    });
});

describe('isFewVisits', () => {
    it('tags a channel with some visits but fewer than the threshold', () => {
        expect(isFewVisits(FEW_VISITS - 1)).toBe(true);
        expect(isFewVisits(FEW_VISITS)).toBe(false);
        expect(isFewVisits(0)).toBe(false);
    });
});

describe('languageRows and deviceRows', () => {
    it('lists every known key in order with its share of visits', () => {
        expect(languageRows([{ language: 'en', visits: 30 }, { language: 'el', visits: 10 }])).toEqual([
            { key: 'el', value: 10, ratio: 0.25 },
            { key: 'en', value: 30, ratio: 0.75 },
        ]);
        expect(deviceRows([{ device: 'DESKTOP', visits: 5 }])).toEqual([
            { key: 'PHONE', value: 0, ratio: 0 },
            { key: 'DESKTOP', value: 5, ratio: 1 },
            { key: 'TABLET', value: 0, ratio: 0 },
        ]);
    });
});

describe('sectionRows', () => {
    it('keeps the page order and shows each section as a share of all visitors', () => {
        expect(
            sectionRows(
                [
                    { section: 'how_it_works', visitors: 80 },
                    { section: 'pricing', visitors: 20 },
                ],
                100,
            ),
        ).toEqual([
            { key: 'how_it_works', value: 80, ratio: 0.8 },
            { key: 'pricing', value: 20, ratio: 0.2 },
        ]);
        expect(sectionRows([{ section: 'faq', visitors: 0 }], 0)).toEqual([{ key: 'faq', value: 0, ratio: null }]);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/adminVisitors.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write the module**

```ts
import { EMPTY_VALUE, type FunnelBreakdownRow, funnelBreakdown, rateOf } from '@/lib/adminFunnel';
import type { VisitorMetricsDto } from '@/lib/api/types';
import { numberFormat } from '@/lib/format';

// Below this many visits a channel's sign-up rate says little: its row is tagged and shows no rate.
export const FEW_VISITS = 50;

export const VISITOR_LANGUAGES = ['el', 'en'] as const;
export const VISITOR_DEVICES = ['PHONE', 'DESKTOP', 'TABLET'] as const;

export function signupsPer100Visits(signups: number, visits: number): number | null {
    return visits > 0 ? (signups / visits) * 100 : null;
}

export function formatPer100(locale: string, value: number | null): string {
    if (value === null || !Number.isFinite(value)) return EMPTY_VALUE;
    return numberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

// A channel with no visits (Invite, Gift) isn't tagged: its sign-ups never came through GA.
export function isFewVisits(visits: number): boolean {
    return visits > 0 && visits < FEW_VISITS;
}

export function languageRows(languages: VisitorMetricsDto['languages']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(languages.map((row) => [row.language, row.visits])), VISITOR_LANGUAGES);
}

export function deviceRows(devices: VisitorMetricsDto['devices']): FunnelBreakdownRow[] {
    return funnelBreakdown(Object.fromEntries(devices.map((row) => [row.device, row.visits])), VISITOR_DEVICES);
}

// Sections arrive in page order. Each one's share is of all visitors in the range.
export function sectionRows(sections: VisitorMetricsDto['landing']['sections'], visitors: number): FunnelBreakdownRow[] {
    return sections.map((row) => ({ key: row.section, value: row.visitors, ratio: rateOf(row.visitors, visitors) }));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/adminVisitors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/adminVisitors.ts lib/adminVisitors.test.ts
git commit -m "Add the admin visitors helpers"
```

---

### Task 5: Copy, window tag and sidebar item

**Files:**
- Modify: `messages/en.json`, `messages/el.json`
- Modify: `components/admin/funnel/FunnelWindowTag.tsx`
- Modify: `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx`
- Create: `components/admin/visitors/VisitorsPanel.tsx` (a stub, filled in Task 7)
- Test: `components/admin/AdminNavigationContext.visitors.test.tsx`

Edit the JSON files as text (Edit tool), not by re-serialising them, so their formatting stays as it is.

- [ ] **Step 1: Write the failing navigation test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

vi.mock('@/components/admin/AdminConsole', () => ({ AdminConsole: () => <p>console</p> }));

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Visitors tab', () => {
    it('opens from #visitors', () => {
        window.history.replaceState(null, '', '/admin#visitors');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('visitors:Visitors')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/admin/AdminNavigationContext.visitors.test.tsx`
Expected: FAIL, `#visitors` falls back to `metrics`.

- [ ] **Step 3: Add the English copy** — in `messages/en.json`:

After `"funnel": "Growth",` in `AdminPage.tabs`:

```json
            "visitors": "Visitors",
```

Replace `"none": "Ignores the date range"` in `AdminPage.funnel.window` with:

```json
                "none": "Ignores the date range",
                "visit": "By visit date"
```

Before `"signupChannel": {` in `AdminPage` (same indentation):

```json
        "visitors": {
            "title": "Visitors",
            "cookiesNote": "Counts only visitors who allowed analytics cookies.",
            "notConfigured": "Google Analytics isn't connected.",
            "error": "Couldn't load visitor numbers.",
            "retry": "Retry",
            "empty": "No data yet",
            "totals": {
                "title": "Totals",
                "visitors": "Visitors",
                "visits": "Visits",
                "signups": "Sign-ups",
                "per100": "Sign-ups per 100 visits"
            },
            "daily": {
                "title": "Visitors over time",
                "visitors": "Visitors"
            },
            "channels": {
                "title": "By source",
                "channel": "Source",
                "visits": "Visits",
                "signups": "Sign-ups",
                "per100": "Sign-ups per 100 visits",
                "fewVisits": "Few visits"
            },
            "pages": {
                "title": "Pages",
                "page": "Page",
                "visits": "Visits",
                "other": "Other",
                "language": "Language",
                "device": "Device"
            },
            "languages": {
                "el": "Greek",
                "en": "English"
            },
            "devices": {
                "PHONE": "Phone",
                "DESKTOP": "Desktop",
                "TABLET": "Tablet"
            },
            "landing": {
                "title": "Landing page",
                "sections": "How far visitors scroll",
                "clicks": "Button clicks",
                "button": "Button",
                "plans": "Plan clicks",
                "plan": "Plan",
                "count": "Clicks",
                "faq": "FAQ opens",
                "question": "Question",
                "questionNumber": "Question {number}",
                "opens": "Opens",
                "events": {
                    "create": "Create event",
                    "plans": "See plans",
                    "demo": "Try the demo",
                    "login": "Log in",
                    "nav": "Menu link"
                }
            }
        },
```

- [ ] **Step 4: Add the Greek copy** — in `messages/el.json`, the same three places:

After `"funnel": "Ανάπτυξη",`:

```json
            "visitors": "Επισκέπτες",
```

Replace `"none": "Αγνοεί το χρονικό διάστημα"` with:

```json
                "none": "Αγνοεί το χρονικό διάστημα",
                "visit": "Κατά ημερομηνία επίσκεψης"
```

Before `"signupChannel": {`:

```json
        "visitors": {
            "title": "Επισκέπτες",
            "cookiesNote": "Μετρά μόνο όσους επισκέπτες δέχτηκαν τα cookies ανάλυσης.",
            "notConfigured": "Το Google Analytics δεν είναι συνδεδεμένο.",
            "error": "Δεν ήταν δυνατή η φόρτωση των αριθμών επισκεπτών.",
            "retry": "Δοκιμή ξανά",
            "empty": "Δεν υπάρχουν δεδομένα ακόμη",
            "totals": {
                "title": "Σύνολα",
                "visitors": "Επισκέπτες",
                "visits": "Επισκέψεις",
                "signups": "Εγγραφές",
                "per100": "Εγγραφές ανά 100 επισκέψεις"
            },
            "daily": {
                "title": "Επισκέπτες ανά ημέρα",
                "visitors": "Επισκέπτες"
            },
            "channels": {
                "title": "Ανά πηγή",
                "channel": "Πηγή",
                "visits": "Επισκέψεις",
                "signups": "Εγγραφές",
                "per100": "Εγγραφές ανά 100 επισκέψεις",
                "fewVisits": "Λίγες επισκέψεις"
            },
            "pages": {
                "title": "Σελίδες",
                "page": "Σελίδα",
                "visits": "Επισκέψεις",
                "other": "Άλλες",
                "language": "Γλώσσα",
                "device": "Συσκευή"
            },
            "languages": {
                "el": "Ελληνικά",
                "en": "Αγγλικά"
            },
            "devices": {
                "PHONE": "Κινητό",
                "DESKTOP": "Υπολογιστής",
                "TABLET": "Tablet"
            },
            "landing": {
                "title": "Αρχική σελίδα",
                "sections": "Πόσο κάτω φτάνουν οι επισκέπτες",
                "clicks": "Κλικ σε κουμπιά",
                "button": "Κουμπί",
                "plans": "Κλικ σε πακέτα",
                "plan": "Πακέτο",
                "count": "Κλικ",
                "faq": "Ανοίγματα ερωτήσεων",
                "question": "Ερώτηση",
                "questionNumber": "Ερώτηση {number}",
                "opens": "Ανοίγματα",
                "events": {
                    "create": "Δημιουργία εκδήλωσης",
                    "plans": "Δες τα πακέτα",
                    "demo": "Δοκίμασε το demo",
                    "login": "Σύνδεση",
                    "nav": "Σύνδεσμος μενού"
                }
            }
        },
```

Check: `node -e "require('./messages/en.json'); require('./messages/el.json')"` prints nothing (both files parse).

- [ ] **Step 5: Add the window** — in `components/admin/funnel/FunnelWindowTag.tsx`:

```ts
export type FunnelWindow = 'signup' | 'payment' | 'visit' | 'none';
```

- [ ] **Step 6: Add the sidebar item** — in `components/admin/AdminNavigationContext.tsx`:
  - add `Footprints` to the `lucide-react` import (alphabetical order);
  - add `| 'visitors'` after `| 'funnel'` in `AdminTab`;
  - add `'#visitors': 'visitors',` after `'#funnel': 'funnel',` in `HASH_TO_TAB`;
  - add `visitors: '#visitors',` after `funnel: '#funnel',` in `TAB_TO_HASH`;
  - add the tab after Growth:

```ts
            { key: 'visitors', label: t('visitors'), icon: Footprints },
```

In `components/admin/AdminShellNav.tsx`, add `visitors: 'overview',` after `funnel: 'overview',` in `TAB_GROUP`.

- [ ] **Step 7: Route it to a stub panel** — create `components/admin/visitors/VisitorsPanel.tsx`:

```tsx
'use client';

export function VisitorsPanel() {
    return null;
}
```

and in `components/admin/AdminConsole.tsx` import it and add after the Growth line:

```tsx
    if (tab === 'visitors') return <VisitorsPanel />;
```

- [ ] **Step 8: Run the tests and type-check**

Run: `npx vitest run components/admin/AdminNavigationContext.visitors.test.tsx components/admin/AdminNavigationContext.funnel.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add messages/en.json messages/el.json components/admin/funnel/FunnelWindowTag.tsx components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx components/admin/visitors/VisitorsPanel.tsx components/admin/AdminNavigationContext.visitors.test.tsx
git commit -m "Add the Visitors item to the admin sidebar"
```

---

### Task 6: `useVisitorsDashboard`

**Files:**
- Create: `hooks/useVisitorsDashboard.ts`

- [ ] **Step 1: Write the hook** (tested through the panel in Task 7)

```ts
'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAdminVisitors, useRefreshAdminVisitors } from '@/hooks/useAdmin';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { dateTimeFormat } from '@/lib/format';

export function useVisitorsDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const { since, until, isValid } = range.bounds;
    const query = useAdminVisitors(since, until, { enabled: isValid });
    const refreshMutation = useRefreshAdminVisitors();

    const data = isValid ? query.data : undefined;
    // When Spring asked GA, not when this page fetched: a cached answer can be up to an hour old.
    const updatedAt = data?.updatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt)) : null;

    const { mutate } = refreshMutation;
    const refresh = useCallback(() => mutate({ since, until }), [mutate, since, until]);

    return {
        range,
        data,
        isLoading: query.isLoading,
        isFetching: query.isFetching || refreshMutation.isPending,
        error: query.error ?? refreshMutation.error,
        updatedAt,
        refresh,
    };
}
```

- [ ] **Step 2: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add hooks/useVisitorsDashboard.ts
git commit -m "Add the visitors dashboard hook"
```

---

### Task 7: The panel

**Files:**
- Create: `components/admin/visitors/__fixtures__/visitorMetrics.ts`
- Create: `components/admin/visitors/VisitorsPanel.test.tsx`
- Create: `components/admin/visitors/VisitorsSkeleton.tsx`, `VisitorsTotals.tsx`, `VisitorsDaily.tsx`, `VisitorsChannels.tsx`, `VisitorsCountTable.tsx`, `VisitorsPages.tsx`, `VisitorsLanding.tsx`
- Modify: `components/admin/visitors/VisitorsPanel.tsx`

- [ ] **Step 1: Write the fixtures**

```ts
import type { VisitorMetricsDto } from '@/lib/api/types';

export function visitorMetricsFixture(): VisitorMetricsDto {
    return {
        configured: true,
        since: '2026-09-01',
        until: '2026-10-17',
        updatedAt: '2026-10-17T09:30:00Z',
        visitors: 1800,
        visits: 2400,
        signups: 36,
        daily: [
            { date: '2026-10-15', visitors: 40, visits: 52 },
            { date: '2026-10-16', visitors: 55, visits: 70 },
        ],
        channels: [
            { channel: 'SEARCH', visits: 1200, signups: 12 },
            { channel: 'SOCIAL', visits: 30, signups: 2 },
            { channel: 'INVITE', visits: 0, signups: 22 },
        ],
        pages: [
            { page: '/', visits: 1500 },
            { page: '/el/gamos', visits: 600 },
            { page: null, visits: 300 },
        ],
        languages: [
            { language: 'el', visits: 900 },
            { language: 'en', visits: 1500 },
        ],
        devices: [
            { device: 'PHONE', visits: 1800 },
            { device: 'DESKTOP', visits: 500 },
            { device: 'TABLET', visits: 100 },
        ],
        landing: {
            sections: [
                { section: 'how_it_works', visitors: 1440 },
                { section: 'pricing', visitors: 540 },
            ],
            clicks: [{ event: 'create', placement: 'hero', count: 120 }],
            plans: [{ plan: 'PRO', count: 45 }],
            faq: [{ question: 2, count: 17 }],
        },
    };
}

export function emptyVisitorMetricsFixture(): VisitorMetricsDto {
    return {
        ...visitorMetricsFixture(),
        visitors: 0,
        visits: 0,
        signups: 0,
        daily: [],
        channels: [],
        pages: [],
        languages: [
            { language: 'el', visits: 0 },
            { language: 'en', visits: 0 },
        ],
        devices: [
            { device: 'PHONE', visits: 0 },
            { device: 'DESKTOP', visits: 0 },
            { device: 'TABLET', visits: 0 },
        ],
        landing: { sections: [], clicks: [], plans: [], faq: [] },
    };
}

export function notConfiguredVisitorMetricsFixture(): VisitorMetricsDto {
    return { ...emptyVisitorMetricsFixture(), configured: false, since: null, until: null, updatedAt: null, languages: [], devices: [] };
}
```

- [ ] **Step 2: Write the failing panel test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    emptyVisitorMetricsFixture,
    notConfiguredVisitorMetricsFixture,
    visitorMetricsFixture,
} from '@/components/admin/visitors/__fixtures__/visitorMetrics';
import { VisitorsPanel } from '@/components/admin/visitors/VisitorsPanel';
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
                <VisitorsPanel />
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

describe('VisitorsPanel', () => {
    it('renders every block from a full response', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        const { container } = renderPanel();

        expect(await screen.findByText('2,400')).toBeInTheDocument();
        expect(screen.getByText('1,800', { selector: 'p' })).toBeInTheDocument();
        // 36 sign-ups over 2,400 visits.
        expect(screen.getByText('1.5')).toBeInTheDocument();
        for (const title of ['Totals', 'Visitors over time', 'By source', 'Pages', 'Landing page']) {
            expect(screen.getAllByText(title).length).toBeGreaterThan(0);
        }
        expect(screen.getByText('/el/gamos')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
        expect(screen.getByText('Greek')).toBeInTheDocument();
        expect(screen.getByText('how_it_works')).toBeInTheDocument();
        expect(screen.getByText('Question 2')).toBeInTheDocument();
        expect(screen.getByText(/^Updated /)).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    it('tags a source with few visits and shows no rate for it', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        renderPanel();

        const table = await screen.findByRole('table', { name: 'By source' });
        const social = within(table).getByText('Social').closest('tr') as HTMLElement;
        expect(within(social).getByText('Few visits')).toBeInTheDocument();
        expect(within(social).getByText('—')).toBeInTheDocument();
        const invite = within(table).getByText('Invite').closest('tr') as HTMLElement;
        expect(within(invite).queryByText('Few visits')).not.toBeInTheDocument();
    });

    it('says when Google Analytics is not connected', async () => {
        apiGet.mockResolvedValue(notConfiguredVisitorMetricsFixture());
        renderPanel();

        expect(await screen.findByText("Google Analytics isn't connected.")).toBeInTheDocument();
        expect(screen.queryByText('Totals')).not.toBeInTheDocument();
    });

    it('shows No data yet for every empty list', async () => {
        apiGet.mockResolvedValue(emptyVisitorMetricsFixture());
        renderPanel();

        expect(await screen.findByText('Totals')).toBeInTheDocument();
        // Daily line, sources, pages, and the four landing lists.
        expect(screen.getAllByText('No data yet')).toHaveLength(7);
    });

    it('offers Retry after an error and asks GA again', async () => {
        apiGet.mockRejectedValueOnce(new Error('503')).mockResolvedValue(visitorMetricsFixture());
        renderPanel();

        fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

        expect(await screen.findByText('2,400')).toBeInTheDocument();
        expect(apiGet).toHaveBeenLastCalledWith('/api/admin/metrics/visitors?fresh=true');
        expect(screen.queryByText("Couldn't load visitor numbers.")).not.toBeInTheDocument();
    });

    it('asks GA again on Refresh', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        renderPanel();
        await screen.findByText('2,400');

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => expect(apiGet).toHaveBeenLastCalledWith('/api/admin/metrics/visitors?fresh=true'));
    });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run components/admin/visitors/VisitorsPanel.test.tsx`
Expected: FAIL, the stub renders nothing.

- [ ] **Step 4: Write `VisitorsSkeleton.tsx`**

```tsx
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

// Loading shapes for the totals row, the daily line and two tables.
export function VisitorsSkeleton() {
    return (
        <SkeletonStatus className="space-y-5">
            {/* Totals */}
            <Skeleton className="h-24 rounded-xl" />
            {/* Daily line */}
            <Skeleton className="h-56 rounded-xl" />
            {/* Tables */}
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
            </div>
        </SkeletonStatus>
    );
}
```

- [ ] **Step 5: Write `VisitorsTotals.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { formatPer100, signupsPer100Visits } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsTotals({ data }: { data: VisitorMetricsDto }) {
    const t = useTranslations('AdminPage.visitors.totals');
    const locale = useLocale();
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="visit">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <PlatformMetricFigure label={t('visitors')} value={format.count(data.visitors)} />
                <PlatformMetricFigure label={t('visits')} value={format.count(data.visits)} />
                <PlatformMetricFigure label={t('signups')} value={format.count(data.signups)} />
                <PlatformMetricFigure label={t('per100')} value={formatPer100(locale, signupsPer100Visits(data.signups, data.visits))} />
            </div>
        </FunnelGroup>
    );
}
```

Check `PlatformMetricFigure` renders its value in a `<p>`; if it uses another tag, change the `selector` in the first test to match.

- [ ] **Step 6: Write `VisitorsDaily.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { VisitorMetricsDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function VisitorsDaily({ daily }: { daily: VisitorMetricsDto['daily'] }) {
    const t = useTranslations('AdminPage.visitors');
    const locale = useLocale();
    const format = useFunnelFormat();

    const formatDay = (value: unknown) => formatDate(locale, String(value), { day: 'numeric', month: 'short', timeZone: 'UTC' });

    return (
        <FunnelGroup title={t('daily.title')} window="visit">
            {daily.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="h-56 min-w-0" aria-label={t('daily.title')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
                            <YAxis allowDecimals={false} tickFormatter={format.count} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip labelFormatter={formatDay} formatter={(value) => [format.count(Number(value)), t('daily.visitors')]} />
                            <Line type="monotone" dataKey="visitors" stroke="var(--ink-muted)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </FunnelGroup>
    );
}
```

- [ ] **Step 7: Write `VisitorsChannels.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { formatPer100, isFewVisits, signupsPer100Visits } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsChannels({ rows }: { rows: VisitorMetricsDto['channels'] }) {
    const t = useTranslations('AdminPage.visitors');
    const tChannel = useTranslations('AdminPage.signupChannel');
    const locale = useLocale();
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('channels.title')} window="visit">
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={t('channels.title')} className="w-full min-w-[520px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{t('channels.channel')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('channels.visits')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('channels.signups')}</th>
                                <th className="py-2 pl-3 text-right font-bold">{t('channels.per100')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const few = isFewVisits(row.visits);
                                return (
                                    <tr key={row.channel} className="border-b border-border last:border-b-0">
                                        {/* Channel */}
                                        <td className="py-2 pr-3 text-ink">
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                {tChannel(row.channel)}
                                                {few && (
                                                    <span className="rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-semibold text-status-neutral">
                                                        {t('channels.fewVisits')}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        {/* Counts */}
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.visits)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.signups)}</td>
                                        {/* Rate */}
                                        <td className="py-2 pl-3 text-right font-mono tabular-nums">
                                            {formatPer100(locale, few ? null : signupsPer100Visits(row.signups, row.visits))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </FunnelGroup>
    );
}
```

- [ ] **Step 8: Write `VisitorsCountTable.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';

export type VisitorsCountRow = { key: string; label: ReactNode; count: number };

// A titled list of labels and counts, or "No data yet".
export function VisitorsCountTable({ title, columns, rows }: { title: string; columns: [string, string]; rows: VisitorsCountRow[] }) {
    const t = useTranslations('AdminPage.visitors');
    const format = useFunnelFormat();

    return (
        <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={title} className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{columns[0]}</th>
                                <th className="py-2 pl-3 text-right font-bold">{columns[1]}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key} className="border-b border-border last:border-b-0">
                                    <td className="max-w-0 truncate py-2 pr-3 text-ink">{row.label}</td>
                                    <td className="py-2 pl-3 text-right font-mono tabular-nums">{format.count(row.count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 9: Write `VisitorsPages.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { VisitorsCountTable } from '@/components/admin/visitors/VisitorsCountTable';
import { deviceRows, languageRows } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsPages({ data }: { data: VisitorMetricsDto }) {
    const t = useTranslations('AdminPage.visitors');

    const pages = data.pages.map((row) => ({
        key: row.page ?? '',
        label: row.page === null ? t('pages.other') : <span className="font-mono text-xs">{row.page}</span>,
        count: row.visits,
    }));

    return (
        <FunnelGroup title={t('pages.title')} window="visit">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                {/* Landing pages */}
                <VisitorsCountTable title={t('pages.page')} columns={[t('pages.page'), t('pages.visits')]} rows={pages} />

                {/* Language and device */}
                <div className="space-y-5">
                    <FunnelBreakdown title={t('pages.language')} rows={languageRows(data.languages)} labels={{ el: t('languages.el'), en: t('languages.en') }} />
                    <FunnelBreakdown
                        title={t('pages.device')}
                        rows={deviceRows(data.devices)}
                        labels={{ PHONE: t('devices.PHONE'), DESKTOP: t('devices.DESKTOP'), TABLET: t('devices.TABLET') }}
                    />
                </div>
            </div>
        </FunnelGroup>
    );
}
```

- [ ] **Step 10: Write `VisitorsLanding.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { VisitorsCountTable } from '@/components/admin/visitors/VisitorsCountTable';
import { sectionRows } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

// Section, placement and plan codes are shown as sent (mono): they name places on the page, not words.
export function VisitorsLanding({ landing, visitors }: { landing: VisitorMetricsDto['landing']; visitors: number }) {
    const t = useTranslations('AdminPage.visitors');

    const clicks = landing.clicks.map((row) => ({
        key: `${row.event}:${row.placement}`,
        label: (
            <>
                {t(`landing.events.${row.event}`)} <span className="ml-1 font-mono text-xs text-ink-faint">{row.placement}</span>
            </>
        ),
        count: row.count,
    }));
    const plans = landing.plans.map((row) => ({ key: row.plan, label: <span className="font-mono text-xs">{row.plan}</span>, count: row.count }));
    const faq = landing.faq.map((row) => ({ key: String(row.question), label: t('landing.questionNumber', { number: row.question }), count: row.count }));

    return (
        <FunnelGroup title={t('landing.title')} window="visit">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Scroll depth */}
                {landing.sections.length === 0 ? (
                    <div className="min-w-0">
                        <h3 className="mb-2 text-xs font-semibold text-ink-muted">{t('landing.sections')}</h3>
                        <p className="text-sm text-ink-muted">{t('empty')}</p>
                    </div>
                ) : (
                    <FunnelBreakdown title={t('landing.sections')} rows={sectionRows(landing.sections, visitors)} />
                )}

                {/* Button clicks */}
                <VisitorsCountTable title={t('landing.clicks')} columns={[t('landing.button'), t('landing.count')]} rows={clicks} />

                {/* Plan clicks */}
                <VisitorsCountTable title={t('landing.plans')} columns={[t('landing.plan'), t('landing.count')]} rows={plans} />

                {/* FAQ opens */}
                <VisitorsCountTable title={t('landing.faq')} columns={[t('landing.question'), t('landing.opens')]} rows={faq} />
            </div>
        </FunnelGroup>
    );
}
```

- [ ] **Step 11: Write the panel** — replace the stub `components/admin/visitors/VisitorsPanel.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { VisitorsChannels } from '@/components/admin/visitors/VisitorsChannels';
import { VisitorsDaily } from '@/components/admin/visitors/VisitorsDaily';
import { VisitorsLanding } from '@/components/admin/visitors/VisitorsLanding';
import { VisitorsPages } from '@/components/admin/visitors/VisitorsPages';
import { VisitorsSkeleton } from '@/components/admin/visitors/VisitorsSkeleton';
import { VisitorsTotals } from '@/components/admin/visitors/VisitorsTotals';
import { useVisitorsDashboard } from '@/hooks/useVisitorsDashboard';

export function VisitorsPanel() {
    const t = useTranslations('AdminPage.visitors');
    const { range, data, isLoading, isFetching, error, updatedAt, refresh } = useVisitorsDashboard();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('title')} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range */}
                <FunnelRangeControl range={range} note={t('cookiesNote')} />

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
                {data && !data.configured && <p className="text-sm text-ink-muted">{t('notConfigured')}</p>}

                {data?.configured && (
                    <>
                        {/* Totals */}
                        <VisitorsTotals data={data} />

                        {/* Visitors over time */}
                        <VisitorsDaily daily={data.daily} />

                        {/* By source */}
                        <VisitorsChannels rows={data.channels} />

                        {/* Pages, language and device */}
                        <VisitorsPages data={data} />

                        {/* Landing page */}
                        <VisitorsLanding landing={data.landing} visitors={data.visitors} />
                    </>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 12: Run the panel test**

Run: `npx vitest run components/admin/visitors/VisitorsPanel.test.tsx`
Expected: PASS (6 tests). The seven "No data yet" lines are the daily line, sources, pages, and the four landing lists; the language and device bars always render, at zero.

- [ ] **Step 13: Commit**

```bash
git add components/admin/visitors
git commit -m "Add the admin Visitors section"
```

---

### Task 8: Checks, visual review and PR

- [ ] **Step 1: Lint, types and tests**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: no lint errors, no type errors, all tests pass. Fix every lint error before going on.

- [ ] **Step 2: Look at it** — with the worktree dev server on :3000 (never `preview_start {name}`; open `preview_start {url: "http://localhost:3000/admin#visitors"}`) and the local backend on the backend branch, signed in as the local admin test account (ask the user for it). Locally GA is not configured, so first check the "isn't connected" line; then check the full layout by answering the request in the browser with the fixture (DevTools override or a temporary MSW handler, removed afterwards). Desktop first (1440 wide), then 375 wide: blocks stack, tables scroll inside their box, no overlap.

- [ ] **Step 3: SEO check** — no public route changes; `docs/seo-guidelines.md` has nothing to apply to an admin hash section. The GA page path change touches no metadata. Note "SEO: no blockers" in the PR.

- [ ] **Step 4: Update the code graph**

Run: `graphify update .`

- [ ] **Step 5: Push and open the PR into staging**

```bash
git push -u origin HEAD
gh pr create --base staging --title "Admin Visitors section" --body "$(cat <<'EOF'
Adds a Visitors item to the admin sidebar (Overview, after Growth): Google Analytics visitors and visits, sign-ups per 100 visits, a daily line, visits and sign-ups per source, landing pages with language and device, and the landing page events (scroll depth, button clicks, plan clicks, FAQ opens). Uses Growth's range control; Refresh asks GA again instead of using Spring's hour-long cache.

Landing pages now send their real path to GA (`/el/gamos` instead of `/[slug]/[occasion]`), so pages and languages can be told apart from the day this ships.

Needs the guestwall-be PR for `GET /api/admin/metrics/visitors`. Without GA settings on the backend the section says GA isn't connected.

SEO: no blockers (admin-only section; no public route or metadata changes).

Spec: `docs/superpowers/specs/2026-10-17-admin-visitors-section-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
