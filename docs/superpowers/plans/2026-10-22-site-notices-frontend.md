# Site Notices — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one platform-wide notice bar at the top of every page, and let admins create and schedule notices from the admin console.

**Architecture:**
- A cached Next route (`/api/site-notices`) serves the live notices from Spring and keeps the last good copy when Spring fails. Both root layouts seed React Query with the list so the bar renders on the server.
- A pure picker in `lib/siteNotices.ts` chooses the notice from the viewer's area, the tone rank and the visitor's dismissals. Dismissals live in a cookie, so the server renders the right bar with no flash.
- The API client reports Spring failures to a small health store. Two in a row swap in a built-in "we're having issues" notice.
- In the app the bar sits at the top of a flex column wrapping the whole page; on the landing page it sits in the normal document flow.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, next-intl, Tailwind v4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-22-site-notices-design.md`. **Backend plan:** `docs/superpowers/plans/2026-10-22-site-notices-backend.md`. The backend PR should merge first, but this one is safe either way, because a missing endpoint just means an empty list.

---

## Deviations from the spec (decided while planning)

1. **Dismissals live in a cookie, not localStorage.** Both root layouts are already dynamic (`i18n/request.ts` reads cookies), so the server can read the cookie and leave a closed notice out of the HTML. With localStorage, a closed notice would flash on every full page load until hydration.
2. **The bar mounts once per root layout, not per layout.**
   - `(main)` wraps its whole tree in `SiteNoticeFrame`, which works out the area from the path, the sign-in state and the event role (`useSiteNoticeArea`).
   - `(landing)` renders the bar with area `PUBLIC`.
   - The public pages under `(main)` (login, legal, invite, …) share no shell, so this is the one place that covers them all.
3. **Story and slideshow views need no code.** They are `fixed inset-0 z-50/z-60` overlays, so they cover the in-flow bar. The bar must never set a z-index.
4. **The desktop nav rail is the one fixed element pinned to the top** (`DesktopNavRail`, `fixed top-0 h-screen`). It moves down by `--site-notice-h`, which the frame measures.

Task 13 updates the spec to match.

## File map

Create:
- `lib/siteNotices.ts`: types re-export, tone rank, `pickSiteNotice`, `siteNoticeAreaFor`, `dismissalKey`
- `lib/siteNoticeDismissals.ts`: cookie read/write/parse and a subscribe store
- `lib/apiHealth.ts`: consecutive-failure store
- `lib/siteNotices.server.ts`: cached Spring fetch with last-good fallback
- `lib/siteNoticeForm.ts`: admin form ⇄ request mapping and validation
- `app/api/site-notices/route.ts`
- `hooks/useSiteNotices.ts` (exports `siteNoticeKeys`), `hooks/useApiHealth.ts`, `hooks/useSiteNoticeDismissals.ts`, `hooks/useSiteNoticeArea.ts`, `hooks/useSiteNoticeBar.ts`, `hooks/useSiteNoticeHeightVar.ts`, `hooks/useAdminSiteNotices.ts`, `hooks/useSiteNoticeForm.ts`, `hooks/useSiteNoticesPanel.ts`
- `components/siteNotices/SiteNoticeBanner.tsx`, `SiteNoticeBar.tsx`, `SiteNoticeFrame.tsx`
- `components/admin/siteNotices/SiteNoticesPanel.tsx`, `SiteNoticesTable.tsx`, `SiteNoticeDrawer.tsx`, `SiteNoticeToneControl.tsx`, `SiteNoticeAreasControl.tsx`, `SiteNoticePills.tsx`
- `docs/uptime-monitoring.md`
- Tests next to each lib/hook/component as `*.test.ts(x)`

Modify:
- `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/client.ts`
- `app/(main)/layout.tsx`, `app/(landing)/layout.tsx`
- `components/layout/DesktopNavRail.tsx`
- `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx`
- `i18n/publicMessages.ts`, `messages/en.json`, `messages/el.json`
- `docs/superpowers/specs/2026-10-22-site-notices-design.md`

Commands:
```bash
npx vitest run <path>        # one test file
npm run type:check
npm run lint
npm test
```

---

### Task 0: Setup

- [ ] **Step 1: Branch.** This worktree's branch `claude/global-announcement-system-6d486a` already sits on `origin/staging` plus the spec and plan commits. Confirm:

```bash
git fetch origin && git log --oneline origin/staging..HEAD
```
Expected: only the spec and plan commits. If staging moved on, use the app's `sync_with_base_branch` tool (or merge `origin/staging` if this isn't an app-made worktree).

- [ ] **Step 2: node_modules.** If missing, link the main checkout's `node_modules` with a junction when the lockfiles match (see memory "Worktree node_modules junction"); otherwise run `npm ci`.

---

### Task 1: Types and endpoints

**Files:** Modify `lib/api/types.ts`, `lib/api/endpoints.ts`

- [ ] **Step 1: Add the types.** Append them to `lib/api/types.ts` next to the other admin DTOs, e.g. after `AdminLandingCategory*`:

```ts
// Site notices (spec 2026-10-22-site-notices-design). Both locales travel; the client picks one.
export type SiteNoticeTone = 'INFO' | 'OFFER' | 'WARNING' | 'CRITICAL';
export type SiteNoticeArea = 'EVERYWHERE' | 'PUBLIC' | 'HOST' | 'GUEST' | 'ADMIN';
export type SiteNoticeStatus = 'LIVE' | 'SCHEDULED' | 'ENDED' | 'OFF';

export interface SiteNoticeLiveDto {
    id: string;
    version: number;
    tone: SiteNoticeTone;
    message: LocalizedText;
    linkUrl: string | null;
    linkLabel: LocalizedText;
    areas: SiteNoticeArea[];
    dismissible: boolean;
    startsAt: string | null;
    createdAt: string;
}

export interface AdminSiteNoticeDto extends Omit<SiteNoticeLiveDto, 'startsAt'> {
    startsAt: string | null;
    endsAt: string | null;
    active: boolean;
    status: SiteNoticeStatus;
    updatedAt: string;
}

export interface AdminSiteNoticeRequestDto {
    tone: SiteNoticeTone;
    message: LocalizedText;
    linkUrl: string | null;
    linkLabel: LocalizedText | null;
    areas: SiteNoticeArea[];
    dismissible: boolean;
    startsAt: string | null;
    endsAt: string | null;
    active: boolean;
}
```

- [ ] **Step 2: Add the endpoints.**
  - Next to `partnerProgram` in `lib/api/endpoints.ts`:

```ts
    // Read through the app's own cached route (app/api/site-notices), never straight from the browser.
    siteNotices: {
        live: '/api/public/site-notices',
    },
```

  - Inside `admin:`, next to `landingCategories`:

```ts
        siteNotices: {
            list: '/api/admin/site-notices',
            byId: (id: string) => `/api/admin/site-notices/${id}`,
        },
```

- [ ] **Step 3: Type-check**

```bash
npm run type:check
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts
git commit -m "Add site notice types and endpoints"
```

---

### Task 2: The picker and the area rules (TDD)

**Files:** Create `lib/siteNotices.ts`, `lib/siteNotices.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import type { SiteNoticeLiveDto } from '@/lib/api/types';
import { dismissalKey, pickSiteNotice, siteNoticeAreaFor } from '@/lib/siteNotices';

function notice(overrides: Partial<SiteNoticeLiveDto>): SiteNoticeLiveDto {
    return {
        id: 'n1',
        version: 1,
        tone: 'INFO',
        message: { en: 'Hello', el: 'Γεια' },
        linkUrl: null,
        linkLabel: {},
        areas: ['EVERYWHERE'],
        dismissible: true,
        startsAt: null,
        createdAt: '2026-10-01T00:00:00Z',
        ...overrides,
    };
}

const NONE = new Set<string>();

describe('pickSiteNotice', () => {
    it('shows nothing where notices are hidden', () => {
        expect(pickSiteNotice([notice({})], null, NONE)).toBeNull();
    });

    it('matches the viewer area, and EVERYWHERE matches every area', () => {
        const offer = notice({ id: 'offer', areas: ['PUBLIC', 'HOST'] });
        expect(pickSiteNotice([offer], 'GUEST', NONE)).toBeNull();
        expect(pickSiteNotice([offer], 'HOST', NONE)?.id).toBe('offer');
        expect(pickSiteNotice([notice({ id: 'all' })], 'ADMIN', NONE)?.id).toBe('all');
    });

    it('shows only EVERYWHERE notices while the event role is unknown', () => {
        const hostOnly = notice({ id: 'host', tone: 'CRITICAL', areas: ['HOST'] });
        const all = notice({ id: 'all' });
        expect(pickSiteNotice([hostOnly, all], 'PENDING', NONE)?.id).toBe('all');
    });

    it('ranks by tone, then by the newest start (or creation)', () => {
        const info = notice({ id: 'info', tone: 'INFO', createdAt: '2026-10-20T00:00:00Z' });
        const olderWarning = notice({ id: 'old', tone: 'WARNING', createdAt: '2026-10-01T00:00:00Z' });
        const newerWarning = notice({ id: 'new', tone: 'WARNING', createdAt: '2026-09-01T00:00:00Z', startsAt: '2026-10-10T00:00:00Z' });
        expect(pickSiteNotice([info, olderWarning, newerWarning], 'PUBLIC', NONE)?.id).toBe('new');
        expect(pickSiteNotice([info, notice({ id: 'crit', tone: 'CRITICAL' })], 'PUBLIC', NONE)?.id).toBe('crit');
    });

    it('skips a dismissed version but shows an edited one, and never skips a notice that cannot be closed', () => {
        const closable = notice({ id: 'a', version: 2 });
        expect(pickSiteNotice([closable], 'PUBLIC', new Set(['a:2']))).toBeNull();
        expect(pickSiteNotice([closable], 'PUBLIC', new Set(['a:1']))?.id).toBe('a');
        const locked = notice({ id: 'b', dismissible: false });
        expect(pickSiteNotice([locked], 'PUBLIC', new Set(['b:1']))?.id).toBe('b');
    });

    it('falls through to the next notice when the top one is dismissed', () => {
        const top = notice({ id: 'top', tone: 'WARNING' });
        const next = notice({ id: 'next', tone: 'OFFER' });
        expect(pickSiteNotice([top, next], 'PUBLIC', new Set([dismissalKey(top)]))?.id).toBe('next');
    });
});

