# Host Overview Journey (KAN-224) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** replace the live event's Overview (coverage strip, number strip, setup steps, host links, usage panel) with the C1 "event journey": a phase stepper (Before / On the day / After) and a winding path of stops for the phase, the current stop shown as a card.

**Architecture:** pure date and session logic goes in `lib/eventJourney.ts`. Four small hooks turn the event into plain stop models (`hooks/useEventJourneyPhase.ts`, `useBeforeJourney.ts`, `useDayJourney.ts`, `useAfterJourney.ts`). A container `OverviewJourney` calls the hooks and hands everything to a props-only `OverviewJourneyView`, which composes small components under `components/manage/overview/`. `OverviewTab` renders the container for live events. The draft and deleted views don't change.

**Tech stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind v4 (`bg-gradient-logo` utility exists), Vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Mockup:** canvas `CDygEzhyHjNzSeVsrSxWXy`, boards C1-mobile, C1-desktop, C1-done-*, C1-day-*, C1-after-*.

---

## Decisions (agreed with the owner on 2026-11-16)

- **Primary day:** the main session's date (`isMain`) in the event's time zone (`schedule.timezone`). When the main session has no start time, use the event's start (`schedule.startAt`).
- **Phase:** today before the primary day is **Before**, the primary day is **On the day**, any later day is **After**.
- **Sessions by phase:** a timed session dated before the primary day sits in the Before journey, after the setup stops. One on the primary day sits in the On the day journey; several on that day all show, by time. One dated later sits first in the After journey, before Media. A session with no start time sits on the day.
- **Stepper:** the current phase opens by default. The host can tap another phase to look at its journey.
- **Moved content** ("fold in, drop repeats"):
  - Days to go moves to the stepper.
  - Members move to the Invitations & QR codes stop ("58 of 100 members").
  - Seats claimed becomes a chip on the RSVP stop.
  - Coverage moves to the After journey's plan stop ("Coverage ends {date}").
  - Pending co-host invitations, the "Host actions" link list and the Share links block leave the Overview. Members, the sidebar and the event menu already have them.
  - INVIART stays at the bottom.
- **On the day tools:** under the path on small screens and beside it on desktop, not in the middle of the path as C1 draws them.
- **On the day totals:** show the totals (photos + videos, wishbook messages) under their existing names. Today-only counts would need a backend change, which we are not doing.
- **Branch:** `claude/kan-224-overview-journey`, stacked on `claude/kan-223-host-dashboard-navigation`. Rebase it onto `staging` after PR #359 merges, and open the KAN-224 PR into `staging` only after that.

## Wording

### Approved new wording (popup, 2026-11-16)

These go in `ManagePage.journey`.

| Key | English | Greek |
|---|---|---|
| `phases.label` (screen readers) | Event phase | Φάση εκδήλωσης |
| `phases.before` | Before | Πριν |
| `phases.day` | On the day | Την ημέρα |
| `phases.after` | After | Μετά |
| `phases.daysToGo` | `{count, plural, one {# day to go} other {# days to go}}` | `{count, plural, one {Απομένει # ημέρα} other {Απομένουν # ημέρες}}` |
| `phases.done` | Done | Ολοκληρώθηκε |
| `phases.today` | Today | Σήμερα |
| `phases.from` | From {date} | Από {date} |
| `getReady` (screen readers) | Get ready | Προετοιμασία |
| `afterEvent` (screen readers) | After the event | Μετά την εκδήλωση |
| `scheduleCard` | Add the parts of your day so guests know when to come. | Προσθέστε τα μέρη της ημέρας σας, ώστε οι καλεσμένοι να ξέρουν πότε να έρθουν. |
| `sessions` | `{count, plural, one {# session} other {# sessions}}` | `{count, plural, one {# ενότητα} other {# ενότητες}}` |
| `members` | {count} of {limit} members | {count} από {limit} μέλη |
| `seats` | `{count, plural, one {# seat} other {# seats}}` | `{count, plural, one {# θέση} other {# θέσεις}}` |
| `allSet.title` | All set | Όλα έτοιμα |
| `allSet.body` | Your guests have everything they need. | Οι καλεσμένοι σας έχουν ό,τι χρειάζονται. |
| `allSet.print` | Print QR codes | Εκτύπωση QR codes |
| `now` | Now | Τώρα |
| `media` | `{photos, plural, one {# image} other {# images}} · {videos, plural, one {# video} other {# videos}}` | `{photos, plural, one {# φωτογραφία} other {# φωτογραφίες}} · {videos} βίντεο` |
| `thankGuests` | Thank your guests | Ευχαριστήστε τους καλεσμένους σας |
| `coverageEnds` | Coverage ends {date} | Η κάλυψη λήγει {date} |
| `extend` | Extend | Παράταση |
| `storage` | {used} of {limit} | {used} από {limit} |

### Other wording rules

- Each stop icon's alt text is the stop's own label.
- C1 shows "· PDF" after the wishbook count. It is dropped.

### Reused wording (unchanged)

- `HostOnboarding.steps.*` titles and actions: Event details, Edit event details, Add/Edit venue details, RSVP, Set RSVP deadline, Gift account, Add gift account, Schedule, Add sessions, Invitations & QR codes, Go to QR links.
- `RightContextPanel.rsvpSummary.{attending,declined,noResponse}` and `RightContextPanel.mediaSummary.title`.
- `RightContextPanel.wishbookSummary.count`.
- `ManagePage.coverage.download` ("Download all").
- `MobileTabBar.hostMenu.{invitationsQr,announcement}.label`.
- The module names from `useModuleCopy` (playlist, wishbook).

The chip line reads "42 Attending", using the existing labels. The mockup's lowercase "42 attending" would be new wording, so don't add it.

### Approved removals (popup, 2026-11-16)

Delete these from both `messages/en.json` and `messages/el.json`:

- `HostOnboarding.steps.section` (title and body).
- `HostOnboarding.steps.invitations.body`.
- `ManagePage.coverage.openUntil`, `ManagePage.coverage.closingIn` and `ManagePage.coverage.ended`. Keep `ManagePage.coverage.download`.
- `ManagePage.stats`, but only if nothing else uses it. Grep first.

**No other text may change.** If a step seems to need a word not listed here, stop and ask the owner in a popup.

## Stop rules

### Before journey (aria-label "Get ready")

Setup stops, in this order (the mockup's order, which differs from today's setup steps):

| Stop | Shown when | Done when | Line when done | Line when not done | Card when current | Tap goes to |
|---|---|---|---|---|---|---|
| Event details | always | title, start, end, location name and address are set | "Edit event details" | "Edit event details" | button "Edit event details" | `?tab=settings` |
| RSVP | RSVP module available | an RSVP deadline is set | chips from `rsvpSummary` (Attending, Declined, No response) plus a seats chip when seats are known | "Set RSVP deadline" | button "Set RSVP deadline" | `tools.rsvp` |
| Schedule | always | any session that isn't deleted | "# sessions" | "Add sessions" | body `scheduleCard` + button "Add sessions" | `tools.schedule` |
| Gift account | `wishlist` module enabled and available | a gift account exists | — | "Add gift account" | button "Add gift account" | `tools.gifts` |
| Invitations & QR codes | not a lite event | an active, non-guest QR link exists | "{count} of {limit} members" (omitted when there is no limit) | members line + " · " + "Go to QR links" | button "Go to QR links" | `invitationsQr` |

Rules:

- The event-type venue link ("Add venue details" / "Edit venue details") stays as a second link on the Event details stop, as today.
- The **current** stop is the first stop that isn't done. When every setup stop is done, there is no current stop and the All set card shows instead (title, body, "Print QR codes" → `invitationsQr`; lite events link to `tools.gallery`).
- Before-phase sessions come after the setup stops. Their line is the date and time ("Fri 11 Dec, 19:00"). They are done once over, and never current.
- The path ends at the day: a balloon image whose alt is "On the day".

### On the day journey (aria-label "On the day")

- One stop per session on the primary day, by time. A session is **done** after it ends, **current** while it runs (coral "Now" under the title, its start time in the circle), and **upcoming** before it starts.
- A session without an end runs until the next session starts, or until the end of its day.
- Below the path come two blocks:
  - **Quick tools**, as rows linking out: Share links, Announcement, Playlist. Each shows only when the event has it (the host menu items and the playlist module).
  - **Totals**, as two tiles: photos + videos under the media title, and messages under the wishbook name. Each shows only when its module is available.
- The path ends in a decorative moon (a lucide icon with `aria-hidden`).

### After journey (aria-label "After the event")

- Later sessions come first (done or upcoming, with date and time).
- **Media**: line "{photos} images · {videos} videos". It is the current card in the After phase, with button "Download all" → `tools.gallery`. It shows only with the gallery module.
- **Wishbook**: "# messages" → `tools.wishbook`. Only with the wishbook module.
- **Announcement**: "Thank your guests" → `tools.announcement`. Only when the host menu has it. KAN-232 later points it at the composer.
- **Plan**: title is the plan name, line "Coverage ends {date}", link "Extend" → `?tab=billing`. Only when the event has a coverage end.
- The path ends in a decorative heart (lucide, `aria-hidden`).

### Plan line

The Before and On the day phases end with a plan line: "{plan name} · {used} of {limit}" with a storage bar, linking to `?tab=billing`. Without a limit it reads "{plan name} · {used}". The Pro storage meter shows under it when `hasProAllowance`. The After phase has no plan line, because its Plan stop already says it (never show a fact twice).

## Layout

- **Small screens (build first):** a vertical path. Stops alternate left and right. Between two stops, a full-width S-shaped connector runs from one side to the other. The current stop's card sits right under its stop. The section list from KAN-223 stays below everything.
- **Desktop (`lg`):** a horizontal wave. Stops alternate between a top and a lower row, with S-connectors between columns. The current card (or All set) sits under the path, with the plan line inside the card on the right, as on C1-desktop.
- **Connectors:** a solid `logo`-gradient stroke between two done stops (and from a done stop to the current one). The rest are a dotted warm stroke (`#f0e2d2`, round caps).
- **Stop circles:**
  - done: a pale green circle with a green check (lucide `Check`, with sr-only "Done").
  - current: a `bg-gradient-logo` circle with a white icon or the session time, and a soft halo.
  - upcoming: a cream circle with a warm border and the stop's icon.
- **Icons** (`lib/journeyIcons.ts`):
  - images from `public/icons`: rsvp.png, present.svg (gift), camera.svg (media), wishbook.svg, music.svg (playlist).
  - lucide: `PencilLine` (details), `CalendarDays` (schedule), `QrCode` (invitations / share links), `Clock` (session), `Megaphone` (announcement), `Gem` (plan).
  - The canvas used images for invitations, announcement and plan, but their files aren't in the repo. Point the visual check reviewer at these three.

## File structure

**Create**
- `lib/eventJourney.ts` and `lib/eventJourney.test.ts`: days, phases, session states, the stop types.
- `lib/journeyIcons.ts`: the icon map.
- `hooks/useEventJourneyPhase.ts` and its `.test.tsx`: current and selected phase, stepper labels.
- `hooks/useBeforeJourney.ts` and its `.test.tsx`
- `hooks/useDayJourney.ts` and its `.test.tsx`
- `hooks/useAfterJourney.ts` and its `.test.tsx`
- `hooks/useOverviewPlanLine.ts` and its `.test.tsx`
- `components/manage/overview/`:
  - `PhaseStepper.tsx`
  - `JourneyStopIcon.tsx`
  - `JourneyStop.tsx`
  - `JourneyConnector.tsx`
  - `JourneyStopCard.tsx`
  - `AllSetCard.tsx`
  - `JourneyPath.tsx`
  - `QuickTools.tsx`
  - `JourneyTotals.tsx`
  - `PlanLine.tsx`
  - `OverviewJourneyView.tsx`
  - `OverviewJourney.tsx`
  - `OverviewJourneyView.stories.tsx`
  - `PhaseStepper.test.tsx`
  - `JourneyPath.test.tsx`

