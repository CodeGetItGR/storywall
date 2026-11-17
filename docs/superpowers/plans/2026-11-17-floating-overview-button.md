# Floating Overview Button Implementation Plan (KAN-236)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a phone, hosts get a small round mint button that opens the event's Overview, with a badge counting the steps left in the event's current phase.

**Architecture:** The step count comes from the same phase, setup and session logic the Overview journey uses (`lib/eventJourney.ts`, `useHelpProgress`), moved into small shared helpers so the badge and the Overview always agree. A gate component in the mobile tab bar decides whether the button shows; a badge component reads the count; a presentational button draws it. No backend change.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query (through the existing hooks), Tailwind v4, Vitest + Testing Library, Storybook.

---

## Decisions (owner, 2026-11-17)

- **Where:** phones only (`md:hidden`), in the event bottom bar's layer. On the feed, where the "+" composer button shows, it sits above "+". On every other event page it takes the spot "+" would have, just above the bottom bar.
- **Which pages:** every event page with the bottom bar except the Overview itself. Dashboard section pages (Members, RSVP, Settings…) show it too, even though header B already has "< Overview".
- **Which events:** hosts only, live full events only. Hidden on drafts, lite events and deleted events.
- **Badge:** Before = setup stops not done + Before sessions not ended. On the day = the day's sessions not ended. After = no badge. 0 = no badge (the button stays).
- **Look:** round, 36px circle inside a 44px tap area, new mint token `#6EE7B7`, lucide `ListChecks` icon in ink, coral badge (`bg-primary`, white number, white ring) at the top right. Hides with the same scale-out motion as "+" (`motion-fab`) when an overlay is open, the composer button is hidden, or the bottom bar hides while typing.
- **Wording:** no new text. The button's screen-reader label is the existing `ManagePage.sections.overview` ("Overview" / "Επισκόπηση"). The badge number is `aria-hidden`.

## File map

- Modify `app/globals.css`: add the `--mint` colour and the `--color-mint` theme token.
- Modify `lib/eventJourney.ts`: add `setupStepKeys`, `journeyStepsLeft`, `isOverviewPath`.
- Modify `lib/eventJourney.test.ts`: tests for the three helpers.
- Modify `hooks/useBeforeJourney.ts`: decide which setup stops show with `setupStepKeys`, so the badge and the path can't drift.
- Create `hooks/useJourneyStepsLeft.ts` (+ test): the badge count for one event.
- Create `hooks/useOverviewFabEvent.ts` (+ test): the event the button is for, or `null` when it shouldn't show.
- Create `components/layout/mobile-tab-bar/OverviewFabButton.tsx` (+ test, + stories): the presentational button.
- Create `components/layout/mobile-tab-bar/OverviewFab.tsx` (+ test): gate + count, renders the button.
- Modify `components/layout/MobileTabBar.tsx`: render `<OverviewFab />` beside `<ComposerFab />`.

---

### Task 1: Mint colour token

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the token**

In the `@theme` block, next to the other `--color-*` lines (after `--color-status-teal-wash`), add:

```css
    --color-mint: var(--mint);
```

In the `:root` block, after the `/* Brand coral */` group, add:

```css
    /* Mint: the floating Overview button */
    --mint: #6ee7b7;
```

If `globals.css` redefines colours for dark mode, leave `--mint` out of it (the button is the same in both).

- [ ] **Step 2: Check Tailwind picks it up**

Run: `npx tsc --noEmit` (sanity only) and grep the build later; `bg-mint` is used in Task 5 and checked in its story.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "KAN-236: Add the mint colour token

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared step helpers in `lib/eventJourney.ts`

**Files:**
- Modify: `lib/eventJourney.ts`
- Test: `lib/eventJourney.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/eventJourney.test.ts` (extend the existing import line with `isOverviewPath, journeyStepsLeft, setupStepKeys`):