describe('siteNoticeAreaFor', () => {
    const base = { isSignedIn: true, routeEventId: null, isHost: false, isEventLoading: false };

    it('hides the bar in the demo', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/demo/wedding' })).toBeNull();
    });

    it('uses ADMIN for the console', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/admin' })).toBe('ADMIN');
    });

    it('uses the event role on event pages, PENDING while it loads', () => {
        const event = { ...base, pathname: '/events/e1/feed', routeEventId: 'e1' };
        expect(siteNoticeAreaFor({ ...event, isHost: true })).toBe('HOST');
        expect(siteNoticeAreaFor(event)).toBe('GUEST');
        expect(siteNoticeAreaFor({ ...event, isEventLoading: true })).toBe('PENDING');
    });

    it('uses HOST on the signed-in app pages without an event', () => {
        for (const pathname of ['/home', '/profile', '/notifications', '/feed', '/events/new']) {
            expect(siteNoticeAreaFor({ ...base, pathname })).toBe('HOST');
        }
    });

    it('treats the invite page as GUEST when signed in and PUBLIC otherwise', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/invite/abc' })).toBe('GUEST');
        expect(siteNoticeAreaFor({ ...base, isSignedIn: false, pathname: '/invite/abc' })).toBe('PUBLIC');
    });

    it('uses PUBLIC everywhere else, and for signed-out visitors on app paths', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/legal/terms' })).toBe('PUBLIC');
        expect(siteNoticeAreaFor({ ...base, pathname: '/login' })).toBe('PUBLIC');
        expect(siteNoticeAreaFor({ ...base, isSignedIn: false, pathname: '/home' })).toBe('PUBLIC');
    });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run lib/siteNotices.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Write the module**

```ts
import type { SiteNoticeArea, SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { isDemoPath } from '@/lib/demo/demoRouting';

// The notice bar (spec 2026-10-22-site-notices-design). One notice shows at a time: the viewer's
// area must match, the highest tone wins, then the newest. A closed notice is remembered by
// id:version, so an edited text shows again.

// PENDING: an event page whose viewer role isn't known yet. Only EVERYWHERE notices show, so a
// guest never sees a host-only offer for a moment.
export type SiteNoticeViewArea = Exclude<SiteNoticeArea, 'EVERYWHERE'> | 'PENDING';

const TONE_RANK: Record<SiteNoticeTone, number> = { CRITICAL: 3, WARNING: 2, OFFER: 1, INFO: 0 };

const APP_PREFIXES = ['/home', '/profile', '/notifications', '/feed', '/events'];

export function dismissalKey(notice: Pick<SiteNoticeLiveDto, 'id' | 'version'>): string {
    return `${notice.id}:${notice.version}`;
}

function matchesArea(notice: SiteNoticeLiveDto, area: SiteNoticeViewArea): boolean {
    if (notice.areas.includes('EVERYWHERE')) return true;
    return area !== 'PENDING' && notice.areas.includes(area);
}

function recency(notice: SiteNoticeLiveDto): number {
    return Date.parse(notice.startsAt ?? notice.createdAt) || 0;
}

export function pickSiteNotice(
    notices: readonly SiteNoticeLiveDto[],
    area: SiteNoticeViewArea | null,
    dismissed: ReadonlySet<string>,
): SiteNoticeLiveDto | null {
    if (area === null) return null;
    const candidates = notices.filter((notice) => matchesArea(notice, area) && !(notice.dismissible && dismissed.has(dismissalKey(notice))));
    candidates.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone] || recency(b) - recency(a));
    return candidates[0] ?? null;
}

function underPrefix(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function siteNoticeAreaFor({
    pathname,
    isSignedIn,
    routeEventId,
    isHost,
    isEventLoading,
}: {
    pathname: string;
    isSignedIn: boolean;
    routeEventId: string | null;
    isHost: boolean;
    isEventLoading: boolean;
}): SiteNoticeViewArea | null {
    if (isDemoPath(pathname)) return null;
    if (underPrefix(pathname, '/admin')) return 'ADMIN';
    if (!isSignedIn) return 'PUBLIC';
    if (routeEventId) {
        if (isEventLoading) return 'PENDING';
        return isHost ? 'HOST' : 'GUEST';
    }
    if (underPrefix(pathname, '/invite')) return 'GUEST';
    if (APP_PREFIXES.some((prefix) => underPrefix(pathname, prefix))) return 'HOST';
    return 'PUBLIC';
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run lib/siteNotices.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/siteNotices.ts lib/siteNotices.test.ts
git commit -m "Pick the site notice for a viewer's area"
```

---

### Task 3: The API health store and client wiring (TDD)

**Files:** Create `lib/apiHealth.ts`, `lib/apiHealth.test.ts`, `lib/api/clientApiHealth.test.ts`. Modify `lib/api/client.ts`.

- [ ] **Step 1: Write the failing store test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isApiDown, reportApiNetworkError, reportApiResponse, resetApiHealth, subscribeApiHealth } from '@/lib/apiHealth';

describe('apiHealth', () => {
    afterEach(() => resetApiHealth());

    it('flags the API as down after two failures in a row', () => {
        reportApiResponse(503);
        expect(isApiDown()).toBe(false);
        reportApiNetworkError();
        expect(isApiDown()).toBe(true);
    });

    it('clears on any answered request, and a 4xx or 500 counts as answered', () => {
        reportApiResponse(502);
        reportApiResponse(504);
        expect(isApiDown()).toBe(true);
        reportApiResponse(404);
        expect(isApiDown()).toBe(false);
        reportApiResponse(503);
        reportApiResponse(500);
        reportApiResponse(503);
        expect(isApiDown()).toBe(false);
    });

    it('tells listeners only when the flag flips', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeApiHealth(listener);
        reportApiResponse(503);
        reportApiResponse(503);
        reportApiResponse(503);
        expect(listener).toHaveBeenCalledTimes(1);
        reportApiResponse(200);
        expect(listener).toHaveBeenCalledTimes(2);
        unsubscribe();
    });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run lib/apiHealth.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Write the store**

```ts
// Whether this browser can reach Spring. The API client reports every request: a network error or a
// 502/503/504 is a failure, any other answer (4xx and 500 included) means Spring is up. Two failures
// in a row flag it down, which swaps the notice bar to the built-in outage notice
// (spec 2026-10-22-site-notices-design §3). Browser only: on the server this module would be shared
// across requests, so the client never reports there.

const FAILURES_TO_FLAG = 2;
const DOWN_STATUSES = new Set([502, 503, 504]);

let consecutiveFailures = 0;
let down = false;
const listeners = new Set<() => void>();

function setDown(next: boolean) {
    if (next === down) return;
    down = next;
    for (const listener of listeners) listener();
}

function recordFailure() {
    consecutiveFailures += 1;
    if (consecutiveFailures >= FAILURES_TO_FLAG) setDown(true);
}

export function reportApiResponse(status: number): void {
    if (DOWN_STATUSES.has(status)) {
        recordFailure();
        return;
    }
    consecutiveFailures = 0;
    setDown(false);
}

export function reportApiNetworkError(): void {
    recordFailure();
}

export function isApiDown(): boolean {
    return down;
}

export function subscribeApiHealth(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// Tests only.
export function resetApiHealth(): void {
    consecutiveFailures = 0;
    down = false;
}
```

- [ ] **Step 4: Run the store test**

```bash
npx vitest run lib/apiHealth.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write the failing client test** `lib/api/clientApiHealth.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { isApiDown, resetApiHealth } from '@/lib/apiHealth';

describe('api client health reporting', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        resetApiHealth();
    });

    it('flags Spring as down after two 503s and clears after a success', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(api.publicGet('/api/config')).rejects.toBeTruthy();
        await expect(api.publicGet('/api/config')).rejects.toBeTruthy();
        expect(isApiDown()).toBe(true);
        await api.publicGet('/api/config');
        expect(isApiDown()).toBe(false);
    });

    it('counts a network error but not an aborted request', async () => {
        const abort = new DOMException('aborted', 'AbortError');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abort).mockRejectedValueOnce(abort).mockRejectedValueOnce(abort));
        await expect(api.publicGet('/api/config')).rejects.toBe(abort);
        await expect(api.publicGet('/api/config')).rejects.toBe(abort);
        expect(isApiDown()).toBe(false);

        const failed = new TypeError('fetch failed');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failed));
        await expect(api.publicGet('/api/config')).rejects.toBe(failed);
        await expect(api.publicGet('/api/config')).rejects.toBe(failed);
        expect(isApiDown()).toBe(true);
    });
});
```

- [ ] **Step 6: Run to confirm it fails**

```bash
npx vitest run lib/api/clientApiHealth.test.ts
```
Expected: FAIL (`isApiDown()` stays false).

- [ ] **Step 7: Wire the client.**
  - In `lib/api/client.ts`, add the import:

```ts
import { reportApiNetworkError, reportApiResponse } from '@/lib/apiHealth';
```

  - Add this helper above `rawFetch`:

```ts
// Every request to Spring goes through here so lib/apiHealth.ts can tell an outage from a bad
// request. An abort (navigation, a cancelled query) and an offline browser say nothing about Spring.
async function trackedFetch(url: string, init: RequestInit): Promise<Response> {
    const inBrowser = typeof window !== 'undefined';
    let res: Response;
    try {
        res = await fetch(url, init);
    } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        const offline = inBrowser && navigator.onLine === false;
        if (inBrowser && !aborted && !offline) reportApiNetworkError();
        throw error;
    }
    if (inBrowser) reportApiResponse(res.status);
    return res;
}
```

  - Replace the three `fetch(\`${API_BASE_URL}${path}\`, {` calls in `rawFetch`, `rawPostForm` and `apiFetchResponse` with `trackedFetch(\`${API_BASE_URL}${path}\`, {`. Leave `reauthenticate()`'s `fetch(endpoints.auth.session)` alone: it hits the Next route, not Spring.

- [ ] **Step 8: Run the client tests, the old ones included**

```bash
npx vitest run lib/api/clientApiHealth.test.ts lib/api/client.test.ts lib/apiHealth.test.ts
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/apiHealth.ts lib/apiHealth.test.ts lib/api/client.ts lib/api/clientApiHealth.test.ts
git commit -m "Track whether Spring is reachable from the API client"
```

---

### Task 4: Dismissal cookie (TDD)

**Files:** Create `lib/siteNoticeDismissals.ts`, `lib/siteNoticeDismissals.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    addDismissal,
    DISMISSED_COOKIE,
    parseDismissals,
    readDismissalsCookie,
    subscribeDismissals,
    writeDismissalsCookie,
} from '@/lib/siteNoticeDismissals';

describe('site notice dismissals', () => {
    afterEach(() => {
        document.cookie = `${DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('parses the cookie value into keys and ignores junk', () => {
        expect(parseDismissals('a:1.b:2')).toEqual(['a:1', 'b:2']);
        expect(parseDismissals('')).toEqual([]);
        expect(parseDismissals(undefined)).toEqual([]);
        expect(parseDismissals('a:1.nonsense.c:x')).toEqual(['a:1']);
    });

    it('adds a key once and keeps only the newest twenty', () => {
        expect(addDismissal('a:1', 'a:1')).toBe('a:1');
        let raw = '';
        for (let i = 0; i < 25; i += 1) raw = addDismissal(raw, `n${i}:1`);
        const keys = parseDismissals(raw);
        expect(keys).toHaveLength(20);
        expect(keys[0]).toBe('n5:1');
        expect(keys.at(-1)).toBe('n24:1');
    });

    it('writes and reads the cookie and tells subscribers', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeDismissals(listener);
        writeDismissalsCookie('a:1');
        expect(readDismissalsCookie()).toBe('a:1');
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run lib/siteNoticeDismissals.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write the module**

```ts
// Closed site notices, as "id:version" keys joined by "." in one cookie. A cookie rather than
// localStorage so the server leaves a closed notice out of the HTML (no flash on load). Capped at
// the newest twenty keys; every access is guarded, since cookies can be blocked.

export const DISMISSED_COOKIE = 'site_notice_dismissed';

const SEPARATOR = '.';
const MAX_KEYS = 20;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const KEY = /^[0-9a-zA-Z-]{1,64}:\d{1,9}$/;

const listeners = new Set<() => void>();

export function parseDismissals(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(SEPARATOR).filter((key) => KEY.test(key));
}

export function addDismissal(raw: string, key: string): string {
    const keys = parseDismissals(raw).filter((existing) => existing !== key);
    keys.push(key);
    return keys.slice(-MAX_KEYS).join(SEPARATOR);
}

export function readDismissalsCookie(): string {
    try {
        const match = document.cookie.split('; ').find((part) => part.startsWith(`${DISMISSED_COOKIE}=`));
        return match ? decodeURIComponent(match.slice(DISMISSED_COOKIE.length + 1)) : '';
    } catch {
        return '';
    }
}

export function writeDismissalsCookie(raw: string): void {
    try {
        document.cookie = `${DISMISSED_COOKIE}=${encodeURIComponent(raw)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
    } catch {
        // Blocked cookies: the notice closes for this page view only.
    }
    for (const listener of listeners) listener();
}

export function subscribeDismissals(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run lib/siteNoticeDismissals.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/siteNoticeDismissals.ts lib/siteNoticeDismissals.test.ts
git commit -m "Remember closed site notices in a cookie"
```

---

### Task 5: Server fetch and the cached route (TDD)

**Files:** Create `lib/siteNotices.server.ts`, `lib/siteNotices.server.test.ts`, `app/api/site-notices/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchLiveSiteNotices', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    const notice = { id: 'n1', version: 1, tone: 'INFO', message: { en: 'a', el: 'b' }, linkUrl: null, linkLabel: {}, areas: ['EVERYWHERE'], dismissible: true, startsAt: null, createdAt: '2026-10-01T00:00:00Z' };

    it('returns the live list and keeps it as the last good copy', async () => {
        const { fetchLiveSiteNotices } = await import('@/lib/siteNotices.server');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([notice]), { status: 200 })));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);

        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveSiteNotices()).toEqual([notice]);
    });

    it('returns an empty list when Spring has never answered or answers with junk', async () => {
        const { fetchLiveSiteNotices } = await import('@/lib/siteNotices.server');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
        expect(await fetchLiveSiteNotices()).toEqual([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"oops":true}', { status: 200 })));
        expect(await fetchLiveSiteNotices()).toEqual([]);
    });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run lib/siteNotices.server.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write the server helper**

```ts
import { endpoints } from '@/lib/api/endpoints';
import type { SiteNoticeLiveDto } from '@/lib/api/types';

// Server-only: the live site notices from Spring, cached for a minute in Next's data cache. When
// Spring fails, the last good copy this server instance saw is served instead, so notices published
// before an outage keep showing during it. Never throws.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
export const SITE_NOTICES_REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3000;

let lastGood: SiteNoticeLiveDto[] = [];

export async function fetchLiveSiteNotices(): Promise<SiteNoticeLiveDto[]> {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoints.siteNotices.live}`, {
            next: { revalidate: SITE_NOTICES_REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return lastGood;
        const body: unknown = await res.json();
        if (!Array.isArray(body)) return lastGood;
        lastGood = body as SiteNoticeLiveDto[];
        return lastGood;
    } catch {
        return lastGood;
    }
}
```

- [ ] **Step 4: Write the route**

```ts
import { NextResponse } from 'next/server';

import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';

// The live site notices for the browser's refetches (hooks/useSiteNotices.ts). The CDN keeps a copy
// for a minute and may serve it for ten more while revalidating, so an outage doesn't blank the bar.
export async function GET() {
    const notices = await fetchLiveSiteNotices();
    return NextResponse.json(notices, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
    });
}
```

- [ ] **Step 5: Run the test**

```bash
npx vitest run lib/siteNotices.server.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/siteNotices.server.ts lib/siteNotices.server.test.ts app/api/site-notices/route.ts
git commit -m "Serve live site notices through a cached route"
```

---

### Task 6: Client hooks

**Files:** Create `hooks/useSiteNotices.ts`, `hooks/useApiHealth.ts`, `hooks/useSiteNoticeDismissals.ts`, `hooks/useSiteNoticeArea.ts`, `hooks/useSiteNoticeBar.ts`, `hooks/useSiteNoticeHeightVar.ts`, `hooks/useSiteNoticeBar.test.tsx`

- [ ] **Step 1: `hooks/useSiteNotices.ts`.** No `'use client'` directive, so layouts can import `siteNoticeKeys`; `hooks/useMyEvents.ts` does the same.

```ts
import { useQuery } from '@tanstack/react-query';