**Modify**
- `lib/datetime.ts`: gains `localDay`. `lib/adminEventActivity.ts` re-exports it.
- `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx` and both of its tests.
- `components/manage/ManageScreen.tsx`: drop `daysToGo`, `pendingCoHostInvitationCount` and the invitations wait.
- `components/manage/ManageSkeletons.tsx`: the Overview skeleton gets the stepper and path shape.
- `hooks/useRightContextPanel.ts`: drop the now-unused `includeManageLinks` option.
- `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`: prefetch the journey's data.
- `messages/en.json` and `messages/el.json`
- `docs/superpowers/plans/2026-11-16-host-pages-redesign-roadmap.md`

**Delete**
- `components/manage/help/` (EventSetupSteps, HelpStep, HelpStepper and the test).
- `hooks/useEventSetupSteps.ts`
- `components/manage/CoverageStatusStrip.tsx`

---

## Task 0: Branch and baseline

- [ ] **Step 1:** confirm you are on `claude/kan-224-overview-journey` with a clean tree.

```bash
git status --short && git branch --show-current
```

Expected: no output from status, then `claude/kan-224-overview-journey`.

- [ ] **Step 2:** run the baseline checks so later failures are yours.

```bash
npx tsc --noEmit && npx eslint . && npx vitest run lib hooks components/manage "app/(main)/(app)/(event)/events/[eventId]/manage"
```

Expected: all pass. The known flaky files (see `docs/superpowers/plans/2026-11-16-host-dashboard-navigation.md`) may fail under load and pass alone.

---

## Task 1: Wording

**Files:** `messages/en.json`, `messages/el.json`.

- [ ] **Step 1:** under `ManagePage`, add `journey` with exactly the keys and text in the "Approved new wording" table (English in `en.json`, Greek in `el.json`). Shape:

```json
"journey": {
    "phases": { "label": "Event phase", "before": "Before", "day": "On the day", "after": "After", "daysToGo": "{count, plural, one {# day to go} other {# days to go}}", "done": "Done", "today": "Today", "from": "From {date}" },
    "getReady": "Get ready",
    "afterEvent": "After the event",
    "scheduleCard": "Add the parts of your day so guests know when to come.",
    "sessions": "{count, plural, one {# session} other {# sessions}}",
    "members": "{count} of {limit} members",
    "seats": "{count, plural, one {# seat} other {# seats}}",
    "allSet": { "title": "All set", "body": "Your guests have everything they need.", "print": "Print QR codes" },
    "now": "Now",
    "media": "{photos, plural, one {# image} other {# images}} · {videos, plural, one {# video} other {# videos}}",
    "thankGuests": "Thank your guests",
    "coverageEnds": "Coverage ends {date}",
    "extend": "Extend",
    "storage": "{used} of {limit}"
}
```

- [ ] **Step 2:** leave the approved removals for Task 12, after the code that reads them is gone, so the app never points at a missing key.

- [ ] **Step 3:** check the files still parse and the message tests pass.

```bash
node -e "require('./messages/en.json');require('./messages/el.json')" && npx vitest run i18n
```

Expected: PASS.

- [ ] **Step 4:** commit.

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-224: Overview journey wording" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Journey dates and sessions (`lib/eventJourney.ts`)

**Files:**
- Modify: `lib/datetime.ts` (add `localDay`, `addDays`, `daysBetween`)
- Modify: `lib/adminEventActivity.ts` (replace its own `localDay` with `export { localDay } from '@/lib/datetime';` and import it for internal use)
- Create: `lib/eventJourney.ts`, `lib/eventJourney.test.ts`

- [ ] **Step 1: write the failing test** `lib/eventJourney.test.ts`

```ts
import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { addDays, daysBetween, localDay } from '@/lib/datetime';
import { currentPhase, phaseOfDay, primaryDay, sessionsByPhase, sessionStates } from '@/lib/eventJourney';

const tz = 'Europe/Athens';

function session(id: string, startAt: string | null, endAt: string | null = null, extra: Partial<EventSessionResponseDto> = {}) {
    return { id, title: id, startAt, endAt, isMain: false, isSecondary: false, deletedAt: null, displayOrder: 0, ...extra } as EventSessionResponseDto;
}

function event(sessions: EventSessionResponseDto[], startAt = '2026-12-12T16:00:00Z') {
    return { sessions, schedule: { startAt, timezone: tz } } as never;
}

describe('day helpers', () => {
    it('reads the calendar day in the time zone', () => {
        expect(localDay('2026-12-11T22:30:00Z', tz)).toBe('2026-12-12');
    });
    it('adds days across a month end', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
    it('counts whole days between two days', () => {
        expect(daysBetween('2026-11-18', '2026-12-12')).toBe(24);
    });
});

describe('primaryDay', () => {
    it("is the main session's day", () => {
        expect(primaryDay(event([session('main', '2026-12-13T15:00:00Z', null, { isMain: true })]))).toBe('2026-12-13');
    });
    it("falls back to the event's start when the main session has no time", () => {
        expect(primaryDay(event([session('main', null, null, { isMain: true })]))).toBe('2026-12-12');
    });
});

describe('phases', () => {
    it('places a day before, on or after the primary day', () => {
        expect(phaseOfDay('2026-12-11', '2026-12-12')).toBe('before');
        expect(phaseOfDay('2026-12-12', '2026-12-12')).toBe('day');
        expect(phaseOfDay('2026-12-13', '2026-12-12')).toBe('after');
    });
    it('uses the event time zone for today', () => {
        // 22:30 UTC on the 11th is already the 12th in Athens.
        expect(currentPhase(event([]), new Date('2026-12-11T22:30:00Z'))).toBe('day');
    });
});

describe('sessionsByPhase', () => {
    it('splits timed sessions by their day and keeps untimed ones on the day', () => {
        const henna = session('henna', '2026-12-11T17:00:00Z');
        const ceremony = session('ceremony', '2026-12-12T16:00:00Z', null, { isMain: true });
        const party = session('party', '2026-12-12T21:00:00Z');
        const brunch = session('brunch', '2026-12-13T09:00:00Z');
        const untimed = session('photos', null);
        const deleted = session('gone', '2026-12-12T18:00:00Z', null, { deletedAt: '2026-11-01T00:00:00Z' });
        const groups = sessionsByPhase(event([party, brunch, untimed, ceremony, henna, deleted]));
        expect(groups.before.map((s) => s.id)).toEqual(['henna']);
        expect(groups.day.map((s) => s.id)).toEqual(['ceremony', 'party', 'photos']);
        expect(groups.after.map((s) => s.id)).toEqual(['brunch']);
    });
});

describe('sessionStates', () => {
    const ceremony = session('ceremony', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z');
    const reception = session('reception', '2026-12-12T18:30:00Z');
    const party = session('party', '2026-12-12T21:00:00Z');
    const list = [ceremony, reception, party];

    it('marks ended, running and later sessions', () => {
        expect(sessionStates(list, tz, new Date('2026-12-12T19:00:00Z'))).toEqual(['done', 'now', 'upcoming']);
    });
    it('runs a session without an end until the next one starts', () => {
        expect(sessionStates(list, tz, new Date('2026-12-12T21:30:00Z'))).toEqual(['done', 'done', 'now']);
    });
    it('ends the last open session with its day', () => {
        expect(sessionStates(list, tz, new Date('2026-12-13T08:00:00Z'))).toEqual(['done', 'done', 'done']);
    });
    it('leaves an untimed session upcoming', () => {
        expect(sessionStates([session('x', null)], tz, new Date('2026-12-12T19:00:00Z'))).toEqual(['upcoming']);
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run lib/eventJourney.test.ts
```

Expected: FAIL. The module `@/lib/eventJourney` can't be found, and `addDays`/`daysBetween` aren't exported.

- [ ] **Step 3: add the day helpers** to `lib/datetime.ts`, after `getDaysUntil`:

```ts
/** The calendar day (yyyy-mm-dd) an instant falls on in a time zone. */
export function localDay(instant: string | Date, timeZone: string): string {
    // en-CA formats as yyyy-mm-dd.
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
}

/** A yyyy-mm-dd day moved by whole days. */
export function addDays(day: string, days: number): string {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** Whole days from one yyyy-mm-dd day to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
```

In `lib/adminEventActivity.ts`:
- delete its `localDay` function;
- add `import { localDay } from '@/lib/datetime';` with the other imports;
- add `export { localDay } from '@/lib/datetime';` so `lib/adminEventActivity.test.ts` keeps importing it from there.

- [ ] **Step 4: write `lib/eventJourney.ts`**

```ts
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { addDays, localDay } from '@/lib/datetime';
import type { JourneyIconKey } from '@/lib/journeyIcons';

export type JourneyPhase = 'before' | 'day' | 'after';
export const JOURNEY_PHASES: JourneyPhase[] = ['before', 'day', 'after'];

export type JourneyStopStatus = 'done' | 'current' | 'upcoming';

export type JourneyChip = { key: string; label: string; tone: 'success' | 'neutral' | 'warn' };

/** One stop on the path. Everything is display-ready text; components only lay it out. */
export type JourneyStopModel = {
    key: string;
    title: string;
    icon: JourneyIconKey;
    status: JourneyStopStatus;
    href: string;
    detail?: string;
    chips?: JourneyChip[];
    links?: { key: string; label: string; href: string }[];
    // Coral line under the title (the running session's "Now").
    highlight?: string;
    // Shown inside the current circle instead of the icon (a session's start time).
    badge?: string;
    // The current stop's card.
    card?: { body?: string; action: { label: string; href: string } };
};

type JourneyEvent = Pick<EventDetailResponseDto, 'sessions' | 'schedule'>;

function liveSessions(event: JourneyEvent): EventSessionResponseDto[] {
    return (event.sessions ?? []).filter((item) => !item.deletedAt);
}

/** The main session's day in the event's time zone, or the event's start day when it has no time. */
export function primaryDay(event: JourneyEvent): string {
    const main = liveSessions(event).find((item) => item.isMain && item.startAt);
    return localDay(main?.startAt ?? event.schedule.startAt, event.schedule.timezone);
}

export function phaseOfDay(day: string, primary: string): JourneyPhase {
    if (day < primary) return 'before';
    return day === primary ? 'day' : 'after';
}

export function currentPhase(event: JourneyEvent, now: Date = new Date()): JourneyPhase {
    return phaseOfDay(localDay(now, event.schedule.timezone), primaryDay(event));
}

function byStart(left: EventSessionResponseDto, right: EventSessionResponseDto): number {
    if (left.startAt && right.startAt) return Date.parse(left.startAt) - Date.parse(right.startAt);
    if (left.startAt) return -1;
    if (right.startAt) return 1;
    return left.displayOrder - right.displayOrder;
}

/** Sessions grouped by the phase their day falls in, each by time. Untimed sessions sit on the day, last. */
export function sessionsByPhase(event: JourneyEvent): Record<JourneyPhase, EventSessionResponseDto[]> {
    const primary = primaryDay(event);
    const groups: Record<JourneyPhase, EventSessionResponseDto[]> = { before: [], day: [], after: [] };
    for (const item of [...liveSessions(event)].sort(byStart)) {
        const phase = item.startAt ? phaseOfDay(localDay(item.startAt, event.schedule.timezone), primary) : 'day';
        groups[phase].push(item);
    }
    return groups;
}

export type SessionState = 'done' | 'now' | 'upcoming';

/**
 * Where each session (sorted by time) stands at `now`. A session without an end runs until the
 * next timed session starts, or until its own day ends.
 */
export function sessionStates(sessions: EventSessionResponseDto[], timeZone: string, now: Date = new Date()): SessionState[] {
    const nowMs = now.getTime();
    const today = localDay(now, timeZone);
    return sessions.map((item, index) => {
        if (!item.startAt) return 'upcoming';
        if (Date.parse(item.startAt) > nowMs) return 'upcoming';
        if (item.endAt) return Date.parse(item.endAt) > nowMs ? 'now' : 'done';
        const next = sessions.slice(index + 1).find((later) => later.startAt);
        if (next?.startAt) return Date.parse(next.startAt) > nowMs ? 'now' : 'done';
        return localDay(item.startAt, timeZone) === today ? 'now' : 'done';
    });
}

/** The day after the primary day: where the After phase starts. */
export function afterStartDay(event: JourneyEvent): string {
    return addDays(primaryDay(event), 1);
}
```

