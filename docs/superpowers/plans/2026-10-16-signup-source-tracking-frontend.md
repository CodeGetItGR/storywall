# Sign-up Source Tracking — Front-end Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture where a visitor came from, send it with every sign-up, and show it in the admin Funnel (source filter, "By source" table) and the account drawer.

**Architecture:** `lib/signupSource.ts` holds pure capture and choice rules, the link-carrying helpers, the `sw_src` cookie and a module-level "page memory". A tracker component mounted in both root providers (`PublicProviders` for `app/(landing)`, `AppProviders` for `app/(main)`) captures on every page, strips a carried `src` param, writes the cookie only with analytics consent, and, on landing pages, rewrites clicks into the app to carry the source (that hop is a full page load between root layouts, so page memory alone would lose it). `authClient` attaches the source to `register` and `oauth`. The admin Funnel adds a channel to its query keys, a source select, and a by-channel table.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, next-intl, Vitest + Testing Library (jsdom), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-16-signup-source-tracking-design.md`.

**Depends on:** the Spring plan (`2026-10-16-signup-source-tracking-backend.md`) for real data. Every task here is testable without it; the manual check in Task 10 needs it running locally.

---

## Task 0: Workspace

- [ ] **Step 1: Link `node_modules`** (worktrees have none; the main checkout's is shared)

```bash
git diff --stat origin/staging -- package.json package-lock.json
```

Expected: no output (same lockfile). Then, in PowerShell:

```powershell
New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules
```

If the lockfiles differ, stop and ask before installing anything.

- [ ] **Step 2: Bring the branch up to date with `staging`**

Use the app's `sync_with_base_branch` tool (this session's worktree). Elsewhere: `git fetch origin && git merge origin/staging`.

---

## File map

| File | Responsibility |
|---|---|
| Create `lib/signupSource.ts` | `VisitSource` type, sanitising, capture, first-visit choice, landing-path test, link carrying, cookie, page memory |
| Create `lib/signupSource.test.ts` | Unit tests for all of the above |
| Modify `lib/consent.ts` | Withdrawing analytics also clears `sw_src` |
| Modify `lib/consent.test.ts` | Covers that |
| Create `hooks/useSignupSourceTracking.ts` | Capture, cookie and carry effects |
| Create `hooks/useSignupSourceTracking.test.tsx` | Hook tests |
| Create `components/layout/SignupSourceTracker.tsx` | Render-nothing wrapper for the hook |
| Modify `providers/PublicProviders.tsx`, `providers/AppProviders.tsx` | Mount the tracker |
| Modify `lib/api/types.ts` | `VisitSourceDto`, `SignupChannel`, `FunnelChannelRowDto`, `SignupSourceDto`, request/response fields |
| Modify `lib/api/authClient.ts` | Attach `visitSource` to register and oauth |
| Create `lib/api/authClient.test.ts` | Request body tests |
| Modify `lib/api/endpoints.ts`, `hooks/useAdmin.ts` | Channel param, channels endpoint, keys |
| Modify `lib/adminFunnel.ts` | `SIGNUP_CHANNELS`, `FEW_SIGNUPS` |
| Create `hooks/useFunnelSource.ts` | Source filter state |
| Modify `hooks/useFunnelCohorts.ts`, `hooks/useFunnelDashboard.ts` | Pass the channel; load channel rows |
| Create `components/admin/funnel/FunnelSourceControl.tsx` | The select |
| Create `components/admin/funnel/FunnelChannels.tsx` | The "By source" table |
| Modify `components/admin/funnel/FunnelPanel.tsx` | Place both |
| Modify `components/admin/funnel/__fixtures__/funnelMetrics.ts`, `FunnelPanel.test.tsx` | Fixture + tests |
| Create `lib/adminSignupSource.ts` + `lib/adminSignupSource.test.ts` | Drawer line text |
| Modify `components/admin/AccountDetailDrawer.tsx` | Source line |
| Modify `messages/en.json`, `messages/el.json` | All new copy |

---

### Task 1: `lib/signupSource.ts` (TDD)

**Files:**
- Create: `lib/signupSource.test.ts`
- Create: `lib/signupSource.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
    captureVisitSource,
    carryClickTarget,
    currentVisitSource,
    decodeVisitSource,
    encodeVisitSource,
    isLandingPath,
    pickVisitSource,
    readVisitSourceCookie,
    rememberVisitSource,
    VISIT_SOURCE_COOKIE,
    type VisitSource,
    withoutVisitSourceParam,
    writeVisitSourceCookie,
} from '@/lib/signupSource';

const ORIGIN = 'https://storywall.gr';

const INSTAGRAM: VisitSource = {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'bio-link',
    adClick: false,
    referrerHost: 'l.instagram.com',
    landingPage: '/',
};

afterEach(() => {
    rememberVisitSource(null);
    document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
    document.body.innerHTML = '';
});

describe('captureVisitSource', () => {
    it('reads campaign parameters, an ad click and the referrer host', () => {
        const source = captureVisitSource(`${ORIGIN}/?utm_source=instagram&utm_medium=social&utm_campaign=bio-link&gclid=abc`, 'https://l.instagram.com/x?y=1', {});
        expect(source).toEqual({ ...INSTAGRAM, adClick: true });
    });

    it('stores the route pattern, never the real path', () => {
        const source = captureVisitSource(`${ORIGIN}/gift/tok-123`, '', { token: 'tok-123' });
        expect(source?.landingPage).toBe('/gift/[token]');
    });

    it('is a direct visit when there is no campaign and no referrer', () => {
        expect(captureVisitSource(`${ORIGIN}/register`, '', {})).toEqual({
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            adClick: false,
            referrerHost: null,
            landingPage: '/register',
        });
    });

    it('is nothing new when the referrer is this site and there is no campaign', () => {
        expect(captureVisitSource(`${ORIGIN}/events/new`, `${ORIGIN}/`, {})).toBeNull();
    });

    it('still counts campaign parameters on an in-site link', () => {
        expect(captureVisitSource(`${ORIGIN}/?utm_source=newsletter`, `${ORIGIN}/el`, {})?.utmSource).toBe('newsletter');
    });

    it('prefers a source carried in the src param', () => {
        const href = `${ORIGIN}/events/new?src=${encodeURIComponent(encodeVisitSource(INSTAGRAM))}`;
        expect(captureVisitSource(href, `${ORIGIN}/`, {})).toEqual(INSTAGRAM);
    });

    it('caps values and strips control characters', () => {
        const long = 'a'.repeat(150);
        const source = captureVisitSource(`${ORIGIN}/?utm_campaign=${long}&utm_source=%0Aig%07`, '', {});
        expect(source?.utmCampaign).toHaveLength(100);
        expect(source?.utmSource).toBe('ig');
    });
});