import type { SiteNoticeLiveDto } from '@/lib/api/types';

// The live site notices. Seeded on the server by both root layouts; refetched on focus and every
// five minutes so a new outage notice reaches open tabs. Reads the app's own cached route, never
// Spring directly, so an outage doesn't count against lib/apiHealth.ts twice.

export const siteNoticeKeys = {
    live: () => ['site-notices', 'live'] as const,
};

const SITE_NOTICES_URL = '/api/site-notices';
const STALE_MS = 60 * 1000;
const REFETCH_MS = 5 * 60 * 1000;

async function fetchSiteNotices(): Promise<SiteNoticeLiveDto[]> {
    const res = await fetch(SITE_NOTICES_URL);
    if (!res.ok) throw new Error(`Site notices failed with status ${res.status}`);
    return (await res.json()) as SiteNoticeLiveDto[];
}

export function useSiteNotices() {
    return useQuery({
        queryKey: siteNoticeKeys.live(),
        queryFn: fetchSiteNotices,
        staleTime: STALE_MS,
        refetchInterval: REFETCH_MS,
        refetchOnWindowFocus: true,
    });
}
```

- [ ] **Step 2: `hooks/useApiHealth.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';

import { isApiDown, subscribeApiHealth } from '@/lib/apiHealth';

function serverSnapshot() {
    return false;
}

export function useApiDown(): boolean {
    return useSyncExternalStore(subscribeApiHealth, isApiDown, serverSnapshot);
}
```

- [ ] **Step 3: `hooks/useSiteNoticeDismissals.ts`**

```ts
'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { addDismissal, parseDismissals, readDismissalsCookie, subscribeDismissals, writeDismissalsCookie } from '@/lib/siteNoticeDismissals';

// initialRaw: the cookie as the server read it, so the first client render matches the HTML.
export function useSiteNoticeDismissals(initialRaw: string) {
    const getServerSnapshot = useCallback(() => initialRaw, [initialRaw]);
    const raw = useSyncExternalStore(subscribeDismissals, readDismissalsCookie, getServerSnapshot);
    const dismissed = useMemo(() => new Set(parseDismissals(raw)), [raw]);
    const dismiss = useCallback((key: string) => writeDismissalsCookie(addDismissal(readDismissalsCookie(), key)), []);
    return { dismissed, dismiss };
}
```

- [ ] **Step 4: `hooks/useSiteNoticeArea.ts`** (the `(main)` tree only: it needs `EventProvider` and `AuthProvider`)

```ts
'use client';

import { usePathname } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { type SiteNoticeViewArea, siteNoticeAreaFor } from '@/lib/siteNotices';
import { useEventContextLoading, useIsHost, useRouteEventId } from '@/providers/EventProvider';

export function useSiteNoticeArea(): SiteNoticeViewArea | null {
    const pathname = usePathname();
    const { user } = useAuth();
    const routeEventId = useRouteEventId();
    const isHost = useIsHost();
    const isEventLoading = useEventContextLoading();
    return siteNoticeAreaFor({ pathname, isSignedIn: Boolean(user), routeEventId, isHost, isEventLoading });
}
```

- [ ] **Step 5: Write the failing view-model test** `hooks/useSiteNoticeBar.test.tsx`

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SiteNoticeLiveDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({ notices: [] as SiteNoticeLiveDto[], apiDown: false }));
vi.mock('@/hooks/useSiteNotices', () => ({ useSiteNotices: () => ({ data: state.notices }) }));
vi.mock('@/hooks/useApiHealth', () => ({ useApiDown: () => state.apiDown }));
vi.mock('next-intl', () => ({ useLocale: () => 'el', useTranslations: () => (key: string) => key }));

import { useSiteNoticeBar } from '@/hooks/useSiteNoticeBar';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';

const offer: SiteNoticeLiveDto = {
    id: 'n1',
    version: 1,
    tone: 'OFFER',
    message: { en: '20% off', el: '20% έκπτωση' },
    linkUrl: '/pricing',
    linkLabel: { en: 'See plans', el: 'Δείτε τα πακέτα' },
    areas: ['PUBLIC'],
    dismissible: true,
    startsAt: null,
    createdAt: '2026-10-01T00:00:00Z',
};

describe('useSiteNoticeBar', () => {
    afterEach(() => {
        state.notices = [];
        state.apiDown = false;
        document.cookie = `${DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('shows the matching notice in the current locale', () => {
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({ tone: 'OFFER', message: '20% έκπτωση', link: { href: '/pricing', label: 'Δείτε τα πακέτα' } });
    });

    it('hides a notice once it is closed', () => {
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        act(() => result.current?.onDismiss?.());
        expect(result.current).toBeNull();
    });

    it('respects a dismissal the server read from the cookie', () => {
        state.notices = [offer];
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', 'n1:1'));
        expect(result.current).toBeNull();
    });

    it('swaps in the built-in outage notice while Spring is down, even over admin notices', () => {
        state.notices = [offer];
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar('PUBLIC', ''));
        expect(result.current).toMatchObject({ tone: 'CRITICAL', message: 'apiDown', link: null, onDismiss: null });
    });

    it('shows nothing where the bar is hidden, outage included', () => {
        state.apiDown = true;
        const { result } = renderHook(() => useSiteNoticeBar(null, ''));
        expect(result.current).toBeNull();
    });
});
```

- [ ] **Step 6: Run to confirm it fails**

```bash
npx vitest run hooks/useSiteNoticeBar.test.tsx
```
Expected: FAIL (module not found).

- [ ] **Step 7: Write `hooks/useSiteNoticeBar.ts`**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useApiDown } from '@/hooks/useApiHealth';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { useSiteNotices } from '@/hooks/useSiteNotices';
import type { SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { dismissalKey, pickSiteNotice, type SiteNoticeViewArea } from '@/lib/siteNotices';

export type SiteNoticeView = {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
};

const NO_NOTICES: SiteNoticeLiveDto[] = [];

// What the bar shows, if anything: the built-in outage notice while Spring is unreachable,
// otherwise the best matching notice that hasn't been closed.
export function useSiteNoticeBar(area: SiteNoticeViewArea | null, initialDismissed: string): SiteNoticeView | null {
    const t = useTranslations('SiteNotice');
    const locale = useLocale();
    const notices = useSiteNotices().data ?? NO_NOTICES;
    const apiDown = useApiDown();
    const { dismissed, dismiss } = useSiteNoticeDismissals(initialDismissed);
    const notice = useMemo(() => pickSiteNotice(notices, area, dismissed), [notices, area, dismissed]);
    const key = notice ? dismissalKey(notice) : null;
    const handleDismiss = useCallback(() => {
        if (key) dismiss(key);
    }, [dismiss, key]);

    if (area === null) return null;
    if (apiDown) return { tone: 'CRITICAL', message: t('apiDown'), link: null, onDismiss: null };
    if (!notice) return null;
    return {
        tone: notice.tone,
        message: resolveLocalizedText(notice.message, locale),
        link: notice.linkUrl ? { href: notice.linkUrl, label: resolveLocalizedText(notice.linkLabel, locale) } : null,
        onDismiss: notice.dismissible ? handleDismiss : null,
    };
}
```
Check `resolveLocalizedText`'s signature in `lib/localizedText.ts` (`useLocalizedText` calls it as `(text, locale, fallback)`). If `fallback` is required, pass `''`.

