# RSVP on One Page Implementation Plan (KAN-227)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the host's RSVP page (three sub-tabs: Stats, List, Reports) with the agreed R1a layout: one page with the RSVP deadline, four headline numbers, the four report cards, attendance, and the guest list with filter chips. Tools > RSVP stops being a second copy of the page and sends hosts to it.

**Architecture:** `RsvpTab` becomes a thin composition shell with no sub-tab state. Each block is a small presentational component under `components/manage/rsvp/`. The STATISTICS report is read once by a new `hooks/useRsvpStatsReport.ts` and handed to the numbers and the attendance block. The countdown's label and target date move into a `lib/rsvpReport.ts` helper. The sub-tab hook, the `?section=` resolver and the `tools` report origin are removed. `/tools/rsvp` keeps its route (old links, the demo) but only redirects hosts to `manage?tab=rsvp`, or shows today's "not available" screen when the plan has no RSVP. No backend change.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind v4, Vitest + Testing Library, Storybook.

**Mockups:** `project/R1a-mobile.dc.html` and `project/R1a-desktop.dc.html` on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

---

## Decisions (owner, 2026-11-16 and 2026-11-17)

- **One page, no sub-tabs.** Order on phones: RSVP deadline, the four numbers, RSVP reports, Attendance, Guests. On desktop (`lg`): a main column (numbers, reports, guests) and a 300px side column (deadline, attendance).
- **Deadline block:** a soft panel with the calendar icon, the label, "N days left · date", and a pencil button that opens today's deadline field in a sheet. With no deadline set, it falls back to today's "Event date" countdown, and the pencil still opens the field so the host can set one. The pencil shows only while the event can be changed (`canWrite`).
- **Numbers:** four soft tiles in one row, phones included (like the Members tiles). The printable report page keeps today's `RsvpReportTiles` strip.
- **Reports:** "RSVP reports" heading, the four reports as cards (label + today's description): a swipe row on phones, 2×2 on desktop. The line under the heading is removed.
- **Attendance:** "Attendance by category" and "People per session" in one block. The bars and lines are today's.
- **Guests:** a "Guests" heading, then filter chips with counts (All, Attending, Declined, No response) instead of the select. Rows, the desktop table, the status pills and Possible duplicate Keep/Remove are today's.
- **Tools > RSVP** must not be a second page with the same content. `/tools/rsvp` redirects hosts to `manage?tab=rsvp` (guests still go to the submit page, as today). Every link that pointed at `/tools/rsvp` now points straight at `manage?tab=rsvp`. A report's Close goes back to `manage?tab=rsvp` (top of the page). Old `?section=` links still open the page.

## Wording (approved 2026-11-17)

New keys:

| Key | English | Greek |
|---|---|---|
| `ManagePage.rsvpGuests.title` | `Guests` | `Καλεσμένοι` |
| `ManagePage.rsvpStats.editDeadline` | `Edit RSVP deadline` | `Επεξεργασία προθεσμίας RSVP` |

Reused as they are: `ManagePage.rsvpStats.*` (deadlineLabel, eventDateLabel, daysToGo, responses, totalPeople, adults, kids, byCategory, deadlineField), `ManagePage.rsvpReports.title`, `.types.*`, `ManagePage.rsvpReport.perSession`, `.empty`, `.loadFailed`, `.people`, `.responses`, `.noAnswer`, `ManagePage.rsvpFilters.all`, `.empty`, `ManagePage.rsvpBreakdown.*`, `ManagePage.rsvpColumns.*`, `ManagePage.rsvpDuplicate.*`, `ManagePage.rsvpStatus.*`, `ManagePage.settings.save`, `.saved`, `ManagePage.noGuestsYet`.

Removed, and their keys deleted from `messages/en.json` and `messages/el.json`:

- `ManagePage.rsvpTabs` ("Stats" / "List" / "Reports", "Στατιστικά" / "Λίστα" / "Αναφορές")
- `ManagePage.rsvpReports.description` ("Open a report to print it or download it as a PDF.")
- `ManagePage.rsvpOverview` ("RSVP overview" / "Επισκόπηση RSVP"), the old Tools page title

No other text changes. The status pills keep today's words.

## File map

Create:
- `hooks/useRsvpStatsReport.ts`: the STATISTICS report for the page, as `{ report, isLoading, isError }`.
- `components/manage/rsvp/RsvpDeadlineCard.tsx` (+ test, + stories): the deadline panel and its pencil.
- `components/manage/rsvp/RsvpDeadlineSheet.tsx`: today's `RsvpDeadlineField` in a sheet.
- `components/manage/rsvp/RsvpHeadlineTiles.tsx` (+ test, + stories): four soft tiles.
- `components/manage/rsvp/RsvpReportCards.tsx` (+ stories): heading + four cards.
- `components/manage/rsvp/RsvpAttendance.tsx` (+ test, + stories): categories + sessions.
- `components/manage/rsvp/RsvpFilterChips.tsx` (+ test): the chips.
- `components/rsvp/RsvpRedirect.tsx` + `hooks/useRsvpRedirect.ts` (+ test): what `/tools/rsvp` renders now.

Modify:
- `lib/rsvpReport.ts` (+ test): drop the sub-tab type and resolver and the `tools` origin; add `rsvpCountdown`; Close goes to `manage?tab=rsvp`.
- `lib/routes.ts` (+ test): `rsvpReport`'s `from` is `'vendor'` only; `tools.rsvp` takes no params.
- `components/manage/rsvp/RsvpDeadlineField.tsx`: `onSavedAction` prop.
- `components/manage/rsvp/RsvpReportRow.tsx` (+ test): card look.
- `components/manage/rsvp/RsvpReportCategories.tsx`, `RsvpReportSessions.tsx`: optional `headingClassName`.
- `components/manage/rsvp/RsvpListPanel.tsx` (+ test, + stories): heading + chips.
- `app/(main)/(app)/(event)/events/[eventId]/manage/RsvpTab.tsx`: the composition.
- `components/manage/ManageScreen.tsx`: drop `origin`.
- `components/manage/ManageSkeletons.tsx`: R1a skeleton, no sub-tabs skeleton.
- `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`: prefetch the report whenever `tab=rsvp`.
- `app/(main)/(app)/(event)/events/[eventId]/tools/rsvp/(root)/page.tsx`, `tools/rsvp/PageClient.tsx`: redirect only.
- Links: `components/feed/QuickAccessBar.tsx`, `components/layout/right-context-panel/RsvpSummarySection.tsx`, `hooks/useBeforeJourney.ts`, `hooks/useRsvpSubmitPageData.ts`, `components/manage/overview/OverviewJourneyView.stories.tsx`, `hooks/useRsvpReportPage.test.tsx`.
- `messages/en.json`, `messages/el.json`.

Delete:
- `hooks/useRsvpSubTab.ts`, `hooks/useRsvpSubTab.test.tsx`
- `components/manage/rsvp/RsvpStatsPanel.tsx`, `components/manage/rsvp/RsvpReportsPanel.tsx`
- `components/rsvp/RsvpScreen.tsx`

## Commands

- One test file: `npx vitest run <path>`
- Types: `npx tsc --noEmit`
- Lint: `npx eslint . --fix` then `npx eslint .`
- Every commit message starts with `KAN-227:` and ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name.

---

### Task 1: Wording

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the two new keys (English)**

In `messages/en.json`, inside `ManagePage.rsvpStats`, after `"deadlineField": "RSVP deadline"` add:

```json
"editDeadline": "Edit RSVP deadline"
```

Inside `ManagePage`, right after the `rsvpFilters` object, add:

```json
"rsvpGuests": {
    "title": "Guests"
},
```

- [ ] **Step 2: Add the two new keys (Greek)**

In `messages/el.json`, the same places:

```json
"editDeadline": "Επεξεργασία προθεσμίας RSVP"
```

```json
"rsvpGuests": {
    "title": "Καλεσμένοι"
},
```

The three removals happen in Task 11, once no code reads them.

- [ ] **Step 3: Check the files parse and the key sets match**

Run: `node -e "const en=require('./messages/en.json').ManagePage, el=require('./messages/el.json').ManagePage; console.log(en.rsvpGuests.title, el.rsvpGuests.title, en.rsvpStats.editDeadline, el.rsvpStats.editDeadline)"`
Expected: `Guests Καλεσμένοι Edit RSVP deadline Επεξεργασία προθεσμίας RSVP`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-227: Add the Guests heading and the deadline pencil label"
```

---

### Task 2: Report helpers without sub-tabs

**Files:**
- Modify: `lib/rsvpReport.ts`, `lib/rsvpReport.test.ts`, `lib/routes.ts`, `lib/routes.test.ts`, `hooks/useRsvpReportPage.test.tsx`

- [ ] **Step 1: Update the tests first**

In `lib/rsvpReport.test.ts`:
- Delete every `describe`/`it` for `resolveRsvpSubTab` and remove it from the import.
- Replace the `resolveRsvpReportCloseHref` cases with:

```ts
describe('resolveRsvpReportCloseHref', () => {
    it('goes back to the RSVP page in the dashboard', () => {
        expect(resolveRsvpReportCloseHref('e1', null)).toBe('/events/e1/manage?tab=rsvp');
    });

    it('sends an old from=tools link to the same RSVP page', () => {
        expect(resolveRsvpReportCloseHref('e1', 'tools')).toBe('/events/e1/manage?tab=rsvp');
    });

    it('returns a vendor to their vendor page', () => {
        expect(resolveRsvpReportCloseHref('e1', 'vendor')).toBe('/events/e1/tools/vendors/me');
    });
});
```

Add the countdown cases (and `rsvpCountdown` to the import):

```ts
describe('rsvpCountdown', () => {
    const now = new Date('2026-08-12T10:00:00Z');

    it('counts to the RSVP deadline when there is one', () => {
        expect(rsvpCountdown('2026-08-30T00:00:00Z', '2026-09-20T16:00:00Z', now)).toEqual({
            labelKey: 'deadlineLabel',
            target: '2026-08-30T00:00:00Z',
            daysLeft: 18,
        });
    });

    it('falls back to the event date when no deadline is set', () => {
        expect(rsvpCountdown(null, '2026-09-20T16:00:00Z', now)).toEqual({
            labelKey: 'eventDateLabel',
            target: '2026-09-20T16:00:00Z',
            daysLeft: 40,
        });
    });

    it('never goes below zero', () => {
        expect(rsvpCountdown('2026-08-01T00:00:00Z', '2026-09-20T16:00:00Z', now).daysLeft).toBe(0);
    });
});
```

In `lib/routes.test.ts`, delete the case `tools.rsvp() with a section param resolves under /demo`.

In `hooks/useRsvpReportPage.test.tsx` line ~59, change the expectation to:

```ts
expect(mocks.push).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp');
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/rsvpReport.test.ts hooks/useRsvpReportPage.test.tsx`
Expected: FAIL (`rsvpCountdown` is not exported; the Close hrefs differ).

- [ ] **Step 3: Change `lib/rsvpReport.ts`**

Delete the `RsvpSubTab` type, `RSVP_SUB_TABS` and `resolveRsvpSubTab` with their comments. Add `getDaysUntil` to the `@/lib/datetime` import. Replace the origin type and the Close resolver, and add the countdown helper:

```ts
// Which screen a report link comes from, so Close can go back there
// (see resolveRsvpReportCloseHref). The host's RSVP page is the default.
export type RsvpReportOrigin = 'manage' | 'vendor';

// Where a report page's Close (useRsvpReportPage) sends the user, from the
// `from` search param the report link carried (see routes.events.rsvpReport).
// An allowlist: anything but a planner's vendor page goes back to the RSVP page
// (old from=tools links included: Tools > RSVP now redirects there, KAN-227).
export function resolveRsvpReportCloseHref(eventId: string, from: string | null): string {
    if (from === 'vendor') return routes.events.tools.vendorMe(eventId);
    return routes.events.manage(eventId, { tab: 'rsvp' });
}

export type RsvpCountdown = { labelKey: 'deadlineLabel' | 'eventDateLabel'; target: string; daysLeft: number };

// The RSVP page's countdown: to the deadline, or to the event when none is set.
export function rsvpCountdown(rsvpDeadline: string | null, startAt: string, now: Date = new Date()): RsvpCountdown {
    const target = rsvpDeadline ?? startAt;
    return { labelKey: rsvpDeadline ? 'deadlineLabel' : 'eventDateLabel', target, daysLeft: getDaysUntil(target, now) ?? 0 };
}
```

- [ ] **Step 4: Change `lib/routes.ts`**

```ts
rsvpReport: (eventId: string, reportType: RsvpReportType, from?: 'vendor') =>
    withQuery(`${eventBasePath(eventId)}/manage/rsvp/reports/${reportType}`, { from }),
```

```ts
// Only redirects now (KAN-227): hosts land on manage?tab=rsvp. Kept for old links.
rsvp: (eventId: string) => `${eventBasePath(eventId)}/tools/rsvp`,
```

- [ ] **Step 5: Fix the callers the compiler now flags**

Run: `npx tsc --noEmit`
Expected errors only in: `RsvpReportRow.test.tsx` (`origin="tools"`), `RsvpTab.tsx` (`RsvpSubTab`), `RsvpScreen.tsx` (`origin="tools"`), the two `page.tsx` files and `useRsvpSubTab.ts` (`resolveRsvpSubTab`). Leave those for their tasks, except:
- In `components/manage/rsvp/RsvpReportRow.test.tsx`, delete the case `carries from=tools only when opened from the tools origin`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/rsvpReport.test.ts lib/routes.test.ts hooks/useRsvpReportPage.test.tsx components/manage/rsvp/RsvpReportRow.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/rsvpReport.ts lib/rsvpReport.test.ts lib/routes.ts lib/routes.test.ts hooks/useRsvpReportPage.test.tsx components/manage/rsvp/RsvpReportRow.test.tsx
git commit -m "KAN-227: Report Close goes back to the RSVP page; countdown helper"
```

(The tree does not type-check between Tasks 2 and 9; that's expected. Each task's own tests pass.)

---

### Task 3: The stats report hook

**Files:**
- Create: `hooks/useRsvpStatsReport.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useRsvpReport } from '@/hooks/useRsvps';
import type { RsvpReportDto } from '@/lib/api/types';

export type RsvpStatsReport = { report: RsvpReportDto | null; isLoading: boolean; isError: boolean };

// The STATISTICS report behind the RSVP page's numbers and attendance (one query, two blocks).
export function useRsvpStatsReport(eventId: string): RsvpStatsReport {
    const { data, isLoading, isError } = useRsvpReport(eventId, 'STATISTICS');
    return { report: data ?? null, isLoading: isLoading || (!data && !isError), isError };
}
```

`isLoading || (!data && !isError)` mirrors today's `RsvpStatsPanel` check, so a disabled query (no access yet) shows the skeleton, not an empty page.

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit 2>&1 | grep useRsvpStatsReport`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add hooks/useRsvpStatsReport.ts
git commit -m "KAN-227: One STATISTICS report read for the RSVP page"
```

---

### Task 4: Deadline block and sheet

**Files:**
- Modify: `components/manage/rsvp/RsvpDeadlineField.tsx`
- Create: `components/manage/rsvp/RsvpDeadlineSheet.tsx`, `components/manage/rsvp/RsvpDeadlineCard.tsx`, `components/manage/rsvp/RsvpDeadlineCard.test.tsx`, `components/manage/rsvp/RsvpDeadlineCard.stories.tsx`

- [ ] **Step 1: Write the failing test**

`components/manage/rsvp/RsvpDeadlineCard.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpDeadlineCard } from '@/components/manage/rsvp/RsvpDeadlineCard';
import messages from '@/messages/en.json';

vi.mock('@/components/manage/rsvp/RsvpDeadlineSheet', () => ({
    RsvpDeadlineSheet: ({ open }: { open: boolean }) => (open ? <div>deadline sheet</div> : null),
}));

afterEach(cleanup);

const t = messages.ManagePage.rsvpStats;

function renderWithIntl(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

describe('RsvpDeadlineCard', () => {
    it('shows the deadline countdown and opens the sheet from the pencil', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline="2999-08-30T00:00:00Z" startAt="2999-09-20T16:00:00Z" canWrite />);

        expect(screen.getByText(t.deadlineLabel)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: t.editDeadline }));
        expect(screen.getByText('deadline sheet')).toBeTruthy();
    });

    it('falls back to the event date when no deadline is set', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline={null} startAt="2999-09-20T16:00:00Z" canWrite />);

        expect(screen.getByText(t.eventDateLabel)).toBeTruthy();
        expect(screen.getByRole('button', { name: t.editDeadline })).toBeTruthy();
    });

    it('has no pencil once the event can no longer change', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline={null} startAt="2999-09-20T16:00:00Z" canWrite={false} />);

        expect(screen.queryByRole('button', { name: t.editDeadline })).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/rsvp/RsvpDeadlineCard.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Let the field tell its owner it saved**

In `components/manage/rsvp/RsvpDeadlineField.tsx`, add an optional prop and call it after a successful save:

```tsx
export function RsvpDeadlineField({
    eventId,
    rsvpDeadline,
    canWrite,
    onSavedAction,
}: {
    eventId: string;
    rsvpDeadline: string | null;
    canWrite: boolean;
    // The sheet closes itself once the new deadline is saved.
    onSavedAction?: () => void;
}) {
```

and inside `handleSubmit`, after `setSaved(true);`:

```tsx
            onSavedAction?.();
```

- [ ] **Step 4: Write the sheet**

`components/manage/rsvp/RsvpDeadlineSheet.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RsvpDeadlineField } from '@/components/manage/rsvp/RsvpDeadlineField';
import { Modal } from '@/components/ui/modal';

type RsvpDeadlineSheetProps = {
    eventId: string;
    rsvpDeadline: string | null;
    open: boolean;
    onCloseAction: () => void;
};

// Today's deadline field, opened from the deadline block's pencil.
export function RsvpDeadlineSheet({ eventId, rsvpDeadline, open, onCloseAction }: RsvpDeadlineSheetProps) {
    const t = useTranslations('ManagePage');

    return (
        <Modal open={open} onClose={onCloseAction} closeLabel={t('rsvpReport.close')} variant="sheet" size="sm" ariaLabel={t('rsvpStats.editDeadline')}>
            {/* Field */}
            <Modal.Body className="px-1 pt-2 pb-2">
                {open && <RsvpDeadlineField eventId={eventId} rsvpDeadline={rsvpDeadline} canWrite onSavedAction={onCloseAction} />}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 5: Write the block**

`components/manage/rsvp/RsvpDeadlineCard.tsx`:

```tsx
'use client';

import { CalendarClock, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { RsvpDeadlineSheet } from '@/components/manage/rsvp/RsvpDeadlineSheet';
import { formatDate } from '@/lib/datetime';
import { rsvpCountdown } from '@/lib/rsvpReport';

type RsvpDeadlineCardProps = {
    eventId: string;
    rsvpDeadline: string | null;
    startAt: string;
    // The pencil shows only while the event can still be changed.
    canWrite: boolean;
};

// R1a: the countdown to the RSVP deadline (or the event), with a pencil to change the deadline.
export function RsvpDeadlineCard({ eventId, rsvpDeadline, startAt, canWrite }: RsvpDeadlineCardProps) {
    const t = useTranslations('ManagePage.rsvpStats');
    const locale = useLocale();
    const [editing, setEditing] = useState(false);
    const countdown = rsvpCountdown(rsvpDeadline, startAt);
    const date = formatDate(locale, countdown.target, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <section className="flex items-center gap-3 rounded-[20px] bg-surface-muted px-4 py-3.5">
            {/* Icon */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>

            {/* Countdown */}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink-muted">{t(countdown.labelKey)}</p>
                <p className="text-[15px] font-bold wrap-break-word text-ink">
                    {t('daysToGo', { count: countdown.daysLeft })} · {date}
                </p>
            </div>

            {/* Edit */}
            {canWrite && (
                <button
                    type="button"
                    aria-label={t('editDeadline')}
                    onClick={() => setEditing(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

            {/* Sheet */}
            <RsvpDeadlineSheet eventId={eventId} rsvpDeadline={rsvpDeadline} open={editing} onCloseAction={() => setEditing(false)} />
        </section>
    );
}
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/manage/rsvp/RsvpDeadlineCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Stories**

`components/manage/rsvp/RsvpDeadlineCard.stories.tsx`, following `MembersUsageTiles.stories.tsx` (`withAppContext`, `storyHostMember`, `copyFor(globals)`), with three stories and a `play` each. Storybook freezes the clock at 2026-06-15 12:00 UTC (`.storybook/preview.tsx`, `freezeClock`), so the day count is stable:
- `WithDeadline`: `rsvpDeadline: '2026-07-03T00:00:00Z'`, `startAt: '2026-07-25T16:00:00Z'`, `canWrite: true`; expects `copyFor(globals).ManagePage.rsvpStats.deadlineLabel` visible and the button named `editDeadline`.
- `NoDeadline`: `rsvpDeadline: null`; expects `eventDateLabel`.
- `ReadOnly`: `canWrite: false`; expects no button named `editDeadline`.

- [ ] **Step 8: Commit**

```bash
git add components/manage/rsvp/RsvpDeadlineField.tsx components/manage/rsvp/RsvpDeadlineSheet.tsx components/manage/rsvp/RsvpDeadlineCard.tsx components/manage/rsvp/RsvpDeadlineCard.test.tsx components/manage/rsvp/RsvpDeadlineCard.stories.tsx
git commit -m "KAN-227: RSVP deadline block with a pencil that opens the field in a sheet"
```

---

### Task 5: Headline tiles

**Files:**
- Create: `components/manage/rsvp/RsvpHeadlineTiles.tsx`, `.test.tsx`, `.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpHeadlineTiles } from '@/components/manage/rsvp/RsvpHeadlineTiles';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage.rsvpStats;
const totals = { responses: 96, people: 168, adults: 142, children: 26 };

function renderTiles(props: Parameters<typeof RsvpHeadlineTiles>[0]) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <RsvpHeadlineTiles {...props} />
        </NextIntlClientProvider>,
    );
}