describe('decodeVisitSource', () => {
    it('rejects junk and a source without a landing page', () => {
        expect(decodeVisitSource('not json')).toBeNull();
        expect(decodeVisitSource(JSON.stringify({ utmSource: 'x' }))).toBeNull();
        expect(decodeVisitSource(JSON.stringify({ ...INSTAGRAM, landingPage: 'https://evil.example/' }))).toBeNull();
    });

    it('drops a referrer that is not a bare host', () => {
        expect(decodeVisitSource(JSON.stringify({ ...INSTAGRAM, referrerHost: 'https://x.com/a' }))?.referrerHost).toBeNull();
    });
});

describe('pickVisitSource', () => {
    const later: VisitSource = { ...INSTAGRAM, utmSource: 'google', utmMedium: 'cpc' };
    const gift: VisitSource = { ...later, landingPage: '/gift/[token]' };

    it('keeps the first visit', () => {
        expect(pickVisitSource(INSTAGRAM, later)).toBe(INSTAGRAM);
        expect(pickVisitSource(null, later)).toBe(later);
        expect(pickVisitSource(INSTAGRAM, null)).toBe(INSTAGRAM);
    });

    it('lets a gift page replace it', () => {
        expect(pickVisitSource(INSTAGRAM, gift)).toBe(gift);
    });
});

describe('isLandingPath', () => {
    it('knows the pages under app/(landing)', () => {
        expect(isLandingPath('/')).toBe(true);
        expect(isLandingPath('/for-business')).toBe(true);
        expect(isLandingPath('/el')).toBe(true);
        expect(isLandingPath('/el/wedding')).toBe(true);
        expect(isLandingPath('/events/new')).toBe(false);
        expect(isLandingPath('/register')).toBe(false);
    });
});

describe('withoutVisitSourceParam', () => {
    it('removes src and keeps everything else', () => {
        expect(withoutVisitSourceParam(`${ORIGIN}/events/new?next=%2Fhome&src=abc#top`)).toBe('/events/new?next=%2Fhome#top');
    });

    it('is null when there is nothing to remove', () => {
        expect(withoutVisitSourceParam(`${ORIGIN}/events/new`)).toBeNull();
    });
});

describe('carryClickTarget', () => {
    function anchor(href: string, attributes: Record<string, string> = {}) {
        const link = document.createElement('a');
        link.href = href;
        for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
        const label = document.createElement('span');
        link.append(label);
        document.body.append(link);
        return label;
    }

    const click = (target: Element, extra: Partial<MouseEvent> = {}) =>
        ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, target, ...extra }) as MouseEvent;

    it('adds the source to a plain click into the app', () => {
        const href = carryClickTarget(click(anchor(`${ORIGIN}/events/new?next=x`)), ORIGIN, INSTAGRAM);
        expect(href).not.toBeNull();
        const url = new URL(href!);
        expect(url.pathname).toBe('/events/new');
        expect(url.searchParams.get('next')).toBe('x');
        expect(decodeVisitSource(url.searchParams.get('src'))).toEqual(INSTAGRAM);
    });

    it('leaves landing links, other sites, new tabs and modified clicks alone', () => {
        expect(carryClickTarget(click(anchor(`${ORIGIN}/el`)), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor('https://instagram.com/storywall')), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`, { target: '_blank' })), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`), { ctrlKey: true }), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`), { defaultPrevented: true }), ORIGIN, INSTAGRAM)).toBeNull();
    });

    it('does nothing without a source', () => {
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`)), ORIGIN, null)).toBeNull();
    });
});