- [ ] **Step 8: `hooks/useSiteNoticeHeightVar.ts`**

```ts
'use client';

import { type RefObject, useEffect } from 'react';

const VAR = '--site-notice-h';

// Publishes the bar's height as --site-notice-h on <html>, so the fixed desktop nav rail can sit
// below it. Removed on unmount, which puts the rail back at the top.
export function useSiteNoticeHeightVar(ref: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty(VAR, `${element.offsetHeight}px`));
        observer.observe(element);
        return () => {
            observer.disconnect();
            root.style.removeProperty(VAR);
        };
    }, [ref]);
}
```

- [ ] **Step 9: Run the tests**

```bash
npx vitest run hooks/useSiteNoticeBar.test.tsx
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add hooks/useSiteNotices.ts hooks/useApiHealth.ts hooks/useSiteNoticeDismissals.ts hooks/useSiteNoticeArea.ts hooks/useSiteNoticeBar.ts hooks/useSiteNoticeBar.test.tsx hooks/useSiteNoticeHeightVar.ts
git commit -m "Add site notice hooks"
```

---

### Task 7: Translations

**Files:** Modify `messages/en.json`, `messages/el.json`, `i18n/publicMessages.ts`

- [ ] **Step 1: Run the UX copy skill** (`design:ux-copy`) on the strings below before committing them. The user asked for the outage line to read close to "We're facing some issues. We're working to fix them." The skill may shorten wording; it must not add explanation.

- [ ] **Step 2: Add the `SiteNotice` namespace** at the top level of both files.

`messages/en.json`:
```json
"SiteNotice": {
    "apiDown": "We're having some issues. We're working on a fix.",
    "close": "Close"
}
```
`messages/el.json`:
```json
"SiteNotice": {
    "apiDown": "Αντιμετωπίζουμε κάποια προβλήματα. Δουλεύουμε για να τα διορθώσουμε.",
    "close": "Κλείσιμο"
}
```

- [ ] **Step 3: Add the admin copy.**
  - Add `"siteNotices": "Site notices"` (el: `"Ανακοινώσεις"`) to `AdminPage.tabs` in both files.
  - Add the `AdminPage.siteNotices` object below to `en.json`:

```json
"siteNotices": {
    "create": "New notice",
    "empty": "No notices yet.",
    "createTitle": "New notice",
    "editTitle": "Edit notice",
    "delete": "Delete notice",
    "deleteTitle": "Delete this notice?",
    "deleteBody": "It disappears for everyone right away.",
    "deleteConfirm": "Delete",
    "edit": "Edit",
    "columns": { "tone": "Tone", "message": "Message", "areas": "Where", "status": "Status", "schedule": "Schedule" },
    "tone": { "INFO": "Info", "OFFER": "Offer", "WARNING": "Warning", "CRITICAL": "Critical" },
    "status": { "LIVE": "Live", "SCHEDULED": "Scheduled", "ENDED": "Ended", "OFF": "Off" },
    "area": { "EVERYWHERE": "Everywhere", "PUBLIC": "Public site", "HOST": "Host pages", "GUEST": "Guest pages", "ADMIN": "Admin" },
    "fields": {
        "preview": "Preview",
        "tone": "Tone",
        "messageEn": "Message (English)",
        "messageEl": "Message (Greek)",
        "linkUrl": "Link",
        "linkUrlHint": "A page here, like /pricing, or a full https:// address.",
        "linkLabelEn": "Link text (English)",
        "linkLabelEl": "Link text (Greek)",
        "where": "Where",
        "dismissible": "People can close it",
        "startsAt": "Starts",
        "endsAt": "Ends",
        "active": "On"
    },
    "where": { "everywhere": "Everywhere", "choose": "Choose areas" },
    "whereHint": { "everywhere": "Shows on every page, for everyone.", "choose": "Shows only in the areas you pick." },
    "scheduleNow": "Now",
    "scheduleNoEnd": "No end",
    "problems": {
        "message": "Add the message in both languages.",
        "linkLabel": "Add the link text in both languages.",
        "areas": "Pick at least one area.",
        "schedule": "The end must be after the start."
    }
}
```
  - Add the same keys in Greek to `el.json`:

```json
"siteNotices": {
    "create": "Νέα ανακοίνωση",
    "empty": "Δεν υπάρχουν ανακοινώσεις.",
    "createTitle": "Νέα ανακοίνωση",
    "editTitle": "Επεξεργασία ανακοίνωσης",
    "delete": "Διαγραφή ανακοίνωσης",
    "deleteTitle": "Διαγραφή της ανακοίνωσης;",
    "deleteBody": "Θα εξαφανιστεί αμέσως για όλους.",
    "deleteConfirm": "Διαγραφή",
    "edit": "Επεξεργασία",
    "columns": { "tone": "Τύπος", "message": "Μήνυμα", "areas": "Πού", "status": "Κατάσταση", "schedule": "Πρόγραμμα" },
    "tone": { "INFO": "Πληροφορία", "OFFER": "Προσφορά", "WARNING": "Προειδοποίηση", "CRITICAL": "Κρίσιμο" },
    "status": { "LIVE": "Ενεργή", "SCHEDULED": "Προγραμματισμένη", "ENDED": "Έληξε", "OFF": "Ανενεργή" },
    "area": { "EVERYWHERE": "Παντού", "PUBLIC": "Δημόσιες σελίδες", "HOST": "Σελίδες διοργανωτή", "GUEST": "Σελίδες καλεσμένων", "ADMIN": "Διαχείριση" },
    "fields": {
        "preview": "Προεπισκόπηση",
        "tone": "Τύπος",
        "messageEn": "Μήνυμα (Αγγλικά)",
        "messageEl": "Μήνυμα (Ελληνικά)",
        "linkUrl": "Σύνδεσμος",
        "linkUrlHint": "Μια σελίδα εδώ, όπως /pricing, ή πλήρης διεύθυνση https://.",
        "linkLabelEn": "Κείμενο συνδέσμου (Αγγλικά)",
        "linkLabelEl": "Κείμενο συνδέσμου (Ελληνικά)",
        "where": "Πού",
        "dismissible": "Μπορεί να κλείσει",
        "startsAt": "Έναρξη",
        "endsAt": "Λήξη",
        "active": "Ενεργή"
    },
    "where": { "everywhere": "Παντού", "choose": "Επιλογή περιοχών" },
    "whereHint": { "everywhere": "Εμφανίζεται σε κάθε σελίδα, σε όλους.", "choose": "Εμφανίζεται μόνο στις περιοχές που επιλέγετε." },
    "scheduleNow": "Τώρα",
    "scheduleNoEnd": "Χωρίς λήξη",
    "problems": {
        "message": "Προσθέστε το μήνυμα και στις δύο γλώσσες.",
        "linkLabel": "Προσθέστε το κείμενο του συνδέσμου και στις δύο γλώσσες.",
        "areas": "Επιλέξτε τουλάχιστον μία περιοχή.",
        "schedule": "Η λήξη πρέπει να είναι μετά την έναρξη."
    }
}
```

- [ ] **Step 4: Let the landing page ship the namespace.** Add `'SiteNotice',` to `PUBLIC_CLIENT_NAMESPACES` in `i18n/publicMessages.ts`. Leave `APP_OMITTED_NAMESPACES` alone: `(main)` keeps every namespace it doesn't omit.

- [ ] **Step 5: Run the message tests**

```bash
npx vitest run i18n
```
Expected: PASS. A test fails if `en.json` and `el.json` keys differ, or until Task 9 imports the bar into the landing layout; re-run after Task 9.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json i18n/publicMessages.ts
git commit -m "Add site notice copy"
```

---

### Task 8: The bar (TDD)

**Files:** Create `components/siteNotices/SiteNoticeBanner.tsx`, `components/siteNotices/SiteNoticeBar.tsx`, `components/siteNotices/SiteNoticeBanner.test.tsx`

Before writing the markup, load the `design:design-system` skill. The bar is host- and guest-facing, so design it mobile first. The screenshot (dark bar, amber text, a centred line with an inline underlined link, × on the right) is the reference for `WARNING` and `CRITICAL`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';

describe('SiteNoticeBanner', () => {
    afterEach(cleanup);

    it('announces a warning as an alert and an offer as a status', () => {
        const { rerender } = render(<SiteNoticeBanner tone="WARNING" message="Outage" link={null} onDismiss={null} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Outage');
        rerender(<SiteNoticeBanner tone="OFFER" message="20% off" link={null} onDismiss={null} />);
        expect(screen.getByRole('status')).toHaveTextContent('20% off');
    });

    it('opens an external link in a new tab and keeps a site path in the tab', () => {
        const { rerender } = render(
            <SiteNoticeBanner tone="INFO" message="m" link={{ href: 'https://status.example.com', label: 'View details' }} onDismiss={null} />,
        );
        const external = screen.getByRole('link', { name: 'View details' });
        expect(external).toHaveAttribute('target', '_blank');
        expect(external).toHaveAttribute('rel', 'noopener noreferrer');
        rerender(<SiteNoticeBanner tone="INFO" message="m" link={{ href: '/pricing', label: 'See plans' }} onDismiss={null} />);
        expect(screen.getByRole('link', { name: 'See plans' })).not.toHaveAttribute('target');
    });

    it('shows a close button only when it can be closed', () => {
        const onDismiss = vi.fn();
        const { rerender } = render(<SiteNoticeBanner tone="INFO" message="m" link={null} onDismiss={null} />);
        expect(screen.queryByRole('button', { name: 'close' })).toBeNull();
        rerender(<SiteNoticeBanner tone="INFO" message="m" link={null} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
```
If `toHaveTextContent` isn't available, check `vitest.setup.ts` for `@testing-library/jest-dom` and use `.textContent` assertions instead.

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run components/siteNotices/SiteNoticeBanner.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Write `SiteNoticeBanner.tsx`**