Note: `sessionStates` must get the whole sorted list for one phase. The "until the next session" rule only looks inside that list. A Before session with no end therefore ends with its day, which is the intent.

- [ ] **Step 5: create `lib/journeyIcons.ts`** (needed by the type import above):

```ts
import { CalendarDays, Clock, Gem, type LucideIcon, Megaphone, PencilLine, QrCode } from 'lucide-react';

export type JourneyIconKey =
    | 'details'
    | 'rsvp'
    | 'schedule'
    | 'gift'
    | 'invitations'
    | 'session'
    | 'media'
    | 'wishbook'
    | 'announcement'
    | 'playlist'
    | 'plan';

export type JourneyIcon = { kind: 'image'; src: string } | { kind: 'lucide'; icon: LucideIcon };

// The gradient images from public/icons where one exists; lucide for the rest.
export const journeyIcons: Record<JourneyIconKey, JourneyIcon> = {
    details: { kind: 'lucide', icon: PencilLine },
    rsvp: { kind: 'image', src: '/icons/rsvp.png' },
    schedule: { kind: 'lucide', icon: CalendarDays },
    gift: { kind: 'image', src: '/icons/present.svg' },
    invitations: { kind: 'lucide', icon: QrCode },
    session: { kind: 'lucide', icon: Clock },
    media: { kind: 'image', src: '/icons/camera.svg' },
    wishbook: { kind: 'image', src: '/icons/wishbook.svg' },
    announcement: { kind: 'lucide', icon: Megaphone },
    playlist: { kind: 'image', src: '/icons/music.svg' },
    plan: { kind: 'lucide', icon: Gem },
};
```

- [ ] **Step 6: run the tests and see them pass.**

```bash
npx vitest run lib/eventJourney.test.ts lib/adminEventActivity.test.ts
```

Expected: PASS.

- [ ] **Step 7: commit.**

```bash
git add lib/datetime.ts lib/adminEventActivity.ts lib/eventJourney.ts lib/eventJourney.test.ts lib/journeyIcons.ts
git commit -m "KAN-224: Journey phases and session states" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Phase hook (`hooks/useEventJourneyPhase.ts`)

Returns the current phase, the phase on screen, a way to switch, and the three stepper steps with their captions.

- [ ] **Step 1: write the failing test** `hooks/useEventJourneyPhase.test.tsx`

```tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEventJourneyPhase } from '@/hooks/useEventJourneyPhase';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const event = {
    sessions: [{ id: 'main', isMain: true, startAt: '2026-12-12T16:00:00Z', endAt: null, deletedAt: null, displayOrder: 0 }],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens' },
} as never;

describe('useEventJourneyPhase', () => {
    it('opens on the current phase and counts the days to go', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-11-18T10:00:00Z')));
        expect(result.current.current).toBe('before');
        expect(result.current.selected).toBe('before');
        expect(result.current.steps.map((step) => step.state)).toEqual(['current', 'upcoming', 'upcoming']);
        expect(result.current.steps[0].caption).toBe('phases.daysToGo:{"count":24}');
        expect(result.current.steps[2].caption).toMatch(/^phases\.from:/);
    });

    it('marks Before done and says Today on the day', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-12-12T10:00:00Z')));
        expect(result.current.steps.map((step) => step.state)).toEqual(['done', 'current', 'upcoming']);
        expect(result.current.steps[0].caption).toBe('phases.done');
        expect(result.current.steps[1].caption).toBe('phases.today');
    });

    it('lets the host look at another phase', () => {
        const { result } = renderHook(() => useEventJourneyPhase(event, new Date('2026-11-18T10:00:00Z')));
        act(() => result.current.select('after'));
        expect(result.current.selected).toBe('after');
        expect(result.current.current).toBe('before');
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run hooks/useEventJourneyPhase.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the hook**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { daysBetween, formatDate, localDay } from '@/lib/datetime';
import { afterStartDay, currentPhase, JOURNEY_PHASES, type JourneyPhase, primaryDay } from '@/lib/eventJourney';

export type PhaseStep = { phase: JourneyPhase; label: string; caption: string; state: 'done' | 'current' | 'upcoming' };

// A yyyy-mm-dd day formatted on its own, so no time zone can shift it.
function formatDay(locale: string, day: string, options: Intl.DateTimeFormatOptions): string {
    return formatDate(locale, `${day}T12:00:00Z`, { ...options, timeZone: 'UTC' });
}

/** The phase the event is in, the phase on screen, and the stepper's three steps. */
export function useEventJourneyPhase(event: Pick<EventDetailResponseDto, 'sessions' | 'schedule'>, now: Date = new Date()) {
    const t = useTranslations('ManagePage.journey');
    const locale = useLocale();
    const current = currentPhase(event, now);
    const [selected, select] = useState<JourneyPhase>(current);

    const steps = useMemo<PhaseStep[]>(() => {
        const primary = primaryDay(event);
        const today = localDay(now, event.schedule.timezone);
        const currentIndex = JOURNEY_PHASES.indexOf(current);
        const captions: Record<JourneyPhase, string> = {
            before: currentIndex > 0 ? t('phases.done') : t('phases.daysToGo', { count: Math.max(0, daysBetween(today, primary)) }),
            day: current === 'day' ? t('phases.today') : formatDay(locale, primary, { weekday: 'short', day: 'numeric', month: 'short' }),
            after: t('phases.from', { date: formatDay(locale, afterStartDay(event), { day: 'numeric', month: 'short' }) }),
        };
        return JOURNEY_PHASES.map((phase, index) => ({
            phase,
            label: t(`phases.${phase}`),
            caption: captions[phase],
            state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
        }));
    }, [event, now, current, locale, t]);

    return { current, selected, select, steps };
}
```

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run hooks/useEventJourneyPhase.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add hooks/useEventJourneyPhase.ts hooks/useEventJourneyPhase.test.tsx
git commit -m "KAN-224: Journey phase hook" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Before journey (`hooks/useBeforeJourney.ts`)

Replaces `useEventSetupSteps`. It reuses `useHelpProgress` for the done checks.

- [ ] **Step 1: write the failing test** `hooks/useBeforeJourney.test.tsx`

```tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBeforeJourney } from '@/hooks/useBeforeJourney';
import { routes } from '@/lib/routes';

const progress = vi.hoisted(() => ({ value: { details: true, rsvp: true, giftAccount: false, schedule: false, invitations: false } }));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useHelpProgress', () => ({ useHelpProgress: () => progress.value }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));

const modules = (keys: string[]) => keys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true }));

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 'e1',
        eventType: 'WEDDING',
        title: 'Maria & Nikos',
        location: {},
        modules: modules(['rsvp', 'wishlist', 'posts']),
        sessions: [],
        schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens', rsvpDeadline: '2026-12-01T00:00:00Z' },
        rsvpSummary: { totalMembers: 81, attending: 42, declined: 8, noResponse: 31 },
        ...overrides,
    } as never;
}

const counts = { memberCount: 58, memberLimit: 100, seatsClaimed: 60 };
const now = new Date('2026-11-18T10:00:00Z');

beforeEach(() => {
    progress.value = { details: true, rsvp: true, giftAccount: false, schedule: false, invitations: false };
});

describe('useBeforeJourney', () => {
    it("puts the stops in the mockup's order and makes the first open one current", () => {
        const { result } = renderHook(() => useBeforeJourney(event(), counts, now));
        expect(result.current.stops.map((stop) => [stop.key, stop.status])).toEqual([
            ['details', 'done'],
            ['rsvp', 'done'],
            ['schedule', 'current'],
            ['giftAccount', 'upcoming'],
            ['invitations', 'upcoming'],
        ]);
        expect(result.current.allDone).toBe(false);
    });

    it('gives the current schedule stop its card', () => {
        const schedule = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[2];
        expect(schedule.card).toEqual({ body: 'journey.scheduleCard', action: { label: 'steps.schedule.edit', href: routes.events.tools.schedule('e1') } });
    });

    it('shows the RSVP answers and seats as chips', () => {
        const rsvp = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[1];
        expect(rsvp.chips?.map((chip) => chip.key)).toEqual(['attending', 'declined', 'noResponse', 'seats']);
    });

    it('counts members against the limit on the invitations stop', () => {
        const invitations = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[4];
        expect(invitations.detail).toBe('journey.members:{"count":58,"limit":100}');
    });

    it('is all set when every stop is done', () => {
        progress.value = { details: true, rsvp: true, giftAccount: true, schedule: true, invitations: true };
        const { result } = renderHook(() => useBeforeJourney(event(), counts, now));
        expect(result.current.allDone).toBe(true);
        expect(result.current.stops.every((stop) => stop.status === 'done')).toBe(true);
    });

    it('leaves out RSVP, the gift account and invitations when the event has none of them', () => {
        const lite = event({ modules: modules(['gallery']), rsvpSummary: null });
        const keys = renderHook(() => useBeforeJourney(lite, counts, now)).result.current.stops.map((stop) => stop.key);
        expect(keys).toEqual(['details', 'schedule']);
    });

    it('adds sessions dated before the primary day after the setup stops', () => {
        const sessions = [
            { id: 'henna', title: 'Henna', startAt: '2026-12-11T17:00:00Z', endAt: null, isMain: false, deletedAt: null, displayOrder: 1 },
            { id: 'main', title: 'Ceremony', startAt: '2026-12-12T16:00:00Z', endAt: null, isMain: true, deletedAt: null, displayOrder: 0 },
        ];
        const stops = renderHook(() => useBeforeJourney(event({ sessions }), counts, now)).result.current.stops;
        expect(stops.at(-1)).toMatchObject({ key: 'session-henna', title: 'Henna', status: 'upcoming', icon: 'session' });
    });
});
```

Build the expected hrefs with `routes`: add `import { routes } from '@/lib/routes';` and write the schedule card's `href` as `routes.events.tools.schedule('e1')` instead of the literal.

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run hooks/useBeforeJourney.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the hook**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useHelpProgress } from '@/hooks/useHelpProgress';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { formatDate } from '@/lib/datetime';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { type JourneyChip, type JourneyStopModel, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

export type JourneyCounts = { memberCount: number; memberLimit: number | null; seatsClaimed: number | null };

type SetupStop = Omit<JourneyStopModel, 'status' | 'card'> & { complete: boolean; action: { label: string; href: string }; cardBody?: string };

/** The Before journey: setup stops in order, then sessions dated before the primary day. */
export function useBeforeJourney(event: EventDetailResponseDto, counts: JourneyCounts, now: Date = new Date()) {
    const t = useTranslations('HostOnboarding');
    const tj = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const sessions = (event.sessions ?? []).filter((item) => !item.deletedAt);
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions });

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((item) => item.isSecondary);
    const wishlistOn = event.modules.some((item) => item.moduleKey === 'wishlist' && item.isEnabled && item.isAvailable);
    const membersLine = counts.memberLimit === null ? undefined : tj('journey.members', { count: counts.memberCount, limit: counts.memberLimit });

    const settingsHref = routes.events.manage(event.id, { tab: 'settings' });
    const scheduleHref = routes.events.tools.schedule(event.id);
    const rsvpHref = routes.events.tools.rsvp(event.id);
    const giftHref = routes.events.tools.gifts(event.id);
    const qrHref = routes.events.invitationsQr(event.id);

    const rsvpChips: JourneyChip[] = event.rsvpSummary
        ? [
              { key: 'attending', label: `${event.rsvpSummary.attending} ${tr('rsvpSummary.attending')}`, tone: 'success' },
              { key: 'declined', label: `${event.rsvpSummary.declined} ${tr('rsvpSummary.declined')}`, tone: 'neutral' },
              { key: 'noResponse', label: `${event.rsvpSummary.noResponse} ${tr('rsvpSummary.noResponse')}`, tone: 'warn' },
              ...(counts.seatsClaimed === null ? [] : [{ key: 'seats', label: tj('journey.seats', { count: counts.seatsClaimed }), tone: 'neutral' as const }]),
          ]
        : [];

    const setup: (SetupStop | false)[] = [
        {
            key: 'details',
            title: t('steps.details.title'),
            icon: 'details',
            href: settingsHref,
            complete: progress.details,
            action: { label: t('steps.details.edit'), href: settingsHref },
            // The title already opens Settings, so "Edit event details" is its plain line (as on C1), not a second link.
            detail: t('steps.details.edit'),
            links: hasVenueConvention
                ? [
                      {
                          key: 'venue',
                          label: t(hasVenue ? 'steps.details.venueEdit' : 'steps.details.venueAdd'),
                          href: routes.events.tools.schedule(event.id, { section: 'venue-session' }),
                      },
                  ]
                : [],
        },
        isModuleAvailable(event.modules, 'rsvp') && {
            key: 'rsvp',
            title: moduleCopy('rsvp').name,
            icon: 'rsvp',
            href: rsvpHref,
            complete: progress.rsvp,
            action: { label: t('steps.rsvp.edit'), href: rsvpHref },
            chips: rsvpChips,
            links: progress.rsvp ? [] : [{ key: 'rsvp', label: t('steps.rsvp.edit'), href: rsvpHref }],
        },
        {
            key: 'schedule',
            title: moduleCopy('schedule').name,
            icon: 'schedule',
            href: scheduleHref,
            complete: progress.schedule,
            action: { label: t('steps.schedule.edit'), href: scheduleHref },
            cardBody: tj('journey.scheduleCard'),
            detail: progress.schedule ? tj('journey.sessions', { count: sessions.length }) : undefined,
            links: progress.schedule ? [] : [{ key: 'schedule', label: t('steps.schedule.edit'), href: scheduleHref }],
        },
        wishlistOn && {
            key: 'giftAccount',
            title: moduleCopy('wishlist').name,
            icon: 'gift',
            href: giftHref,
            complete: progress.giftAccount,
            action: { label: t('steps.giftAccount.edit'), href: giftHref },
            links: progress.giftAccount ? [] : [{ key: 'gifts', label: t('steps.giftAccount.edit'), href: giftHref }],
        },
        !isLiteEvent(event) && {
            key: 'invitations',
            title: t('steps.invitations.title'),
            icon: 'invitations',
            href: qrHref,
            complete: progress.invitations,
            action: { label: t('steps.invitations.qr'), href: qrHref },
            detail: membersLine,
            links: progress.invitations ? [] : [{ key: 'qr', label: t('steps.invitations.qr'), href: qrHref }],
        },
    ];

    const present = setup.filter((stop): stop is SetupStop => Boolean(stop));
    const currentIndex = present.findIndex((stop) => !stop.complete);
    const setupStops: JourneyStopModel[] = present.map(({ complete, action, cardBody, ...stop }, index) => {
        const status = complete ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return { ...stop, status, card: status === 'current' ? { body: cardBody, action } : undefined };
    });

    const earlier = sessionsByPhase(event).before;
    const states = sessionStates(earlier, event.schedule.timezone, now);
    const sessionStops: JourneyStopModel[] = earlier.map((item, index) => ({
        key: `session-${item.id}`,
        title: item.title,
        icon: 'session',
        status: states[index] === 'done' ? 'done' : 'upcoming',
        href: scheduleHref,
        detail: item.startAt
            ? formatDate(locale, item.startAt, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: event.schedule.timezone,
              })
            : undefined,
    }));

    return { stops: [...setupStops, ...sessionStops], allDone: currentIndex === -1 };
}
```