```ts
import type { HelpProgress } from '@/hooks/useHelpProgress';

function fullEvent(over: Record<string, unknown> = {}) {
    return {
        id: 'e1',
        status: 'ACTIVE',
        sessions: [],
        schedule: { startAt: '2026-12-12T16:00:00Z', timezone: tz },
        modules: [
            // `posts` makes it a full event: isLiteEvent says lite when the plan leaves out the feed.
            { moduleKey: 'posts', isEnabled: true, isAvailable: true },
            { moduleKey: 'rsvp', isEnabled: true, isAvailable: true },
            { moduleKey: 'wishlist', isEnabled: true, isAvailable: true },
        ],
        ...over,
    } as never;
}

const noneDone: HelpProgress = { details: false, rsvp: false, giftAccount: false, schedule: false, invitations: false };

describe('setupStepKeys', () => {
    it('lists every setup stop a full event with RSVP and a wishlist has, in path order', () => {
        expect(setupStepKeys(fullEvent())).toEqual(['details', 'rsvp', 'schedule', 'giftAccount', 'invitations']);
    });
    it('drops RSVP and the gift account when those modules are off', () => {
        expect(setupStepKeys(fullEvent({ modules: [{ moduleKey: 'posts', isEnabled: true, isAvailable: true }] }))).toEqual(['details', 'schedule', 'invitations']);
    });
    it('drops invitations for a lite event', () => {
        expect(setupStepKeys(fullEvent({ modules: [] }))).toEqual(['details', 'schedule']);
    });
});

describe('journeyStepsLeft', () => {
    const before = new Date('2026-11-20T10:00:00Z');

    it('counts setup stops not done before the day', () => {
        expect(journeyStepsLeft(fullEvent(), noneDone, before)).toBe(5);
        expect(journeyStepsLeft(fullEvent(), { ...noneDone, details: true, schedule: true }, before)).toBe(3);
    });
    it('adds sessions before the day that have not ended', () => {
        const ev = fullEvent({ sessions: [session('henna', '2026-12-10T17:00:00Z', '2026-12-10T20:00:00Z'), session('main', '2026-12-12T16:00:00Z', null, { isMain: true })] });
        const allDone = { details: true, rsvp: true, giftAccount: true, schedule: true, invitations: true };
        expect(journeyStepsLeft(ev, allDone, before)).toBe(1);
        expect(journeyStepsLeft(ev, allDone, new Date('2026-12-11T10:00:00Z'))).toBe(0);
    });
    it('counts the day sessions not ended on the day', () => {
        const ev = fullEvent({
            sessions: [
                session('church', '2026-12-12T14:00:00Z', '2026-12-12T15:00:00Z', { isMain: true }),
                session('party', '2026-12-12T18:00:00Z', '2026-12-12T23:00:00Z'),
            ],
        });
        expect(journeyStepsLeft(ev, noneDone, new Date('2026-12-12T16:00:00Z'))).toBe(1);
    });
    it('has no count after the day', () => {
        expect(journeyStepsLeft(fullEvent(), noneDone, new Date('2026-12-20T10:00:00Z'))).toBeNull();
    });
});

describe('isOverviewPath', () => {
    it('is the dashboard with no tab or the overview tab', () => {
        expect(isOverviewPath('e1', routes.events.manage('e1'), '')).toBe(true);
        expect(isOverviewPath('e1', routes.events.manage('e1'), 'tab=overview')).toBe(true);
    });
    it('is not a dashboard section or another page', () => {
        expect(isOverviewPath('e1', routes.events.manage('e1'), 'tab=members')).toBe(false);
        expect(isOverviewPath('e1', routes.events.invitationsQr('e1'), '')).toBe(false);
        expect(isOverviewPath('e1', routes.events.feed('e1'), '')).toBe(false);
    });
});
```

`routes.events.feed(id)` and `routes.events.invitationsQr(id)` exist in `lib/routes.ts`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/eventJourney.test.ts`
Expected: FAIL, `setupStepKeys` / `journeyStepsLeft` / `isOverviewPath` not exported.

- [ ] **Step 3: Implement**

In `lib/eventJourney.ts` add the imports and helpers:

```ts
import type { HelpProgress } from '@/hooks/useHelpProgress';
import { isModuleAvailable } from '@/lib/eventLifecycle';

export type SetupStepKey = keyof HelpProgress;

type SetupEvent = Pick<EventDetailResponseDto, 'modules'> & Parameters<typeof isLiteEvent>[0];