```tsx
'use client';

import { CircleAlert, Info, type LucideIcon, Tag, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { SiteNoticeTone } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Dark bar with amber text for problems (the outage look), calmer brand tones for the rest.
const TONE_STYLE: Record<SiteNoticeTone, { className: string; icon: LucideIcon }> = {
    CRITICAL: { className: 'bg-[#1d1813] text-[#f5b84a]', icon: CircleAlert },
    WARNING: { className: 'bg-[#1d1813] text-[#f5b84a]', icon: TriangleAlert },
    OFFER: { className: 'bg-primary-light text-primary-dark', icon: Tag },
    INFO: { className: 'bg-surface-muted text-ink', icon: Info },
};

function isExternal(href: string) {
    return href.startsWith('https://');
}

// One notice line. Presentational: the admin drawer's preview renders it too.
export function SiteNoticeBanner({
    tone,
    message,
    link,
    onDismiss,
}: {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
}) {
    const t = useTranslations('SiteNotice');
    const { className, icon: Icon } = TONE_STYLE[tone];
    const urgent = tone === 'WARNING' || tone === 'CRITICAL';

    return (
        <div role={urgent ? 'alert' : 'status'} className={cn('flex items-center gap-2 px-4 py-2 text-[13px] leading-5', className)}>
            {/* Message */}
            <p className="flex min-w-0 flex-1 items-start justify-center gap-2 text-center sm:items-center">
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <span className="min-w-0">
                    {message}
                    {link && (
                        <>
                            {' '}
                            {isExternal(link.href) ? (
                                <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                                    {link.label}
                                </a>
                            ) : (
                                <Link href={link.href} className="font-semibold underline underline-offset-2">
                                    {link.label}
                                </Link>
                            )}
                        </>
                    )}
                </span>
            </p>
            {/* Close */}
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={t('close')}
                    className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-80 transition-opacity hover:opacity-100"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Write `SiteNoticeBar.tsx`**

```tsx
'use client';

import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';
import { useSiteNoticeBar } from '@/hooks/useSiteNoticeBar';
import type { SiteNoticeViewArea } from '@/lib/siteNotices';

// The notice bar for a given area; renders nothing when no notice applies.
export function SiteNoticeBar({ area, initialDismissed }: { area: SiteNoticeViewArea | null; initialDismissed: string }) {
    const view = useSiteNoticeBar(area, initialDismissed);
    if (!view) return null;
    return <SiteNoticeBanner tone={view.tone} message={view.message} link={view.link} onDismiss={view.onDismiss} />;
}
```

- [ ] **Step 5: Run the test**

```bash
npx vitest run components/siteNotices/SiteNoticeBanner.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/siteNotices
git commit -m "Add the site notice bar"
```

---

### Task 9: Mount the bar and prefetch

**Files:** Create `components/siteNotices/SiteNoticeFrame.tsx`. Modify `app/(main)/layout.tsx`, `app/(landing)/layout.tsx`, `components/layout/DesktopNavRail.tsx`.

- [ ] **Step 1: Write `SiteNoticeFrame.tsx`**

```tsx
'use client';

import { type ReactNode, useRef } from 'react';

import { SiteNoticeBar } from '@/components/siteNotices/SiteNoticeBar';
import { useSiteNoticeArea } from '@/hooks/useSiteNoticeArea';
import { useSiteNoticeHeightVar } from '@/hooks/useSiteNoticeHeightVar';

// The app's root frame: the notice bar on top, the page below it. The (main) body is locked to the
// viewport height and pages scroll inside their own containers, so the page sits in a flex-1 slot
// instead of the body's full height. No z-index: story and slideshow overlays must cover the bar.
export function SiteNoticeFrame({ children, initialDismissed }: { children: ReactNode; initialDismissed: string }) {
    const area = useSiteNoticeArea();
    const barRef = useRef<HTMLDivElement>(null);
    useSiteNoticeHeightVar(barRef);

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Notice */}
            <div ref={barRef} className="shrink-0">
                <SiteNoticeBar area={area} initialDismissed={initialDismissed} />
            </div>
            {/* Page */}
            <div className="min-h-0 flex-1">{children}</div>
        </div>
    );
}
```

- [ ] **Step 2: Wire `(main)`.** Replace `app/(main)/layout.tsx`'s default export with:

```tsx
export default async function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
    const handoff = await resolveServerSession();
    const queryClient = makeQueryClient();
    // Public and the same for everyone: cached for a minute, never throws (see siteNotices.server.ts).
    queryClient.setQueryData(siteNoticeKeys.live(), await fetchLiveSiteNotices());
    const dismissed = (await cookies()).get(DISMISSED_COOKIE)?.value ?? '';

    return (
        <RootDocument messages={pickAppMessages(await getMessages())}>
            <AppProviders handoff={handoff}>
                <HydrationBoundary state={dehydrate(queryClient)}>
                    <SiteNoticeFrame initialDismissed={dismissed}>{children}</SiteNoticeFrame>
                </HydrationBoundary>
            </AppProviders>
        </RootDocument>
    );
}
```
New imports:
```tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cookies } from 'next/headers';

import { SiteNoticeFrame } from '@/components/siteNotices/SiteNoticeFrame';
import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { makeQueryClient } from '@/lib/queryClient';
import { DISMISSED_COOKIE } from '@/lib/siteNoticeDismissals';
import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';
```
The cookie value is URI-encoded on write. `cookies().get().value` returns it decoded, and the keys only use `[0-9a-zA-Z-:.]`, so both sides hold the same string. Check this in the browser in Task 12.

- [ ] **Step 3: Wire `(landing)`.** Replace its default export with:

```tsx
export default async function LandingLayout({ children }: Readonly<{ children: ReactNode }>) {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(siteNoticeKeys.live(), await fetchLiveSiteNotices());
    const dismissed = (await cookies()).get(DISMISSED_COOKIE)?.value ?? '';

    return (
        <RootDocument documentScroll messages={pickPublicMessages(await getMessages())}>
            <PublicProviders>
                <HydrationBoundary state={dehydrate(queryClient)}>
                    {/* Notice */}
                    <SiteNoticeBar area="PUBLIC" initialDismissed={dismissed} />
                    {children}
                </HydrationBoundary>
            </PublicProviders>
        </RootDocument>
    );
}
```
Use the same imports as step 2, with `SiteNoticeBar` (from `@/components/siteNotices/SiteNoticeBar`) in place of `SiteNoticeFrame`. The landing body scrolls the document, so the bar sits in normal flow.

- [ ] **Step 4: Move the desktop rail below the bar.** In `components/layout/DesktopNavRail.tsx` line ~66, replace `fixed top-0 left-0 z-40 hidden h-screen` with:

```
fixed top-[var(--site-notice-h,0px)] left-0 z-40 hidden h-[calc(100vh-var(--site-notice-h,0px))]
```
Check the token spacing in the whole className string afterwards. A glued class broke staging twice (memory "Body height vs pinch zoom").

- [ ] **Step 5: Re-run the i18n tests and the full unit suite**

```bash
npx vitest run i18n && npm test
```
Expected: PASS.

- [ ] **Step 6: Type-check and lint**

```bash
npm run type:check && npm run lint
```
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/siteNotices/SiteNoticeFrame.tsx "app/(main)/layout.tsx" "app/(landing)/layout.tsx" components/layout/DesktopNavRail.tsx
git commit -m "Mount the site notice bar on every page"
```

---

### Task 10: Admin data hooks and form rules (TDD)

**Files:** Create `hooks/useAdminSiteNotices.ts`, `lib/siteNoticeForm.ts`, `lib/siteNoticeForm.test.ts`

- [ ] **Step 1: `hooks/useAdminSiteNotices.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { siteNoticeKeys } from '@/hooks/useSiteNotices';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminSiteNoticeDto, AdminSiteNoticeRequestDto } from '@/lib/api/types';

// Admin site notices (/api/admin/site-notices). Every write refetches the list and the live notices,
// so the admin sees their own bar change at once (other visitors within about a minute).

export const adminSiteNoticeKeys = {
    all: ['admin', 'site-notices'] as const,
};

export function useAdminSiteNotices() {
    return useQuery({
        queryKey: adminSiteNoticeKeys.all,
        queryFn: () => api.get<AdminSiteNoticeDto[]>(endpoints.admin.siteNotices.list),
    });
}

function useRefreshSiteNotices() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminSiteNoticeKeys.all });
        void queryClient.invalidateQueries({ queryKey: siteNoticeKeys.live() });
    }, [queryClient]);
}

export function useCreateSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: (input: AdminSiteNoticeRequestDto) => api.post<AdminSiteNoticeDto>(endpoints.admin.siteNotices.list, input),
        onSuccess: refresh,
    });
}

export function useUpdateSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminSiteNoticeRequestDto }) =>
            api.put<AdminSiteNoticeDto>(endpoints.admin.siteNotices.byId(id), input),
        onSuccess: refresh,
    });
}

export function useDeleteSiteNotice() {
    const refresh = useRefreshSiteNotices();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.siteNotices.byId(id)),
        onSuccess: refresh,
    });
}
```

- [ ] **Step 2: Write the failing form tests** `lib/siteNoticeForm.test.ts`

