# Admin event Activity: frontend plan (KAN-214, storywall)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an **Activity** tab to the admin event page that shows the anonymous counts and charts from `GET /api/admin/events/{eventId}/activity`.

**Architecture:**
- The tab lives in the admin hash (`#events/<id>/activity`).
- The container `EventActivityTab` calls `useAdminEventActivity` and hands plain data to a presentational `EventActivityContent`. Storybook and the component tests render `EventActivityContent` directly with a fixture.
- Every derived value (days, hour columns, heatmap, peaks, the per-day series) comes from pure, unit-tested helpers in `lib/adminEventActivity.ts`.
- Charts use `recharts`, which the admin console already uses. The heatmap is a CSS grid.

**Tech stack:** Next.js App Router (client component inside the hash-routed admin console), React 19, TanStack Query, next-intl, Tailwind, recharts 3, lucide-react, Vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Spec:** `docs/superpowers/specs/2026-11-14-admin-event-activity-design.md`
**Depends on:** the backend plan, `docs/superpowers/plans/2026-11-14-admin-event-activity-backend.md`. Tasks 2 to 9 work against the fixture, so they can be built before the backend is deployed.

Branch: `claude/kan-214-admin-event-activity`, already created from `origin/staging`. Commit messages start with `KAN-214:` and end with the `Co-Authored-By` line.

## Files

| File | Responsibility |
|---|---|
| Modify `lib/api/types.ts` | `AdminEventActivityDto` |
| Modify `lib/api/endpoints.ts` | `admin.events.activity(eventId)` |
| Modify `lib/adminEvents.ts` (+ `.test.ts`) | Tab segment in the events hash |
| Create `lib/adminEventActivity.ts` (+ `.test.ts`) | Pure derivations and series colors |
| Modify `hooks/useAdminEvents.ts` | `adminEventKeys.activity`, `useAdminEventActivity` |
| Create `hooks/useEventDetailTab.ts` | Current tab from the hash |
| Create `hooks/useEventActivityView.ts` | Day picker state and derived series, for the content component |
| Create `components/admin/events/activity/*.tsx` | Tabs, toolbar, members line, tiles, hourly, heatmap, peaks, daily, empty, skeleton, content, container |
| Create `components/admin/events/activity/__fixtures__/eventActivity.ts` | Wedding, empty and multi-day fixtures |
| Create `components/admin/events/activity/EventActivityContent.test.tsx` | Component tests |
| Create `components/admin/events/activity/EventActivityContent.stories.tsx` | Visual stories |
| Modify `components/admin/events/EventDetailPage.tsx` | Tab bar, and switching between Settings and Activity |
| Modify `messages/en.json`, `messages/el.json` | `AdminPage.events.activity.*`, but only after the copy is approved |

---

### Task 1: Copy approval (blocking)

CLAUDE.md does not allow adding any user-facing string without the owner's explicit yes. Show this table in an `AskUserQuestion` popup, split across several popups if needed, and wait for a clear yes on every row. Apply any wording the owner changes in the table before Task 10.