Check: `useHelpProgress` is called with `sessions` already filtered. It only uses `.some(!deletedAt)`, so the result is the same.

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run hooks/useBeforeJourney.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add hooks/useBeforeJourney.ts hooks/useBeforeJourney.test.tsx
git commit -m "KAN-224: Before journey stops" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: On the day journey (`hooks/useDayJourney.ts`)

- [ ] **Step 1: write the failing test** `hooks/useDayJourney.test.tsx`

```tsx
import { renderHook } from '@testing-library/react';
import { Megaphone, Ticket } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { useDayJourney } from '@/hooks/useDayJourney';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));
vi.mock('@/hooks/useToolsMenuItems', () => ({
    useHostMenuItems: () => [
        { key: 'manage', href: '/m', icon: Ticket, label: 'Manage' },
        { key: 'invitationsQr', href: '/qr', icon: Ticket, label: 'Share links' },
        { key: 'announcement', href: '/a', icon: Megaphone, label: 'Announcement' },
    ],
}));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: { photoCount: 12, videoCount: 2 } }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbookCount: () => ({ data: 3 }) }));

const session = (id: string, startAt: string, endAt: string | null = null, isMain = false) => ({
    id,
    title: id,
    startAt,
    endAt,
    isMain,
    deletedAt: null,
    displayOrder: 0,
});

const event = {
    id: 'e1',
    eventType: 'WEDDING',
    deletedAt: null,
    modules: ['gallery', 'wishbook', 'playlist'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true })),
    sessions: [
        session('Ceremony', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z', true),
        session('Reception', '2026-12-12T18:30:00Z'),
        session('Party', '2026-12-12T21:00:00Z'),
    ],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens' },
} as never;

describe('useDayJourney', () => {
    it("shows the day's sessions with the running one current", () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.stops.map((stop) => [stop.title, stop.status])).toEqual([
            ['Ceremony', 'done'],
            ['Reception', 'current'],
            ['Party', 'upcoming'],
        ]);
        expect(result.current.stops[1]).toMatchObject({ highlight: 'journey.now', badge: expect.stringMatching(/20:30/) });
    });

    it('offers share links, the announcement and the playlist as quick tools', () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.tools.map((tool) => tool.key)).toEqual(['invitationsQr', 'announcement', 'playlist']);
    });

    it('totals the media and the wishbook', () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.totals).toEqual([
            { key: 'media', icon: 'media', value: 14, label: 'mediaSummary.title' },
            { key: 'wishbook', icon: 'wishbook', value: 3, label: 'module.wishbook' },
        ]);
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run hooks/useDayJourney.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the hook**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useGallerySummary } from '@/hooks/useGalleryArchive';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useHostMenuItems } from '@/hooks/useToolsMenuItems';
import { useWishbookCount } from '@/hooks/useWishbook';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatTime } from '@/lib/datetime';
import { type JourneyStopModel, type JourneyStopStatus, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import type { JourneyIconKey } from '@/lib/journeyIcons';
import { routes } from '@/lib/routes';

export type QuickTool = { key: string; label: string; href: string; icon: JourneyIconKey };
export type JourneyTotal = { key: string; icon: JourneyIconKey; value: number; label: string };

const QUICK_TOOL_ICONS: Record<string, JourneyIconKey> = { invitationsQr: 'invitations', announcement: 'announcement' };

/** The On the day journey: the primary day's sessions, the quick tools and the totals. */
export function useDayJourney(event: EventDetailResponseDto, now: Date = new Date()) {
    const t = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const readable = readableModuleKeys(event);
    const hostItems = useHostMenuItems();
    const gallery = useGallerySummary(event.id, readable.has('gallery'));
    const wishbook = useWishbookCount(readable.has('wishbook') ? event.id : null);
    const timeZone = event.schedule.timezone;

    const daySessions = sessionsByPhase(event).day;
    const states = sessionStates(daySessions, timeZone, now);
    const stops: JourneyStopModel[] = daySessions.map((item, index) => {
        // A 24-hour clock, like the guests' schedule (ScheduleStorySession).
        const time = item.startAt ? formatTime(locale, item.startAt, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }) : undefined;
        const state = states[index];
        const status: JourneyStopStatus = state === 'now' ? 'current' : state;
        return {
            key: `session-${item.id}`,
            title: item.title,
            icon: 'session',
            status,
            href: routes.events.tools.schedule(event.id),
            detail: status === 'current' ? undefined : time,
            highlight: status === 'current' ? t('journey.now') : undefined,
            badge: status === 'current' ? time : undefined,
        };
    });

    const tools: QuickTool[] = [
        ...hostItems
            .filter((item) => item.key in QUICK_TOOL_ICONS)
            .map((item) => ({ key: item.key, label: item.label, href: item.href, icon: QUICK_TOOL_ICONS[item.key] })),
        ...(readable.has('playlist')
            ? [{ key: 'playlist', label: moduleCopy('playlist').name, href: routes.events.tools.playlist(event.id), icon: 'playlist' as const }]
            : []),
    ];

    const totals: JourneyTotal[] = [
        ...(readable.has('gallery') && gallery.data
            ? [{ key: 'media', icon: 'media' as const, value: gallery.data.photoCount + gallery.data.videoCount, label: tr('mediaSummary.title') }]
            : []),
        ...(readable.has('wishbook') && wishbook.data !== undefined
            ? [{ key: 'wishbook', icon: 'wishbook' as const, value: wishbook.data, label: moduleCopy('wishbook').name }]
            : []),
    ];

    return { stops, tools, totals };
}
```

`readableModuleKeys` reads the fixture's `modules` (its `deletedAt: null` matters). Session times use `hour12: false` in every journey, so they read "20:30" in both languages, as on C1 and the guests' schedule.

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run hooks/useDayJourney.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add hooks/useDayJourney.ts hooks/useDayJourney.test.tsx
git commit -m "KAN-224: On the day journey" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: After journey (`hooks/useAfterJourney.ts`)

- [ ] **Step 1: write the failing test** `hooks/useAfterJourney.test.tsx`