describe('RsvpHeadlineTiles', () => {
    it('shows the four numbers with today’s labels', () => {
        renderTiles({ totals, isLoading: false });
        for (const [label, value] of [
            [t.responses, '96'],
            [t.totalPeople, '168'],
            [t.adults, '142'],
            [t.kids, '26'],
        ]) {
            expect(screen.getByText(label).nextElementSibling?.textContent).toBe(value);
        }
    });

    it('shows a skeleton while loading and nothing without numbers', () => {
        const { container, rerender } = renderTiles({ totals: null, isLoading: true });
        expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
        rerender(
            <NextIntlClientProvider locale="en" messages={messages}>
                <RsvpHeadlineTiles totals={null} isLoading={false} />
            </NextIntlClientProvider>,
        );
        expect(container).toBeEmptyDOMElement();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/rsvp/RsvpHeadlineTiles.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import type { RsvpReportTotalsDto } from '@/lib/api/types';

type RsvpHeadlineTilesProps = { totals: RsvpReportTotalsDto | null; isLoading: boolean };

// R1a: four soft tiles in one row, phones included. The report page keeps RsvpReportTiles.
export function RsvpHeadlineTiles({ totals, isLoading }: RsvpHeadlineTilesProps) {
    const t = useTranslations('ManagePage.rsvpStats');

    if (isLoading) {
        return (
            <div aria-hidden="true" className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[58px] rounded-2xl" />
                ))}
            </div>
        );
    }
    if (!totals) return null;

    const tiles = [
        { key: 'responses', label: t('responses'), value: totals.responses },
        { key: 'people', label: t('totalPeople'), value: totals.people },
        { key: 'adults', label: t('adults'), value: totals.adults },
        { key: 'kids', label: t('kids'), value: totals.children },
    ];

    return (
        <dl className="grid grid-cols-4 gap-2">
            {tiles.map((tile) => (
                // Tile
                <div key={tile.key} className="flex min-w-0 flex-col-reverse gap-px rounded-2xl bg-surface-muted px-2 py-2.5 sm:px-3">
                    <dt className="truncate text-[11px] font-semibold text-ink-muted">{tile.label}</dt>
                    <dd className="text-[19px] leading-tight font-bold text-ink tabular-nums">{tile.value}</dd>
                </div>
            ))}
        </dl>
    );
}
```

`flex-col-reverse` keeps `<dt>` before `<dd>` in the markup (valid `dl`) while the number shows on top; that's why the test reads the number through the label's `nextElementSibling`.

- [ ] **Step 4: Run the test**

Run: `npx vitest run components/manage/rsvp/RsvpHeadlineTiles.test.tsx`
Expected: PASS

- [ ] **Step 5: Stories**

`RsvpHeadlineTiles.stories.tsx` with `Numbers` (the totals above; `play` checks the four labels from `copyFor(globals)`) and `Loading`, with a `max-w-[390px]` decorator so the one-row phone layout is what the visual check sees.

- [ ] **Step 6: Commit**

```bash
git add components/manage/rsvp/RsvpHeadlineTiles.tsx components/manage/rsvp/RsvpHeadlineTiles.test.tsx components/manage/rsvp/RsvpHeadlineTiles.stories.tsx
git commit -m "KAN-227: Four soft RSVP tiles in one row"
```

---

### Task 6: Report cards

**Files:**
- Modify: `components/manage/rsvp/RsvpReportRow.tsx`
- Create: `components/manage/rsvp/RsvpReportCards.tsx`, `RsvpReportCards.stories.tsx`

- [ ] **Step 1: Restyle the row as a card**

`components/manage/rsvp/RsvpReportRow.tsx` keeps its props, `href` and texts; only the markup changes:

```tsx
'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { RsvpReportType } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import type { RsvpReportOrigin } from '@/lib/rsvpReport';
import { cn } from '@/lib/utils';

type RsvpReportRowProps = { eventId: string; reportType: RsvpReportType; origin: RsvpReportOrigin; className?: string };

// One report as a card: its name and what it holds. Opens the printable report page.
export function RsvpReportRow({ eventId, reportType, origin, className }: RsvpReportRowProps) {
    const t = useTranslations('ManagePage.rsvpReports');

    return (
        <AppLink
            href={routes.events.rsvpReport(eventId, reportType, origin === 'manage' ? undefined : origin)}
            className={cn(
                'flex min-h-[84px] flex-col gap-1 rounded-[18px] bg-primary-light px-3.5 py-3 text-ink transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                className,
            )}
        >
            {/* Name */}
            <span className="flex items-center gap-2 text-sm font-bold">
                <FileText className="h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                {t(`types.${reportType}.label`)}
            </span>
            {/* What it holds */}
            <span className="text-xs leading-snug text-ink-muted">{t(`types.${reportType}.description`)}</span>
        </AppLink>
    );
}
```

- [ ] **Step 2: Run its existing tests**

Run: `npx vitest run components/manage/rsvp/RsvpReportRow.test.tsx`
Expected: PASS (they check `href` and the link name only).

- [ ] **Step 3: Write the cards block**

`components/manage/rsvp/RsvpReportCards.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RsvpReportRow } from '@/components/manage/rsvp/RsvpReportRow';
import { RSVP_REPORT_TYPES } from '@/lib/rsvpReport';