/** The Before journey's setup stops this event has, in path order. */
export function setupStepKeys(event: SetupEvent): SetupStepKey[] {
    const wishlistOn = event.modules.some((item) => item.moduleKey === 'wishlist' && item.isEnabled && item.isAvailable);
    return [
        'details' as const,
        ...(isModuleAvailable(event.modules, 'rsvp') ? (['rsvp'] as const) : []),
        'schedule' as const,
        ...(wishlistOn ? (['giftAccount'] as const) : []),
        ...(isLiteEvent(event) ? [] : (['invitations'] as const)),
    ];
}

/**
 * Steps left in the event's current phase, as the Overview path shows them: Before counts setup
 * stops not done and earlier sessions not ended; On the day counts the day's sessions not ended.
 * After has no count (its stops are never marked done).
 */
export function journeyStepsLeft(event: JourneyEvent & SetupEvent, progress: HelpProgress, now: Date = new Date()): number | null {
    const phase = currentPhase(event, now);
    if (phase === 'after') return null;
    const groups = sessionsByPhase(event);
    const openSessions = (list: EventSessionResponseDto[]) =>
        sessionStates(list, event.schedule.timezone, now).filter((state) => state !== 'done').length;
    if (phase === 'day') return openSessions(groups.day);
    return setupStepKeys(event).filter((key) => !progress[key]).length + openSessions(groups.before);
}

/** The dashboard's Overview: `/manage` with no tab, or `?tab=overview`. */
export function isOverviewPath(eventId: string, pathname: string, searchParams: string): boolean {
    if (pathname !== routes.events.manage(eventId)) return false;
    const tab = new URLSearchParams(searchParams).get('tab');
    return tab === null || tab === 'overview';
}
```

`sessionStates` and `sessionsByPhase` are declared further down the file; function declarations are hoisted, so order is fine. If importing `isModuleAvailable` from `lib/eventLifecycle` creates an import cycle (check with `npx madge --circular lib/eventJourney.ts` or by a failing test), inline the check the same way `useBeforeJourney` used it.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run lib/eventJourney.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/eventJourney.ts lib/eventJourney.test.ts
git commit -m "KAN-236: Count the journey steps left

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The Before path uses `setupStepKeys`

**Files:**
- Modify: `hooks/useBeforeJourney.ts`
- Test: `hooks/useBeforeJourney.test.tsx` (existing; must stay green)

- [ ] **Step 1: Swap the presence checks**

In `useBeforeJourney`, add `const present = new Set(setupStepKeys(event));` (import `setupStepKeys` from `@/lib/eventJourney`) and replace the three presence conditions in the `setup` array:

```ts
        present.has('rsvp') && {
            key: 'rsvp',
            // …unchanged
        },
        …
        present.has('giftAccount') && {
            key: 'giftAccount',
            // …unchanged
        },
        present.has('invitations') && {
            key: 'invitations',
            // …unchanged
        },
```

Remove the now-unused `wishlistOn` const and the `isModuleAvailable` / `isLiteEvent` imports if nothing else in the file uses them. Rename the later `const present = setup.filter(...)` to `const shown = setup.filter(...)` (and its two uses) so the names don't clash.

- [ ] **Step 2: Run the existing tests**

Run: `npx vitest run hooks/useBeforeJourney.test.tsx components/manage/overview`
Expected: PASS with no test changes (behaviour is the same).

- [ ] **Step 3: Commit**

```bash
git add hooks/useBeforeJourney.ts
git commit -m "KAN-236: Share the setup stop list with the Before path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `useJourneyStepsLeft` and `useOverviewFabEvent`

**Files:**
- Create: `hooks/useJourneyStepsLeft.ts`, `hooks/useJourneyStepsLeft.test.tsx`
- Create: `hooks/useOverviewFabEvent.ts`, `hooks/useOverviewFabEvent.test.tsx`

- [ ] **Step 1: Write the failing tests**