```tsx
import { renderHook } from '@testing-library/react';
import { Megaphone } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { useAfterJourney } from '@/hooks/useAfterJourney';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));
vi.mock('@/hooks/useToolsMenuItems', () => ({
    useHostMenuItems: () => [{ key: 'announcement', href: '/a', icon: Megaphone, label: 'Announcement' }],
}));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: { photoCount: 12, videoCount: 2 } }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbookCount: () => ({ data: 3 }) }));

const event = {
    id: 'e1',
    eventType: 'WEDDING',
    deletedAt: null,
    modules: ['gallery', 'wishbook'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true })),
    sessions: [
        { id: 'main', title: 'Ceremony', startAt: '2026-12-12T16:00:00Z', endAt: null, isMain: true, deletedAt: null, displayOrder: 0 },
        { id: 'brunch', title: 'Brunch', startAt: '2026-12-13T09:00:00Z', endAt: null, isMain: false, deletedAt: null, displayOrder: 1 },
    ],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens', coverageEndsAt: '2027-03-12T00:00:00Z' },
} as never;

describe('useAfterJourney', () => {
    it('starts with later sessions, then media, wishbook, announcement and the plan', () => {
        const { result } = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z')));
        expect(result.current.stops.map((stop) => stop.key)).toEqual(['session-brunch', 'media', 'wishbook', 'announcement', 'plan']);
    });

    it('makes media the current card with Download all', () => {
        const media = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z'))).result.current.stops[1];
        expect(media).toMatchObject({ status: 'current', detail: 'journey.media:{"photos":12,"videos":2}' });
        expect(media.card?.action.label).toBe('coverage.download');
    });

    it('names the plan, when coverage ends, and links to Extend', () => {
        const plan = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z'))).result.current.stops.at(-1);
        expect(plan).toMatchObject({ title: 'Premium', detail: expect.stringMatching(/^journey\.coverageEnds:/) });
        expect(plan?.links?.[0].label).toBe('journey.extend');
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run hooks/useAfterJourney.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the hook**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useGallerySummary } from '@/hooks/useGalleryArchive';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useHostMenuItems } from '@/hooks/useToolsMenuItems';
import { useWishbookCount } from '@/hooks/useWishbook';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { type JourneyStopModel, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

/** The After journey: later sessions, then media, wishbook, the thank-you and the plan's coverage. */
export function useAfterJourney(event: EventDetailResponseDto, planName: string | null, now: Date = new Date()) {
    const t = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const readable = readableModuleKeys(event);
    const announcement = useHostMenuItems().find((item) => item.key === 'announcement');
    const gallery = useGallerySummary(event.id, readable.has('gallery'));
    const wishbook = useWishbookCount(readable.has('wishbook') ? event.id : null);
    const timeZone = event.schedule.timezone;

    const later = sessionsByPhase(event).after;
    const states = sessionStates(later, timeZone, now);
    const sessionStops: JourneyStopModel[] = later.map((item, index) => ({
        key: `session-${item.id}`,
        title: item.title,
        icon: 'session',
        status: states[index] === 'done' ? 'done' : 'upcoming',
        href: routes.events.tools.schedule(event.id),
        detail: item.startAt
            ? formatDate(locale, item.startAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
            : undefined,
    }));

    const galleryHref = routes.events.tools.gallery(event.id);
    const billingHref = routes.events.manage(event.id, { tab: 'billing' });
    const coverageEndsAt = event.schedule.coverageEndsAt;

    const extras: (JourneyStopModel | false)[] = [
        readable.has('gallery') && {
            key: 'media',
            title: tr('mediaSummary.title'),
            icon: 'media',
            status: 'current',
            href: galleryHref,
            detail: t('journey.media', { photos: gallery.data?.photoCount ?? 0, videos: gallery.data?.videoCount ?? 0 }),
            card: { action: { label: t('coverage.download'), href: galleryHref } },
        },
        readable.has('wishbook') && {
            key: 'wishbook',
            title: moduleCopy('wishbook').name,
            icon: 'wishbook',
            status: 'upcoming',
            href: routes.events.tools.wishbook(event.id),
            detail: tr('wishbookSummary.count', { count: wishbook.data ?? 0 }),
        },
        Boolean(announcement) && {
            key: 'announcement',
            title: announcement!.label,
            icon: 'announcement',
            status: 'upcoming',
            href: announcement!.href,
            detail: t('journey.thankGuests'),
        },
        Boolean(planName && coverageEndsAt) && {
            key: 'plan',
            title: planName!,
            icon: 'plan',
            status: 'upcoming',
            href: billingHref,
            detail: t('journey.coverageEnds', { date: formatDate(locale, coverageEndsAt!, { day: 'numeric', month: 'short', timeZone }) }),
            links: [{ key: 'extend', label: t('journey.extend'), href: billingHref }],
        },
    ];

    return { stops: [...sessionStops, ...extras.filter((stop): stop is JourneyStopModel => Boolean(stop))] };
}
```

Without the gallery module, no stop is current. `JourneyPath` handles that: no card shows.

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run hooks/useAfterJourney.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add hooks/useAfterJourney.ts hooks/useAfterJourney.test.tsx
git commit -m "KAN-224: After journey" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: Plan line (`hooks/useOverviewPlanLine.ts`)

- [ ] **Step 1: write the failing test** `hooks/useOverviewPlanLine.test.tsx`

```tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOverviewPlanLine } from '@/hooks/useOverviewPlanLine';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const usage = { storageBytes: 1_200_000_000, storageLimitBytes: 10_000_000_000, storagePercent: 12, proStorageBytes: 0, proUsedBytes: 0 } as never;

describe('useOverviewPlanLine', () => {
    it('reads used of limit with the plan name', () => {
        const { result } = renderHook(() => useOverviewPlanLine('e1', 'Premium', usage));
        expect(result.current).toMatchObject({ planName: 'Premium', percent: 12, showPro: false });
        expect(result.current?.usage).toMatch(/^journey\.storage:/);
    });

    it('shows only the used amount when there is no limit', () => {
        const { result } = renderHook(() => useOverviewPlanLine('e1', 'Premium', { ...(usage as object), storageLimitBytes: null } as never));
        expect(result.current?.usage).not.toMatch(/journey\.storage/);
        expect(result.current?.percent).toBeNull();
    });

    it('is empty without usage', () => {
        expect(renderHook(() => useOverviewPlanLine('e1', 'Premium', null)).result.current).toBeNull();
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run hooks/useOverviewPlanLine.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the hook**

```ts
'use client';

import { useTranslations } from 'next-intl';