// R1a: the four reports. A swipe row on phones (bleeds to the screen edge), 2x2 on desktop.
export function RsvpReportCards({ eventId }: { eventId: string }) {
    const t = useTranslations('ManagePage.rsvpReports');

    return (
        <section className="flex flex-col gap-2" aria-labelledby="rsvp-reports-title">
            {/* Heading */}
            <h2 id="rsvp-reports-title" className="text-[15px] font-bold text-ink">
                {t('title')}
            </h2>

            {/* Cards */}
            <div className="-mr-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pr-4 pb-1 [scrollbar-width:none] lg:mr-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pr-0 lg:pb-0">
                {RSVP_REPORT_TYPES.map((reportType) => (
                    <RsvpReportRow key={reportType} eventId={eventId} reportType={reportType} origin="manage" className="w-[200px] shrink-0 snap-start lg:w-auto" />
                ))}
            </div>
        </section>
    );
}
```

The `-mr-4`/`pr-4` pair matches the manage content's `px-4` on phones (`ManageShell.tsx`), so the row bleeds to the screen edge.

- [ ] **Step 4: Stories**

`RsvpReportCards.stories.tsx`: one `Cards` story (`eventId: 'evt-story'`, `withAppContext`, host member) whose `play` checks all four `copyFor(globals).ManagePage.rsvpReports.types.*.label` links are present. No separate desktop story: the default viewport covers 2x2, and the mobile viewport global covers the row.

- [ ] **Step 5: Commit**

```bash
git add components/manage/rsvp/RsvpReportRow.tsx components/manage/rsvp/RsvpReportCards.tsx components/manage/rsvp/RsvpReportCards.stories.tsx
git commit -m "KAN-227: RSVP reports as cards, a swipe row on phones"
```

---

### Task 7: Attendance block

**Files:**
- Modify: `components/manage/rsvp/RsvpReportCategories.tsx`, `components/manage/rsvp/RsvpReportSessions.tsx`
- Create: `components/manage/rsvp/RsvpAttendance.tsx`, `.test.tsx`, `.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpAttendance } from '@/components/manage/rsvp/RsvpAttendance';
import type { RsvpReportDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage;

function report(responses: number): RsvpReportDto {
    return {
        reportType: 'STATISTICS',
        header: {} as RsvpReportDto['header'],
        totals: { responses, people: 168, adults: 142, children: 26 },
        categories: [{ label: 'Attending', attending: true, people: 152, responses: 80, percentOfPeople: 90, comingSessionIds: [], noAnswerSessionIds: [] }],
        sessions: [{ sessionId: 's1', title: 'Church', people: 152, noAnswerPeople: 8 }],
        groups: null,
    };
}

function renderBlock(props: Parameters<typeof RsvpAttendance>[0]) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <RsvpAttendance {...props} />
        </NextIntlClientProvider>,
    );
}