`hooks/useJourneyStepsLeft.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useJourneyStepsLeft } from '@/hooks/useJourneyStepsLeft';

const progress = { details: true, rsvp: false, giftAccount: false, schedule: true, invitations: false };
vi.mock('@/hooks/useHelpProgress', () => ({ useHelpProgress: () => progress }));

const event = {
    id: 'e1',
    title: 'Nick and Maria',
    status: 'ACTIVE',
    sessions: [],
    location: { name: 'x', address: 'y' },
    schedule: { startAt: '2099-06-12T16:00:00Z', endAt: '2099-06-12T23:00:00Z', timezone: 'Europe/Athens' },
    modules: [
        { moduleKey: 'posts', isEnabled: true, isAvailable: true },
        { moduleKey: 'rsvp', isEnabled: true, isAvailable: true },
    ],
} as never;

describe('useJourneyStepsLeft', () => {
    it('counts the Before stops not done', () => {
        const { result } = renderHook(() => useJourneyStepsLeft(event));
        // rsvp + invitations (no wishlist module, so no gift stop)
        expect(result.current).toBe(2);
    });
});
```

`hooks/useOverviewFabEvent.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOverviewFabEvent } from '@/hooks/useOverviewFabEvent';

const state = {
    event: { id: 'e1', status: 'ACTIVE', deletedAt: null } as Record<string, unknown> | null,
    isHost: true,
    pathname: '/events/e1/feed',
    search: '',
    lite: false,
};
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => state.event, useIsHost: () => state.isHost }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useSearchParams: () => new URLSearchParams(state.search) }));
vi.mock('@/lib/liteEvents', async (orig) => ({ ...(await orig<object>()), isLiteEvent: () => state.lite }));

describe('useOverviewFabEvent', () => {
    beforeEach(() => {
        Object.assign(state, { event: { id: 'e1', status: 'ACTIVE', deletedAt: null }, isHost: true, pathname: '/events/e1/feed', search: '', lite: false });
    });
    it('returns the event for a host of a live full event off the Overview', () => {
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBe(state.event);
    });
    it('shows on dashboard sections', () => {
        Object.assign(state, { pathname: '/events/e1/manage', search: 'tab=members' });
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBe(state.event);
    });
    it.each([
        ['on the Overview', { pathname: '/events/e1/manage', search: '' }],
        ['for a guest', { isHost: false }],
        ['for a draft', { event: { id: 'e1', status: 'DRAFT', deletedAt: null } }],
        ['for a lite event', { lite: true }],
        ['with no event', { event: null }],
    ])('is null %s', (_label, change) => {
        Object.assign(state, change);
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBeNull();
    });
});
```

Add a deleted-event case too: `{ event: { id: 'e1', status: 'ACTIVE', deletedAt: '2026-11-01T00:00:00Z' } }` (`isEventDeleted` reads `deletedAt`).

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useJourneyStepsLeft.test.tsx hooks/useOverviewFabEvent.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`hooks/useJourneyStepsLeft.ts`:

```ts
'use client';

import { useHelpProgress } from '@/hooks/useHelpProgress';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { journeyStepsLeft } from '@/lib/eventJourney';

/** The floating Overview button's badge: steps left in the event's current phase (null after the day). */
export function useJourneyStepsLeft(event: EventDetailResponseDto): number | null {
    const sessions = (event.sessions ?? []).filter((item) => !item.deletedAt);
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions });
    return journeyStepsLeft(event, progress);
}
```

`hooks/useOverviewFabEvent.ts`:

```ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { isOverviewPath } from '@/lib/eventJourney';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { isLiteEvent } from '@/lib/liteEvents';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

/** The event the floating Overview button opens, or null when it shouldn't show (KAN-236). */
export function useOverviewFabEvent(): EventDetailResponseDto | null {
    const event = useActiveEvent();
    const isHost = useIsHost();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();

    if (!event || !isHost) return null;
    if (event.status === 'DRAFT' || isEventDeleted(event) || isLiteEvent(event)) return null;
    if (isOverviewPath(event.id, pathname, searchParams)) return null;
    return event;
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run hooks/useJourneyStepsLeft.test.tsx hooks/useOverviewFabEvent.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useJourneyStepsLeft.ts hooks/useJourneyStepsLeft.test.tsx hooks/useOverviewFabEvent.ts hooks/useOverviewFabEvent.test.tsx
git commit -m "KAN-236: Add hooks for the Overview button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `OverviewFabButton` (presentational)

**Files:**
- Create: `components/layout/mobile-tab-bar/OverviewFabButton.tsx`
- Create: `components/layout/mobile-tab-bar/OverviewFabButton.test.tsx`
- Create: `components/layout/mobile-tab-bar/OverviewFabButton.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OverviewFabButton } from '@/components/layout/mobile-tab-bar/OverviewFabButton';