import type { EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';
import { hasProAllowance } from '@/lib/vendors';

/** The plan line under the Before and On the day journeys: plan name, storage used, and the Pro meter. */
export function useOverviewPlanLine(eventId: string, planName: string | null, usage: EventUsageResponseDto | null) {
    const t = useTranslations('ManagePage');
    if (!usage || !planName) return null;
    const used = formatBytes(usage.storageBytes);
    return {
        planName,
        usage: usage.storageLimitBytes === null ? used : t('journey.storage', { used, limit: formatBytes(usage.storageLimitBytes) }),
        percent: usage.storageLimitBytes === null ? null : usage.storagePercent,
        href: routes.events.manage(eventId, { tab: 'billing' }),
        showPro: hasProAllowance(usage),
        proUsedBytes: usage.proUsedBytes ?? 0,
        proAllowanceBytes: usage.proStorageBytes ?? 0,
    };
}

export type OverviewPlanLine = NonNullable<ReturnType<typeof useOverviewPlanLine>>;
```

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run hooks/useOverviewPlanLine.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add hooks/useOverviewPlanLine.ts hooks/useOverviewPlanLine.test.tsx
git commit -m "KAN-224: Overview plan line" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: Phase stepper component

**Files:** `components/manage/overview/PhaseStepper.tsx` and `PhaseStepper.test.tsx`.

- [ ] **Step 1: write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhaseStepper } from '@/components/manage/overview/PhaseStepper';
import type { PhaseStep } from '@/hooks/useEventJourneyPhase';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const steps: PhaseStep[] = [
    { phase: 'before', label: 'Before', caption: 'Done', state: 'done' },
    { phase: 'day', label: 'On the day', caption: 'Today', state: 'current' },
    { phase: 'after', label: 'After', caption: 'From 13 Dec', state: 'upcoming' },
];

afterEach(cleanup);

describe('PhaseStepper', () => {
    it('marks the current phase and the one on screen', () => {
        render(<PhaseStepper steps={steps} selected="after" onSelect={vi.fn()} />);
        expect(screen.getByRole('group', { name: 'journey.phases.label' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /On the day/ })).toHaveAttribute('aria-current', 'step');
        expect(screen.getByRole('button', { name: /After/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects a phase on tap', () => {
        const onSelect = vi.fn();
        render(<PhaseStepper steps={steps} selected="day" onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: /Before/ }));
        expect(onSelect).toHaveBeenCalledWith('before');
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run components/manage/overview/PhaseStepper.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write the component.** Each button is its own small component so the handler isn't an inline arrow (`react/jsx-no-bind`).

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PhaseStep } from '@/hooks/useEventJourneyPhase';
import type { JourneyPhase } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

function PhaseButton({ step, selected, onSelect }: { step: PhaseStep; selected: boolean; onSelect: (phase: JourneyPhase) => void }) {
    const handleClick = useCallback(() => onSelect(step.phase), [onSelect, step.phase]);
    return (
        <button
            type="button"
            onClick={handleClick}
            aria-pressed={selected}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="group flex min-h-11 flex-1 flex-col items-start text-left first:items-start last:items-end last:text-right [&:nth-child(2)]:items-center [&:nth-child(2)]:text-center"
        >
            {/* Dot */}
            <span
                aria-hidden="true"
                className={cn(
                    'mb-2 block h-3.5 w-3.5 rounded-full border-2',
                    step.state === 'done' && 'border-success bg-success',
                    step.state === 'current' && 'border-primary bg-primary ring-4 ring-primary/20',
                    step.state === 'upcoming' && 'border-border-warm bg-event',
                )}
            />
            <span className={cn('text-sm leading-tight', selected ? 'font-bold text-ink' : 'font-semibold text-ink-muted')}>{step.label}</span>
            <span className="text-xs text-ink-muted">{step.caption}</span>
        </button>
    );
}

/** Before / On the day / After. The current phase is marked; tapping one shows its journey. */
export function PhaseStepper({ steps, selected, onSelect }: { steps: PhaseStep[]; selected: JourneyPhase; onSelect: (phase: JourneyPhase) => void }) {
    const t = useTranslations('ManagePage');
    return (
        <div role="group" aria-label={t('journey.phases.label')} className="relative flex gap-2">
            {/* Track */}
            <span aria-hidden="true" className="absolute top-[0.4rem] right-2 left-2 h-1 rounded-full bg-border-warm/70" />
            {steps.map((step) => (
                <PhaseButton key={step.phase} step={step} selected={step.phase === selected} onSelect={onSelect} />
            ))}
        </div>
    );
}
```

Check the colour tokens against `app/globals.css` before using them: `success`, `border-warm`, `primary`, `event`. Where a token doesn't exist, use the nearest one that does (for example `emerald-600`, or `border`). Never add a new token in this ticket. The coloured progress fill between done dots, as on the mockup, is a sibling `span` whose width is the done share (`0%`, `50%`, `100%`) with `bg-gradient-logo`. Add it once the dots render.

- [ ] **Step 4: run the test and see it pass.**

```bash
npx vitest run components/manage/overview/PhaseStepper.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add components/manage/overview/PhaseStepper.tsx components/manage/overview/PhaseStepper.test.tsx
git commit -m "KAN-224: Phase stepper" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: The path

**Files:**
- `components/manage/overview/JourneyStopIcon.tsx`
- `components/manage/overview/JourneyStop.tsx`
- `components/manage/overview/JourneyConnector.tsx`
- `components/manage/overview/JourneyStopCard.tsx`
- `components/manage/overview/AllSetCard.tsx`
- `components/manage/overview/JourneyPath.tsx`
- `components/manage/overview/JourneyPath.test.tsx`

- [ ] **Step 1: write the failing test** `JourneyPath.test.tsx`

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JourneyPath } from '@/components/manage/overview/JourneyPath';
import type { JourneyStopModel } from '@/lib/eventJourney';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const stops: JourneyStopModel[] = [
    { key: 'details', title: 'Event details', icon: 'details', status: 'done', href: '/settings' },
    {
        key: 'schedule',
        title: 'Schedule',
        icon: 'schedule',
        status: 'current',
        href: '/schedule',
        card: { body: 'Add the parts of your day', action: { label: 'Add sessions', href: '/schedule' } },
    },
    { key: 'gift', title: 'Gift account', icon: 'gift', status: 'upcoming', href: '/gifts', detail: 'Add gift account' },
];

afterEach(cleanup);

describe('JourneyPath', () => {
    it('lists the stops in order under the journey label (small screens)', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const list = within(screen.getByTestId('journey-mobile')).getByRole('list', { name: 'Get ready' });
        expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            expect.stringContaining('Event details'),
            expect.stringContaining('Schedule'),
            expect.stringContaining('Gift account'),
        ]);
    });

    it("shows the current stop's card with its action", () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getByText('Add the parts of your day')).toBeInTheDocument();
        expect(within(mobile).getByRole('link', { name: 'Add sessions' })).toHaveAttribute('href', '/schedule');
    });

    it('labels done stops and gives stop images their label as alt text', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getAllByText('journey.phases.done')).toHaveLength(1);
        expect(within(mobile).getByAltText('Gift account')).toBeInTheDocument();
        expect(within(mobile).getByAltText('On the day')).toBeInTheDocument();
    });

    it('swaps the current card for a given replacement (All set)', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" replacementCard={<p>All set card</p>} />);
        expect(within(screen.getByTestId('journey-mobile')).getByText('All set card')).toBeInTheDocument();
        expect(within(screen.getByTestId('journey-mobile')).queryByText('Add the parts of your day')).toBeNull();
    });
});
```

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run components/manage/overview/JourneyPath.test.tsx
```

Expected: FAIL, because the module doesn't exist yet.

- [ ] **Step 3: write `JourneyStopIcon.tsx`**: the circle in its three states.

```tsx
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { JourneyStopModel } from '@/lib/eventJourney';
import { journeyIcons } from '@/lib/journeyIcons';
import { cn } from '@/lib/utils';

/** The stop's circle: a check when done, the gradient when current, the icon when still to come. */
export function JourneyStopIcon({ stop }: { stop: JourneyStopModel }) {
    const t = useTranslations('ManagePage');
    const icon = journeyIcons[stop.icon];

    if (stop.status === 'done') {
        return (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
                <span className="sr-only">{t('journey.phases.done')}</span>
            </span>
        );
    }

    const current = stop.status === 'current';
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                current
                    ? 'h-[4.5rem] w-[4.5rem] bg-gradient-logo text-white shadow-[0_8px_24px_rgba(242,136,92,0.35)] ring-8 ring-primary/10'
                    : 'h-14 w-14 border-2 border-[#f0e2d2] bg-event text-ink-muted',
            )}
        >
            {current && stop.badge ? (
                <span className="text-base font-bold">{stop.badge}</span>
            ) : icon.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element -- small static icon from public/icons
                <img src={icon.src} alt={stop.title} className="h-7 w-7 object-contain" />
            ) : (
                <icon.icon className="h-6 w-6" aria-label={stop.title} role="img" />
            )}
        </span>
    );
}
```

If the repo already has a lint-clean pattern for small `public/icons` images (look at how the guest pages render them, e.g. `grep -rn "/icons/" components`), use that pattern instead of the eslint-disable.

- [ ] **Step 4: write `JourneyStop.tsx`**: icon plus text. The whole title is a link.

```tsx
import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { JourneyChip, JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

const CHIP_TONES: Record<JourneyChip['tone'], string> = {
    success: 'bg-emerald-50 text-emerald-800',
    neutral: 'bg-surface-muted text-ink-muted',
    warn: 'bg-amber-50 text-amber-800',
};

/** One stop: its circle, title, line, chips and links. `align` puts the text on the circle's left or right. */
export function JourneyStop({ stop, align }: { stop: JourneyStopModel; align: 'start' | 'end' | 'center' }) {
    return (
        <div
            className={cn(
                'flex items-center gap-3',
                align === 'end' && 'flex-row-reverse text-right',
                align === 'center' && 'flex-col text-center',
            )}
        >
            <JourneyStopIcon stop={stop} />

            {/* Text */}
            <div className={cn('flex min-w-0 flex-col gap-1', align === 'end' && 'items-end', align === 'center' && 'items-center')}>
                <AppLink href={stop.href} className="text-[15px] leading-tight font-bold text-ink hover:underline">
                    {stop.title}
                </AppLink>
                {stop.highlight && <span className="text-sm font-semibold text-primary-dark">{stop.highlight}</span>}
                {stop.detail && <span className="text-sm text-ink-muted">{stop.detail}</span>}
                {stop.chips && stop.chips.length > 0 && (
                    <span className={cn('flex flex-wrap gap-1.5', align === 'end' && 'justify-end', align === 'center' && 'justify-center')}>
                        {stop.chips.map((chip) => (
                            <span key={chip.key} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', CHIP_TONES[chip.tone])}>
                                {chip.label}
                            </span>
                        ))}
                    </span>
                )}
                {stop.links?.map((link) => (
                    <AppLink key={link.key} href={link.href} className="text-sm font-semibold text-primary-dark hover:underline">
                        {link.label}
                    </AppLink>
                ))}
            </div>
        </div>
    );
}
```

A stop's `links` never repeat the title link's target. `useBeforeJourney` only adds a link (for example "Add sessions") while the stop isn't done, and the details stop shows "Edit event details" as plain text.

- [ ] **Step 5: write `JourneyConnector.tsx`**: the S-curve between two stops (decorative).

```tsx
import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * The curve from one stop to the next. Vertical (small screens) runs from one side to the other;
 * horizontal (desktop) runs from the top row to the lower one or back. Solid gradient once walked.
 */
export function JourneyConnector({
    orientation,
    reverse,
    walked,
    className,
}: {
    orientation: 'vertical' | 'horizontal';
    reverse: boolean;
    walked: boolean;
    className?: string;
}) {
    const gradientId = useId();
    const d =
        orientation === 'vertical'
            ? reverse
                ? 'M90 0 C90 55 10 45 10 100'
                : 'M10 0 C10 55 90 45 90 100'
            : reverse
              ? 'M0 85 C55 85 45 15 100 15'
              : 'M0 15 C55 15 45 85 100 85';
    return (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={cn('block overflow-visible', className)}>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2={orientation === 'vertical' ? '0' : '1'} y2={orientation === 'vertical' ? '1' : '0'}>
                    <stop offset="0%" stopColor="#c777b1" />
                    <stop offset="50%" stopColor="#e48279" />
                    <stop offset="100%" stopColor="#f2885c" />
                </linearGradient>
            </defs>
            <path
                d={d}
                fill="none"
                vectorEffect="non-scaling-stroke"
                stroke={walked ? `url(#${gradientId})` : '#f0e2d2'}
                strokeWidth={walked ? 5 : 6}
                strokeLinecap="round"
                strokeDasharray={walked ? undefined : '0 12'}
            />
        </svg>
    );
}
```

- [ ] **Step 6: write `JourneyStopCard.tsx` and `AllSetCard.tsx`.**

`JourneyStopCard.tsx`:

```tsx
import type { ReactNode } from 'react';

import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { JourneyStopModel } from '@/lib/eventJourney';

/** The current stop, opened up: its title, an optional line, and one action. */
export function JourneyStopCard({ stop, aside }: { stop: JourneyStopModel; aside?: ReactNode }) {
    if (!stop.card) return null;
    return (
        <div className="flex flex-col gap-4 rounded-3xl bg-primary-light/40 p-5 lg:flex-row lg:items-center lg:gap-8 lg:p-7">
            {/* Icon */}
            <div className="hidden lg:block">
                <JourneyStopIcon stop={stop} />
            </div>

            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="text-lg font-bold text-ink">{stop.title}</h3>
                {stop.detail && <p className="text-sm text-ink-muted">{stop.detail}</p>}
                {stop.card.body && <p className="text-sm text-ink-muted">{stop.card.body}</p>}
                <AppLink
                    href={stop.card.action.href}
                    className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition-opacity hover:opacity-90 lg:self-start"
                >
                    {stop.card.action.label}
                </AppLink>
            </div>

            {/* Plan (desktop) */}
            {aside && <div className="hidden lg:block lg:w-64">{aside}</div>}
        </div>
    );
}
```

`AllSetCard.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';

/** Replaces the current card once every setup stop is done. */
export function AllSetCard({ printHref, aside }: { printHref: string; aside?: ReactNode }) {
    const t = useTranslations('ManagePage');
    return (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-linear-to-b from-[#fbe3ec] to-primary-light/40 p-6 text-center lg:flex-row lg:text-left">
            {/* Balloons */}
            <img src="/icons/balloon.svg" alt={t('journey.allSet.title')} className="h-20 w-20 object-contain" />

            {/* Text */}
            <div className="flex flex-1 flex-col items-center gap-1 lg:items-start">
                <h3 className="text-xl font-bold text-ink">{t('journey.allSet.title')}</h3>
                <p className="text-sm text-ink-muted">{t('journey.allSet.body')}</p>
                <AppLink
                    href={printHref}
                    className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white hover:opacity-90"
                >
                    {t('journey.allSet.print')}
                </AppLink>
            </div>

            {/* Plan (desktop) */}
            {aside && <div className="hidden lg:block lg:w-64">{aside}</div>}
        </div>
    );
}
```

Repeat the `img` lint handling from Step 3 here.

- [ ] **Step 7: write `JourneyPath.tsx`**: both layouts. Only one is visible at a time (CSS), so the hidden one is out of the accessibility tree.

```tsx
import { Heart, Moon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { JourneyConnector } from '@/components/manage/overview/JourneyConnector';
import { JourneyStop } from '@/components/manage/overview/JourneyStop';
import { JourneyStopCard } from '@/components/manage/overview/JourneyStopCard';
import type { JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

type JourneyEnd = 'day' | 'night' | 'heart';

function PathEnd({ end, label }: { end: JourneyEnd; label: string }) {
    if (end === 'day') return <img src="/icons/balloon.svg" alt={label} className="h-14 w-10 object-contain" />;
    const Icon = end === 'night' ? Moon : Heart;
    return <Icon className="h-9 w-9 fill-[#e48279] text-[#e48279]" aria-hidden="true" />;
}

// A connector is walked when the stop it leaves is done (it reaches the next stop, done or current).
const walked = (stops: JourneyStopModel[], index: number) => stops[index].status === 'done';

/**
 * The winding path. Small screens: stops down the page, alternating sides, the current card under
 * its stop. Desktop: stops across in a wave, the current card under the whole path.
 */
export function JourneyPath({
    label,
    stops,
    end,
    endLabel,
    replacementCard,
    aside,
}: {
    label: string;
    stops: JourneyStopModel[];
    end: JourneyEnd;
    endLabel: string;
    // Shown instead of the current stop's card (the All set card).
    replacementCard?: ReactNode;
    // Beside the card on desktop (the plan line).
    aside?: ReactNode;
}) {
    const current = stops.find((stop) => stop.status === 'current' && stop.card);
    const card = replacementCard ?? (current ? <JourneyStopCard stop={current} aside={aside} /> : null);

    return (
        <>
            {/* Path (small screens) */}
            <div data-testid="journey-mobile" className="lg:hidden">
                <ol aria-label={label} className="flex flex-col">
                    {stops.map((stop, index) => (
                        <li key={stop.key} className="flex flex-col">
                            <div className={cn('flex', index % 2 === 0 ? 'justify-start' : 'justify-end')}>
                                <JourneyStop stop={stop} align={index % 2 === 0 ? 'start' : 'end'} />
                            </div>
                            {stop === current && !replacementCard && <div className="mt-4">{card}</div>}
                            <JourneyConnector orientation="vertical" reverse={index % 2 === 1} walked={walked(stops, index)} className="mx-7 h-16" />
                        </li>
                    ))}
                </ol>
                {/* End */}
                <div className={cn('flex', stops.length % 2 === 0 ? 'justify-start pl-4' : 'justify-end pr-4')}>
                    <PathEnd end={end} label={endLabel} />
                </div>
                {replacementCard && <div className="mt-6">{replacementCard}</div>}
            </div>

            {/* Path (desktop) */}
            <div className="hidden lg:block">
                <ol aria-label={label} className="flex items-start">
                    {stops.map((stop, index) => (
                        <Fragment key={stop.key}>
                            <li className={cn('flex w-36 shrink-0 justify-center', index % 2 === 1 && 'mt-20')}>
                                <JourneyStop stop={stop} align="center" />
                            </li>
                            <li aria-hidden="true" className="min-w-8 flex-1 self-stretch pt-7">
                                <JourneyConnector orientation="horizontal" reverse={index % 2 === 1} walked={walked(stops, index)} className="h-20 w-full" />
                            </li>
                        </Fragment>
                    ))}
                    <li className={cn('flex shrink-0 items-center', stops.length % 2 === 1 && 'mt-20')}>
                        <PathEnd end={end} label={endLabel} />
                    </li>
                </ol>
                {/* Current card */}
                {card && <div className="mt-8">{card}</div>}
            </div>
        </>
    );
}
```

The desktop list's connector items are `aria-hidden` so the list reads as stops only. The test reads the mobile list, whose `li`s hold only stops. The end image is the path's last visible element. Check its alt "On the day" against the approved wording rule (alt = label).

- [ ] **Step 8: run the test and see it pass.**

```bash
npx vitest run components/manage/overview/JourneyPath.test.tsx
```

Expected: PASS.

- [ ] **Step 9: commit.**

```bash
git add components/manage/overview/JourneyStopIcon.tsx components/manage/overview/JourneyStop.tsx components/manage/overview/JourneyConnector.tsx components/manage/overview/JourneyStopCard.tsx components/manage/overview/AllSetCard.tsx components/manage/overview/JourneyPath.tsx components/manage/overview/JourneyPath.test.tsx
git commit -m "KAN-224: Journey path, stops and cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 10: Quick tools, totals, plan line, and the composed view

**Files:**
- `components/manage/overview/QuickTools.tsx`
- `components/manage/overview/JourneyTotals.tsx`
- `components/manage/overview/PlanLine.tsx`
- `components/manage/overview/OverviewJourneyView.tsx`
- `components/manage/overview/OverviewJourney.tsx`
- `components/manage/overview/OverviewJourneyView.stories.tsx`

- [ ] **Step 1: `QuickTools.tsx`**: rows linking out, one soft surface.

```tsx
import { ChevronRight } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import type { QuickTool } from '@/hooks/useDayJourney';
import { journeyIcons } from '@/lib/journeyIcons';

function ToolIcon({ tool }: { tool: QuickTool }) {
    const icon = journeyIcons[tool.icon];
    if (icon.kind === 'image') return <img src={icon.src} alt={tool.label} className="h-8 w-8 object-contain" />;
    return <icon.icon className="h-6 w-6 text-primary-dark" role="img" aria-label={tool.label} />;
}

/** On the day: the tools a host reaches for during the event. */
export function QuickTools({ tools }: { tools: QuickTool[] }) {
    if (tools.length === 0) return null;
    return (
        <ul className="flex flex-col rounded-3xl bg-primary-light/40 p-2">
            {tools.map((tool) => (
                <li key={tool.key}>
                    <AppLink href={tool.href} className="flex min-h-14 items-center gap-3 rounded-2xl px-3 font-semibold text-ink hover:bg-white/60">
                        <ToolIcon tool={tool} />
                        <span className="flex-1">{tool.label}</span>
                        <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                    </AppLink>
                </li>
            ))}
        </ul>
    );
}
```

The icon's alt repeats the link text. That follows the agreed rule (icon alt = its label). Screen readers will hear the label twice. If the a11y review objects, raise it with the owner. Do not drop the alt on your own (CLAUDE.md forbids empty alt).

- [ ] **Step 2: `JourneyTotals.tsx`**

```tsx
import type { JourneyTotal } from '@/hooks/useDayJourney';
import { formatCount } from '@/lib/format';
import { journeyIcons } from '@/lib/journeyIcons';

/** On the day: what guests have shared so far. */
export function JourneyTotals({ totals }: { totals: JourneyTotal[] }) {
    if (totals.length === 0) return null;
    return (
        <dl className="grid grid-cols-2 gap-3">
            {totals.map((total) => {
                const icon = journeyIcons[total.icon];
                return (
                    <div key={total.key} className="flex items-center gap-3 rounded-2xl bg-primary-light/40 px-4 py-3">
                        {icon.kind === 'image' ? (
                            <img src={icon.src} alt={total.label} className="h-8 w-8 object-contain" />
                        ) : (
                            <icon.icon className="h-6 w-6" role="img" aria-label={total.label} />
                        )}
                        {/* dt first for valid markup; the number shows on top */}
                        <div className="flex flex-col-reverse">
                            <dt className="text-sm text-ink-muted">{total.label}</dt>
                            <dd className="text-xl leading-none font-bold text-ink">{formatCount(total.value)}</dd>
                        </div>
                    </div>
                );
            })}
        </dl>
    );
}
```

- [ ] **Step 3: `PlanLine.tsx`**

```tsx
import { ChevronRight } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';
import type { OverviewPlanLine } from '@/hooks/useOverviewPlanLine';

/** The plan and its storage, linking to Billing. */
export function PlanLine({ line }: { line: OverviewPlanLine }) {
    return (
        <div className="flex flex-col gap-3">
            <AppLink href={line.href} className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_0_rgba(36,31,26,0.04)]">
                <span className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-ink">{line.planName}</span>
                    <span className="flex-1 text-ink-muted">· {line.usage}</span>
                    <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                </span>
                {line.percent !== null && (
                    <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#f0e2d2]">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, line.percent)}%` }} />
                    </span>
                )}
            </AppLink>
            {line.showPro && <ProStorageMeter usedBytes={line.proUsedBytes} allowanceBytes={line.proAllowanceBytes} className="px-1" />}
        </div>
    );
}
```

- [ ] **Step 4: `OverviewJourneyView.tsx`**: props only. One journey shows at a time.

```tsx
import { AllSetCard } from '@/components/manage/overview/AllSetCard';
import { JourneyPath } from '@/components/manage/overview/JourneyPath';
import { JourneyTotals } from '@/components/manage/overview/JourneyTotals';
import { PhaseStepper } from '@/components/manage/overview/PhaseStepper';
import { PlanLine } from '@/components/manage/overview/PlanLine';
import { QuickTools } from '@/components/manage/overview/QuickTools';
import type { JourneyTotal, QuickTool } from '@/hooks/useDayJourney';
import type { PhaseStep } from '@/hooks/useEventJourneyPhase';
import type { OverviewPlanLine } from '@/hooks/useOverviewPlanLine';
import type { JourneyPhase, JourneyStopModel } from '@/lib/eventJourney';