describe('RsvpAttendance', () => {
    it('shows categories and people per session in one block', () => {
        renderBlock({ report: report(96), isLoading: false, isError: false });
        expect(screen.getByRole('heading', { name: t.rsvpStats.byCategory })).toBeTruthy();
        expect(screen.getByText(t.rsvpReport.perSession)).toBeTruthy();
        expect(screen.getByText(/Church: 152 people/)).toBeTruthy();
    });

    it('says there are no responses yet', () => {
        renderBlock({ report: report(0), isLoading: false, isError: false });
        expect(screen.getByText(t.rsvpReport.empty)).toBeTruthy();
    });

    it('says when the report failed to load', () => {
        renderBlock({ report: null, isLoading: false, isError: true });
        expect(screen.getByText(t.rsvpReport.loadFailed)).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/rsvp/RsvpAttendance.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Let the two sections take a heading style**

In both `RsvpReportCategories.tsx` and `RsvpReportSessions.tsx`, add an optional prop and use it on the `<h2>` (default = today's classes, so the report page doesn't change):

```tsx
const defaultHeadingClass = 'mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase';
```

```tsx
export function RsvpReportCategories({ categories, headingClassName = defaultHeadingClass }: { categories: RsvpReportCategoryDto[]; headingClassName?: string }) {
```

```tsx
<h2 className={headingClassName}>{t('rsvpStats.byCategory')}</h2>
```

Same for `RsvpReportSessions` (`{ sessions, headingClassName = defaultHeadingClass }`), on its `<h2>`.

- [ ] **Step 4: Write the block**

`components/manage/rsvp/RsvpAttendance.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RsvpReportSkeleton } from '@/components/manage/ManageSkeletons';
import { RsvpReportCategories } from '@/components/manage/rsvp/RsvpReportCategories';
import { RsvpReportSessions } from '@/components/manage/rsvp/RsvpReportSessions';
import type { RsvpStatsReport } from '@/hooks/useRsvpStatsReport';

// R1a: attendance by category and people per session, in one block.
export function RsvpAttendance({ report, isLoading, isError }: RsvpStatsReport) {
    const t = useTranslations('ManagePage');

    if (isLoading) return <RsvpReportSkeleton />;
    if (isError || !report) return <p className="text-sm text-rose-600">{t('rsvpReport.loadFailed')}</p>;
    if (report.totals.responses === 0) return <p className="text-sm text-ink-muted">{t('rsvpReport.empty')}</p>;

    return (
        <section className="flex flex-col gap-4">
            {/* Categories */}
            <RsvpReportCategories categories={report.categories ?? []} headingClassName="mb-2.5 text-[15px] font-bold text-ink" />

            {/* Sessions */}
            <RsvpReportSessions sessions={report.sessions ?? []} headingClassName="mb-1.5 text-xs font-bold text-ink-muted" />
        </section>
    );
}
```

The failed-load message lives here only; the tiles render nothing on error, so the page says it once.

- [ ] **Step 5: Run the test and the report page's tests**

Run: `npx vitest run components/manage/rsvp/RsvpAttendance.test.tsx components/manage/rsvp/RsvpReportView.test.tsx`
Expected: PASS

- [ ] **Step 6: Stories**

`RsvpAttendance.stories.tsx`: `WithSessions` (three categories, two sessions, like the R1a board), `NoResponses`, `Loading`. `play` checks the `byCategory` heading from `copyFor(globals)`.

- [ ] **Step 7: Commit**

```bash
git add components/manage/rsvp/RsvpReportCategories.tsx components/manage/rsvp/RsvpReportSessions.tsx components/manage/rsvp/RsvpAttendance.tsx components/manage/rsvp/RsvpAttendance.test.tsx components/manage/rsvp/RsvpAttendance.stories.tsx
git commit -m "KAN-227: Attendance and people per session in one block"
```

---

### Task 8: Guests heading and filter chips

**Files:**
- Create: `components/manage/rsvp/RsvpFilterChips.tsx`, `RsvpFilterChips.test.tsx`
- Modify: `components/manage/rsvp/RsvpListPanel.tsx`, `RsvpListPanel.test.tsx`, `RsvpListPanel.stories.tsx`

- [ ] **Step 1: Write the failing chip test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpFilterChips } from '@/components/manage/rsvp/RsvpFilterChips';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage;
const counts = { ATTENDING: 84, DECLINED: 12, NO_RESPONSE: 14 };

describe('RsvpFilterChips', () => {
    it('shows each filter with its count and marks the active one', () => {
        const onChange = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <RsvpFilterChips filter="all" counts={counts} guestCount={110} onChangeAction={onChange} />
            </NextIntlClientProvider>,
        );

        expect(screen.getByRole('button', { name: `${t.rsvpFilters.all} 110` }).getAttribute('aria-pressed')).toBe('true');
        const declined = screen.getByRole('button', { name: `${t.rsvpBreakdown.declined} 12` });
        expect(declined.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(declined);
        expect(onChange).toHaveBeenCalledWith('DECLINED');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/rsvp/RsvpFilterChips.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the chips**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { RosterFilter } from '@/hooks/useRsvpRoster';
import type { RsvpDisplayStatus } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const filters: { key: RosterFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'rsvpFilters.all' },
    { key: 'ATTENDING', labelKey: 'rsvpBreakdown.attending' },
    { key: 'DECLINED', labelKey: 'rsvpBreakdown.declined' },
    { key: 'NO_RESPONSE', labelKey: 'rsvpBreakdown.noResponse' },
];

type RsvpFilterChipsProps = {
    filter: RosterFilter;
    counts: Record<RsvpDisplayStatus, number>;
    guestCount: number;
    onChangeAction: (filter: RosterFilter) => void;
};

// R1a: the guest list's filters as chips with counts (was a select).
export function RsvpFilterChips({ filter, counts, guestCount, onChangeAction }: RsvpFilterChipsProps) {
    const t = useTranslations('ManagePage');

    return (
        <div role="group" aria-label={t('rsvpGuests.title')} className="flex flex-wrap gap-2">
            {filters.map(({ key, labelKey }) => {
                const active = key === filter;
                return (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChangeAction(key)}
                        className={cn(
                            'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                            active ? 'bg-ink text-white' : 'bg-background text-ink-muted ring-1 ring-border ring-inset hover:text-ink',
                        )}
                    >
                        {t(labelKey)}
                        <span className="opacity-70">{key === 'all' ? guestCount : counts[key]}</span>
                    </button>
                );
            })}
        </div>
    );
}
```

`aria-label` on the group reuses the "Guests" heading text, no new string.

- [ ] **Step 4: Run the chip test**

Run: `npx vitest run components/manage/rsvp/RsvpFilterChips.test.tsx`
Expected: PASS

- [ ] **Step 5: Use the heading and chips in the list**

In `components/manage/rsvp/RsvpListPanel.tsx`:
- Remove the `filters` constant, `handleFilterChange`, the `ChangeEvent`/`useCallback` imports and the `ChevronDown`/`Filter` icons.
- Import `RsvpFilterChips`.
- Wrap the panel in a `<section aria-labelledby="rsvp-guests-title">` and replace the `{/* Filters */}` block with:

```tsx
            {/* Heading */}
            <h2 id="rsvp-guests-title" className="text-[17px] font-bold text-ink">
                {t('rsvpGuests.title')}
            </h2>

            {/* Filters */}
            {guestCount > 0 && <RsvpFilterChips filter={filter} counts={counts} guestCount={guestCount} onChangeAction={setFilter} />}
```

Keep the outer `flex flex-col gap-4` (on the `section` now) and everything from `{/* Action error */}` down unchanged.

- [ ] **Step 6: Update the list test**

In `components/manage/rsvp/RsvpListPanel.test.tsx`, replace the two `getByRole('option', …)` lines with:

```ts
expect(screen.getByRole('button', { name: `${t.rsvpFilters.all} 2` })).toBeTruthy();
expect(screen.getByRole('button', { name: `${t.rsvpBreakdown.attending} 2` })).toBeTruthy();
```

and add one case:

```ts
it('filters the list from a chip', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: `${t.rsvpBreakdown.declined} 0` }));
    expect(screen.getAllByText(t.rsvpFilters.empty).length).toBeGreaterThan(0);
});
```

- [ ] **Step 7: Update the stories**

In `RsvpListPanel.stories.tsx`, change any `play` that reads the select (`getByRole('combobox')` / `option`) to the chip buttons, and add a check that the `copyFor(globals).ManagePage.rsvpGuests.title` heading is visible in the default story.

- [ ] **Step 8: Run the list tests**

Run: `npx vitest run components/manage/rsvp/RsvpListPanel.test.tsx components/manage/rsvp/RsvpFilterChips.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add components/manage/rsvp/RsvpFilterChips.tsx components/manage/rsvp/RsvpFilterChips.test.tsx components/manage/rsvp/RsvpListPanel.tsx components/manage/rsvp/RsvpListPanel.test.tsx components/manage/rsvp/RsvpListPanel.stories.tsx
git commit -m "KAN-227: Guests heading and filter chips with counts"
```

---

### Task 9: The page

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/manage/RsvpTab.tsx`, `components/manage/ManageScreen.tsx`, `components/manage/ManageSkeletons.tsx`
- Delete: `components/manage/rsvp/RsvpStatsPanel.tsx`, `components/manage/rsvp/RsvpReportsPanel.tsx`, `hooks/useRsvpSubTab.ts`, `hooks/useRsvpSubTab.test.tsx`

- [ ] **Step 1: Rewrite `RsvpTab.tsx`**

```tsx
'use client';

import { RsvpAttendance } from '@/components/manage/rsvp/RsvpAttendance';
import { RsvpDeadlineCard } from '@/components/manage/rsvp/RsvpDeadlineCard';
import { RsvpHeadlineTiles } from '@/components/manage/rsvp/RsvpHeadlineTiles';
import { RsvpListPanel } from '@/components/manage/rsvp/RsvpListPanel';
import { RsvpReportCards } from '@/components/manage/rsvp/RsvpReportCards';
import type { RosterMember, RosterRsvp } from '@/hooks/useRsvpRoster';
import { useRsvpStatsReport } from '@/hooks/useRsvpStatsReport';

type RsvpTabProps = {
    eventId: string;
    members: RosterMember[];
    rsvps: RosterRsvp[];
    startAt: string;
    rsvpDeadline: string | null;
    canWrite: boolean;
};

// R1a: RSVP on one page (KAN-227). Phones: deadline, numbers, reports, attendance, guests.
// Desktop: numbers, reports and guests in the main column; deadline and attendance beside them.
// The two columns are `contents` on phones, so `order` interleaves their blocks.
export default function RsvpTab({ eventId, members, rsvps, startAt, rsvpDeadline, canWrite }: RsvpTabProps) {
    const stats = useRsvpStatsReport(eventId);

    return (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:items-start lg:gap-8">
            {/* Main column */}
            <div className="contents lg:flex lg:flex-col lg:gap-7">
                {/* Numbers (nothing on a failed load: the attendance block says so once) */}
                {(stats.isLoading || stats.report) && (
                    <div className="order-2 lg:order-none">
                        <RsvpHeadlineTiles totals={stats.report?.totals ?? null} isLoading={stats.isLoading} />
                    </div>
                )}

                {/* Reports */}
                <div className="order-3 lg:order-none">
                    <RsvpReportCards eventId={eventId} />
                </div>

                {/* Guests */}
                <div className="order-5 lg:order-none">
                    <RsvpListPanel eventId={eventId} members={members} rsvps={rsvps} canWrite={canWrite} />
                </div>
            </div>

            {/* Side column */}
            <div className="contents lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-6">
                {/* Deadline */}
                <div className="order-1 lg:order-none">
                    <RsvpDeadlineCard eventId={eventId} rsvpDeadline={rsvpDeadline} startAt={startAt} canWrite={canWrite} />
                </div>

                {/* Attendance */}
                <div className="order-4 lg:order-none">
                    <RsvpAttendance {...stats} />
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Drop `origin` in `ManageScreen.tsx`**

Delete the `origin="manage"` prop on `<RsvpTab … />`.

- [ ] **Step 3: R1a skeleton**

In `components/manage/ManageSkeletons.tsx`, replace `ManageRsvpSkeleton`'s body (no sub-tabs), and delete `SubTabsSkeleton` if nothing else uses it (`grep -rn SubTabsSkeleton components app`):

```tsx
export function ManageRsvpSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-6">
            {/* Deadline */}
            <Skeleton className="h-[68px] w-full rounded-[20px]" />

            {/* Numbers */}
            <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[58px] rounded-2xl" />
                ))}
            </div>

            {/* Reports */}
            <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-[84px] w-[200px] shrink-0 rounded-[18px]" />
                ))}
            </div>

            {/* Attendance */}
            <RsvpReportSkeleton />
        </SkeletonStatus>
    );
}
```

Check `SkeletonStatus` is already imported in that file (it is used by `ManageMembersSkeleton`).

- [ ] **Step 4: Delete the old pieces**

```bash
git rm components/manage/rsvp/RsvpStatsPanel.tsx components/manage/rsvp/RsvpReportsPanel.tsx hooks/useRsvpSubTab.ts hooks/useRsvpSubTab.test.tsx
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in the two `page.tsx` files (`resolveRsvpSubTab`) and `components/rsvp/RsvpScreen.tsx` (`origin`). Task 10 removes them.