```ts
import { describe, expect, it } from 'vitest';

import type { AdminSiteNoticeDto } from '@/lib/api/types';
import { EMPTY_SITE_NOTICE_FORM, formOfNotice, requestOfForm, siteNoticeFormProblem } from '@/lib/siteNoticeForm';

const filled = { ...EMPTY_SITE_NOTICE_FORM, messageEn: ' Outage ', messageEl: 'Διακοπή' };

describe('siteNoticeForm', () => {
    it('starts as an on, closable Info notice shown everywhere', () => {
        expect(EMPTY_SITE_NOTICE_FORM).toMatchObject({ tone: 'INFO', where: 'everywhere', dismissible: true, active: true });
    });

    it('names the first problem, or none', () => {
        expect(siteNoticeFormProblem(EMPTY_SITE_NOTICE_FORM)).toBe('message');
        expect(siteNoticeFormProblem({ ...filled, linkUrl: '/pricing', linkLabelEn: 'See plans' })).toBe('linkLabel');
        expect(siteNoticeFormProblem({ ...filled, where: 'choose', areas: [] })).toBe('areas');
        expect(siteNoticeFormProblem({ ...filled, startsAt: '2026-11-02T10:00', endsAt: '2026-11-01T10:00' })).toBe('schedule');
        expect(siteNoticeFormProblem(filled)).toBeNull();
    });

    it('builds a trimmed request, with EVERYWHERE or the chosen areas and no link fields without a link', () => {
        expect(requestOfForm(filled)).toEqual({
            tone: 'INFO',
            message: { en: 'Outage', el: 'Διακοπή' },
            linkUrl: null,
            linkLabel: null,
            areas: ['EVERYWHERE'],
            dismissible: true,
            startsAt: null,
            endsAt: null,
            active: true,
        });
        const offer = requestOfForm({ ...filled, where: 'choose', areas: ['PUBLIC', 'HOST'], linkUrl: '/pricing', linkLabelEn: 'See plans', linkLabelEl: 'Πακέτα' });
        expect(offer.areas).toEqual(['PUBLIC', 'HOST']);
        expect(offer.linkLabel).toEqual({ en: 'See plans', el: 'Πακέτα' });
    });

    it('round-trips a saved notice', () => {
        const saved: AdminSiteNoticeDto = {
            id: 'n1',
            version: 2,
            tone: 'OFFER',
            message: { en: '20% off', el: '20% έκπτωση' },
            linkUrl: '/pricing',
            linkLabel: { en: 'See plans', el: 'Πακέτα' },
            areas: ['PUBLIC', 'HOST'],
            dismissible: true,
            startsAt: null,
            endsAt: null,
            active: false,
            status: 'OFF',
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-01T00:00:00Z',
        };
        const form = formOfNotice(saved);
        expect(form).toMatchObject({ where: 'choose', areas: ['PUBLIC', 'HOST'], linkLabelEl: 'Πακέτα', active: false });
        expect(requestOfForm(form)).toMatchObject({ areas: ['PUBLIC', 'HOST'], linkUrl: '/pricing', active: false });
    });
});
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npx vitest run lib/siteNoticeForm.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Write `lib/siteNoticeForm.ts`**

```ts
import { instantToLocalInput } from '@/lib/adminPlanForm';
import type { AdminSiteNoticeDto, AdminSiteNoticeRequestDto, SiteNoticeArea, SiteNoticeTone } from '@/lib/api/types';
import { datetimeLocalValueToIso, parseDatetimeLocalValue } from '@/lib/datetime';

// The admin drawer's form for one site notice. Times are edited in the admin's own clock
// ("YYYY-MM-DDTHH:mm") and sent as instants. Limits mirror SiteNoticeService.

export const SITE_NOTICE_MESSAGE_MAX = 200;
export const SITE_NOTICE_LINK_LABEL_MAX = 40;
export const SITE_NOTICE_TONES: SiteNoticeTone[] = ['INFO', 'OFFER', 'WARNING', 'CRITICAL'];
export type ChoosableArea = Exclude<SiteNoticeArea, 'EVERYWHERE'>;
export const CHOOSABLE_AREAS: ChoosableArea[] = ['PUBLIC', 'HOST', 'GUEST', 'ADMIN'];

export type SiteNoticeForm = {
    tone: SiteNoticeTone;
    messageEn: string;
    messageEl: string;
    linkUrl: string;
    linkLabelEn: string;
    linkLabelEl: string;
    where: 'everywhere' | 'choose';
    areas: ChoosableArea[];
    dismissible: boolean;
    startsAt: string;
    endsAt: string;
    active: boolean;
};

export type SiteNoticeFormProblem = 'message' | 'linkLabel' | 'areas' | 'schedule';

export const EMPTY_SITE_NOTICE_FORM: SiteNoticeForm = {
    tone: 'INFO',
    messageEn: '',
    messageEl: '',
    linkUrl: '',
    linkLabelEn: '',
    linkLabelEl: '',
    where: 'everywhere',
    areas: [],
    dismissible: true,
    startsAt: '',
    endsAt: '',
    active: true,
};

export function formOfNotice(notice: AdminSiteNoticeDto): SiteNoticeForm {
    const everywhere = notice.areas.includes('EVERYWHERE');
    return {
        tone: notice.tone,
        messageEn: notice.message.en ?? '',
        messageEl: notice.message.el ?? '',
        linkUrl: notice.linkUrl ?? '',
        linkLabelEn: notice.linkLabel.en ?? '',
        linkLabelEl: notice.linkLabel.el ?? '',
        where: everywhere ? 'everywhere' : 'choose',
        areas: everywhere ? [] : (notice.areas as ChoosableArea[]),
        dismissible: notice.dismissible,
        startsAt: instantToLocalInput(notice.startsAt),
        endsAt: instantToLocalInput(notice.endsAt),
        active: notice.active,
    };
}

export function siteNoticeFormProblem(form: SiteNoticeForm): SiteNoticeFormProblem | null {
    if (!form.messageEn.trim() || !form.messageEl.trim()) return 'message';
    if (form.linkUrl.trim() && (!form.linkLabelEn.trim() || !form.linkLabelEl.trim())) return 'linkLabel';
    if (form.where === 'choose' && form.areas.length === 0) return 'areas';
    const start = parseDatetimeLocalValue(form.startsAt);
    const end = parseDatetimeLocalValue(form.endsAt);
    if (start && end && end.getTime() <= start.getTime()) return 'schedule';
    return null;
}

export function requestOfForm(form: SiteNoticeForm): AdminSiteNoticeRequestDto {
    const linkUrl = form.linkUrl.trim() || null;
    return {
        tone: form.tone,
        message: { en: form.messageEn.trim(), el: form.messageEl.trim() },
        linkUrl,
        linkLabel: linkUrl ? { en: form.linkLabelEn.trim(), el: form.linkLabelEl.trim() } : null,
        areas: form.where === 'everywhere' ? ['EVERYWHERE'] : form.areas,
        dismissible: form.dismissible,
        startsAt: datetimeLocalValueToIso(form.startsAt),
        endsAt: datetimeLocalValueToIso(form.endsAt),
        active: form.active,
    };
}
```
Check that `parseDatetimeLocalValue` is exported from `lib/datetime.ts` (it is at the time of planning) and returns `null` for `''`.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run lib/siteNoticeForm.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAdminSiteNotices.ts lib/siteNoticeForm.ts lib/siteNoticeForm.test.ts
git commit -m "Add admin site notice data hooks and form rules"
```

---

### Task 11: Admin panel, table and drawer

**Files:** Create `hooks/useSiteNoticeForm.ts`, `hooks/useSiteNoticesPanel.ts`, `components/admin/siteNotices/SiteNoticesPanel.tsx`, `SiteNoticesTable.tsx`, `SiteNoticeDrawer.tsx`, `SiteNoticeToneControl.tsx`, `SiteNoticeAreasControl.tsx`, `SiteNoticePills.tsx`, `components/admin/siteNotices/SiteNoticeDrawer.test.tsx`. Modify `components/admin/AdminNavigationContext.tsx`, `AdminShellNav.tsx`, `AdminConsole.tsx`.

Before the markup, load the `design:design-system` skill. Follow the admin direction in `CLAUDE.md`: slate surfaces, a data table with compact pills, a right-side drawer, a segmented control with a one-line caption, and monospace for dates. Reuse `AdminDrawer`, `AdminField`/`adminInputClass`, `AdminSwitch`, `DateTimeField` and `ConfirmActionModal`, and copy the segmented-control look from `VisibilitySegmentedControl`.

- [ ] **Step 1: Register the section**
  - `AdminNavigationContext.tsx`:
    - add `| 'siteNotices'` to `AdminTab`
    - add `'#site-notices': 'siteNotices'` to `HASH_TO_TAB` and `siteNotices: '#site-notices'` to `TAB_TO_HASH`
    - import `Megaphone` from `lucide-react` and add `{ key: 'siteNotices', label: t('siteNotices'), icon: Megaphone }` to `tabs` after `billingOps`
  - `AdminShellNav.tsx`: add `siteNotices: 'operations'` to `TAB_GROUP`.
  - `AdminConsole.tsx`: import `SiteNoticesPanel` and add, next to the `appReviews` branch:

```tsx
    if (tab === 'siteNotices') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                <SiteNoticesPanel />
            </div>
        );
    }
```

- [ ] **Step 2: `hooks/useSiteNoticesPanel.ts`** (drawer state, kept out of the component)

```ts
'use client';

import { type MouseEvent, useCallback, useRef, useState } from 'react';

import { useAdminSiteNotices } from '@/hooks/useAdminSiteNotices';
import type { AdminSiteNoticeDto } from '@/lib/api/types';

// token: which opening this is. The drawer is keyed on it, so each opening starts from the saved values.
type DrawerState = { open: boolean; notice: AdminSiteNoticeDto | null; token: number };

export function useSiteNoticesPanel() {
    const query = useAdminSiteNotices();
    const notices = query.data ?? [];
    const [drawer, setDrawer] = useState<DrawerState>({ open: false, notice: null, token: 0 });
    const nextToken = useRef(0);

    const open = useCallback((notice: AdminSiteNoticeDto | null) => {
        nextToken.current += 1;
        setDrawer({ open: true, notice, token: nextToken.current });
    }, []);

    const handleCreateClick = useCallback(() => open(null), [open]);

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = notices.find((notice) => notice.id === event.currentTarget.dataset.noticeId);
            if (found) open(found);
        },
        [notices, open],
    );

    const closeDrawer = useCallback(() => setDrawer((current) => ({ ...current, open: false })), []);

    return { query, notices, drawer, handleCreateClick, handleEditClick, closeDrawer };
}
```