export type OverviewJourneyViewProps = {
    labels: { getReady: string; day: string; afterEvent: string };
    steps: PhaseStep[];
    selected: JourneyPhase;
    onSelectPhase: (phase: JourneyPhase) => void;
    before: { stops: JourneyStopModel[]; allDone: boolean; printHref: string };
    day: { stops: JourneyStopModel[]; tools: QuickTool[]; totals: JourneyTotal[] };
    after: { stops: JourneyStopModel[] };
    planLine: OverviewPlanLine | null;
};

/** The Overview of a live event: the phase stepper and that phase's journey. */
export function OverviewJourneyView({ labels, steps, selected, onSelectPhase, before, day, after, planLine }: OverviewJourneyViewProps) {
    const plan = planLine ? <PlanLine line={planLine} /> : null;

    return (
        <div className="flex flex-col gap-6">
            {/* Phases */}
            <PhaseStepper steps={steps} selected={selected} onSelect={onSelectPhase} />

            {/* Before */}
            {selected === 'before' && (
                <JourneyPath
                    label={labels.getReady}
                    stops={before.stops}
                    end="day"
                    endLabel={labels.day}
                    replacementCard={before.allDone ? <AllSetCard printHref={before.printHref} aside={plan} /> : undefined}
                    aside={plan}
                />
            )}

            {/* On the day */}
            {selected === 'day' && (
                <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
                    <JourneyPath label={labels.day} stops={day.stops} end="night" endLabel={labels.day} />
                    <div className="flex flex-col gap-3">
                        <QuickTools tools={day.tools} />
                        <JourneyTotals totals={day.totals} />
                    </div>
                </div>
            )}

            {/* After */}
            {selected === 'after' && <JourneyPath label={labels.afterEvent} stops={after.stops} end="heart" endLabel={labels.afterEvent} />}

            {/* Plan (small screens; desktop shows it inside the card) */}
            {selected !== 'after' && plan && <div className={selected === 'before' ? 'lg:hidden' : undefined}>{plan}</div>}
        </div>
    );
}
```

C1's phone board places the On the day quick tools between the running session and the next one. The owner chose on 2026-11-16 to put them under the path instead (beside it on desktop), so the path stays whole.

- [ ] **Step 5: `OverviewJourney.tsx`**: the container.

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { OverviewJourneyView } from '@/components/manage/overview/OverviewJourneyView';
import { useAfterJourney } from '@/hooks/useAfterJourney';
import { type JourneyCounts, useBeforeJourney } from '@/hooks/useBeforeJourney';
import { useDayJourney } from '@/hooks/useDayJourney';
import { useEventJourneyPhase } from '@/hooks/useEventJourneyPhase';
import { useOverviewPlanLine } from '@/hooks/useOverviewPlanLine';
import type { EventDetailResponseDto, EventUsageResponseDto } from '@/lib/api/types';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

/** Gathers the journey for a live event and hands it to the view. */
export function OverviewJourney({
    event,
    eventUsage,
    planName,
    counts,
}: {
    event: EventDetailResponseDto;
    eventUsage: EventUsageResponseDto | null;
    planName: string | null;
    counts: JourneyCounts;
}) {
    const t = useTranslations('ManagePage');
    // One "now" for the page's life, so phases and session states agree with each other.
    const [now] = useState(() => new Date());
    const phase = useEventJourneyPhase(event, now);
    const before = useBeforeJourney(event, counts, now);
    const day = useDayJourney(event, now);
    const after = useAfterJourney(event, planName, now);
    const planLine = useOverviewPlanLine(event.id, planName, eventUsage);

    return (
        <OverviewJourneyView
            labels={{ getReady: t('journey.getReady'), day: t('journey.phases.day'), afterEvent: t('journey.afterEvent') }}
            steps={phase.steps}
            selected={phase.selected}
            onSelectPhase={phase.select}
            before={{ ...before, printHref: isLiteEvent(event) ? routes.events.tools.gallery(event.id) : routes.events.invitationsQr(event.id) }}
            day={day}
            after={after}
            planLine={planLine}
        />
    );
}
```

- [ ] **Step 6: stories** in `OverviewJourneyView.stories.tsx`. Copy the structure of `components/manage/nav/ManageSectionList.stories.tsx` (`withAppContext`, `STORY_EVENT_ID`). Use plain fixture stop models (no hooks) for:
  - `BeforeMobile`: stops as in the C1-mobile board (details and RSVP done, Schedule current with its card, Gift account and Invitations upcoming). Tags `['visual-mobile-only']`, `globals: { viewport: { value: 'mobile' } }`.
  - `BeforeDesktop`: same data, tag `visual-desktop-only`.
  - `AllSetMobile`: all done, `allDone: true`.
  - `OnTheDayMobile`: Ceremony done, Reception current ("Now", badge "20:30"), Party upcoming; three tools; totals 14 and 3.
  - `AfterMobile`: Media current with "Download all", Wishbook, Announcement, Plan with Extend.
  - `OnTheDayDesktop` and `AfterDesktop`.

  Use the English wording from the approved table as fixture text, and pass `onSelectPhase: fn()`. Then run Storybook's test build so the stories at least compile:

```bash
npx vitest run --project=storybook components/manage/overview 2>&1 | tail -20
```

If the repo has no storybook vitest project, run `npx tsc --noEmit` instead and check the stories in `npm run storybook` by eye (see `docs/storybook.md`).

- [ ] **Step 7: commit.**

```bash
git add components/manage/overview
git commit -m "KAN-224: Overview journey view, tools, totals and plan line" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 11: Put the journey on the Overview

**Files:**
- `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx`
- `OverviewTab.test.tsx`, `OverviewTab.themePicker.test.tsx`
- `components/manage/ManageScreen.tsx`
- `components/manage/ManageSkeletons.tsx`

- [ ] **Step 1: update the test first.** In `OverviewTab.test.tsx`:
  - replace the mocks of `HostContextSections`, `useRightContextPanel`, `CoverageStatusStrip`, `EventSetupSteps` and `MetricStrip` with one mock: `vi.mock('@/components/manage/overview/OverviewJourney', () => ({ OverviewJourney: ({ counts }: { counts: { memberCount: number } }) => <p data-testid="journey">{counts.memberCount}</p> }))`;
  - drop the `memberCount`/`daysToGo`/`pendingCoHostInvitationCount` props from `renderOverview`, keeping `seatsClaimed` and adding `memberCount` back only if the new prop list keeps it (see Step 3);
  - replace the two MetricStrip tests with:

```tsx
it('shows the journey on a live event', () => {
    renderOverview('ACTIVE');
    expect(screen.getByTestId('journey')).toBeInTheDocument();
});