- [ ] **Step 6: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/manage/RsvpTab.tsx" components/manage/ManageScreen.tsx components/manage/ManageSkeletons.tsx
git commit -m "KAN-227: RSVP on one page, no sub-tabs"
```

---

### Task 10: Tools > RSVP points to the page; prefetch

**Files:**
- Create: `hooks/useRsvpRedirect.ts`, `hooks/useRsvpRedirect.test.tsx`, `components/rsvp/RsvpRedirect.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/rsvp/PageClient.tsx`, `tools/rsvp/(root)/page.tsx`, `manage/(root)/page.tsx`, `components/feed/QuickAccessBar.tsx`, `components/layout/right-context-panel/RsvpSummarySection.tsx`, `hooks/useBeforeJourney.ts`, `hooks/useRsvpSubmitPageData.ts`, `components/manage/overview/OverviewJourneyView.stories.tsx`
- Delete: `components/rsvp/RsvpScreen.tsx`

- [ ] **Step 1: Write the failing hook test**

`hooks/useRsvpRedirect.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpRedirect } from '@/hooks/useRsvpRedirect';

const mocks = vi.hoisted(() => ({ replace: vi.fn(), available: true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/hooks/useRsvpAvailability', () => ({
    useRsvpAvailability: () => ({ isAvailable: mocks.available, unavailableTitle: 'title', unavailableBody: 'body' }),
}));

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.available = true;
});