describe('cookie and page memory', () => {
    it('round-trips through the cookie', () => {
        writeVisitSourceCookie(INSTAGRAM);
        expect(readVisitSourceCookie()).toEqual(INSTAGRAM);
    });

    it('prefers page memory, then falls back to the cookie', () => {
        expect(currentVisitSource()).toBeNull();
        writeVisitSourceCookie(INSTAGRAM);
        expect(currentVisitSource()).toEqual(INSTAGRAM);
        const memory = { ...INSTAGRAM, utmSource: 'ig' };
        rememberVisitSource(memory);
        expect(currentVisitSource()).toBe(memory);
    });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run lib/signupSource.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/signupSource"`.

- [ ] **Step 3: Write the implementation**

```ts
import { locales } from '@/i18n/config';
import { pageRoute } from '@/lib/vercelInsights';

type RouteParams = Record<string, string | string[] | undefined>;

// Where a visitor came from, saved with their account if they sign up (Spring decides the channel).
// Never a full URL, a click id or a token. The caps match Spring's VisitSourceDto validation.
export type VisitSource = {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    adClick: boolean;
    referrerHost: string | null;
    landingPage: string;
};

// Carries the source across the full page load from a landing page into the app.
export const VISIT_SOURCE_PARAM = 'src';
// Kept 30 days, and only with analytics consent.
export const VISIT_SOURCE_COOKIE = 'sw_src';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const UTM_MAX = 100;
const HOST_MAX = 255;
const PAGE_MAX = 255;
const AD_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid'];
const GIFT_PAGE = '/gift/';
const HOST_PATTERN = /^[a-z0-9.-]+$/;
const PAGE_PATTERN = /^\/[\x21-\x7e]*$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

function cleanText(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(CONTROL_CHARACTERS, '').trim().slice(0, max);
    return cleaned || null;
}

function cleanHost(value: unknown): string | null {
    const host = cleanText(value, HOST_MAX)?.toLowerCase() ?? null;
    return host && HOST_PATTERN.test(host) ? host : null;
}

function cleanPage(value: unknown): string | null {
    const page = cleanText(value, PAGE_MAX);
    return page && PAGE_PATTERN.test(page) ? page : null;
}

function parseUrl(value: string): URL | null {
    if (!value) return null;
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

// A source rebuilt from untrusted JSON (the src param or the cookie), every field checked.
function sanitizeVisitSource(raw: unknown): VisitSource | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    const landingPage = cleanPage(value.landingPage);
    if (!landingPage) return null;
    return {
        utmSource: cleanText(value.utmSource, UTM_MAX),
        utmMedium: cleanText(value.utmMedium, UTM_MAX),
        utmCampaign: cleanText(value.utmCampaign, UTM_MAX),
        adClick: value.adClick === true,
        referrerHost: cleanHost(value.referrerHost),
        landingPage,
    };
}

export function encodeVisitSource(source: VisitSource): string {
    return JSON.stringify(source);
}

export function decodeVisitSource(value: string | null): VisitSource | null {
    if (!value) return null;
    try {
        return sanitizeVisitSource(JSON.parse(value));
    } catch {
        return null;
    }
}

// This page load's source. Null when it was reached from this site with nothing new to say (a
// reload, or an in-site link without campaign parameters).
export function captureVisitSource(href: string, referrer: string, params: RouteParams): VisitSource | null {
    const url = new URL(href);
    const carried = decodeVisitSource(url.searchParams.get(VISIT_SOURCE_PARAM));
    if (carried) return carried;

    const utmSource = cleanText(url.searchParams.get('utm_source'), UTM_MAX);
    const utmMedium = cleanText(url.searchParams.get('utm_medium'), UTM_MAX);
    const utmCampaign = cleanText(url.searchParams.get('utm_campaign'), UTM_MAX);
    const adClick = AD_CLICK_PARAMS.some((name) => url.searchParams.has(name));
    const referrerUrl = parseUrl(referrer);
    const fromThisSite = referrerUrl?.origin === url.origin;
    if (fromThisSite && !utmSource && !utmMedium && !utmCampaign && !adClick) return null;

    return {
        utmSource,
        utmMedium,
        utmCampaign,
        adClick,
        referrerHost: referrerUrl && !fromThisSite ? cleanHost(referrerUrl.hostname) : null,
        landingPage: cleanPage(pageRoute(url.pathname, params)) ?? '/',
    };
}

// The first visit wins; a gift page replaces it.
export function pickVisitSource(saved: VisitSource | null, incoming: VisitSource | null): VisitSource | null {
    if (!incoming) return saved;
    if (!saved || incoming.landingPage.startsWith(GIFT_PAGE)) return incoming;
    return saved;
}

// Pages under app/(landing). Leaving one for any other page is a full page load (another root layout).
export function isLandingPath(pathname: string): boolean {
    if (pathname === '/' || pathname === '/for-business') return true;
    const first = pathname.split('/')[1];
    return (locales as readonly string[]).includes(first);
}

// The address without a carried src, for replacing the one in the address bar; null if it had none.
export function withoutVisitSourceParam(href: string): string | null {
    const url = new URL(href);
    if (!url.searchParams.has(VISIT_SOURCE_PARAM)) return null;
    url.searchParams.delete(VISIT_SOURCE_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
}

// Where a click on a landing page should go instead, carrying the source: only a plain click on a
// same-site link out of the landing pages. Null leaves the click alone.
export function carryClickTarget(event: MouseEvent, origin: string, source: VisitSource | null): string | null {
    if (!source || event.defaultPrevented || event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (!(event.target instanceof Element)) return null;

    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return null;
    if (link.target && link.target !== '_self') return null;

    const url = parseUrl(link.href);
    if (!url || url.origin !== origin || isLandingPath(url.pathname)) return null;
    url.searchParams.set(VISIT_SOURCE_PARAM, encodeVisitSource(source));
    return url.toString();
}

export function readVisitSourceCookie(): VisitSource | null {
    if (typeof document === 'undefined') return null;
    const prefix = `${VISIT_SOURCE_COOKIE}=`;
    const part = document.cookie
        .split(';')
        .map((piece) => piece.trim())
        .find((piece) => piece.startsWith(prefix));
    if (!part) return null;
    try {
        return decodeVisitSource(decodeURIComponent(part.slice(prefix.length)));
    } catch {
        return null;
    }
}

export function writeVisitSourceCookie(source: VisitSource): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${VISIT_SOURCE_COOKIE}=${encodeURIComponent(encodeVisitSource(source))}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

// Page memory: this tab's source until the next full page load. Nothing stored on the device.
let remembered: VisitSource | null = null;

export function rememberVisitSource(source: VisitSource | null): void {
    remembered = source;
}

export function currentVisitSource(): VisitSource | null {
    return remembered ?? readVisitSourceCookie();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/signupSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signupSource.ts lib/signupSource.test.ts
git commit -m "feat(signup-source): capture, choose and carry the visit source"
```

---

### Task 2: Withdrawing analytics consent clears `sw_src` (TDD)

**Files:**
- Modify: `lib/consent.test.ts`
- Modify: `lib/consent.ts:68-70`

- [ ] **Step 1: Add the failing test** to `lib/consent.test.ts` (add the imports `clearAnalyticsCookies` from `@/lib/consent` and `VISIT_SOURCE_COOKIE` from `@/lib/signupSource` if missing):

```ts
describe('clearAnalyticsCookies and the signup source', () => {
    it('also removes sw_src', () => {
        document.cookie = `${VISIT_SOURCE_COOKIE}=x; Path=/`;
        clearAnalyticsCookies();
        expect(document.cookie).not.toContain(`${VISIT_SOURCE_COOKIE}=`);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/consent.test.ts`
Expected: the new test FAILS.

- [ ] **Step 3: Implement**

In `lib/consent.ts`, add `import { VISIT_SOURCE_COOKIE } from '@/lib/signupSource';` and change:

```ts
// Google Analytics' cookies, and the signup source, which is kept only with analytics consent.
export function clearAnalyticsCookies(): void {
    clearCookiesStartingWith(ANALYTICS_COOKIE_PREFIX);
    clearCookiesStartingWith(VISIT_SOURCE_COOKIE);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/consent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/consent.ts lib/consent.test.ts
git commit -m "feat(signup-source): clear the source cookie with the analytics cookies"
```

---

### Task 3: The tracker hook and its mount (TDD)

**Files:**
- Create: `hooks/useSignupSourceTracking.test.tsx`
- Create: `hooks/useSignupSourceTracking.ts`
- Create: `components/layout/SignupSourceTracker.tsx`
- Modify: `providers/PublicProviders.tsx`, `providers/AppProviders.tsx:77`

- [ ] **Step 1: Write the failing tests**

```tsx
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignupSourceTracking } from '@/hooks/useSignupSourceTracking';
import { writeConsent } from '@/lib/consent';
import { currentVisitSource, readVisitSourceCookie, rememberVisitSource, VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

const navigation = vi.hoisted(() => ({ pathname: '/', params: {} as Record<string, string> }));
vi.mock('next/navigation', () => ({
    usePathname: () => navigation.pathname,
    useParams: () => navigation.params,
}));

function visit(path: string, referrer = '') {
    window.history.replaceState(null, '', path);
    navigation.pathname = new URL(path, window.location.origin).pathname;
    Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}

beforeEach(() => {
    rememberVisitSource(null);
    navigation.params = {};
});

afterEach(() => {
    cleanup();
    document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
    document.cookie = 'sw_consent=; Max-Age=0; Path=/';
    document.body.innerHTML = '';
});

describe('useSignupSourceTracking', () => {
    it('remembers the first visit without storing it when there is no consent', () => {
        visit('/?utm_source=instagram&utm_medium=social', 'https://l.instagram.com/');
        renderHook(() => useSignupSourceTracking());

        expect(currentVisitSource()?.utmSource).toBe('instagram');
        expect(readVisitSourceCookie()).toBeNull();
    });

    it('stores it in the cookie with analytics consent', () => {
        writeConsent({ ads: false, analytics: true });
        visit('/?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        expect(readVisitSourceCookie()?.utmSource).toBe('instagram');
    });

    it('reads a carried src and removes it from the address bar', () => {
        const carried = { utmSource: 'ig', utmMedium: null, utmCampaign: null, adClick: false, referrerHost: null, landingPage: '/' };
        visit(`/events/new?next=%2Fhome&src=${encodeURIComponent(JSON.stringify(carried))}`, `${window.location.origin}/`);
        renderHook(() => useSignupSourceTracking());

        expect(currentVisitSource()).toEqual(carried);
        expect(window.location.search).toBe('?next=%2Fhome');
    });

    it('takes over a plain click from a landing page into the app', () => {
        visit('/?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        const link = document.createElement('a');
        link.href = '/events/new';
        document.body.append(link);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link.dispatchEvent(event);

        // jsdom cannot navigate; the target URL itself is covered by carryClickTarget in Task 1.
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves clicks alone outside the landing pages', () => {
        visit('/events?utm_source=instagram');
        renderHook(() => useSignupSourceTracking());

        const link = document.createElement('a');
        link.href = '/events/new';
        document.body.append(link);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        link.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
```

jsdom prints "Not implemented: navigation" for `window.location.assign`; that console noise is expected in the first click test.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run hooks/useSignupSourceTracking.test.tsx`
Expected: FAIL, `Failed to resolve import "@/hooks/useSignupSourceTracking"`.

- [ ] **Step 3: Write the hook**

```ts
'use client';

import { useParams, usePathname } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { replacePageUrl } from '@/lib/overlayHistory';
import {
    captureVisitSource,
    carryClickTarget,
    currentVisitSource,
    isLandingPath,
    pickVisitSource,
    rememberVisitSource,
    withoutVisitSourceParam,
    writeVisitSourceCookie,
} from '@/lib/signupSource';

// Where the visitor came from, for the account they may create. Every page counts and the first
// visit wins. It lives in page memory, and also in a cookie with analytics consent. A landing page
// passes it to the app in the link, since that hop is a full page load.
export function useSignupSourceTracking() {
    const pathname = usePathname();
    const params = useParams();
    const { consent } = useCookieConsent();
    const analytics = consent?.analytics === true;

    const capture = useEffectEvent(() => {
        const { href } = window.location;
        rememberVisitSource(pickVisitSource(currentVisitSource(), captureVisitSource(href, document.referrer, params ?? {})));
        const cleaned = withoutVisitSourceParam(href);
        if (cleaned) replacePageUrl(cleaned);
    });

    useEffect(() => {
        capture();
    }, [pathname]);

    useEffect(() => {
        const source = currentVisitSource();
        if (analytics && source) writeVisitSourceCookie(source);
    }, [analytics, pathname]);

    useEffect(() => {
        if (!isLandingPath(pathname)) return;
        const abortController = new AbortController();
        // Capture phase, so this runs before Next's Link, which skips a click already prevented.
        document.addEventListener(
            'click',
            (event) => {
                const href = carryClickTarget(event, window.location.origin, currentVisitSource());
                if (!href) return;
                event.preventDefault();
                window.location.assign(href);
            },
            { capture: true, signal: abortController.signal },
        );
        return () => abortController.abort();
    }, [pathname]);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run hooks/useSignupSourceTracking.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount it in both root providers**

`components/layout/SignupSourceTracker.tsx`:

```tsx
'use client';

import { useSignupSourceTracking } from '@/hooks/useSignupSourceTracking';

export function SignupSourceTracker() {
    useSignupSourceTracking();
    return null;
}
```

In `providers/PublicProviders.tsx`, add `import { SignupSourceTracker } from '@/components/layout/SignupSourceTracker';` and render it after `<AppConfigBootstrap />`:

```tsx
            <AppConfigBootstrap />
            <SignupSourceTracker />
```

In `providers/AppProviders.tsx`, add the same import and render `<SignupSourceTracker />` on the line after `<AppConfigBootstrap />` (line 77).

- [ ] **Step 6: Run the provider-adjacent suites**

Run: `npx vitest run providers hooks/useGoogleTag.test.ts components/consent`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useSignupSourceTracking.ts hooks/useSignupSourceTracking.test.tsx components/layout/SignupSourceTracker.tsx providers/PublicProviders.tsx providers/AppProviders.tsx
git commit -m "feat(signup-source): track the visit source on every page"
```

---

### Task 4: Send it with sign-ups (TDD)

**Files:**
- Modify: `lib/api/types.ts:596-633`
- Create: `lib/api/authClient.test.ts`
- Modify: `lib/api/authClient.ts`

- [ ] **Step 1: Add the request types**

In `lib/api/types.ts`, before `RegisterRequestDto`:

```ts
// Where a sign-up came from. Validated by Spring (400 if malformed); lib/signupSource.ts trims to the same caps.
export interface VisitSourceDto {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    adClick: boolean;
    referrerHost: string | null;
    landingPage: string;
}
```

Add to both `RegisterRequestDto` and `OAuthLoginRequestDto`:

```ts
    // Saved on the account only when this request creates it.
    visitSource?: VisitSourceDto;
```

- [ ] **Step 2: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '@/lib/api/authClient';
import { rememberVisitSource, type VisitSource } from '@/lib/signupSource';

const SOURCE: VisitSource = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: null, adClick: false, referrerHost: null, landingPage: '/' };

function stubFetch() {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: 't' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
    return JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
}

const REGISTER = {
    email: 'a@example.com',
    password: 'password123',
    firstName: 'A',
    lastName: 'B',
    acceptedGuidelinesVersion: 'g',
    acceptedTermsVersion: 't',
    adultConfirmed: true as const,
};

afterEach(() => {
    rememberVisitSource(null);
    vi.unstubAllGlobals();
});

describe('authClient visit source', () => {
    it('adds the remembered source to register', async () => {
        const fetchMock = stubFetch();
        rememberVisitSource(SOURCE);
        await authClient.register(REGISTER);
        expect(sentBody(fetchMock).visitSource).toEqual(SOURCE);
    });

    it('adds it to oauth', async () => {
        const fetchMock = stubFetch();
        rememberVisitSource(SOURCE);
        await authClient.oauth('GOOGLE', { idToken: 'id' });
        expect(sentBody(fetchMock).visitSource).toEqual(SOURCE);
    });

    it('sends no visitSource when there is none', async () => {
        const fetchMock = stubFetch();
        await authClient.register(REGISTER);
        expect(sentBody(fetchMock)).not.toHaveProperty('visitSource');
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run lib/api/authClient.test.ts`
Expected: the two "adds" tests FAIL.

- [ ] **Step 4: Implement**

In `lib/api/authClient.ts`, add `import { currentVisitSource } from '@/lib/signupSource';` and:

```ts
// Sign-ups carry where the visitor came from; Spring keeps it only when the request creates the account.
function withVisitSource<T extends object>(input: T): T & { visitSource?: VisitSourceDto } {
    const visitSource = currentVisitSource();
    return visitSource ? { ...input, visitSource } : input;
}
```

(add `VisitSourceDto` to the type import), then:

```ts
    register: (input: RegisterRequestDto) =>
        authRequest<AuthSessionDto>(endpoints.auth.register, { method: 'POST', body: JSON.stringify(withVisitSource(input)) }),
```

```ts
    oauth: (provider: 'GOOGLE' | 'APPLE', input: OAuthLoginRequestDto) =>
        authRequest<AuthSessionDto>(endpoints.auth.oauth(provider), { method: 'POST', body: JSON.stringify(withVisitSource(input)) }),
```

The Next route handlers (`app/api/auth/register/route.ts`, `app/api/auth/oauth/[provider]/route.ts`) forward the parsed body to Spring unchanged, so they need no edit.

- [ ] **Step 5: Run the auth suites**

Run: `npx vitest run lib/api app/api/auth "app/(main)/register" components/auth`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/api/authClient.ts lib/api/authClient.test.ts
git commit -m "feat(signup-source): send the visit source with register and oauth"
```

---

### Task 5: Admin API layer

**Files:**
- Modify: `lib/api/types.ts` (near `FunnelCohortDto`, and `UserResponseDto` at line 720)
- Modify: `lib/api/endpoints.ts:321-327`
- Modify: `hooks/useAdmin.ts:52-68, 260-276`
- Modify: `lib/adminFunnel.ts`

- [ ] **Step 1: Types**

Add after `FunnelCohortDto` in `lib/api/types.ts`:

```ts
export type SignupChannel = 'INVITE' | 'GIFT' | 'ADS' | 'SOCIAL' | 'EMAIL' | 'PARTNER' | 'SEARCH' | 'OTHER_SITE' | 'DIRECT' | 'UNKNOWN';

// GET /api/admin/metrics/funnel/channels: accounts that signed up in the range, per channel.
// Revenue is provider-settled orders of any kind, all time, in minor units per currency.
export interface FunnelChannelRowDto {
    channel: SignupChannel;
    signedUp: number;
    createdEvent: number;
    paidHost: number;
    revenueMinorByCurrency: Record<string, number>;
}

// Where an account came from. Only on the admin user endpoints; null on /api/me.
export interface SignupSourceDto {
    channel: SignupChannel;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    adClick: boolean | null;
    referrerHost: string | null;
    landingPage: string | null;
}
```

Add to `UserResponseDto` after `currentTermsVersion`:

```ts
    signupSource?: SignupSourceDto | null;
```

- [ ] **Step 2: Endpoints**

Replace the `funnel` and `funnelCohorts` entries and add `funnelChannels`:

```ts
            funnel: (since?: string | null, until?: string | null, channel?: SignupChannel | null) => {
                const params = new URLSearchParams();
                if (since) params.set('since', since);
                if (until) params.set('until', until);
                if (channel) params.set('channel', channel);
                const query = params.toString();
                return `/api/admin/metrics/funnel${query ? `?${query}` : ''}`;
            },
            funnelCohorts: (weeks: number, channel?: SignupChannel | null) =>
                `/api/admin/metrics/funnel/cohorts?weeks=${encodeURIComponent(String(weeks))}${channel ? `&channel=${channel}` : ''}`,
            funnelChannels: (since?: string | null, until?: string | null) => {
                const params = new URLSearchParams();
                if (since) params.set('since', since);
                if (until) params.set('until', until);
                const query = params.toString();
                return `/api/admin/metrics/funnel/channels${query ? `?${query}` : ''}`;
            },
```

(import `SignupChannel` from `@/lib/api/types` at the top of `endpoints.ts`).

- [ ] **Step 3: Keys and hooks**

In `hooks/useAdmin.ts`, replace the two funnel keys and add one:

```ts
    funnel: (since: string | null, until: string | null, channel: SignupChannel | null) => ['admin', 'metrics', 'funnel', since, until, channel] as const,
    funnelCohorts: (weeks: number, channel: SignupChannel | null) => ['admin', 'metrics', 'funnel', 'cohorts', weeks, channel] as const,
    funnelChannels: (since: string | null, until: string | null) => ['admin', 'metrics', 'funnel', 'channels', since, until] as const,
```

Replace `useAdminFunnel` and `useAdminFunnelCohorts`, and add `useAdminFunnelChannels` (import `FunnelChannelRowDto`, `SignupChannel`):

```ts
// GET /api/admin/metrics/funnel - conversion funnel for accounts that signed up in the range, optionally from one channel.
export function useAdminFunnel(since: string | null, until: string | null, channel: SignupChannel | null, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: adminKeys.funnel(since, until, channel),
        queryFn: () => api.get<FunnelMetricsResponseDto>(endpoints.admin.metrics.funnel(since, until, channel)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}

export function useAdminFunnelCohorts(weeks: number, channel: SignupChannel | null) {
    return useQuery({
        queryKey: adminKeys.funnelCohorts(weeks, channel),
        queryFn: () => api.get<FunnelCohortDto[]>(endpoints.admin.metrics.funnelCohorts(weeks, channel)),
        placeholderData: keepPreviousData,
    });
}

// GET /api/admin/metrics/funnel/channels - the signup range split by where accounts came from.
export function useAdminFunnelChannels(since: string | null, until: string | null, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: adminKeys.funnelChannels(since, until),
        queryFn: () => api.get<FunnelChannelRowDto[]>(endpoints.admin.metrics.funnelChannels(since, until)),
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    });
}
```

- [ ] **Step 4: Shared constants** in `lib/adminFunnel.ts`

```ts
// Every channel, in the order the source filter lists them.
export const SIGNUP_CHANNELS = ['ADS', 'SOCIAL', 'SEARCH', 'EMAIL', 'PARTNER', 'OTHER_SITE', 'DIRECT', 'INVITE', 'GIFT', 'UNKNOWN'] as const satisfies readonly SignupChannel[];

// Below this many sign-ups a channel's percentages say little, and its row is tagged.
export const FEW_SIGNUPS = 20;
```

(add `SignupChannel` to the existing type import from `@/lib/api/types`).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `hooks/useFunnelDashboard.ts` and `hooks/useFunnelCohorts.ts` (the new arguments). Task 6 fixes them.

- [ ] **Step 6: Commit after Task 6** (the tree does not type-check yet).

---

### Task 6: Source filter state and wiring

**Files:**
- Create: `hooks/useFunnelSource.ts`
- Modify: `hooks/useFunnelCohorts.ts`
- Modify: `hooks/useFunnelDashboard.ts`
- Create: `components/admin/funnel/FunnelSourceControl.tsx`

- [ ] **Step 1: The state hook**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { SIGNUP_CHANNELS } from '@/lib/adminFunnel';
import type { SignupChannel } from '@/lib/api/types';

// The one channel the Funnel is narrowed to, or null for all of them.
export function useFunnelSource() {
    const t = useTranslations('AdminPage.signupChannel');
    const [channel, setChannel] = useState<SignupChannel | null>(null);

    const options = useMemo(() => SIGNUP_CHANNELS.map((value) => ({ value, label: t(value) })), [t]);

    const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setChannel((event.target.value || null) as SignupChannel | null);
    }, []);

    return { channel, options, handleChange };
}
```

- [ ] **Step 2: Cohorts follow the channel**

In `hooks/useFunnelCohorts.ts`, change the signature and the query call:

```ts
// Weekly signup cohorts. Independent of the page's date range; narrowed by the source filter.
export function useFunnelCohorts(channel: SignupChannel | null) {
    const [weeks, setWeeks] = useState<FunnelCohortWeeks>(12);
    const [mode, setMode] = useState<FunnelCohortMode>('COUNT');
    const query = useAdminFunnelCohorts(weeks, channel);
```

(import `SignupChannel` from `@/lib/api/types`).

- [ ] **Step 3: Dashboard wiring**

Replace `hooks/useFunnelDashboard.ts` with:

```ts
'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useAdminFunnel, useAdminFunnelChannels } from '@/hooks/useAdmin';
import { useFunnelCohorts } from '@/hooks/useFunnelCohorts';
import { useFunnelRange } from '@/hooks/useFunnelRange';
import { useFunnelSource } from '@/hooks/useFunnelSource';
import { dateTimeFormat } from '@/lib/format';

export function useFunnelDashboard() {
    const locale = useLocale();
    const range = useFunnelRange();
    const source = useFunnelSource();
    const { since, until, isValid } = range.bounds;
    const query = useAdminFunnel(since, until, source.channel, { enabled: isValid });
    const channelsQuery = useAdminFunnelChannels(since, until, { enabled: isValid });
    const cohorts = useFunnelCohorts(source.channel);

    const updatedAt = query.dataUpdatedAt ? dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt) : null;

    const { refetch } = query;
    const { refetch: refetchChannels } = channelsQuery;
    const { refetch: refetchCohorts } = cohorts;
    const refresh = useCallback(() => {
        void refetch();
        void refetchChannels();
        void refetchCohorts();
    }, [refetch, refetchChannels, refetchCohorts]);

    return {
        range,
        source,
        metrics: isValid ? query.data : undefined,
        channels: isValid ? channelsQuery.data : undefined,
        isLoading: query.isLoading,
        isFetching: query.isFetching || channelsQuery.isFetching || cohorts.isFetching,
        error: query.error,
        updatedAt,
        refresh,
        cohorts,
    };
}
```

- [ ] **Step 3b: Fix any other callers**

Run: `npx tsc --noEmit`
Expected: no errors, except possibly other users of `useAdminFunnel` / `useAdminFunnelCohorts` / `adminKeys.funnel`. Run `grep -rn "useAdminFunnel\|adminKeys.funnel" --include=*.ts --include=*.tsx .` and pass `null` as the channel wherever one is found.

- [ ] **Step 4: The select**

`components/admin/funnel/FunnelSourceControl.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { useFunnelSource } from '@/hooks/useFunnelSource';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function FunnelSourceControl({ source }: { source: ReturnType<typeof useFunnelSource> }) {
    const t = useTranslations('AdminPage.funnel.source');

    return (
        <label className="flex flex-col gap-0.5">
            <span className={LABEL}>{t('label')}</span>
            <select value={source.channel ?? ''} onChange={source.handleChange} className={adminInputClass('w-56')}>
                <option value="">{t('all')}</option>
                {source.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
```

- [ ] **Step 5: Type-check and commit Tasks 5–6**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add lib/api/types.ts lib/api/endpoints.ts hooks/useAdmin.ts lib/adminFunnel.ts hooks/useFunnelSource.ts hooks/useFunnelCohorts.ts hooks/useFunnelDashboard.ts components/admin/funnel/FunnelSourceControl.tsx
git commit -m "feat(signup-source): narrow the admin funnel to one signup channel"
```

---

### Task 7: The "By source" table, panel placement and copy (TDD)

**Files:**
- Modify: `components/admin/funnel/__fixtures__/funnelMetrics.ts`
- Modify: `components/admin/funnel/FunnelPanel.test.tsx`
- Create: `components/admin/funnel/FunnelChannels.tsx`
- Modify: `components/admin/funnel/FunnelPanel.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Fixture**

Append to `components/admin/funnel/__fixtures__/funnelMetrics.ts` (import `FunnelChannelRowDto` from `@/lib/api/types`):

```ts
export function funnelChannelsFixture(): FunnelChannelRowDto[] {
    return [
        { channel: 'SOCIAL', signedUp: 420, createdEvent: 160, paidHost: 48, revenueMinorByCurrency: { EUR: 336000 } },
        { channel: 'ADS', signedUp: 12, createdEvent: 5, paidHost: 2, revenueMinorByCurrency: { EUR: 14000 } },
        { channel: 'UNKNOWN', signedUp: 808, createdEvent: 300, paidHost: 136, revenueMinorByCurrency: {} },
    ];
}
```

- [ ] **Step 2: Write the failing tests**

In `FunnelPanel.test.tsx`, import `funnelChannelsFixture` and replace `serve` so each endpoint gets its own fixture:

```ts
function serve(metrics: FunnelMetricsResponseDto) {
    apiGet.mockImplementation((path: string) => {
        if (path.startsWith('/api/admin/metrics/funnel/cohorts')) return Promise.resolve(funnelCohortsFixture());
        if (path.startsWith('/api/admin/metrics/funnel/channels')) return Promise.resolve(funnelChannelsFixture());
        return Promise.resolve(metrics);
    });
}
```

Add inside `describe('FunnelPanel', …)`:

```ts
    it('lists sign-ups by source and tags channels with few sign-ups', async () => {
        serve(funnelMetricsFixture());
        renderPanel();

        const table = await screen.findByRole('table', { name: 'By source' });
        expect(within(table).getByText('Social')).toBeInTheDocument();
        expect(within(table).getByText('€3,360.00')).toBeInTheDocument();
        expect(within(table).getAllByText('Few sign-ups')).toHaveLength(1);
    });

    it('asks for one channel when a source is picked', async () => {
        serve(funnelMetricsFixture());
        renderPanel();
        await screen.findByRole('table', { name: 'By source' });

        fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'SOCIAL' } });

        await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/admin\/metrics\/funnel\?.*channel=SOCIAL/)));
        expect(apiGet).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/admin\/metrics\/funnel\/cohorts\?weeks=12&channel=SOCIAL$/));
    });
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run components/admin/funnel/FunnelPanel.test.tsx`
Expected: the two new tests FAIL (no table, no "Source" label). Existing tests still pass.

- [ ] **Step 4: Add the copy**

In `messages/en.json`, add under `AdminPage` (sibling of `funnel`):

```json
"signupChannel": {
    "INVITE": "Invite",
    "GIFT": "Gift",
    "ADS": "Ads",
    "SOCIAL": "Social",
    "EMAIL": "Email",
    "PARTNER": "Partner",
    "SEARCH": "Search",
    "OTHER_SITE": "Other site",
    "DIRECT": "Direct",
    "UNKNOWN": "Unknown"
}
```

and under `AdminPage.funnel`:

```json
"source": { "label": "Source", "all": "All sources" },
"channels": {
    "title": "By source",
    "columns": { "channel": "Source", "signedUp": "Sign-ups", "createdEvent": "Created an event", "paidHost": "Paid", "revenue": "Revenue" },
    "fewSignups": "Few sign-ups",
    "empty": "No sign-ups in this range."
}
```

In `messages/el.json`, the same keys:

```json
"signupChannel": {
    "INVITE": "Πρόσκληση",
    "GIFT": "Δώρο",
    "ADS": "Διαφημίσεις",
    "SOCIAL": "Social media",
    "EMAIL": "Email",
    "PARTNER": "Συνεργάτης",
    "SEARCH": "Αναζήτηση",
    "OTHER_SITE": "Άλλος ιστότοπος",
    "DIRECT": "Απευθείας",
    "UNKNOWN": "Άγνωστο"
}
```

```json
"source": { "label": "Προέλευση", "all": "Όλες οι προελεύσεις" },
"channels": {
    "title": "Ανά προέλευση",
    "columns": { "channel": "Προέλευση", "signedUp": "Εγγραφές", "createdEvent": "Δημιούργησαν εκδήλωση", "paidHost": "Πλήρωσαν", "revenue": "Έσοδα" },
    "fewSignups": "Λίγες εγγραφές",
    "empty": "Καμία εγγραφή σε αυτό το διάστημα."
}
```

- [ ] **Step 5: The table**

`components/admin/funnel/FunnelChannels.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { EMPTY_VALUE, FEW_SIGNUPS } from '@/lib/adminFunnel';
import type { FunnelChannelRowDto } from '@/lib/api/types';

export function FunnelChannels({ rows }: { rows: FunnelChannelRowDto[] }) {
    const t = useTranslations('AdminPage.funnel.channels');
    const tChannel = useTranslations('AdminPage.signupChannel');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup">
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={t('title')} className="w-full min-w-[560px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{t('columns.channel')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.signedUp')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.createdEvent')}</th>
                                <th className="px-3 py-2 text-right font-bold">{t('columns.paidHost')}</th>
                                <th className="py-2 pl-3 text-right font-bold">{t('columns.revenue')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const revenue = Object.entries(row.revenueMinorByCurrency);
                                return (
                                    <tr key={row.channel} className="border-b border-border last:border-b-0">
                                        {/* Channel */}
                                        <td className="py-2 pr-3 text-ink">
                                            <span className="inline-flex flex-wrap items-center gap-2">
                                                {tChannel(row.channel)}
                                                {row.signedUp < FEW_SIGNUPS && (
                                                    <span className="rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-semibold text-status-neutral">
                                                        {t('fewSignups')}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        {/* Counts */}
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.signedUp)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.createdEvent)}</td>
                                        <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.paidHost)}</td>
                                        {/* Revenue */}
                                        <td className="py-2 pl-3 text-right font-mono tabular-nums">
                                            {revenue.length ? revenue.map(([currency, minor]) => format.money(minor, currency)).join(' · ') : EMPTY_VALUE}
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

- [ ] **Step 6: Place both in the panel**

In `components/admin/funnel/FunnelPanel.tsx`, import `FunnelChannels` and `FunnelSourceControl`, read `source` and `channels` from `useFunnelDashboard()`, and change the range block and the start of the metrics block:

```tsx
                {/* Range and source */}
                <div className="space-y-3">
                    <FunnelRangeControl range={range} note={t('funnel.range.windows')} />
                    <FunnelSourceControl source={source} />
                </div>
```

```tsx
                        {/* Funnel */}
                        <FunnelSteps funnel={metrics.funnel} />

                        {/* By source */}
                        {channels && <FunnelChannels rows={channels} />}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run components/admin/funnel`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/admin/funnel messages/en.json messages/el.json
git commit -m "feat(signup-source): show sign-ups by source in the admin funnel"
```

---

### Task 8: Source line in the account drawer (TDD)

**Files:**
- Create: `lib/adminSignupSource.test.ts`
- Create: `lib/adminSignupSource.ts`
- Modify: `components/admin/AccountDetailDrawer.tsx`
- Modify: `messages/en.json`, `messages/el.json` (`AdminPage.accounts.detail.source`)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { signupSourceDetail } from '@/lib/adminSignupSource';
import type { SignupSourceDto } from '@/lib/api/types';

const base: SignupSourceDto = {
    channel: 'SOCIAL',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    adClick: null,
    referrerHost: null,
    landingPage: null,
};

describe('signupSourceDetail', () => {
    it('joins the campaign source and name', () => {
        expect(signupSourceDetail({ ...base, utmSource: 'instagram', utmCampaign: 'bio-link' })).toBe('instagram / bio-link');
    });

    it('falls back to the referring site', () => {
        expect(signupSourceDetail({ ...base, referrerHost: 'l.instagram.com' })).toBe('l.instagram.com');
    });

    it('is null when there is nothing beyond the channel', () => {
        expect(signupSourceDetail(base)).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/adminSignupSource.test.ts`
Expected: FAIL, unresolved import.

- [ ] **Step 3: Implement**

```ts
import type { SignupSourceDto } from '@/lib/api/types';

// The part after the channel in the account drawer: "instagram / bio-link", else the referring site.
export function signupSourceDetail(source: SignupSourceDto): string | null {
    const campaign = [source.utmSource, source.utmCampaign].filter(Boolean).join(' / ');
    return campaign || source.referrerHost || null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/adminSignupSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Copy and drawer**

Add `"source": "Source"` to `AdminPage.accounts.detail` in `messages/en.json`, and `"source": "Προέλευση"` in `messages/el.json`.

In `AccountDetailDrawer.tsx`, import `signupSourceDetail`, add `const tChannel = useTranslations('AdminPage.signupChannel');`, and add this item to the `<dl>` right after the "Sign-in method" item:

```tsx
                    {account.signupSource && (
                        <div className="col-span-2">
                            <dt className="text-xs text-ink-faint">{t('source')}</dt>
                            <dd className="mt-1 text-ink">
                                <span className="font-semibold">{tChannel(account.signupSource.channel)}</span>
                                {signupSourceDetail(account.signupSource) && (
                                    <span className="font-mono text-xs text-ink-muted"> · {signupSourceDetail(account.signupSource)}</span>
                                )}
                            </dd>
                        </div>
                    )}
```

- [ ] **Step 6: Type-check and run the admin suites**

Run: `npx tsc --noEmit && npx vitest run components/admin lib/adminSignupSource.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/adminSignupSource.ts lib/adminSignupSource.test.ts components/admin/AccountDetailDrawer.tsx messages/en.json messages/el.json
git commit -m "feat(signup-source): show the signup source in the account drawer"
```

---

### Task 9: Lint, types, full tests

- [ ] **Step 1:** Run: `npm run lint` — Expected: no errors. Fix any before going on.
- [ ] **Step 2:** Run: `npx tsc --noEmit` — Expected: no errors.
- [ ] **Step 3:** Run: `npm test` — Expected: all suites pass.
- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(signup-source): lint and type fixes"
```

---

### Task 10: Real-app checks

Needs the Spring branch from the backend plan running locally on `:8080` and this worktree's dev server on `:3000` (local backend CORS allows only `:3000`). Open it in the browser pane with `preview_start {url: "http://localhost:3000/"}` only, never `preview_start {name}`: the dev server shares `.next` with the main checkout.

- [ ] **Step 1: Cookies declined, landing → sign-up**
  1. In a fresh browser profile, open `http://localhost:3000/?utm_source=instagram&utm_medium=social&utm_campaign=bio-link` and click **Reject all** on the cookie banner.
  2. Click a "Create" button. Expected: the app page opens with no `src` left in the address bar.
  3. Register a new test account (generate the test values and record them in the project's seed/example config, not in chat).
  4. In the admin console, open that account. Expected: **Source: Social · instagram / bio-link**.
- [ ] **Step 2: Cookies accepted, later visit**
  1. In a fresh profile, open `http://localhost:3000/?utm_source=google&utm_medium=cpc`, click **Accept all**, and check that DevTools shows a `sw_src` cookie.
  2. Close the tab, open `http://localhost:3000/register` directly, and register. Expected: the drawer shows **Ads · google**.
  3. Turn analytics off in Cookie settings. Expected: `sw_src` is gone.
- [ ] **Step 3: Admin Funnel**
  Open the Funnel. Expected: a **Source** select under the date range and a **By source** table after the Funnel steps. Picking **Social** narrows every section. Check desktop width first (admin is desktop-first), then phone width for overlap.
- [ ] **Step 4: SEO** — check the change against `docs/seo-guidelines.md`. The `src` param appears only on app pages after a landing click and is removed on arrival; no new routes. List any rule it breaks as a **BLOCKER**.

### Task 11: PR

- [ ] **Step 1:** Bring the branch up to date with `staging` (`sync_with_base_branch`) and re-run `npm run lint && npx tsc --noEmit && npm test`.
- [ ] **Step 2:** Push and open a PR into `staging`:

```bash
git push -u origin HEAD
gh pr create --base staging --title "Track the sign-up source and split the admin funnel by channel" --body "$(cat <<'EOF'
Captures where a visitor came from (UTM, ad click, referrer host, first page) on every page, carries it from the landing pages into the app in the link, keeps it in a 30-day `sw_src` cookie only with analytics consent, and sends it with register and Google/Apple sign-up. The admin Funnel gets a source filter and a "By source" table; the account drawer shows the source.

Needs the matching guestwall-be PR (signup source columns, `/funnel/channels`, `channel` filter).

**Release blocker:** publish new Cookie Policy (`sw_src`) and Privacy Policy versions before this goes live.

Spec: `docs/superpowers/specs/2026-10-16-signup-source-tracking-design.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