- [ ] **Step 3: `hooks/useSiteNoticeForm.ts`** (the drawer's state and actions)

```ts
'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateSiteNotice, useDeleteSiteNotice, useUpdateSiteNotice } from '@/hooks/useAdminSiteNotices';
import type { AdminSiteNoticeDto, SiteNoticeTone } from '@/lib/api/types';
import {
    type ChoosableArea,
    EMPTY_SITE_NOTICE_FORM,
    formOfNotice,
    requestOfForm,
    type SiteNoticeForm,
    siteNoticeFormProblem,
} from '@/lib/siteNoticeForm';

type TextField = 'messageEn' | 'messageEl' | 'linkUrl' | 'linkLabelEn' | 'linkLabelEl';

export function useSiteNoticeForm(notice: AdminSiteNoticeDto | null, onDone: () => void) {
    const create = useCreateSiteNotice();
    const update = useUpdateSiteNotice();
    const remove = useDeleteSiteNotice();
    const [form, setForm] = useState<SiteNoticeForm>(() => (notice ? formOfNotice(notice) : EMPTY_SITE_NOTICE_FORM));
    const [previewLocale, setPreviewLocale] = useState<'en' | 'el'>('en');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [showProblem, setShowProblem] = useState(false);

    const problem = siteNoticeFormProblem(form);
    const busy = create.isPending || update.isPending || remove.isPending;

    function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function setTone(tone: SiteNoticeTone) {
        setForm((current) => ({ ...current, tone }));
    }

    function setWhere(where: SiteNoticeForm['where']) {
        setForm((current) => ({ ...current, where }));
    }

    function toggleArea(area: ChoosableArea) {
        setForm((current) => ({
            ...current,
            areas: current.areas.includes(area) ? current.areas.filter((item) => item !== area) : [...current.areas, area],
        }));
    }

    function setDismissible(dismissible: boolean) {
        setForm((current) => ({ ...current, dismissible }));
    }

    function setActive(active: boolean) {
        setForm((current) => ({ ...current, active }));
    }

    function setStartsAt(startsAt: string) {
        setForm((current) => ({ ...current, startsAt }));
    }

    function setEndsAt(endsAt: string) {
        setForm((current) => ({ ...current, endsAt }));
    }

    async function save() {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            const input = requestOfForm(form);
            if (notice) await update.mutateAsync({ id: notice.id, input });
            else await create.mutateAsync(input);
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        void save();
    }

    async function confirmDeletion() {
        if (!notice) return;
        setError(null);
        try {
            await remove.mutateAsync(notice.id);
            setConfirmDelete(false);
            onDone();
        } catch (caught) {
            setConfirmDelete(false);
            setError(caught);
        }
    }

    return {
        form,
        problem: showProblem ? problem : null,
        busy,
        error,
        previewLocale,
        setPreviewLocale,
        confirmDelete,
        openDeleteConfirmation: () => setConfirmDelete(true),
        closeDeleteConfirmation: () => setConfirmDelete(false),
        confirmDeletion,
        handleTextChange,
        handleSubmit,
        setTone,
        setWhere,
        toggleArea,
        setDismissible,
        setActive,
        setStartsAt,
        setEndsAt,
    };
}
```

- [ ] **Step 4: Write the drawer test** `components/admin/siteNotices/SiteNoticeDrawer.test.tsx`. Mock `next-intl`, `AdminDrawer` and `ConfirmActionModal` the same way `LandingCategoryDrawer.test.tsx` does (copy its first 60 lines of mocks). Then mock the data hooks:

```tsx
const hooks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/useAdminSiteNotices', () => ({
    useCreateSiteNotice: () => ({ mutateAsync: hooks.create, isPending: false }),
    useUpdateSiteNotice: () => ({ mutateAsync: hooks.update, isPending: false }),
    useDeleteSiteNotice: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));
```
Cases:
1. Creating with both messages filled sends `{ areas: ['EVERYWHERE'], tone: 'INFO', linkUrl: null, … }` to `hooks.create` and calls `onCloseAction`.
2. Saving with an empty Greek message shows `siteNotices.problems.message` and doesn't call `hooks.create`.
3. Picking "Choose areas", ticking `area.PUBLIC` and `area.HOST`, then saving sends `areas: ['PUBLIC', 'HOST']`.
4. Editing an existing notice and confirming delete calls `hooks.remove('n1')`.

Fill inputs with `fireEvent.change(screen.getByLabelText('siteNotices.fields.messageEn'), { target: { value: 'Outage' } })`, and submit with `fireEvent.click(screen.getByRole('button', { name: 'save' }))`.

- [ ] **Step 5: Run to confirm it fails**

```bash
npx vitest run components/admin/siteNotices/SiteNoticeDrawer.test.tsx
```
Expected: FAIL.

- [ ] **Step 6: Write the small controls**

`SiteNoticePills.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { SiteNoticeArea, SiteNoticeStatus, SiteNoticeTone } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold';

const STATUS_CLASS: Record<SiteNoticeStatus, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    SCHEDULED: 'bg-status-warn-wash text-status-warn',
    ENDED: 'bg-status-neutral-wash text-status-neutral',
    OFF: 'bg-status-neutral-wash text-status-neutral',
};

const TONE_CLASS: Record<SiteNoticeTone, string> = {
    CRITICAL: 'bg-status-danger-wash text-status-danger',
    WARNING: 'bg-status-warn-wash text-status-warn',
    OFFER: 'bg-status-neutral-wash text-ink',
    INFO: 'bg-status-neutral-wash text-status-neutral',
};

export function SiteNoticeStatusPill({ status }: { status: SiteNoticeStatus }) {
    const t = useTranslations('AdminPage.siteNotices');
    return <span className={cn(PILL, STATUS_CLASS[status])}>{t(`status.${status}`)}</span>;
}

export function SiteNoticeTonePill({ tone }: { tone: SiteNoticeTone }) {
    const t = useTranslations('AdminPage.siteNotices');
    return <span className={cn(PILL, TONE_CLASS[tone])}>{t(`tone.${tone}`)}</span>;
}

export function SiteNoticeAreaPills({ areas }: { areas: SiteNoticeArea[] }) {
    const t = useTranslations('AdminPage.siteNotices');
    return (
        <span className="flex flex-wrap gap-1">
            {areas.map((area) => (
                <span key={area} className="rounded-md border border-border px-2 py-0.5 text-xs text-ink-muted">
                    {t(`area.${area}`)}
                </span>
            ))}
        </span>
    );
}
```

`SiteNoticeToneControl.tsx` (segmented, same look as `VisibilitySegmentedControl`):
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { SiteNoticeTone } from '@/lib/api/types';
import { SITE_NOTICE_TONES } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

export function SiteNoticeToneControl({ value, onChangeAction }: { value: SiteNoticeTone; onChangeAction: (tone: SiteNoticeTone) => void }) {
    const t = useTranslations('AdminPage.siteNotices');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.tone as SiteNoticeTone);
    }

    return (
        <div role="group" aria-label={t('fields.tone')} className="flex gap-1 rounded-lg bg-canvas p-1">
            {SITE_NOTICE_TONES.map((tone) => (
                <button
                    key={tone}
                    type="button"
                    data-tone={tone}
                    onClick={handleClick}
                    aria-pressed={value === tone}
                    className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                        value === tone ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t(`tone.${tone}`)}
                </button>
            ))}
        </div>
    );
}
```

`SiteNoticeAreasControl.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent } from 'react';

import { CHOOSABLE_AREAS, type ChoosableArea, type SiteNoticeForm } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

const WHERE_OPTIONS: SiteNoticeForm['where'][] = ['everywhere', 'choose'];