describe('useRsvpRedirect', () => {
    it('sends the host to the RSVP page in the dashboard', () => {
        renderHook(() => useRsvpRedirect('e1'));
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp');
    });

    it('stays put when the plan has no RSVP, so the not-available screen shows', () => {
        mocks.available = false;
        const { result } = renderHook(() => useRsvpRedirect('e1'));
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(result.current.isAvailable).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useRsvpRedirect.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook and the component**

`hooks/useRsvpRedirect.ts`:

```ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRsvpAvailability } from '@/hooks/useRsvpAvailability';
import { routes } from '@/lib/routes';

// Tools > RSVP is no longer its own page (KAN-227): hosts go to the RSVP page in the
// dashboard. Without RSVP in the plan they stay, to see today's not-available screen.
export function useRsvpRedirect(eventId: string) {
    const router = useRouter();
    const availability = useRsvpAvailability();

    useEffect(() => {
        if (availability.isAvailable) router.replace(routes.events.manage(eventId, { tab: 'rsvp' }));
    }, [availability.isAvailable, eventId, router]);

    return availability;
}
```

`components/rsvp/RsvpRedirect.tsx`:

```tsx
'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { RsvpPageSkeleton } from '@/components/rsvp/RsvpSkeletons';
import { RsvpUnavailableState } from '@/components/rsvp/RsvpUnavailableState';
import { useRsvpRedirect } from '@/hooks/useRsvpRedirect';

// What /tools/rsvp shows a host: the not-available screen, or a skeleton for the moment before the redirect.
export function RsvpRedirect() {
    const { eventId } = useEventRouteContext();
    const rsvp = useRsvpRedirect(eventId);

    if (!rsvp.isAvailable) return <RsvpUnavailableState eventId={eventId} title={rsvp.unavailableTitle} body={rsvp.unavailableBody} />;
    return <RsvpPageSkeleton />;
}
```

- [ ] **Step 4: Run the hook test**

Run: `npx vitest run hooks/useRsvpRedirect.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire `/tools/rsvp`**

`tools/rsvp/PageClient.tsx`: replace `RsvpScreen` with `RsvpRedirect` (import from `@/components/rsvp/RsvpRedirect`). Guests keep `guestRedirectTo` the submit page.

`tools/rsvp/(root)/page.tsx` becomes thin (no prefetch: the page it sends hosts to prefetches its own data):

```tsx
import RsvpPage from '../PageClient';

// Hosts are sent on to the RSVP page in the dashboard (KAN-227); guests to the submit page.
export default function Page() {
    return <RsvpPage />;
}
```

Then `git rm components/rsvp/RsvpScreen.tsx`.

- [ ] **Step 6: Prefetch the report whenever the RSVP page opens**

In `manage/(root)/page.tsx`:
- Remove the `resolveRsvpSubTab` import.
- Replace the two `opensRsvpStats` lines with:

```ts
    // The RSVP page shows the STATISTICS report's numbers and attendance (KAN-227: no sub-tabs).
    const opensRsvp = tab === 'rsvp';
```

- Rename the one use below (`rsvpAvailable && opensRsvpStats`) to `rsvpAvailable && opensRsvp`, and change the header comment line "The RSVP stats sub-tab's STATISTICS report is prefetched when that sub-tab opens." to "The RSVP page's STATISTICS report is prefetched when that page opens." `searchParams` no longer needs `section` for this; keep it in the type only if something else reads it (it doesn't today: remove `section` from the destructuring if unused, and let lint tell you).

- [ ] **Step 7: Point every RSVP link at the page**

Replace `routes.events.tools.rsvp(X)` with `routes.events.manage(X, { tab: 'rsvp' })` in:
- `components/feed/QuickAccessBar.tsx:41`
- `components/layout/right-context-panel/RsvpSummarySection.tsx:24`
- `hooks/useBeforeJourney.ts:58`
- `hooks/useRsvpSubmitPageData.ts:50`
- `components/manage/overview/OverviewJourneyView.stories.tsx:15`

Then run `grep -rn "tools\.rsvp(\|tools/rsvp" --include=*.ts --include=*.tsx app components hooks lib` and fix any test that now expects the old href (e.g. `QuickAccessBar`, `RsvpSummarySection`, `useBeforeJourney`, `useRsvpSubmitPageData` tests). Leave the route-list tests that only name `/tools/rsvp` as a path (`eventLifecycle`, `eventTheme`, `liteEvents`, `myRoleSheetRequests`, `routes`): the route still exists.

Check `ManageTab` in `lib/routes.ts` includes `'rsvp'` (it does).

- [ ] **Step 8: Type-check, lint, run the touched tests**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx eslint . --fix && npx eslint .`
Expected: 0 errors.

Run: `npx vitest run hooks components/manage components/feed components/layout lib`
Expected: PASS (if a known flaky file fails, re-run it alone).

- [ ] **Step 9: Commit**

```bash
git add hooks/useRsvpRedirect.ts hooks/useRsvpRedirect.test.tsx components/rsvp/RsvpRedirect.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/rsvp/PageClient.tsx" "app/(main)/(app)/(event)/events/[eventId]/tools/rsvp/(root)/page.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx" components/feed/QuickAccessBar.tsx components/layout/right-context-panel/RsvpSummarySection.tsx hooks/useBeforeJourney.ts hooks/useRsvpSubmitPageData.ts components/manage/overview/OverviewJourneyView.stories.tsx
git commit -m "KAN-227: Tools > RSVP sends hosts to the RSVP page; links point there"
```

(Add any test files you changed in Step 7 to the same commit.)

---

### Task 11: Remove the old text, full checks, look at it

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Make sure nothing reads the old keys**

Run: `grep -rn "rsvpTabs\|rsvpOverview\|rsvpReports\.description\|t('description')" --include=*.ts --include=*.tsx app components hooks lib | grep -i rsvp`
Expected: no output.

- [ ] **Step 2: Delete them in both files**

Remove `ManagePage.rsvpTabs`, `ManagePage.rsvpOverview` and `ManagePage.rsvpReports.description` from `messages/en.json` and `messages/el.json`. Nothing else.

- [ ] **Step 3: Stale references**

Run: `grep -rn "useRsvpSubTab\|resolveRsvpSubTab\|RsvpSubTab\|RsvpStatsPanel\|RsvpReportsPanel\|RsvpScreen\b\|origin=\"tools\"" --include=*.ts --include=*.tsx --include=*.md app components hooks lib docs/*.md`
Expected: no output (plans under `docs/superpowers/` may mention them; leave those).

- [ ] **Step 4: Full checks**

Run: `npx tsc --noEmit` → clean.
Run: `npx eslint .` → 0 errors.
Run: `npx vitest run` → all pass; re-run any known flaky file alone (save-my-date editor `PageClient*.test.tsx`, `hooks/useCampaignsPage.test.tsx`, `lib/overlayHistory.test.ts`).

- [ ] **Step 5: Look at it, signed in**

Local backend + `npx next dev --webpack -p 3000` (see the KAN-236 setup), host account bob, a live event with RSVP and replies ("Mits & Nameless"). At 375px and 1280px, on `/events/<id>/manage?tab=rsvp`:
- Phone order: deadline, four tiles in one row, report cards swiping, attendance, Guests with chips. Nothing cut off at 375px (tile labels truncate, not overflow).
- Desktop: main column (tiles, 2x2 reports, guests table) and the side column (deadline, attendance).
- Pencil opens the sheet; saving a new date closes it and the countdown updates.
- A chip filters the list; Possible duplicate Keep/Remove still work.
- A report card opens the report; Close comes back to the RSVP page.
- `/events/<id>/tools/rsvp` lands on the RSVP page; the feed's quick bar and the right panel's RSVP link go straight there.
- An event without RSVP in its plan (alice's lite event): `/tools/rsvp` shows the not-available screen.
Afterwards `git checkout -- AGENTS.md` and stop the servers.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-227: Remove the RSVP sub-tab labels, the reports line and the old Tools title"
```

- [ ] **Step 7: SEO check**

`/tools/rsvp` and `/manage` are signed-in host pages (no index). Check `docs/seo-guidelines.md` anyway and list any rule this breaks as a BLOCKER in the PR description; expected: none.

- [ ] **Step 8: Push and open the PR (only when the owner asks)**

Branch `claude/kan-227-rsvp-one-page`, PR into `staging`, title `KAN-227: RSVP on one page`. Body: Summary, What changes, Wording (the table above + removals), Visual check notes (new stories; `RsvpListPanel` stories change from the select to chips; `ManageSkeletons` RSVP skeleton changes), SEO (no blockers), Checks, and the attribution line. Name only KAN-227 in the body.