const base = { href: '/events/e1/manage', label: 'Overview', raised: false, hidden: false };

describe('OverviewFabButton', () => {
    it('links to the Overview with its label', () => {
        render(<OverviewFabButton {...base} count={3} />);
        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/events/e1/manage');
    });
    it('shows the count as a badge hidden from screen readers', () => {
        render(<OverviewFabButton {...base} count={3} />);
        const badge = screen.getByText('3');
        expect(badge).toHaveAttribute('aria-hidden', 'true');
    });
    it.each([0, null])('shows no badge for %s', (count) => {
        render(<OverviewFabButton {...base} count={count} />);
        expect(screen.queryByTestId('overview-fab-badge')).toBeNull();
    });
    it('is inert while hidden', () => {
        render(<OverviewFabButton {...base} count={1} hidden />);
        expect(screen.getByRole('link', { hidden: true })).toHaveAttribute('data-hidden');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/layout/mobile-tab-bar/OverviewFabButton.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { ListChecks } from 'lucide-react';
import Link from 'next/link';

import { usePinchZoomBox } from '@/hooks/usePinchZoomBox';
import { cn } from '@/lib/utils';

// Same layer as the composer button (z-46: over the tab bar, under every modal), phones only.
// The 44px tap area holds a 36px circle. Raised = above the 48px "+" (feed); otherwise it takes "+"'s spot.
const layerClassName = 'pointer-events-none fixed inset-0 z-46 md:hidden';
const linkClassName =
    'motion-fab group pointer-events-auto absolute right-[18px] flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink/40';

export function OverviewFabButton({
    href,
    label,
    count,
    raised,
    hidden,
}: {
    href: string;
    label: string;
    count: number | null;
    raised: boolean;
    hidden: boolean;
}) {
    const pinchZoomBox = usePinchZoomBox();

    return (
        // Overview
        <div className={layerClassName} style={pinchZoomBox}>
            <Link
                href={href}
                aria-label={label}
                inert={hidden}
                data-hidden={hidden || undefined}
                className={cn(linkClassName, raised ? 'bottom-[136px]' : 'bottom-[82px]')}
            >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-mint text-ink shadow-md transition-transform duration-150 ease-out group-active:scale-95">
                    <ListChecks className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
                    {/* Steps left */}
                    {count !== null && count > 0 && (
                        <span
                            data-testid="overview-fab-badge"
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-white"
                        >
                            {count}
                        </span>
                    )}
                </span>
            </Link>
        </div>
    );
}
```

Positions: "+" is 48px at `right-4 bottom-20` (80px). The 44px box at `right-[18px]` centres on it. Not raised: the box centre sits on "+"'s centre (80 + 24 = 104px, so bottom 82px). Raised: the 36px circle sits 12px above "+" (circle bottom at 140px, box bottom at 136px).

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run components/layout/mobile-tab-bar/OverviewFabButton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Stories**

Follow `ComposerFab.stories.tsx` for the meta and decorators (`withAppContext`, a phone viewport). Stories: `WithCount` (count 3, not raised), `AboveComposer` (count 3, raised, with the real `ComposerFab` rendered beside it if the existing decorators allow; otherwise a 48px coral circle placeholder at the "+" spot), `NoBadge` (count 0), `AfterTheDay` (count null). Label: `messages.ManagePage.sections.overview` from the English messages.

- [ ] **Step 6: Commit**

```bash
git add components/layout/mobile-tab-bar/OverviewFabButton.tsx components/layout/mobile-tab-bar/OverviewFabButton.test.tsx components/layout/mobile-tab-bar/OverviewFabButton.stories.tsx
git commit -m "KAN-236: Add the floating Overview button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `OverviewFab` and the tab bar

**Files:**
- Create: `components/layout/mobile-tab-bar/OverviewFab.tsx`, `components/layout/mobile-tab-bar/OverviewFab.test.tsx`
- Modify: `components/layout/MobileTabBar.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewFab } from '@/components/layout/mobile-tab-bar/OverviewFab';
import messages from '@/messages/en.json';

afterEach(cleanup);

function renderWithIntl(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {node}
        </NextIntlClientProvider>,
    );
}

let fabEvent: { id: string } | null = { id: 'e1' };
vi.mock('@/hooks/useOverviewFabEvent', () => ({ useOverviewFabEvent: () => fabEvent }));
vi.mock('@/hooks/useJourneyStepsLeft', () => ({ useJourneyStepsLeft: () => 2 }));

describe('OverviewFab', () => {
    it('renders the button with the count when the hook gives an event', () => {
        renderWithIntl(<OverviewFab raised={false} hidden={false} />);
        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/events/e1/manage');
        expect(screen.getByText('2')).toBeInTheDocument();
    });
    it('renders nothing when there is no event', () => {
        fabEvent = null;
        const { container } = renderWithIntl(<OverviewFab raised={false} hidden={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/layout/mobile-tab-bar/OverviewFab.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { OverviewFabButton } from '@/components/layout/mobile-tab-bar/OverviewFabButton';
import { useJourneyStepsLeft } from '@/hooks/useJourneyStepsLeft';
import { useOverviewFabEvent } from '@/hooks/useOverviewFabEvent';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type Placement = { raised: boolean; hidden: boolean };

/** KAN-236: hosts' floating way back to the Overview, with the steps left in this phase. */
export function OverviewFab(placement: Placement) {
    const event = useOverviewFabEvent();
    if (!event) return null;
    // Keyed by event so the count's queries belong to the event on screen.
    return <OverviewFabForEvent key={event.id} event={event} {...placement} />;
}

function OverviewFabForEvent({ event, raised, hidden }: Placement & { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');
    const count = useJourneyStepsLeft(event);
    return <OverviewFabButton href={routes.events.manage(event.id)} label={t('sections.overview')} count={count} raised={raised} hidden={hidden} />;
}
```

In `components/layout/MobileTabBar.tsx`, import `OverviewFab` and render it right before the composer:

```tsx
            {/* Overview */}
            <OverviewFab raised={showComposerFab} hidden={hasOpenOverlay || isComposerFabHidden || isMobileTabBarHidden} />

            {/* Compose */}
            {showComposerFab && <ComposerFab hidden={hasOpenOverlay || isComposerFabHidden} />}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/layout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/mobile-tab-bar/OverviewFab.tsx components/layout/mobile-tab-bar/OverviewFab.test.tsx components/layout/MobileTabBar.tsx
git commit -m "KAN-236: Show the Overview button in the bottom bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Checks, signed-in look, PR

- [ ] **Step 1: Automated checks**

Run `npx tsc --noEmit`, `npx eslint .` and `npx vitest run`. All clean (the known flaky save-my-date editor files may time out in the full run; re-run them alone).

- [ ] **Step 2: Signed-in check at 375px**

Start the local backend and `npx next dev --webpack -p 3000` from this worktree (see memory notes), sign in as a test host, and screenshot:

- the feed of a live full event: the button sits above "+", badge shows the Before count, and it matches the not-done stops on the Overview;
- a tool page (gallery or schedule): the button sits in "+"'s spot;
- a dashboard section (Members): the button shows;
- the Overview: no button;
- opening a sheet (e.g. a post) hides it; it comes back when the sheet closes;
- a lite event and a draft: no button.

At 1280px: no button. Revert `AGENTS.md` and stop the servers afterwards.

- [ ] **Step 3: PR**

Merge staging in if it moved and re-run the checks. Push `claude/kan-236-floating-overview-button` and open "KAN-236: Floating Overview button" into `staging`: Summary, What changes, Wording (none new; reuses "Overview"), Visual check notes (new `OverviewFabButton` stories; no existing story should change), SEO (no route change, no blockers), Checks.