| Key (`AdminPage.events.activity.`) | English | Greek |
|---|---|---|
| `tabs.settings` | Settings | Ρυθμίσεις |
| `tabs.activity` | Activity | Δραστηριότητα |
| `tabs.label` | Event sections | Ενότητες εκδήλωσης |
| `updatedAt` | Updated {time} | Ενημέρωση {time} |
| `refresh` | Refresh | Ανανέωση |
| `loading` | Loading activity | Φόρτωση δραστηριότητας |
| `members` | {contributed} of {total} members contributed · {share} | {contributed} από {total} μέλη συμμετείχαν · {share} |
| `tiles.posts` | Posts | Αναρτήσεις |
| `tiles.postMedia` | {count, plural, one {# photo or video} other {# photos and videos}} | {count, plural, one {# φωτογραφία ή βίντεο} other {# φωτογραφίες και βίντεο}} |
| `tiles.stories` | Stories | Ιστορίες |
| `tiles.storyViews` | {count, plural, one {# view} other {# views}} | {count, plural, one {# προβολή} other {# προβολές}} |
| `tiles.gallery` | Gallery | Γκαλερί |
| `tiles.viaQr` | {count} via QR | {count} μέσω QR |
| `tiles.pro` | Professional uploads | Ανεβάσματα επαγγελματιών |
| `tiles.reactions` | Reactions | Αντιδράσεις |
| `tiles.comments` | Comments | Σχόλια |
| `tiles.wishes` | Wishes | Ευχές |
| `tiles.playlist` | Songs suggested | Προτάσεις τραγουδιών |
| `tiles.votes` | {count, plural, one {# vote} other {# votes}} | {count, plural, one {# ψήφος} other {# ψήφοι}} |
| `tiles.quiz` | Quiz answers | Απαντήσεις κουίζ |
| `tiles.rsvp` | Attending | Θα παρευρεθούν |
| `tiles.declined` | {count} not attending | {count} δεν θα παρευρεθούν |
| `tiles.removed` | Removed | Αφαιρέθηκαν |
| `removed.posts` | {count, plural, one {# post} other {# posts}} | {count, plural, one {# ανάρτηση} other {# αναρτήσεις}} |
| `removed.stories` | {count, plural, one {# story} other {# stories}} | {count, plural, one {# ιστορία} other {# ιστορίες}} |
| `removed.galleryUploads` | {count, plural, one {# gallery upload} other {# gallery uploads}} | {count, plural, one {# ανέβασμα στη γκαλερί} other {# ανεβάσματα στη γκαλερί}} |
| `removed.comments` | {count, plural, one {# comment} other {# comments}} | {count, plural, one {# σχόλιο} other {# σχόλια}} |
| `removed.wishes` | {count, plural, one {# wish} other {# wishes}} | {count, plural, one {# ευχή} other {# ευχές}} |
| `series.posts` | Posts | Αναρτήσεις |
| `series.stories` | Stories | Ιστορίες |
| `series.gallery` | Gallery | Γκαλερί |
| `series.wishes` | Wishes | Ευχές |
| `hourly.title` | Per hour | Ανά ώρα |
| `hourly.previous` | Previous day | Προηγούμενη ημέρα |
| `hourly.next` | Next day | Επόμενη ημέρα |
| `heatmap.title` | Busiest hours of the day | Πιο πολυσύχναστες ώρες της ημέρας |
| `heatmap.cell` | {kind} at {hour}: {count} | {kind} στις {hour}: {count} |
| `peaks.title` | Peak moments | Κορυφαίες στιγμές |
| `daily.title` | Per day | Ανά ημέρα |
| `daily.earlier` | Earlier | Νωρίτερα |
| `empty` | No activity yet. | Δεν υπάρχει δραστηριότητα ακόμα. |

Numbers, times, dates and emoji are formatted data, not copy. The tooltip header ("23:00 · 214") and the peak rows ("Sat 23:00 … 214") use only formatted values.

- [ ] **Step 1:** Show the table in popups and record the approved wording here.
- [ ] **Step 2:** Do not start Task 10 until every row is approved.

---

### Task 2: Types and endpoint

**Files:** Modify `lib/api/types.ts` and `lib/api/endpoints.ts`

- [ ] **Step 1: Add the DTO** next to `AdminEventDetailDto` in `lib/api/types.ts`

```ts
// GET /api/admin/events/{eventId}/activity — anonymous counts; hour is local "yyyy-MM-ddTHH:00" in `timezone`.
export interface AdminEventActivityDto {
    timezone: string;
    eventStartAt: string | null;
    eventEndAt: string | null;
    generatedAt: string;
    members: { total: number; contributed: number };
    totals: {
        posts: number;
        postMedia: number;
        stories: number;
        storyViews: number;
        galleryUploads: number;
        galleryViaQr: number;
        proUploads: number;
        comments: number;
        reactions: number;
        reactionsByType: { code: string; emoji: string | null; count: number }[];
        wishes: number | null;
        playlist: { suggestions: number; votes: number } | null;
        quizAnswers: number | null;
        rsvp: { attending: number; declined: number } | null;
    };
    removed: { posts: number; stories: number; galleryUploads: number; comments: number; wishes: number };
    hours: AdminEventActivityHour[];
}

export interface AdminEventActivityHour {
    hour: string;
    posts: number;
    stories: number;
    gallery: number;
    wishes: number;
}
```

- [ ] **Step 2: Add the endpoint.** In `lib/api/endpoints.ts`, inside `admin.events`, after `vendors: (eventId: string) => \`/api/admin/events/${eventId}/vendors\`,`, add:

```ts
            activity: (eventId: string) => `/api/admin/events/${eventId}/activity`,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts
git commit -m "KAN-214: Add the admin event activity type and endpoint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tab in the events hash

**Files:** Modify `lib/adminEvents.ts` and `lib/adminEvents.test.ts`

- [ ] **Step 1: Write the failing tests.** Add `parseEventsTab` to the import list in `lib/adminEvents.test.ts`, then add this to the existing hash `describe` block:

```ts
    it('reads and writes the activity tab', () => {
        expect(formatEventsHash('e-1', 'activity')).toBe('#events/e-1/activity');
        expect(formatEventsHash('e-1', 'settings')).toBe('#events/e-1');
        expect(parseEventsHash('#events/e-1/activity')).toBe('e-1');
        expect(parseEventsTab('#events/e-1/activity')).toBe('activity');
        expect(parseEventsTab('#events/e-1')).toBe('settings');
        expect(parseEventsTab('#events/e-1/unknown')).toBe('settings');
        expect(parseEventsHash(formatEventsHash('a b/c', 'activity'))).toBe('a b/c');
    });
```

- [ ] **Step 2: Run them and check they fail**

Run: `npx vitest run lib/adminEvents.test.ts`
Expected: FAIL, because `parseEventsTab` is not exported.

- [ ] **Step 3: Implement.** Replace `parseEventsHash` and `formatEventsHash` in `lib/adminEvents.ts`:

```ts
export type EventDetailTab = 'settings' | 'activity';

// `#events/<eventId>` opens that event's settings, `#events/<eventId>/activity` its activity; the bare root is the list.
// The id is URI-encoded, so a slash inside it never splits the hash.
export function parseEventsHash(hash: string): string | null {
    if (!isEventsHash(hash)) return null;
    const [encodedId] = hash.slice(EVENTS_HASH_ROOT.length + 1).split('/');
    if (!encodedId) return null;
    try {
        return decodeURIComponent(encodedId);
    } catch {
        return null;
    }
}

export function parseEventsTab(hash: string): EventDetailTab {
    if (!isEventsHash(hash)) return 'settings';
    return hash.slice(EVENTS_HASH_ROOT.length + 1).split('/')[1] === 'activity' ? 'activity' : 'settings';
}

export function formatEventsHash(eventId: string | null, tab: EventDetailTab = 'settings'): string {
    if (!eventId) return EVENTS_HASH_ROOT;
    const base = `${EVENTS_HASH_ROOT}/${encodeURIComponent(eventId)}`;
    return tab === 'activity' ? `${base}/activity` : base;
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run lib/adminEvents.test.ts components/admin/AdminNavigationContext.events.test.tsx`
Expected: PASS. The old cases still pass too.

- [ ] **Step 5: Commit**

```bash
git add lib/adminEvents.ts lib/adminEvents.test.ts
git commit -m "KAN-214: Keep the admin event tab in the hash

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pure activity helpers

**Files:** Create `lib/adminEventActivity.ts` and `lib/adminEventActivity.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
    activeDays,
    contributedShare,
    dailySeries,
    defaultDay,
    hourlyForDay,
    hourOfDayHeatmap,
    localDay,
    removedTotal,
    shiftDay,
    topPeaks,
} from '@/lib/adminEventActivity';
import type { AdminEventActivityHour } from '@/lib/api/types';

const h = (hour: string, posts = 0, stories = 0, gallery = 0, wishes = 0): AdminEventActivityHour => ({ hour, posts, stories, gallery, wishes });

const HOURS = [
    h('2026-06-13T20:00', 1),
    h('2026-06-14T18:00', 2, 1),
    h('2026-06-14T21:00', 4, 0, 3),
    h('2026-06-14T23:00', 6, 2, 9, 3),
    h('2026-06-16T10:00', 0, 0, 1),
];

describe('activeDays', () => {
    it('lists each day with activity once, in order', () => {
        expect(activeDays(HOURS)).toEqual(['2026-06-13', '2026-06-14', '2026-06-16']);
    });
});

describe('localDay', () => {
    it('reads the calendar day in the event time zone', () => {
        expect(localDay('2026-06-14T22:30:00Z', 'Europe/Athens')).toBe('2026-06-15');
        expect(localDay('2026-06-14T20:30:00Z', 'Europe/Athens')).toBe('2026-06-14');
    });
});

describe('defaultDay', () => {
    it('opens on the start day when it had activity', () => {
        expect(defaultDay(HOURS, '2026-06-14T13:00:00Z', 'Europe/Athens')).toBe('2026-06-14');
    });
    it('falls back to the busiest day', () => {
        expect(defaultDay(HOURS, '2026-07-01T13:00:00Z', 'Europe/Athens')).toBe('2026-06-14');
        expect(defaultDay(HOURS, null, 'Europe/Athens')).toBe('2026-06-14');
    });
    it('is null without activity', () => {
        expect(defaultDay([], null, 'Europe/Athens')).toBeNull();
    });
});

describe('shiftDay', () => {
    it('steps through active days only', () => {
        const days = activeDays(HOURS);
        expect(shiftDay(days, '2026-06-14', 1)).toBe('2026-06-16');
        expect(shiftDay(days, '2026-06-14', -1)).toBe('2026-06-13');
        expect(shiftDay(days, '2026-06-16', 1)).toBeNull();
    });
});

describe('hourlyForDay', () => {
    it('trims to the first and last active hour and fills the gaps with zero', () => {
        const columns = hourlyForDay(HOURS, '2026-06-14');
        expect(columns.map((c) => c.hour)).toEqual([18, 19, 20, 21, 22, 23]);
        expect(columns[1]).toMatchObject({ posts: 0, total: 0 });
        expect(columns[5]).toMatchObject({ posts: 6, stories: 2, gallery: 9, wishes: 3, total: 20, label: '23:00' });
    });
    it('is empty for a day without activity', () => {
        expect(hourlyForDay(HOURS, '2026-06-15')).toEqual([]);
    });
});

describe('dailySeries', () => {
    it('covers first to last active day with zero-filled gaps', () => {
        const days = dailySeries(HOURS);
        expect(days.map((d) => d.day)).toEqual(['2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16']);
        expect(days[1].total).toBe(30);
        expect(days[2].total).toBe(0);
    });
    it('folds days before the cap into one earlier column', () => {
        const days = dailySeries(HOURS, 2);
        expect(days.map((d) => d.day)).toEqual(['earlier', '2026-06-15', '2026-06-16']);
        expect(days[0]).toMatchObject({ earlier: true, total: 31 });
    });
});

describe('hourOfDayHeatmap', () => {
    it('sums each kind per hour of the day across all days', () => {
        const map = hourOfDayHeatmap(HOURS);
        expect(map.posts[23]).toBe(6);
        expect(map.posts[20]).toBe(1);
        expect(map.gallery[10]).toBe(1);
        expect(map.wishes).toHaveLength(24);
    });
});

describe('topPeaks', () => {
    it('ranks the busiest hours, earlier first on a tie', () => {
        expect(topPeaks(HOURS, 3).map((p) => [p.hour, p.total])).toEqual([
            ['2026-06-14T23:00', 20],
            ['2026-06-14T21:00', 7],
            ['2026-06-14T18:00', 3],
        ]);
    });
});

describe('contributedShare and removedTotal', () => {
    it('is null with no members', () => {
        expect(contributedShare({ total: 0, contributed: 0 })).toBeNull();
        expect(contributedShare({ total: 4, contributed: 1 })).toBe(0.25);
    });
    it('adds every removed kind', () => {
        expect(removedTotal({ posts: 1, stories: 2, galleryUploads: 3, comments: 4, wishes: 5 })).toBe(15);
    });
});
```

- [ ] **Step 2: Run them and check they fail**

Run: `npx vitest run lib/adminEventActivity.test.ts`
Expected: FAIL, because the module is not found.

- [ ] **Step 3: Implement `lib/adminEventActivity.ts`**

```ts
import type { AdminEventActivityDto, AdminEventActivityHour } from '@/lib/api/types';

// Hours arrive as local wall-clock strings ("2026-06-14T23:00") in the event's time zone, so every
// helper here works on those strings and on UTC calendar arithmetic. No Date is ever read in the
// viewer's zone.

export type ActivityKind = 'posts' | 'stories' | 'gallery' | 'wishes';
export const ACTIVITY_KINDS: ActivityKind[] = ['posts', 'stories', 'gallery', 'wishes'];

// Fixed categorical order: the colour follows the kind, never its rank.
export const ACTIVITY_COLORS: Record<ActivityKind, string> = {
    posts: '#2a78d6',
    stories: '#eb6834',
    gallery: '#1baf7a',
    wishes: '#eda100',
};

export const DAILY_MAX_DAYS = 60;
export const EARLIER_DAY = 'earlier';

type KindCounts = Record<ActivityKind, number>;
export type HourColumn = KindCounts & { hour: number; label: string; total: number };
export type DayColumn = KindCounts & { day: string; earlier: boolean; total: number };
export type Peak = { hour: string; total: number };

const zeroCounts = (): KindCounts => ({ posts: 0, stories: 0, gallery: 0, wishes: 0 });
const totalOf = (counts: KindCounts) => counts.posts + counts.stories + counts.gallery + counts.wishes;
const addInto = (target: KindCounts, source: KindCounts) => {
    for (const kind of ACTIVITY_KINDS) target[kind] += source[kind];
};

const dayOf = (hour: string) => hour.slice(0, 10);
const hourOf = (hour: string) => Number(hour.slice(11, 13));
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function nextDay(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

export function activeDays(hours: AdminEventActivityHour[]): string[] {
    return [...new Set(hours.map((row) => dayOf(row.hour)))].sort();
}

export function localDay(instant: string, timeZone: string): string {
    // en-CA formats as yyyy-mm-dd.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
}

function totalsByDay(hours: AdminEventActivityHour[]): Map<string, KindCounts> {
    const byDay = new Map<string, KindCounts>();
    for (const row of hours) {
        const counts = byDay.get(dayOf(row.hour)) ?? zeroCounts();
        addInto(counts, row);
        byDay.set(dayOf(row.hour), counts);
    }
    return byDay;
}

export function defaultDay(hours: AdminEventActivityHour[], eventStartAt: string | null, timeZone: string): string | null {
    const days = activeDays(hours);
    if (days.length === 0) return null;
    if (eventStartAt) {
        const start = localDay(eventStartAt, timeZone);
        if (days.includes(start)) return start;
    }
    let busiest = days[0];
    let busiestTotal = -1;
    for (const [day, counts] of totalsByDay(hours)) {
        const total = totalOf(counts);
        if (total > busiestTotal || (total === busiestTotal && day < busiest)) {
            busiest = day;
            busiestTotal = total;
        }
    }
    return busiest;
}

export function shiftDay(days: string[], day: string, step: 1 | -1): string | null {
    const index = days.indexOf(day);
    if (index === -1) return null;
    return days[index + step] ?? null;
}

export function hourlyForDay(hours: AdminEventActivityHour[], day: string): HourColumn[] {
    const rows = hours.filter((row) => dayOf(row.hour) === day);
    if (rows.length === 0) return [];
    const byHour = new Map(rows.map((row) => [hourOf(row.hour), row]));
    const first = Math.min(...byHour.keys());
    const last = Math.max(...byHour.keys());
    const columns: HourColumn[] = [];
    for (let hour = first; hour <= last; hour++) {
        const row = byHour.get(hour);
        const counts = row ? { posts: row.posts, stories: row.stories, gallery: row.gallery, wishes: row.wishes } : zeroCounts();
        columns.push({ ...counts, hour, label: hourLabel(hour), total: totalOf(counts) });
    }
    return columns;
}

export function dailySeries(hours: AdminEventActivityHour[], maxDays = DAILY_MAX_DAYS): DayColumn[] {
    const days = activeDays(hours);
    if (days.length === 0) return [];
    const byDay = totalsByDay(hours);
    const all: string[] = [];
    for (let day = days[0]; day <= days[days.length - 1]; day = nextDay(day)) all.push(day);

    const kept = all.slice(-maxDays);
    const folded = all.slice(0, all.length - kept.length);
    const columns: DayColumn[] = kept.map((day) => {
        const counts = byDay.get(day) ?? zeroCounts();
        return { ...counts, day, earlier: false, total: totalOf(counts) };
    });
    if (folded.length > 0) {
        const counts = zeroCounts();
        for (const day of folded) addInto(counts, byDay.get(day) ?? zeroCounts());
        columns.unshift({ ...counts, day: EARLIER_DAY, earlier: true, total: totalOf(counts) });
    }
    return columns;
}

export function hourOfDayHeatmap(hours: AdminEventActivityHour[]): Record<ActivityKind, number[]> {
    const map = Object.fromEntries(ACTIVITY_KINDS.map((kind) => [kind, Array<number>(24).fill(0)])) as Record<ActivityKind, number[]>;
    for (const row of hours) {
        for (const kind of ACTIVITY_KINDS) map[kind][hourOf(row.hour)] += row[kind];
    }
    return map;
}

export function topPeaks(hours: AdminEventActivityHour[], count = 3): Peak[] {
    return hours
        .map((row) => ({ hour: row.hour, total: totalOf(row) }))
        .filter((peak) => peak.total > 0)
        .sort((a, b) => b.total - a.total || a.hour.localeCompare(b.hour))
        .slice(0, count);
}

export function contributedShare(members: AdminEventActivityDto['members']): number | null {
    return members.total === 0 ? null : members.contributed / members.total;
}

export function removedTotal(removed: AdminEventActivityDto['removed']): number {
    return removed.posts + removed.stories + removed.galleryUploads + removed.comments + removed.wishes;
}

// A local day ("2026-06-14") or hour ("2026-06-14T23:00") as a Date at that wall-clock time in UTC,
// for Intl formatting with timeZone: 'UTC'.
export function wallClockDate(value: string): Date {
    const [year, month, date] = value.slice(0, 10).split('-').map(Number);
    const hour = value.length > 10 ? hourOf(value) : 0;
    return new Date(Date.UTC(year, month - 1, date, hour));
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run lib/adminEventActivity.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/adminEventActivity.ts lib/adminEventActivity.test.ts
git commit -m "KAN-214: Derive an event's hourly, daily and peak activity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Query hook, tab hook and view hook

**Files:** Modify `hooks/useAdminEvents.ts`; create `hooks/useEventDetailTab.ts` and `hooks/useEventActivityView.ts`

- [ ] **Step 1: Add the query.** In `hooks/useAdminEvents.ts`:
  - Add `activity: (eventId: string) => ['admin', 'events', 'detail', eventId, 'activity'] as const,` to `adminEventKeys`.
  - Import `AdminEventActivityDto`.
  - Append:

```ts
// GET /api/admin/events/{eventId}/activity — anonymous counts, counted live on each request.
export function useAdminEventActivity(eventId: string) {
    return useQuery({
        queryKey: adminEventKeys.activity(eventId),
        queryFn: () => api.get<AdminEventActivityDto>(endpoints.admin.events.activity(eventId)),
        retry: false,
    });
}
```

- [ ] **Step 2: Write `hooks/useEventDetailTab.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';

import { type EventDetailTab, parseEventsTab } from '@/lib/adminEvents';

function currentTab(): EventDetailTab {
    return typeof window === 'undefined' ? 'settings' : parseEventsTab(window.location.hash);
}

// Which section of the event page the hash has open. The tab links are plain hash links, so Back
// and a reload land on the same tab.
export function useEventDetailTab(): EventDetailTab {
    const [tab, setTab] = useState<EventDetailTab>(currentTab);

    useEffect(() => {
        function syncFromHash() {
            setTab(currentTab());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    return tab;
}
```

- [ ] **Step 3: Write `hooks/useEventActivityView.ts`**

```ts
'use client';

import { useMemo, useState } from 'react';

import { activeDays, dailySeries, defaultDay, hourlyForDay, hourOfDayHeatmap, shiftDay, topPeaks } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

// Everything the Activity tab draws, derived once from the response, plus the day picker.
export function useEventActivityView(activity: AdminEventActivityDto) {
    const days = useMemo(() => activeDays(activity.hours), [activity.hours]);
    const initialDay = useMemo(
        () => defaultDay(activity.hours, activity.eventStartAt, activity.timezone),
        [activity.hours, activity.eventStartAt, activity.timezone],
    );
    const [pickedDay, setPickedDay] = useState<string | null>(null);
    // A refresh can drop the picked day; fall back to the default rather than show an empty chart.
    const day = pickedDay && days.includes(pickedDay) ? pickedDay : initialDay;

    const previousDay = day ? shiftDay(days, day, -1) : null;
    const nextDay = day ? shiftDay(days, day, 1) : null;

    return {
        day,
        hourly: useMemo(() => (day ? hourlyForDay(activity.hours, day) : []), [activity.hours, day]),
        daily: useMemo(() => dailySeries(activity.hours), [activity.hours]),
        heatmap: useMemo(() => hourOfDayHeatmap(activity.hours), [activity.hours]),
        peaks: useMemo(() => topPeaks(activity.hours), [activity.hours]),
        hasActivity: activity.hours.length > 0,
        previousDay,
        nextDay,
        goToPreviousDay: () => previousDay && setPickedDay(previousDay),
        goToNextDay: () => nextDay && setPickedDay(nextDay),
    };
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useAdminEvents.ts hooks/useEventDetailTab.ts hooks/useEventActivityView.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminEvents.ts hooks/useEventDetailTab.ts hooks/useEventActivityView.ts
git commit -m "KAN-214: Add the event activity query, tab and view hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Fixtures

**Files:** Create `components/admin/events/activity/__fixtures__/eventActivity.ts`

- [ ] **Step 1: Write the fixtures**

```ts
import type { AdminEventActivityDto, AdminEventActivityHour } from '@/lib/api/types';

const hour = (value: string, posts: number, stories: number, gallery: number, wishes: number): AdminEventActivityHour => ({
    hour: value,
    posts,
    stories,
    gallery,
    wishes,
});

// A Saturday wedding in Athens: a quiet build-up, a peak around midnight, a trickle of uploads after.
export const weddingActivityFixture: AdminEventActivityDto = {
    timezone: 'Europe/Athens',
    eventStartAt: '2026-06-13T13:00:00Z',
    eventEndAt: '2026-06-14T01:00:00Z',
    generatedAt: '2026-06-16T11:02:00Z',
    members: { total: 184, contributed: 121 },
    totals: {
        posts: 312,
        postMedia: 601,
        stories: 97,
        storyViews: 2410,
        galleryUploads: 866,
        galleryViaQr: 402,
        proUploads: 0,
        comments: 688,
        reactions: 3905,
        reactionsByType: [
            { code: 'heart', emoji: '❤️', count: 2100 },
            { code: 'laugh', emoji: '😂', count: 1105 },
            { code: 'wow', emoji: '😮', count: 700 },
        ],
        wishes: 74,
        playlist: { suggestions: 58, votes: 410 },
        quizAnswers: null,
        rsvp: { attending: 120, declined: 6 },
    },
    removed: { posts: 8, stories: 3, galleryUploads: 0, comments: 0, wishes: 0 },
    hours: [
        hour('2026-06-12T20:00', 2, 0, 1, 0),
        hour('2026-06-13T16:00', 4, 1, 2, 0),
        hour('2026-06-13T17:00', 6, 2, 3, 1),
        hour('2026-06-13T18:00', 9, 4, 10, 2),
        hour('2026-06-13T19:00', 14, 6, 18, 3),
        hour('2026-06-13T20:00', 22, 10, 30, 6),
        hour('2026-06-13T21:00', 30, 14, 40, 8),
        hour('2026-06-13T22:00', 41, 20, 52, 10),
        hour('2026-06-13T23:00', 60, 30, 90, 34),
        hour('2026-06-14T00:00', 52, 28, 80, 28),
        hour('2026-06-14T01:00', 20, 10, 30, 6),
        hour('2026-06-14T02:00', 8, 3, 10, 1),
        hour('2026-06-15T10:00', 0, 0, 14, 2),
    ],
};

export const emptyActivityFixture: AdminEventActivityDto = {
    ...weddingActivityFixture,
    members: { total: 3, contributed: 0 },
    totals: {
        ...weddingActivityFixture.totals,
        posts: 0,
        postMedia: 0,
        stories: 0,
        storyViews: 0,
        galleryUploads: 0,
        galleryViaQr: 0,
        comments: 0,
        reactions: 0,
        reactionsByType: [],
        wishes: null,
        playlist: null,
        rsvp: null,
    },
    removed: { posts: 0, stories: 0, galleryUploads: 0, comments: 0, wishes: 0 },
    hours: [],
};

// A three-day festival with professional uploads and a quiz.
export const festivalActivityFixture: AdminEventActivityDto = {
    ...weddingActivityFixture,
    eventStartAt: '2026-07-10T15:00:00Z',
    totals: { ...weddingActivityFixture.totals, proUploads: 48, quizAnswers: 230, wishes: null },
    hours: [
        hour('2026-07-10T18:00', 10, 4, 12, 0),
        hour('2026-07-10T22:00', 30, 12, 40, 0),
        hour('2026-07-11T19:00', 18, 6, 20, 0),
        hour('2026-07-11T23:00', 44, 18, 61, 0),
        hour('2026-07-12T21:00', 25, 9, 33, 0),
    ],
};
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/events/activity/__fixtures__/eventActivity.ts
git commit -m "KAN-214: Add event activity fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tiles, members line and toolbar

**Files:** Create these in `components/admin/events/activity/`:
- `EventActivityTile.tsx`
- `EventActivityTiles.tsx`
- `EventActivityMembers.tsx`
- `EventActivityToolbar.tsx`

Visual rules (spec, "Look"):
- Tile: `rounded-xl bg-card px-4 py-3.5`, with no border.
- Icon chip: `h-[26px] w-[26px] rounded-lg` with a tint of the series color, and the lucide icon at 15 px.
- Number: `text-[22px] font-semibold tabular-nums`.
- Subline: `text-xs text-ink-faint`.

- [ ] **Step 1: `EventActivityTile.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// One count: icon, label, number, an optional muted line, and an optional hover detail.
export function EventActivityTile({
    icon: Icon,
    tint,
    label,
    value,
    detail,
    title,
}: {
    icon: LucideIcon;
    tint: string;
    label: string;
    value: string;
    detail?: ReactNode;
    title?: string;
}) {
    return (
        <div className="min-w-0 rounded-xl bg-card px-4 py-3.5" title={title}>
            {/* Label */}
            <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${tint}1f`, color: tint }}>
                    <Icon aria-hidden="true" className="h-[15px] w-[15px]" />
                </span>
                <span className="truncate">{label}</span>
            </div>
            {/* Value */}
            <p className="mt-1.5 text-[22px] leading-tight font-semibold text-ink tabular-nums">{value}</p>
            {detail && <p className="mt-0.5 truncate text-xs text-ink-faint">{detail}</p>}
        </div>
    );
}
```

- [ ] **Step 2: `EventActivityTiles.tsx`**

```tsx
'use client';

import { BookHeart, CircleDashed, Heart, Images, ListMusic, MessageCircle, Briefcase, HelpCircle, CalendarCheck, Trash2, StickyNote } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventActivityTile } from '@/components/admin/events/activity/EventActivityTile';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, removedTotal } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

const NEUTRAL = '#5f6b7a';

// Every count in one grid. Module tiles appear only when the response carries them; the
// professional and removed tiles only when there is something to show.
export function EventActivityTiles({ totals, removed }: { totals: AdminEventActivityDto['totals']; removed: AdminEventActivityDto['removed'] }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const removedParts = (['posts', 'stories', 'galleryUploads', 'comments', 'wishes'] as const)
        .filter((kind) => removed[kind] > 0)
        .map((kind) => t(`removed.${kind}`, { count: removed[kind] }))
        .join(' · ');
    const reactionsTitle = totals.reactionsByType.map((r) => `${r.emoji ?? r.code} ${count(r.count)}`).join('  ');

    return (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {/* Feed */}
            <EventActivityTile icon={StickyNote} tint={ACTIVITY_COLORS.posts} label={t('tiles.posts')} value={count(totals.posts)} detail={t('tiles.postMedia', { count: totals.postMedia })} />
            <EventActivityTile icon={CircleDashed} tint={ACTIVITY_COLORS.stories} label={t('tiles.stories')} value={count(totals.stories)} detail={t('tiles.storyViews', { count: totals.storyViews })} />
            <EventActivityTile icon={Images} tint={ACTIVITY_COLORS.gallery} label={t('tiles.gallery')} value={count(totals.galleryUploads)} detail={t('tiles.viaQr', { count: count(totals.galleryViaQr) })} />
            {totals.wishes !== null && <EventActivityTile icon={BookHeart} tint={ACTIVITY_COLORS.wishes} label={t('tiles.wishes')} value={count(totals.wishes)} />}
            <EventActivityTile icon={Heart} tint="#d4537e" label={t('tiles.reactions')} value={count(totals.reactions)} detail={reactionsTitle || undefined} title={reactionsTitle || undefined} />
            <EventActivityTile icon={MessageCircle} tint={NEUTRAL} label={t('tiles.comments')} value={count(totals.comments)} />
            {/* Modules */}
            {totals.playlist && (
                <EventActivityTile icon={ListMusic} tint="#6250d6" label={t('tiles.playlist')} value={count(totals.playlist.suggestions)} detail={t('tiles.votes', { count: totals.playlist.votes })} />
            )}
            {totals.quizAnswers !== null && <EventActivityTile icon={HelpCircle} tint="#6250d6" label={t('tiles.quiz')} value={count(totals.quizAnswers)} />}
            {totals.rsvp && (
                <EventActivityTile icon={CalendarCheck} tint={NEUTRAL} label={t('tiles.rsvp')} value={count(totals.rsvp.attending)} detail={t('tiles.declined', { count: count(totals.rsvp.declined) })} />
            )}
            {totals.proUploads > 0 && <EventActivityTile icon={Briefcase} tint={NEUTRAL} label={t('tiles.pro')} value={count(totals.proUploads)} />}
            {/* Removed */}
            {removedTotal(removed) > 0 && <EventActivityTile icon={Trash2} tint={NEUTRAL} label={t('tiles.removed')} value={count(removedTotal(removed))} detail={removedParts} />}
        </div>
    );
}
```

Sort the lucide import alphabetically if eslint's import-sort rule complains. Check that each icon name exists in lucide-react 1.x, for example with `grep -l "BookHeart" node_modules/lucide-react/dist/lucide-react.d.ts`, and swap in the nearest existing one if not.

- [ ] **Step 3: `EventActivityMembers.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { contributedShare } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

export function EventActivityMembers({ members }: { members: AdminEventActivityDto['members'] }) {
    const t = useTranslations('AdminPage.events.activity');
    const format = useFunnelFormat();
    return (
        <p className="text-sm text-ink-muted">
            {t('members', {
                contributed: format.count(members.contributed),
                total: format.count(members.total),
                share: format.rate(contributedShare(members)),
            })}
        </p>
    );
}
```

`format.rate` (from `formatRate` in `lib/adminFunnel.ts`) takes a ratio or null and returns a formatted percentage string, or "—" for null.

- [ ] **Step 4: `EventActivityToolbar.tsx`**

```tsx
'use client';

import { RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// When the numbers were counted, and a way to count again.
export function EventActivityToolbar({ updatedAt, refreshing, onRefreshAction }: { updatedAt: number; refreshing: boolean; onRefreshAction: () => void }) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    return (
        <div className="flex items-center justify-end gap-2 text-xs text-ink-faint">
            <span>{t('updatedAt', { time: formatDate(locale, updatedAt, { hour: '2-digit', minute: '2-digit' }) })}</span>
            <button type="button" onClick={onRefreshAction} aria-label={t('refresh')} title={t('refresh')} className="rounded-md p-1.5 hover:bg-card hover:text-ink">
                <RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
        </div>
    );
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/admin/events/activity`
Expected: no errors. The `t()` calls may fail type checks until the keys exist (Task 10), if next-intl typed messages are on (check `global.d.ts`). If so, finish Task 10 before running `tsc` and note that in the commit.

- [ ] **Step 6: Commit**

```bash
git add components/admin/events/activity
git commit -m "KAN-214: Add the activity tiles, members line and toolbar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Charts (hourly, heatmap, peaks, daily)

**Files:** Create these in `components/admin/events/activity/`:
- `EventActivityLegend.tsx`
- `EventActivityTooltip.tsx`
- `EventActivityHourly.tsx`
- `EventActivityDayPicker.tsx`
- `EventActivityHeatmap.tsx`
- `EventActivityPeaks.tsx`
- `EventActivityDaily.tsx`

Every chart follows `VisitorsDaily.tsx` for axes:
- `tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}`
- `tickLine={false}` and `axisLine={false}`
- `CartesianGrid stroke="var(--border)" vertical={false}`
- Columns at most 22 px wide, with 4 px rounded tops (`radius={[4, 4, 0, 0]}` on the top series only).
- Totals above each column through `LabelList`.

- [ ] **Step 1: `EventActivityLegend.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ACTIVITY_COLORS, ACTIVITY_KINDS } from '@/lib/adminEventActivity';

export function EventActivityLegend() {
    const t = useTranslations('AdminPage.events.activity.series');
    return (
        <ul className="flex flex-wrap gap-4 text-xs text-ink-muted">
            {ACTIVITY_KINDS.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: ACTIVITY_COLORS[kind] }} />
                    {t(kind)}
                </li>
            ))}
        </ul>
    );
}
```

- [ ] **Step 2: `EventActivityTooltip.tsx`.** This is the hover breakdown, shared by the hourly and daily charts.

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, type ActivityKind } from '@/lib/adminEventActivity';

type Row = Record<ActivityKind, number> & { total: number };

export function EventActivityTooltip({ active, payload, title }: { active?: boolean; payload?: { payload: Row }[]; title: (row: Row) => string }) {
    const t = useTranslations('AdminPage.events.activity.series');
    const { count } = useFunnelFormat();
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            <p className="mb-1 font-semibold text-ink">
                {title(row)} · {count(row.total)}
            </p>
            {ACTIVITY_KINDS.map((kind) => (
                <p key={kind} className="flex items-center justify-between gap-4 text-ink-muted">
                    <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: ACTIVITY_COLORS[kind] }} />
                        {t(kind)}
                    </span>
                    <span className="tabular-nums">{count(row[kind])}</span>
                </p>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: `EventActivityDayPicker.tsx`**

```tsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';

export function EventActivityDayPicker({
    day,
    canGoBack,
    canGoForward,
    onPreviousAction,
    onNextAction,
}: {
    day: string;
    canGoBack: boolean;
    canGoForward: boolean;
    onPreviousAction: () => void;
    onNextAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.activity.hourly');
    const locale = useLocale();
    const label = formatDate(locale, wallClockDate(day), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const arrow = 'rounded-md p-1 text-ink-muted hover:bg-card hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';
    return (
        <div className="flex items-center gap-2 text-sm">
            <button type="button" className={arrow} onClick={onPreviousAction} disabled={!canGoBack} aria-label={t('previous')}>
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-24 text-center font-semibold text-ink tabular-nums">{label}</span>
            <button type="button" className={arrow} onClick={onNextAction} disabled={!canGoForward} aria-label={t('next')}>
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
        </div>
    );
}
```

- [ ] **Step 4: `EventActivityHourly.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EventActivityLegend } from '@/components/admin/events/activity/EventActivityLegend';
import { EventActivityTooltip } from '@/components/admin/events/activity/EventActivityTooltip';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, type HourColumn } from '@/lib/adminEventActivity';

// One day, hour by hour, stacked by kind, with each hour's total above its column. The busiest hour
// is drawn at full strength; the rest are a touch quieter.
export function EventActivityHourly({ columns, picker }: { columns: HourColumn[]; picker: ReactNode }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const peak = Math.max(...columns.map((c) => c.total));
    const top = ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1];

    return (
        <section className="min-w-0 space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{t('hourly.title')}</h3>
                {picker}
            </div>
            <EventActivityLegend />
            {/* Chart */}
            <div role="img" aria-label={t('hourly.title')} className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={columns} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="22%">
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis allowDecimals={false} tickFormatter={count} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'var(--canvas)' }} content={<EventActivityTooltip title={(row) => (row as HourColumn).label} />} />
                        {ACTIVITY_KINDS.map((kind) => (
                            <Bar key={kind} dataKey={kind} stackId="hour" fill={ACTIVITY_COLORS[kind]} maxBarSize={22} radius={kind === top ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
                                {columns.map((column) => (
                                    <Cell key={column.hour} fillOpacity={column.total === peak ? 1 : 0.82} />
                                ))}
                                {kind === top && <LabelList dataKey="total" position="top" formatter={(value: unknown) => count(Number(value))} fontSize={11} fill="var(--ink-muted)" />}
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
```

In recharts 3, a radius on a zero-height top segment can leave the stack square-topped. That is acceptable. Use `fontWeight` on the label only for the peak, through a custom `content` render, if the plain `LabelList` can't do it. A bold peak label is optional polish.

- [ ] **Step 5: `EventActivityHeatmap.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_KINDS, type ActivityKind, hourLabel } from '@/lib/adminEventActivity';

const AXIS = [0, 6, 12, 18, 23];

// Hour of day against kind, summed over every day: when guests were busiest. One blue ramp.
export function EventActivityHeatmap({ heatmap }: { heatmap: Record<ActivityKind, number[]> }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const max = Math.max(1, ...ACTIVITY_KINDS.flatMap((kind) => heatmap[kind]));

    return (
        <section className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold text-ink">{t('heatmap.title')}</h3>
            {/* Grid */}
            <div className="space-y-[3px]">
                {ACTIVITY_KINDS.map((kind) => (
                    <div key={kind} className="grid grid-cols-[4.5rem_repeat(24,minmax(0,1fr))] items-center gap-[3px]">
                        <span className="truncate text-[11px] text-ink-muted">{t(`series.${kind}`)}</span>
                        {heatmap[kind].map((value, hour) => {
                            const label = t('heatmap.cell', { kind: t(`series.${kind}`), hour: hourLabel(hour), count: count(value) });
                            return (
                                <span
                                    key={hour}
                                    role="img"
                                    aria-label={label}
                                    title={label}
                                    className="h-4 rounded-[3px] bg-canvas"
                                    style={value > 0 ? { backgroundColor: `rgba(42, 120, 214, ${0.12 + (value / max) * 0.88})` } : undefined}
                                />
                            );
                        })}
                    </div>
                ))}
                {/* Axis */}
                <div className="grid grid-cols-[4.5rem_repeat(24,minmax(0,1fr))] gap-[3px] text-[11px] text-ink-faint">
                    <span />
                    {Array.from({ length: 24 }, (_, hour) => (
                        <span key={hour} className="text-center">
                            {AXIS.includes(hour) ? String(hour).padStart(2, '0') : ''}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 6: `EventActivityPeaks.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { type Peak, wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// The three busiest single hours of the whole event.
export function EventActivityPeaks({ peaks }: { peaks: Peak[] }) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    const { count } = useFunnelFormat();

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">{t('peaks.title')}</h3>
            <ol className="space-y-2.5">
                {peaks.map((peak, index) => (
                    <li key={peak.hour} className="flex items-center gap-3 text-sm">
                        <span aria-hidden="true" className={cn('inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px]', index === 0 ? 'bg-brand/15 text-brand' : 'bg-card text-ink-muted')}>
                            {index + 1}
                        </span>
                        <span className="flex-1 text-ink">
                            {formatDate(locale, wallClockDate(peak.hour), { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                        </span>
                        <span className="font-semibold text-ink tabular-nums">{count(peak.total)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
```

Check that `bg-brand`/`text-brand` exist in the admin Tailwind theme (`grep -rn "brand" app/globals.css | head`). If they don't, use the token the admin nav's active indicator uses (see `AdminNavLink.tsx`).

- [ ] **Step 7: `EventActivityDaily.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EventActivityTooltip } from '@/components/admin/events/activity/EventActivityTooltip';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, ACTIVITY_KINDS, type DayColumn, wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';

export function EventActivityDaily({ columns }: { columns: DayColumn[] }) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    const { count } = useFunnelFormat();
    const top = ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1];
    const dayLabel = (column: DayColumn) =>
        column.earlier ? t('daily.earlier') : formatDate(locale, wallClockDate(column.day), { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    const data = columns.map((column) => ({ ...column, label: dayLabel(column) }));

    return (
        <section className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold text-ink">{t('daily.title')}</h3>
            <div role="img" aria-label={t('daily.title')} className="h-40 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis allowDecimals={false} tickFormatter={count} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'var(--canvas)' }} content={<EventActivityTooltip title={(row) => (row as DayColumn & { label: string }).label} />} />
                        {ACTIVITY_KINDS.map((kind) => (
                            <Bar key={kind} dataKey={kind} stackId="day" fill={ACTIVITY_COLORS[kind]} maxBarSize={40} radius={kind === top ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
                                {kind === top && <LabelList dataKey="total" position="top" formatter={(value: unknown) => count(Number(value))} fontSize={11} fill="var(--ink-muted)" />}
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
```

- [ ] **Step 8: Lint**

Run: `npx eslint components/admin/events/activity`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/admin/events/activity
git commit -m "KAN-214: Add the activity charts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Content, container, empty state, skeleton and tabs

**Files:** Create these in `components/admin/events/activity/`:
- `EventActivityContent.tsx`
- `EventActivityTab.tsx`
- `EventActivityEmpty.tsx`
- `EventActivitySkeleton.tsx`
- `EventDetailTabs.tsx`

Modify `components/admin/events/EventDetailPage.tsx`.

- [ ] **Step 1: `EventActivityEmpty.tsx` and `EventActivitySkeleton.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function EventActivityEmpty() {
    const t = useTranslations('AdminPage.events.activity');
    return <p className="py-10 text-center text-sm text-ink-muted">{t('empty')}</p>;
}
```

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function EventActivitySkeleton() {
    const t = useTranslations('AdminPage.events.activity');
    return (
        <div role="status" aria-label={t('loading')} className="space-y-8">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-[88px] animate-pulse rounded-xl bg-card" />
                ))}
            </div>
            <div className="h-56 animate-pulse rounded-xl bg-card" />
        </div>
    );
}
```

- [ ] **Step 2: `EventActivityContent.tsx`**

```tsx
'use client';

import { EventActivityDaily } from '@/components/admin/events/activity/EventActivityDaily';
import { EventActivityDayPicker } from '@/components/admin/events/activity/EventActivityDayPicker';
import { EventActivityEmpty } from '@/components/admin/events/activity/EventActivityEmpty';
import { EventActivityHeatmap } from '@/components/admin/events/activity/EventActivityHeatmap';
import { EventActivityHourly } from '@/components/admin/events/activity/EventActivityHourly';
import { EventActivityMembers } from '@/components/admin/events/activity/EventActivityMembers';
import { EventActivityPeaks } from '@/components/admin/events/activity/EventActivityPeaks';
import { EventActivityTiles } from '@/components/admin/events/activity/EventActivityTiles';
import { useEventActivityView } from '@/hooks/useEventActivityView';
import type { AdminEventActivityDto } from '@/lib/api/types';

// The Activity tab's body, from one response. Sections are separated by space, not borders.
export function EventActivityContent({ activity }: { activity: AdminEventActivityDto }) {
    const view = useEventActivityView(activity);

    return (
        <div className="space-y-9">
            {/* Summary */}
            <div className="space-y-4">
                <EventActivityMembers members={activity.members} />
                <EventActivityTiles totals={activity.totals} removed={activity.removed} />
            </div>

            {!view.hasActivity || !view.day ? (
                <EventActivityEmpty />
            ) : (
                <>
                    {/* Per hour */}
                    <EventActivityHourly
                        columns={view.hourly}
                        picker={
                            <EventActivityDayPicker
                                day={view.day}
                                canGoBack={Boolean(view.previousDay)}
                                canGoForward={Boolean(view.nextDay)}
                                onPreviousAction={view.goToPreviousDay}
                                onNextAction={view.goToNextDay}
                            />
                        }
                    />
                    {/* Busiest hours and peaks */}
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <EventActivityHeatmap heatmap={view.heatmap} />
                        <EventActivityPeaks peaks={view.peaks} />
                    </div>
                    {/* Per day */}
                    <EventActivityDaily columns={view.daily} />
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 3: `EventActivityTab.tsx`, the container**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { EventActivityContent } from '@/components/admin/events/activity/EventActivityContent';
import { EventActivitySkeleton } from '@/components/admin/events/activity/EventActivitySkeleton';
import { EventActivityToolbar } from '@/components/admin/events/activity/EventActivityToolbar';
import { useAdminEventActivity } from '@/hooks/useAdminEvents';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function EventActivityTab({ eventId }: { eventId: string }) {
    const t = useTranslations('AdminPage');
    const query = useAdminEventActivity(eventId);

    return (
        <div className="max-w-6xl space-y-5">
            {/* Toolbar */}
            {(query.data || query.error) && (
                <EventActivityToolbar updatedAt={query.dataUpdatedAt || query.errorUpdatedAt} refreshing={query.isFetching} onRefreshAction={() => void query.refetch()} />
            )}
            {/* Content */}
            {query.isLoading && <EventActivitySkeleton />}
            {Boolean(query.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
            {query.data && <EventActivityContent activity={query.data} />}
        </div>
    );
}
```

- [ ] **Step 4: `EventDetailTabs.tsx`.** These are plain hash links, styled as the admin's underline tabs, with the coral indicator.

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { type EventDetailTab, formatEventsHash } from '@/lib/adminEvents';
import { cn } from '@/lib/utils';

const TABS: EventDetailTab[] = ['settings', 'activity'];

export function EventDetailTabs({ eventId, tab }: { eventId: string; tab: EventDetailTab }) {
    const t = useTranslations('AdminPage.events.activity.tabs');
    return (
        <nav aria-label={t('label')} className="flex gap-6 border-b border-border">
            {TABS.map((item) => (
                <a
                    key={item}
                    href={formatEventsHash(eventId, item)}
                    aria-current={item === tab ? 'page' : undefined}
                    className={cn(
                        '-mb-px border-b-2 py-2 text-sm font-semibold transition-colors',
                        item === tab ? 'border-brand text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t(item)}
                </a>
            ))}
        </nav>
    );
}
```

Use the same coral token check as in Task 8, Step 6.

- [ ] **Step 5: Wire up `EventDetailPage.tsx`.** Replace the content line:

```tsx
            {eventQuery.data && <EventDetail event={eventQuery.data} />}
```

with:

```tsx
            {eventQuery.data && (
                <>
                    {/* Tabs */}
                    <EventDetailTabs eventId={eventId} tab={tab} />
                    {tab === 'activity' ? <EventActivityTab eventId={eventId} /> : <EventDetail event={eventQuery.data} />}
                </>
            )}
```

Add `const tab = useEventDetailTab();` after `eventQuery`, and import `EventDetailTabs`, `EventActivityTab` and `useEventDetailTab`.

- [ ] **Step 6: Check that the list's Back link still works.** `useEventsPanel` reads the id through `parseEventsHash`, so `#events/<id>/activity` keeps the same event selected. `BackButton href={EVENTS_HASH_ROOT}` is unchanged.

- [ ] **Step 7: Commit**

```bash
git add components/admin/events
git commit -m "KAN-214: Show the Activity tab on the admin event page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Messages (approved copy only)

**Files:** Modify `messages/en.json` and `messages/el.json`

- [ ] **Step 1:** Under `AdminPage.events`, add an `activity` object with exactly the keys and wording approved in Task 1. Nest it as the dotted keys show: `tabs.settings` becomes `"tabs": { "settings": … }`. Keep both files' key order identical.
- [ ] **Step 2:** Check that both locales have the same keys:

Run: `node -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?f(v,p+k+'.'):[p+k]);const a=f(require('./messages/en.json').AdminPage.events.activity),b=f(require('./messages/el.json').AdminPage.events.activity);console.log(a.filter(k=>!b.includes(k)),b.filter(k=>!a.includes(k)))"`
Expected: `[] []`

- [ ] **Step 3:** `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-214: Add the approved Activity tab copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Component tests

**Files:** Create `components/admin/events/activity/EventActivityContent.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyActivityFixture, festivalActivityFixture, weddingActivityFixture } from '@/components/admin/events/activity/__fixtures__/eventActivity';
import { EventActivityContent } from '@/components/admin/events/activity/EventActivityContent';
import type { AdminEventActivityDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

const copy = messages.AdminPage.events.activity;

function renderContent(activity: AdminEventActivityDto) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <EventActivityContent activity={activity} />
        </NextIntlClientProvider>,
    );
}

beforeEach(() => vi.stubGlobal('ResizeObserver', InertResizeObserver));
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('EventActivityContent', () => {
    it('shows each count once, with module tiles only when present', () => {
        renderContent(weddingActivityFixture);
        expect(screen.getByText(copy.tiles.posts)).toBeInTheDocument();
        expect(screen.getByText('312')).toBeInTheDocument();
        expect(screen.getByText(copy.tiles.wishes)).toBeInTheDocument();
        expect(screen.queryByText(copy.tiles.quiz)).not.toBeInTheDocument();
        expect(screen.queryByText(copy.tiles.pro)).not.toBeInTheDocument();
        expect(screen.getByText(copy.tiles.removed)).toBeInTheDocument();
    });

    it('shows professional uploads and quiz answers when the event has them', () => {
        renderContent(festivalActivityFixture);
        expect(screen.getByText(copy.tiles.pro)).toBeInTheDocument();
        expect(screen.getByText(copy.tiles.quiz)).toBeInTheDocument();
        expect(screen.queryByText(copy.tiles.wishes)).not.toBeInTheDocument();
    });

    it('opens on the start day and steps through active days', () => {
        renderContent(weddingActivityFixture);
        expect(screen.getByText('Sat, Jun 13')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.next }));
        expect(screen.getByText('Sun, Jun 14')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.next }));
        expect(screen.getByText('Mon, Jun 15')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.hourly.next })).toBeDisabled();
    });

    it('lists the busiest hour first among the peaks', () => {
        renderContent(weddingActivityFixture);
        const peaks = screen.getByRole('heading', { name: copy.peaks.title }).parentElement!;
        expect(peaks.querySelectorAll('li')[0].textContent).toContain('214');
    });

    it('shows the empty state without charts', () => {
        renderContent(emptyActivityFixture);
        expect(screen.getByText(copy.empty)).toBeInTheDocument();
        expect(screen.queryByText(copy.hourly.title)).not.toBeInTheDocument();
    });
});
```

The exact day labels ("Sat, Jun 13") depend on Node's ICU. If they differ, read the rendered label once and match it. The peak's total of 214 is 60 + 30 + 90 + 34 at 23:00 on 13 June.

- [ ] **Step 2: Run them**

Run: `npx vitest run components/admin/events/activity`
Expected: PASS, 5 tests. Fix the component, not the test, unless the label format is the only difference.

- [ ] **Step 3: Commit**

```bash
git add components/admin/events/activity/EventActivityContent.test.tsx
git commit -m "KAN-214: Test the Activity tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Stories

**Files:** Create `components/admin/events/activity/EventActivityContent.stories.tsx`

- [ ] **Step 1: Write the stories**

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAdminShell } from '@/.storybook/admin';
import { emptyActivityFixture, festivalActivityFixture, weddingActivityFixture } from '@/components/admin/events/activity/__fixtures__/eventActivity';
import { EventActivityContent } from '@/components/admin/events/activity/EventActivityContent';

const meta = {
    title: 'Admin/Events/Activity',
    component: EventActivityContent,
    args: { activity: weddingActivityFixture },
    decorators: [withAdminShell],
} satisfies Meta<typeof EventActivityContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wedding: Story = {};
export const MultiDay: Story = { args: { activity: festivalActivityFixture } };
export const Empty: Story = { args: { activity: emptyActivityFixture } };
```

Read `docs/storybook.md` for the visual-regression tags. Admin stories elsewhere use `tags: ['visual-desktop-only']`. This tab is desktop-first but must stay usable on mobile, so leave the tag off for both breakpoints unless the doc says otherwise.

- [ ] **Step 2: Build Storybook once** (`npm run build-storybook`, or whatever script `package.json` names). Expected: success.
- [ ] **Step 3: Commit**

```bash
git add components/admin/events/activity/EventActivityContent.stories.tsx
git commit -m "KAN-214: Add Activity tab stories

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Checks and visual confirmation

- [ ] **Step 1:** Run `npx tsc --noEmit`, `npx eslint .` and `npx vitest run`. All must be clean. Read the output.
- [ ] **Step 2: Visual check.** Use the Storybook stories, at desktop width (1280) and mobile width (375), for all three stories. Look for:
  - totals that overlap the columns
  - a cramped heatmap at 375 px (if the labels collide, hide the axis labels under `sm`)
  - tiles at 2 per row
- [ ] **Step 3: Signed-in check against the local backend** (once the backend branch runs locally on :8080 and the dev server on :3000, per the memory notes). Open `/admin#events/<id>/activity` for a seeded event and confirm the numbers match the seed. Ask the owner for the local admin login; never guess a password.
- [ ] **Step 4: SEO.** This is an admin-only hash view with no new route, so `docs/seo-guidelines.md` has nothing to apply. Say so in the PR.
- [ ] **Step 5:** Push and open the PR into `staging`, titled `KAN-214: Admin event Activity tab`. Link the backend PR, and state the deploy order: backend first. Name only KAN-214. End the body with the Claude Code attribution line.