// "Everywhere / Choose areas" plus the area checkboxes: one control for one decision.
export function SiteNoticeAreasControl({
    where,
    areas,
    onWhereChangeAction,
    onToggleAreaAction,
}: {
    where: SiteNoticeForm['where'];
    areas: ChoosableArea[];
    onWhereChangeAction: (where: SiteNoticeForm['where']) => void;
    onToggleAreaAction: (area: ChoosableArea) => void;
}) {
    const t = useTranslations('AdminPage.siteNotices');

    function handleWhereClick(event: MouseEvent<HTMLButtonElement>) {
        onWhereChangeAction(event.currentTarget.dataset.where as SiteNoticeForm['where']);
    }

    function handleAreaChange(event: ChangeEvent<HTMLInputElement>) {
        onToggleAreaAction(event.currentTarget.value as ChoosableArea);
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('fields.where')}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {WHERE_OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-where={option}
                        onClick={handleWhereClick}
                        aria-pressed={where === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            where === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`where.${option}`)}
                    </button>
                ))}
            </div>
            <p className="text-xs leading-5 text-ink-faint">{t(`whereHint.${where}`)}</p>
            {where === 'choose' && (
                <div className="grid grid-cols-2 gap-2">
                    {CHOOSABLE_AREAS.map((area) => (
                        <label key={area} className="flex items-center gap-2 text-sm text-ink">
                            <input type="checkbox" value={area} checked={areas.includes(area)} onChange={handleAreaChange} />
                            {t(`area.${area}`)}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 7: Write `SiteNoticeDrawer.tsx`**

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { SiteNoticeAreasControl } from '@/components/admin/siteNotices/SiteNoticeAreasControl';
import { SiteNoticeToneControl } from '@/components/admin/siteNotices/SiteNoticeToneControl';
import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useSiteNoticeForm } from '@/hooks/useSiteNoticeForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminSiteNoticeDto } from '@/lib/api/types';
import { SITE_NOTICE_LINK_LABEL_MAX, SITE_NOTICE_MESSAGE_MAX } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

const FORM_ID = 'site-notice-form';
const PREVIEW_LOCALES = ['en', 'el'] as const;

// Create or edit one site notice. The panel remounts it (key) on every opening.
export function SiteNoticeDrawer({ open, notice, onCloseAction }: { open: boolean; notice: AdminSiteNoticeDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = useSiteNoticeForm(notice, onCloseAction);
    const { form } = f;
    const previewMessage = (f.previewLocale === 'en' ? form.messageEn : form.messageEl) || '…';
    const previewLabel = f.previewLocale === 'en' ? form.linkLabelEn : form.linkLabelEl;

    function handlePreviewLocaleClick(event: MouseEvent<HTMLButtonElement>) {
        f.setPreviewLocale(event.currentTarget.dataset.locale as 'en' | 'el');
    }

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={f.busy}
                title={notice ? t('siteNotices.editTitle') : t('siteNotices.createTitle')}
                footer={
                    <>
                        <div>
                            {/* Danger */}
                            {notice && (
                                <button
                                    type="button"
                                    onClick={f.openDeleteConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('siteNotices.delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={f.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={f.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {f.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Preview */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('siteNotices.fields.preview')}</p>
                            <div className="flex gap-1 rounded-md bg-canvas p-0.5">
                                {PREVIEW_LOCALES.map((locale) => (
                                    <button
                                        key={locale}
                                        type="button"
                                        data-locale={locale}
                                        onClick={handlePreviewLocaleClick}
                                        aria-pressed={f.previewLocale === locale}
                                        className={cn(
                                            'rounded px-2 py-0.5 font-mono text-[11px] font-bold',
                                            f.previewLocale === locale ? 'bg-card text-ink shadow-sm' : 'text-ink-faint',
                                        )}
                                    >
                                        {locale.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border">
                            <SiteNoticeBanner
                                tone={form.tone}
                                message={previewMessage}
                                link={form.linkUrl.trim() ? { href: '#', label: previewLabel || '…' } : null}
                                onDismiss={form.dismissible ? () => undefined : null}
                            />
                        </div>
                    </div>

                    {/* Tone */}
                    <SiteNoticeToneControl value={form.tone} onChangeAction={f.setTone} />

                    {/* Message */}
                    <AdminField label={t('siteNotices.fields.messageEn')} required hint={`${form.messageEn.length}/${SITE_NOTICE_MESSAGE_MAX}`}>
                        <input name="messageEn" aria-label={t('siteNotices.fields.messageEn')} className={adminInputClass()} maxLength={SITE_NOTICE_MESSAGE_MAX} value={form.messageEn} onChange={f.handleTextChange} />
                    </AdminField>
                    <AdminField label={t('siteNotices.fields.messageEl')} required hint={`${form.messageEl.length}/${SITE_NOTICE_MESSAGE_MAX}`}>
                        <input name="messageEl" aria-label={t('siteNotices.fields.messageEl')} className={adminInputClass()} maxLength={SITE_NOTICE_MESSAGE_MAX} value={form.messageEl} onChange={f.handleTextChange} />
                    </AdminField>

                    {/* Link */}
                    <AdminField label={t('siteNotices.fields.linkUrl')} optional hint={t('siteNotices.fields.linkUrlHint')}>
                        <input name="linkUrl" aria-label={t('siteNotices.fields.linkUrl')} className={adminInputClass('font-mono')} maxLength={500} value={form.linkUrl} onChange={f.handleTextChange} />
                    </AdminField>
                    {form.linkUrl.trim() && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <AdminField label={t('siteNotices.fields.linkLabelEn')} required>
                                <input name="linkLabelEn" aria-label={t('siteNotices.fields.linkLabelEn')} className={adminInputClass()} maxLength={SITE_NOTICE_LINK_LABEL_MAX} value={form.linkLabelEn} onChange={f.handleTextChange} />
                            </AdminField>
                            <AdminField label={t('siteNotices.fields.linkLabelEl')} required>
                                <input name="linkLabelEl" aria-label={t('siteNotices.fields.linkLabelEl')} className={adminInputClass()} maxLength={SITE_NOTICE_LINK_LABEL_MAX} value={form.linkLabelEl} onChange={f.handleTextChange} />
                            </AdminField>
                        </div>
                    )}

                    {/* Where */}
                    <SiteNoticeAreasControl where={form.where} areas={form.areas} onWhereChangeAction={f.setWhere} onToggleAreaAction={f.toggleArea} />

                    {/* Schedule */}
                    <div className="grid gap-4">
                        <AdminField label={t('siteNotices.fields.startsAt')} optional hint={form.startsAt ? undefined : t('siteNotices.scheduleNow')}>
                            <DateTimeField value={form.startsAt} onChange={f.setStartsAt} inputClassName={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('siteNotices.fields.endsAt')} optional hint={form.endsAt ? undefined : t('siteNotices.scheduleNoEnd')}>
                            <DateTimeField value={form.endsAt} onChange={f.setEndsAt} inputClassName={adminInputClass()} />
                        </AdminField>
                    </div>

                    {/* Switches */}
                    <div className="rounded-lg border border-border">
                        <AdminSwitch label={t('siteNotices.fields.dismissible')} checked={form.dismissible} onCheckedChangeAction={f.setDismissible} />
                        <AdminSwitch label={t('siteNotices.fields.active')} checked={form.active} onCheckedChangeAction={f.setActive} />
                    </div>

                    {/* Errors */}
                    {f.problem && <p className="text-sm text-status-danger">{t(`siteNotices.problems.${f.problem}`)}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={f.confirmDelete}
                title={t('siteNotices.deleteTitle')}
                body={t('siteNotices.deleteBody')}
                confirmLabel={t('siteNotices.deleteConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={f.busy}
                onCloseAction={f.closeDeleteConfirmation}
                onConfirmAction={f.confirmDeletion}
            />
        </>
    );
}
```
`DateTimeField` takes no `aria-label` (only `aria-invalid`), so its label comes from `AdminField`. Check `AdminSwitch`'s props against its file before running. Fix any mismatch here, not in the shared components.

- [ ] **Step 8: Write `SiteNoticesTable.tsx` and `SiteNoticesPanel.tsx`**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { SiteNoticeAreaPills, SiteNoticeStatusPill, SiteNoticeTonePill } from '@/components/admin/siteNotices/SiteNoticePills';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { AdminSiteNoticeDto } from '@/lib/api/types';

function formatWhen(value: string | null, locale: string): string | null {
    if (!value) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SiteNoticesTable({ notices, onEditAction }: { notices: AdminSiteNoticeDto[]; onEditAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
    const t = useTranslations('AdminPage.siteNotices');
    const locale = useLocale();
    const localizedText = useLocalizedText();

    return (
        <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                <tr>
                    <th className="px-4 py-2.5">{t('columns.tone')}</th>
                    <th className="px-4 py-2.5">{t('columns.message')}</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">{t('columns.areas')}</th>
                    <th className="px-4 py-2.5">{t('columns.status')}</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">{t('columns.schedule')}</th>
                    <th className="w-10 px-2 py-2.5" />
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {notices.map((notice) => {
                    const message = localizedText(notice.message);
                    const start = formatWhen(notice.startsAt, locale) ?? t('scheduleNow');
                    const end = formatWhen(notice.endsAt, locale) ?? t('scheduleNoEnd');
                    return (
                        <tr key={notice.id} className="hover:bg-canvas/60">
                            <td className="px-4 py-3"><SiteNoticeTonePill tone={notice.tone} /></td>
                            <td className="max-w-0 px-4 py-3"><span className="block truncate text-ink">{message}</span></td>
                            <td className="hidden px-4 py-3 md:table-cell"><SiteNoticeAreaPills areas={notice.areas} /></td>
                            <td className="px-4 py-3"><SiteNoticeStatusPill status={notice.status} /></td>
                            <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted lg:table-cell">{start} → {end}</td>
                            <td className="px-2 py-3">
                                <button
                                    type="button"
                                    data-notice-id={notice.id}
                                    onClick={onEditAction}
                                    aria-label={`${t('edit')} ${message}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
```

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SiteNoticeDrawer } from '@/components/admin/siteNotices/SiteNoticeDrawer';
import { SiteNoticesTable } from '@/components/admin/siteNotices/SiteNoticesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useSiteNoticesPanel } from '@/hooks/useSiteNoticesPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// The notice bar's admin (spec 2026-10-22-site-notices-design §5).
export function SiteNoticesPanel() {
    const t = useTranslations('AdminPage');
    const { query, notices, drawer, handleCreateClick, handleEditClick, closeDrawer } = useSiteNoticesPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('siteNotices.create')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && notices.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('siteNotices.empty')}</p>}
                {notices.length > 0 && <SiteNoticesTable notices={notices} onEditAction={handleEditClick} />}
            </section>

            <SiteNoticeDrawer key={drawer.token} open={drawer.open} notice={drawer.notice} onCloseAction={closeDrawer} />
        </section>
    );
}
```

- [ ] **Step 9: Run the drawer test, then the whole suite, type-check and lint**

```bash
npx vitest run components/admin/siteNotices && npm test && npm run type:check && npm run lint
```
Expected: all clean. Run `npm run lint:fix` for formatting, then re-run `npm run lint`.

- [ ] **Step 10: Commit**

```bash
git add hooks/useSiteNoticeForm.ts hooks/useSiteNoticesPanel.ts components/admin/siteNotices components/admin/AdminNavigationContext.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx
git commit -m "Add the site notices admin panel"
```

---

### Task 12: See it working

Read the memories "Dev server shares .next", "Browser pane and signed-in UI", "Local backend CORS is :3000 only" and "Shared test account revokes mid-run" first. Only open the preview with `preview_start {url: "http://localhost:3000/"}`, never by name. Signed-in checks need the local Spring with the backend branch running, plus the local test login from the user.

- [ ] **Step 1: Create notices as an admin** at `/admin#site-notices`:
  - A: `WARNING`, Everywhere, can't be closed, link `https://status.railway.com`
  - B: `OFFER`, Public site + Host pages, closable, link `/pricing`
- [ ] **Step 2: Check each area at phone width (375px) first, then desktop.**
  - landing `/`: shows A; with A off, shows B
  - `/login`: A
  - `/home`: A, or B once A is off
  - a guest event feed: A only, never B
  - `/admin`: A, styled the same as everywhere else
  - `/demo/...`: no bar
  - open a story: it covers the bar
- [ ] **Step 3: Desktop rail.** At ≥1024px the left rail starts below the bar and fills the rest of the height. Turn the notice off and refetch (focus the window): the rail goes back to the top.
- [ ] **Step 4: Closing.**
  - Close B and reload: no flash of B.
  - Edit B's text in admin and reload: B shows again.
- [ ] **Step 5: Outage.** Stop the local Spring and click around the app until two requests fail. The outage line shows, with no ×. Start Spring again, act once, and it goes away.
- [ ] **Step 6: Admin drawer.** Long Greek copy wraps. The preview toggles EN/EL. Delete asks for confirmation.
- [ ] **Step 7: Pinch zoom** on `/home` (memory "Body height vs pinch zoom"): the page still fills the screen with no blank strip. Use the user's phone if they're available; otherwise, say in the PR that it wasn't checked on a real device.
- [ ] **Step 8: Run the review skills** `design:design-critique` and `design:accessibility-review` on the bar and the drawer. Fix what they find.

---

### Task 13: Docs, spec, SEO, PR

- [ ] **Step 1: Write `docs/uptime-monitoring.md`**

```markdown
# Uptime monitoring

Spring can't warn anyone about its own outage, so an outside service watches it.

## Setup (Better Stack or UptimeRobot, free tier)

1. Create a monitor of type HTTP(s) for `<Spring base URL>/actuator/health`.
2. Check every 1 minute. Expect status 200 and the body to contain `"UP"`.
3. Alert after 2 failed checks in a row.
4. Alert by email to every platform admin, and turn on push in the provider's phone app.
5. Optional: a second monitor for the site's home page on Vercel.

## When it fires

Post a site notice from the admin console (Site notices → New notice, tone Critical, Everywhere).
If Spring itself is down, the app already shows the built-in outage line to anyone whose requests
fail; notices published before the outage keep showing from the cache.
```

- [ ] **Step 2: Update the spec** (`docs/superpowers/specs/2026-10-22-site-notices-design.md`) to match the deviations at the top of this plan:
  - dismissals in a cookie
  - one mount per root layout, with `siteNoticeAreaFor`
  - story and slideshow are covered by their overlays
  - `--site-notice-h` for the rail
  - `/api` paths
  - JSON maps for localized text

- [ ] **Step 3: SEO check.** Read `docs/seo-guidelines.md`. `/api/site-notices` is an API route, not a page, and no route's metadata changes. Confirm that no rule applies, or list the ones that do as **BLOCKER**s.

- [ ] **Step 4: Final checks**

```bash
npm run type:check && npm run lint && npm test
```
Expected: clean.

- [ ] **Step 5: Commit, push, open the PR into staging**

```bash
git add docs/uptime-monitoring.md docs/superpowers/specs/2026-10-22-site-notices-design.md
git commit -m "Document uptime monitoring and update the site notices spec"
git push -u origin claude/global-announcement-system-6d486a
gh pr create --base staging --title "Site notices: a platform-wide notice bar" --body "$(cat <<'EOF'
Adds the site notice bar (spec docs/superpowers/specs/2026-10-22-site-notices-design.md).

- One bar at the top of every page; admins pick tone, text (EN/EL), optional link, areas, schedule, and whether it can be closed
- Areas follow the viewer: public site, host pages, guest pages, admin
- Cached through /api/site-notices; the last good copy keeps showing if Spring fails
- A built-in outage line shows when this browser can't reach Spring
- Admin: Operations → Site notices (table + drawer)
- docs/uptime-monitoring.md: external uptime alerts

Needs the backend PR (site_notices, V177) deployed for notices to appear; without it the bar stays empty.

SEO: no blockers (no page routes changed).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
After opening it, bind the PR with the ccd_pr tools as the session instructions describe.