it('keeps the draft panel for a draft', () => {
    renderOverview('DRAFT');
    expect(screen.queryByTestId('journey')).toBeNull();
    expect(screen.getByTestId('draft-panel')).toBeInTheDocument();
});
```

Update `OverviewTab.themePicker.test.tsx` the same way: remove its mocks for the deleted components and fix its props.

- [ ] **Step 2: run the tests and see them fail.**

```bash
npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab"
```

Expected: FAIL. `journey` isn't found, because the live branch still renders the old blocks.

- [ ] **Step 3: change `OverviewTab.tsx`.**
  - Props:
    - remove `daysToGo` and `pendingCoHostInvitationCount`;
    - keep `memberCount` (the fallback when usage hasn't loaded) and `seatsClaimed`.
  - Imports: remove `InviartOverviewSection`'s neighbours that are no longer used (`HostContextSections`, `CoverageStatusStrip`, `EventSetupSteps`, `MetricStrip`, `useRightContextPanel`, `isLiteEvent`). Add `OverviewJourney`.
  - Remove `const hostContextPanel = useRightContextPanel(...)`.
  - Replace the live branch's return with:

```tsx
    // Members are counted on the invitations stop, against the plan's limit.
    const counts = { memberCount: eventUsage?.memberCount ?? memberCount, memberLimit: eventUsage?.memberLimit ?? null, seatsClaimed };

    return (
        <div className="flex flex-col gap-8">
            {/* Journey */}
            <OverviewJourney event={event} eventUsage={eventUsage} planName={currentPlan?.name ?? null} counts={counts} />

            {/* INVIART */}
            <InviartOverviewSection eventType={eventType} />
        </div>
    );
```

`currentPlan` already comes from `useEventOverviewPlan` at the top of the component.

- [ ] **Step 4: change `ManageScreen.tsx`.**
  - Remove the `daysToGo` state, its effect, and the `daysToGo`/`pendingCoHostInvitationCount` props.
  - Remove `countPendingCoHostInvitations` from the imports.
  - Change `overviewLoading` to `membersLoading || rsvpsLoading || usageLoading`, because the Overview no longer reads invitations.
  - Keep `useEventInvitations`, which the Members section still uses.
  - Check whether anything else imports `countPendingCoHostInvitations`:

```bash
grep -rn "countPendingCoHostInvitations" --include=*.ts --include=*.tsx . | grep -v node_modules
```

If only `lib/eventInvitations.ts` and its test are left, keep it. It's a tested helper, and deleting it is outside this ticket.

- [ ] **Step 5: skeleton.** In `components/manage/ManageSkeletons.tsx`, make `ManageOverviewSkeleton` match the new shape:
  - a row of three dots with two short text bars under each (the stepper);
  - then four circles alternating left and right (small screens), each with a title bar;
  - on `lg`, the circles in one row.

  Reuse the file's existing skeleton primitives (look at its current imports, e.g. `Skeleton`).

- [ ] **Step 6: run the tests and see them pass.**

```bash
npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage" components/manage
```

Expected: PASS.

- [ ] **Step 7: commit.**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.test.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.themePicker.test.tsx" components/manage/ManageScreen.tsx components/manage/ManageSkeletons.tsx
git commit -m "KAN-224: Overview shows the event journey" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 12: Remove what the journey replaced

- [ ] **Step 1: delete the old files.**

```bash
git rm -r components/manage/help hooks/useEventSetupSteps.ts components/manage/CoverageStatusStrip.tsx
```

- [ ] **Step 2: drop the `includeManageLinks` option** from `hooks/useRightContextPanel.ts`. Its only caller was the Overview.
  - Remove the parameter and its filter line, and the comment paragraph about it.
  - Keep `useRightContextPanel()` calls elsewhere unchanged.
  - Update any test that passed the option:

```bash
grep -rn "includeManageLinks" --include=*.ts --include=*.tsx . | grep -v node_modules
```

Expected after the change: no results.

- [ ] **Step 3: remove the approved messages** from `en.json` and `el.json`:
  - `HostOnboarding.steps.section`
  - `HostOnboarding.steps.invitations.body`
  - `ManagePage.coverage.openUntil`, `.closingIn` and `.ended` (keep `.download`)

  Then check `ManagePage.stats`:

```bash
grep -rn "stats\.\(totalGuests\|daysToGo\|invitations\|seats\)\|'ManagePage.stats'" --include=*.ts --include=*.tsx app components hooks lib | grep -v node_modules
```

If nothing reads it, delete `ManagePage.stats` from both files. If something does, keep it and note it in the PR.

- [ ] **Step 4: look for anything that still points at the removed pieces.**

```bash
grep -rn "EventSetupSteps\|useEventSetupSteps\|HelpStep\|CoverageStatusStrip\|steps.section\|coverage.openUntil\|coverage.closingIn\|coverage.ended" --include=*.ts --include=*.tsx --include=*.json --include=*.md . | grep -v node_modules | grep -v "docs/superpowers"
```

Expected: no results.

- [ ] **Step 5: run the checks.**

```bash
npx tsc --noEmit && npx eslint . && npx vitest run i18n hooks lib components/manage "app/(main)/(app)/(event)/events/[eventId]/manage"
```

Expected: all pass.

- [ ] **Step 6: commit.**

```bash
git add -A messages hooks components lib
git commit -m "KAN-224: Remove the old setup steps, coverage strip and unused wording" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 13: Server prefetch for the journey

The journey adds four reads on the Overview: gift account, QR links, media summary and wishbook count. Prefetch them on a full load of the Overview (no `?tab=`, or `tab=overview`) for a live host event, mirroring each hook's gating.

**Files:** `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx` and `page.test.tsx`.

- [ ] **Step 1: write the failing tests.** `page.test.tsx` already mocks `serverGet`, `serverGetOrNull` and the context resolvers, and has `visit()` and `seededKeys()`. Add after `liveEvent`:

```tsx
const journeyEvent = {
    ...liveEvent,
    modules: ['rsvp', 'wishlist', 'gallery', 'wishbook'].map((moduleKey) => ({ moduleKey, isAvailable: true, isEnabled: true })),
};
```

and these tests inside the `describe`:

```tsx
    it("seeds the journey's reads on the overview of a live event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(journeyEvent);
        mocks.serverGet.mockImplementation((path: string) => Promise.resolve(path.endsWith('/wishbook/count') ? 3 : []));

        const element = await visit();

        expect(mocks.serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'gift-account'],
                ['events', 'e1', 'qr-links'],
                ['events', 'e1', 'media', 'summary'],
                ['events', 'e1', 'wishbook', 'count'],
            ]),
        );
    });

    it("skips the journey's reads on another section", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(journeyEvent);

        await visit({ tab: 'rsvp' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/qr-links', 'token-1');
        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/media/summary', 'token-1');
        expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
    });

    it('leaves out the reads of modules the plan lacks', async () => {
        await visit();

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/media/summary', 'token-1');
        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/wishbook/count', 'token-1');
        expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
    });
```

The existing test "seeds usage and the gift even when a guest list request fails" expects exactly `[usage, gift]` on the Overview. Its event has no journey modules, but the QR links now seed too. Change its expectation to:

```tsx
        expect(seededKeys(await visit())).toEqual([
            ['events', 'e1', 'usage'],
            ['events', 'e1', 'gift'],
            ['events', 'e1', 'qr-links'],
        ]);
```

If the endpoint paths in `lib/api/endpoints.ts` differ from the ones above, use theirs.

- [ ] **Step 2: run it and see it fail.**

```bash
npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.test.tsx"
```

Expected: FAIL. The keys aren't seeded.

- [ ] **Step 3: add the prefetch.** Inside the existing `try`, after the current `Promise.all`:

```ts
            // The Overview's journey: setup progress (gift account, share links) and the totals.
            const opensOverview = !isDraft && (tab === undefined || tab === 'overview');
            if (opensOverview) {
                const readable = readableModuleKeys(event);
                const [giftAccount, qrLinks, mediaSummary, wishbookCount] = await Promise.all([
                    readable.has('wishlist')
                        ? serverGetOrNull<EventGiftAccountResponseDto>(endpoints.events.giftAccount(eventId), accessToken).catch(() => undefined)
                        : undefined,
                    serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken).catch(() => null),
                    readable.has('gallery') ? serverGet<MediaSummaryDto>(endpoints.events.mediaSummary(eventId), accessToken).catch(() => null) : null,
                    readable.has('wishbook') ? serverGet<number>(endpoints.events.wishbookCount(eventId), accessToken).catch(() => null) : null,
                ]);
                if (giftAccount !== undefined) queryClient.setQueryData(giftAccountKeys.event(eventId), giftAccount);
                if (qrLinks) queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
                if (mediaSummary) queryClient.setQueryData(galleryArchiveKeys.summary(eventId), mediaSummary);
                if (wishbookCount !== null) queryClient.setQueryData(wishbookKeys.count(eventId), wishbookCount);
            }
```

Imports to add:
- `giftAccountKeys` from `@/hooks/useGiftAccount`
- `qrLinkKeys` from `@/hooks/useQrLinks`
- `galleryArchiveKeys` from `@/hooks/useGalleryArchive`
- `wishbookKeys` from `@/hooks/useWishbook`
- `readableModuleKeys` from `@/lib/eventLifecycle`
- `EventGiftAccountResponseDto`, `QrLinkResponseDto` and `MediaSummaryDto` from `@/lib/api/types`

This gating mirrors the hooks:
- `useGiftAccount`, `useGallerySummary` and `useWishbookCount` gate on `useModuleReadable`, which is `readableModuleKeys(event).has(key)`.
- `useEventQrLinks` has no module gate and seeds `normalizeList(res).items`.
- `useHelpProgress` reads the QR links for every live event, lite ones included.

Update the comment block above `Page` to mention the journey reads.

- [ ] **Step 4: run the tests and see them pass.**

```bash
npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.test.tsx"
```

Expected: PASS.

- [ ] **Step 5: commit.**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.test.tsx"
git commit -m "KAN-224: Prefetch the Overview journey's data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 14: Look at it, then hand back

- [ ] **Step 1: full checks.**

```bash
npx tsc --noEmit && npx eslint . && npx vitest run
```

Expected: all pass, apart from the known flaky files. Re-run any of those alone to confirm.

- [ ] **Step 2: run it signed in.** Use the local stack from the KAN-223 work:
  - backend `bootRun` with `APP_SEED_ENABLED=true`;
  - `npx next dev --webpack -p 3000` in the worktree, with `.env.local` present;
  - open it in the browser pane with `preview_start {url: "http://localhost:3000/"}`, never by name.
  - Sign in as the seeded host of the full event "Mits & Nameless" (bob). Never type the password in chat.

  Check at 375px, then 1280px:
  - the Before phase (the seeded event's date decides the default phase; use the stepper to see the other two);
  - All set (finish the setup steps, or check it in Storybook);
  - On the day with a running session (temporarily give a seed session a time around now, then put it back);
  - After;
  - a lite event (alice): no RSVP, Gift or Invitations stops.

  Check that every link goes where the stop rules say. Revert `AGENTS.md` if `next dev` changed it (`git checkout -- AGENTS.md`).

- [ ] **Step 3: SEO.** The page is signed-in only. Confirm against `docs/seo-guidelines.md` that nothing there applies, and say so in the PR.

- [ ] **Step 4: roadmap.** The plan's commit already linked this plan from the roadmap and marked the wording approved. If the build changed a decision (an icon, a placement), add one line about it under "What each piece leaves for later", then commit:

```bash
git add docs/superpowers/plans/2026-11-16-host-pages-redesign-roadmap.md
git commit -m "KAN-224: Roadmap notes from the build" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: wait for KAN-223.** Once PR #359 is merged into `staging`:

```bash
git fetch origin && git rebase --onto origin/staging claude/kan-223-host-dashboard-navigation
```

Re-run Step 1, push, and open the PR into `staging` titled `KAN-224: Overview shows the event journey`. Name only KAN-224 in the body. List the visual-check reviewer notes (the lucide stop icons where C1 had images; the On the day tools under the path, as agreed), then end with the Claude Code line. Never tick the visual check's approve box.
