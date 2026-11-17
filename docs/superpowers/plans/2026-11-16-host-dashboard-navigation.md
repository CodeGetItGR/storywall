# Host Dashboard Navigation Implementation Plan (KAN-223)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the host dashboard groups its sections under Event and People in a desktop sidebar. On mobile the Overview is the menu, and every other dashboard page gets a header with a clear "Overview" back button. Help folds into the Overview. Share links and Vendors open inside the dashboard.

**Architecture:**

- **Nav data:** `lib/manageSections.ts` becomes the one source for the nav. It defines grouped entries, where an entry is either a section (opened in place with `?tab=`) or a page with its own route (`/manage/qr`, `/manage/vendors`).
- **Visibility:** `useManageNav` gathers today's visibility rules once, so every dashboard page shows the same nav.
- **Frame:** `ManageShell` is the frame shared by the dashboard and its two pages. It holds the event header, the desktop sidebar, the mobile section header (header B) and the mobile section list on the Overview.
- **Help:** the setup steps move from the Help section onto the Overview, and the Help entry goes everywhere.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind, Vitest + Testing Library, Storybook.

**Mockups:** boards N1-desktop, MN1-overview and MN1-section-b on the design canvas (artifact `CDygEzhyHjNzSeVsrSxWXy`). Roadmap: [2026-11-16-host-pages-redesign-roadmap.md](2026-11-16-host-pages-redesign-roadmap.md).

---

## Decisions this plan builds on

**Sidebar groups (N1):**

| Group | Entries |
|---|---|
| **Event** | Overview, Settings, Theme, Billing, Given as a gift |
| **People** | RSVP, Invitation, Share links, Members, Vendors |
| *(apart, last)* | Danger zone, below a divider |

- Each entry shows only when it does today: Theme only while a theme can be picked, the gift section only when available, Danger zone only for the primary host, and so on.
- Share links follows the event menu's rule: hidden on a lite event. Vendors shows when the plan has vendors.
- "Given as a gift" was not on the mockups. Task 1 confirms that it goes under Event.
- Invitation and Share links stay two entries until KAN-225 merges them into "Invitations & QR codes". This piece adds no new entry names.

**Small screens (MN1):**

- The Overview keeps the event title and status, shows its content, then lists every entry under the same group headings, with Danger zone last.
- Every other dashboard page (sections, Share links, Vendors) replaces the event header with header B: an "Overview" pill on the left and the page title in the centre.
- The "Change section" switcher and its sheet go.
- The bottom tab bar does not change.

**Help:**

- The Help section goes. Its setup steps move onto the Overview (for live events) under the existing heading "Manage your event".
- The Help entry leaves the event menu.
- Old `?tab=help` links fall back to the Overview, which now holds the steps.

**Pages for hosts:**

- Share links and Vendors render inside `ManageShell`. Their content does not change.
- The Share links subtitle becomes the first paragraph of the page.
- A planner with `QR_READ` still sees the standalone Share links page as today.

**Out of scope here:** Overview C1 (KAN-224), Invitations & QR codes (KAN-225), Announcement in the composer (KAN-232), and the content of every section.

## File map

| File | Change | Responsibility |
|---|---|---|
| `lib/manageSections.ts` | modify | Section list without `help`, nav groups, pages, `manageNavHref`, `visibleManageNav` |
| `lib/manageSections.test.ts` | modify | Tests for the above |
| `lib/routes.ts:9-10` | modify | Drop `'help'` from `ManageTab` |
| `hooks/useEventSetupSteps.ts` | create | Builds the setup steps (logic moved out of `HelpTab`) |
| `components/manage/help/EventSetupSteps.tsx` (+ `.test.tsx`) | create | The steps block on the Overview |
| `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx` | modify | Renders `EventSetupSteps` on a live event |
| `app/(main)/(app)/(event)/events/[eventId]/manage/HelpTab.tsx` (+ `.test.tsx`) | delete | Replaced by `EventSetupSteps` |
| `hooks/useToolsMenuItems.ts` (+ test) | modify | Drop the Help entry |
| `components/layout/MobileTabBar.tsx` | modify | Drop the Help filter |
| `hooks/useRightContextPanel.ts` | modify | Drop Help filters. On the Overview, also drop Vendors (now in the nav) |
| `hooks/useManageSectionLabel.ts` | modify | Labels for pages too |
| `hooks/useManageNav.ts` (+ test) | create | Visibility rules, gift section, visible nav |
| `hooks/useManageSectionRoute.ts` (+ test) | create | `?tab=` → section, in-place switching, fallback |
| `components/manage/nav/manageNavIcons.ts` | create | One icon per entry |
| `components/manage/nav/ManageNavLink.tsx` (+ test) | create | Link that switches a section in place |
| `components/manage/nav/ManageSidebar.tsx` (+ test, story) | create | Grouped desktop sidebar |
| `components/manage/nav/ManageSectionList.tsx` (+ test, story) | create | Mobile list on the Overview |
| `components/manage/nav/ManageSectionHeader.tsx` (+ test, story) | create | Header B |
| `components/manage/nav/ManageShell.tsx` (+ test) | create | Shared dashboard frame |
| `components/manage/nav/ManagePageFrame.tsx` | create | `ManageShell` for the route pages |
| `components/manage/ManageScreen.tsx` | modify | Uses the hooks and `ManageShell` |
| `components/manage/ManageSectionNav.tsx` | delete | Replaced by `ManageSidebar` |
| `components/manage/invitations/InvitationsQrScreen.tsx` | modify | Hosts see it in the dashboard |
| `components/vendors/manage/ManageVendorsScreen.tsx` | modify | Shown in the dashboard |
| `messages/en.json`, `messages/el.json` | modify | Add `ManagePage.navGroups`. Remove the keys that only Help, the switcher and the vendors back link used |

---

### Task 0: Branch and workspace

- [ ] **Step 1: Branch from the latest staging**

```bash
git fetch origin staging
git switch -c claude/kan-223-host-dashboard-navigation origin/staging
```

- [ ] **Step 2: Link node_modules if the worktree has none**

The memory note `worktree-node-modules-junction.md` says to compare the lockfiles. If they match, link the main checkout's `node_modules`:

```powershell
if ((Get-FileHash package-lock.json).Hash -eq (Get-FileHash ..\..\..\package-lock.json).Hash) { New-Item -ItemType Junction -Path node_modules -Target ..\..\..\node_modules }
```

Expected: a `node_modules` junction. If the hashes differ, run `npm ci` instead.

- [ ] **Step 3: Baseline**

Run: `npx vitest run lib/manageSections.test.ts hooks/useToolsMenuItems.test.tsx`
Expected: PASS.

### Task 1: Get the wording approved

No code. Ask in one AskUserQuestion popup (several questions are fine) and record the answers in the PR description. **Stop until every item has a clear yes.**

1. **New group headings.**

   | | English (agreed on the canvas) | Greek (proposed) |
   |---|---|---|
   | Event | "Event" | "Εκδήλωση" |
   | People | "People" | "Άτομα" |

   The Settings entry is already "Εκδήλωση" in Greek, so the Greek heading would read the same as the entry below it. Offer "Η εκδήλωση" as an alternative, and let the owner pick or write their own.
2. **Remove the "Host Dashboard" / "Πίνακας Διοργανωτή" line** above the event title (N1 and MN1 show the title alone). If declined, keep the `<p>` eyebrow in `ManageShell`'s header, as `ManageScreen` has it today.
3. **Remove from the Help section:** "Welcome!" and "Let's get your event ready", plus the event title under them. The heading "Manage your event", its line "A few steps and everything's ready for your guests" and the steps move to the Overview unchanged.
4. **Remove the event-menu entry** "Help — Setup guide and tips" / "Βοήθεια — Οδηγός ρύθμισης και συμβουλές".
5. **Remove the screen-reader label** "Change section" / its Greek, which goes with the switcher.
6. **Share links and Vendors for hosts:** the "Back to feed" and "Back" links give way to the "Overview" back button on mobile and to the sidebar on desktop. A planner keeps "Back to feed".
7. **Placement:** "Given as a gift" goes under Event, after Billing.

### Task 2: The setup steps as an Overview block

**Files:**
- Create: `hooks/useEventSetupSteps.ts`
- Create: `components/manage/help/EventSetupSteps.tsx`
- Test: `components/manage/help/EventSetupSteps.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/help/EventSetupSteps.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventSetupSteps } from '@/components/manage/help/EventSetupSteps';
import type { EventDetailResponseDto, EventModuleResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey }) }));
vi.mock('@/hooks/useHelpProgress', () => ({
    useHelpProgress: () => ({ details: false, rsvp: false, giftAccount: false, schedule: false, invitations: false }),
}));
vi.mock('@/components/manage/help/HelpStepper', () => ({ HelpStepper: ({ children }: { children: React.ReactNode }) => <ol>{children}</ol> }));
vi.mock('@/components/manage/help/HelpStep', () => ({ HelpStep: ({ title }: { title: string }) => <li>{title}</li> }));

afterEach(cleanup);

function event(moduleKeys: string[]): EventDetailResponseDto {
    const modules = moduleKeys.map(
        (moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} }) as unknown as EventModuleResponseDto,
    );
    return {
        id: 'e1',
        title: 'Wedding',
        eventType: 'WEDDING',
        status: 'ACTIVE',
        deletedAt: null,
        schedule: {},
        location: {},
        sessions: [],
        modules,
    } as unknown as EventDetailResponseDto;
}

describe('EventSetupSteps', () => {
    it('shows the heading and the invitations step on a full event', () => {
        render(<EventSetupSteps event={event(['posts', 'gallery'])} />);
        expect(screen.getByRole('heading', { name: 'steps.section.title' })).toBeInTheDocument();
        expect(screen.getByText('steps.invitations.title')).toBeInTheDocument();
    });

    // A lite event takes no guests: they use its guest code.
    it('leaves the invitations step out on a lite event', () => {
        render(<EventSetupSteps event={event(['gallery', 'wishbook'])} />);
        expect(screen.queryByText('steps.invitations.title')).toBeNull();
        expect(screen.getByText('steps.details.title')).toBeInTheDocument();
    });

    it('lists the RSVP step only when the plan has RSVP', () => {
        render(<EventSetupSteps event={event(['posts', 'rsvp'])} />);
        expect(screen.getByText('rsvp')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/help/EventSetupSteps.test.tsx`
Expected: FAIL, "Failed to resolve import @/components/manage/help/EventSetupSteps".

- [ ] **Step 3: Write the hook (logic moved as-is from `HelpTab.tsx`)**

```ts
// hooks/useEventSetupSteps.ts
'use client';

import { useTranslations } from 'next-intl';

import type { HelpStepAction } from '@/components/manage/help/HelpStep';
import { useHelpProgress } from '@/hooks/useHelpProgress';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { isLiteEvent } from '@/lib/liteEvents';
import { routes } from '@/lib/routes';

export type EventSetupStep = { key: string; title: string; body?: string; complete: boolean; actions: HelpStepAction[] };

/** The host's setup steps for a live event, in order, each with its links. */
export function useEventSetupSteps(event: EventDetailResponseDto): EventSetupStep[] {
    const t = useTranslations('HostOnboarding');
    const moduleCopy = useModuleCopy(event.eventType);
    const sessions = event.sessions ?? [];
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions });

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(event.eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((session) => session.isSecondary && !session.deletedAt);
    const enabledModuleKeys = new Set(event.modules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));
    // A lite event takes no guests: they add photos and wishes through its guest code.
    const isLite = isLiteEvent(event);

    const detailsActions: HelpStepAction[] = [
        { key: 'settings', href: routes.events.manage(event.id, { tab: 'settings' }), label: t('steps.details.edit') },
    ];
    if (hasVenueConvention) {
        detailsActions.push({
            key: 'venue',
            href: routes.events.tools.schedule(event.id, { section: 'venue-session' }),
            label: t(hasVenue ? 'steps.details.venueEdit' : 'steps.details.venueAdd'),
        });
    }

    const steps: (EventSetupStep | false)[] = [
        { key: 'details', title: t('steps.details.title'), complete: progress.details, actions: detailsActions },
        isModuleAvailable(event.modules, 'rsvp') && {
            key: 'rsvp',
            title: moduleCopy('rsvp').name,
            complete: progress.rsvp,
            actions: [{ key: 'rsvp', href: routes.events.tools.rsvp(event.id), label: t('steps.rsvp.edit') }],
        },
        enabledModuleKeys.has('wishlist') && {
            key: 'giftAccount',
            title: moduleCopy('wishlist').name,
            complete: progress.giftAccount,
            actions: [{ key: 'gifts', href: routes.events.tools.gifts(event.id), label: t('steps.giftAccount.edit') }],
        },
        {
            key: 'schedule',
            title: moduleCopy('schedule').name,
            complete: progress.schedule,
            actions: [{ key: 'schedule', href: routes.events.tools.schedule(event.id), label: t('steps.schedule.edit') }],
        },
        !isLite && {
            key: 'invitations',
            title: t('steps.invitations.title'),
            body: t('steps.invitations.body'),
            complete: progress.invitations,
            actions: [{ key: 'qr', href: routes.events.invitationsQr(event.id), label: t('steps.invitations.qr') }],
        },
    ];
    return steps.filter((step): step is EventSetupStep => Boolean(step));
}
```

- [ ] **Step 4: Write the component**

```tsx
// components/manage/help/EventSetupSteps.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { HelpStep } from '@/components/manage/help/HelpStep';
import { HelpStepper } from '@/components/manage/help/HelpStepper';
import { useEventSetupSteps } from '@/hooks/useEventSetupSteps';
import type { EventDetailResponseDto } from '@/lib/api/types';

/** The setup steps on the Overview (they used to be the Help section). */
export function EventSetupSteps({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('HostOnboarding');
    const steps = useEventSetupSteps(event);
    const headingId = useId();

    return (
        <section aria-labelledby={headingId} className="flex flex-col">
            {/* Heading */}
            <div className="mb-5">
                <h2 id={headingId} className="text-base font-semibold text-ink">
                    {t('steps.section.title')}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{t('steps.section.body')}</p>
            </div>

            {/* Steps */}
            <HelpStepper>
                {steps.map((step, index) => (
                    <HelpStep
                        key={step.key}
                        index={index + 1}
                        title={step.title}
                        body={step.body}
                        complete={step.complete}
                        actions={step.actions}
                        isLast={index === steps.length - 1}
                    />
                ))}
            </HelpStepper>
        </section>
    );
}
```

- [ ] **Step 5: Run the test and make sure it passes**

Run: `npx vitest run components/manage/help/EventSetupSteps.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/useEventSetupSteps.ts components/manage/help/EventSetupSteps.tsx components/manage/help/EventSetupSteps.test.tsx
git commit -m "KAN-223: setup steps as an Overview block"
```

### Task 3: The Overview shows the steps; the Help section goes

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx`, `OverviewTab.test.tsx`, `OverviewTab.themePicker.test.tsx`
- Delete: `app/(main)/(app)/(event)/events/[eventId]/manage/HelpTab.tsx`, `HelpTab.test.tsx`
- Modify: `lib/manageSections.ts`, `lib/manageSections.test.ts`, `lib/routes.ts`, `components/manage/ManageScreen.tsx`, `components/manage/ManageSectionNav.tsx`, `hooks/useToolsMenuItems.ts`, `hooks/useToolsMenuItems.test.tsx`, `components/layout/MobileTabBar.tsx`, `hooks/useRightContextPanel.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Update the tests first**

In `lib/manageSections.test.ts`:
- Replace the test `parseManageSection resolves "help"` with:

```ts
    it('parseManageSection sends the removed Help section to the overview', () => {
        expect(parseManageSection('help')).toBe('overview');
    });
```

- Delete `'help'` from every expected array in the file. For example, the first test becomes `['overview', 'settings', 'theme', 'invitation', 'rsvp', 'members', 'gift', 'billing', 'danger']`.

In `hooks/useToolsMenuItems.test.tsx`:
- Line 193: rename the test to `'lists manage, the share links and announcement for a live event'` and expect `['manage', 'invitationsQr', 'announcement']`.
- Line 219: expect `['manage']`.

- [ ] **Step 2: Run them and make sure they fail**

Run: `npx vitest run lib/manageSections.test.ts hooks/useToolsMenuItems.test.tsx`
Expected: FAIL. `'help'` is still listed.

- [ ] **Step 3: Remove `help`**

- `lib/manageSections.ts`: drop `'help'` from the `ManageSection` union and from `manageSections`.
- `lib/routes.ts:9-10`: drop `'help'` from `ManageTab`.
- `components/manage/ManageSectionNav.tsx`: drop `help: HelpCircle` and the `HelpCircle` import.
- `components/manage/ManageScreen.tsx`: delete the `{section === 'help' && (<HelpTab … />)}` block and the `HelpTab` import.
- `hooks/useToolsMenuItems.ts:175`: delete the `{ key: 'help', … }` entry. Remove `HelpCircle` from the lucide import if nothing else uses it.
- `components/layout/MobileTabBar.tsx:77-78`: replace the help comment and filter with `...hostItems,`.
- `hooks/useRightContextPanel.ts`:
  - Line 65 becomes `if (!includeManageLinks) hostItemsForActions = hostItemsForActions.filter((item) => item.key !== 'manage');`.
  - Line 84's draft branch becomes `? hostItemsForActions`.
  - Update the comment above line 64: it no longer mentions Help.
- `git rm "app/(main)/(app)/(event)/events/[eventId]/manage/HelpTab.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/HelpTab.test.tsx"`.

- [ ] **Step 4: Put the steps on the Overview**

In `OverviewTab.tsx`:
- Add `import { EventSetupSteps } from '@/components/manage/help/EventSetupSteps';`.
- In the live branch, between `{/* Headline numbers */}` `<MetricStrip … />` and `{/* Host context … */}`, add:

```tsx
            {/* Setup steps (moved here from Help) */}
            <div className="border-t border-border pt-5">
                <EventSetupSteps event={event} />
            </div>
```

In both `OverviewTab.test.tsx` and `OverviewTab.themePicker.test.tsx`, add next to the other component mocks:

```tsx
vi.mock('@/components/manage/help/EventSetupSteps', () => ({ EventSetupSteps: () => null }));
```

- [ ] **Step 5: Remove the copy that only Help used** (approved in Task 1, items 3 and 4)

In both `messages/en.json` and `messages/el.json`, delete:
- `ManagePage.sections.help`
- `HostOnboarding.welcome` (the whole object)
- `MobileTabBar.hostMenu.help` (the whole object)

Then confirm nothing still reads them:

Run: `git grep -n "welcome\.greeting\|hostMenu.help\|sections.help\|tab: 'help'" -- "*.ts" "*.tsx"`
Expected: no output.

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run lib/manageSections.test.ts hooks/useToolsMenuItems.test.tsx hooks/useRightContextPanel.test.tsx "app/(main)/(app)/(event)/events/[eventId]/manage" components/manage/help`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A lib/manageSections.ts lib/manageSections.test.ts lib/routes.ts components/manage hooks/useToolsMenuItems.ts hooks/useToolsMenuItems.test.tsx components/layout/MobileTabBar.tsx hooks/useRightContextPanel.ts messages "app/(main)/(app)/(event)/events/[eventId]/manage"
git commit -m "KAN-223: fold Help into the Overview"
```

### Task 4: Nav groups, pages and links in `lib/manageSections.ts`

**Files:**
- Modify: `lib/manageSections.ts`
- Test: `lib/manageSections.test.ts`

- [ ] **Step 1: Write the failing tests**

Change the import and the first test, then append the new tests inside the `describe`:

```ts
import { routes } from '@/lib/routes';
import {
    isManagePage,
    manageNavGroups,
    manageNavHref,
    manageSections,
    parseManageSection,
    resolveManageSection,
    visibleManageNav,
    visibleManageSections,
} from '@/lib/manageSections';

    it('lists sections in the nav order: the Event group, then People, then Danger zone', () => {
        expect(manageSections).toEqual(['overview', 'settings', 'theme', 'billing', 'gift', 'rsvp', 'invitation', 'members', 'danger']);
        const groupedSections = manageNavGroups.flatMap((group) => group.items).filter((key) => !isManagePage(key));
        expect([...groupedSections, 'danger']).toEqual(manageSections);
    });

    it('groups the nav under Event and People, with the two pages among the People', () => {
        expect(manageNavGroups).toEqual([
            { key: 'event', items: ['overview', 'settings', 'theme', 'billing', 'gift'] },
            { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
        ]);
    });

    it('manageNavHref opens a section through ?tab= and a page on its own route', () => {
        expect(manageNavHref('e1', 'overview')).toBe(routes.events.manage('e1'));
        expect(manageNavHref('e1', 'settings')).toBe(routes.events.manage('e1', { tab: 'settings' }));
        expect(manageNavHref('e1', 'shareLinks')).toBe(routes.events.invitationsQr('e1'));
        expect(manageNavHref('e1', 'vendors')).toBe(routes.events.manageVendors('e1'));
    });

    it('visibleManageNav keeps only visible entries, drops empty groups and keeps Danger zone apart', () => {
        const visibleSections = visibleManageSections({ canDelete: true, rsvpAvailable: false, membersAvailable: false });
        expect(visibleManageNav(visibleSections, { shareLinks: false, vendors: false })).toEqual({
            groups: [{ key: 'event', items: ['overview', 'settings', 'billing'] }],
            showDanger: true,
        });
        expect(visibleManageNav(visibleManageSections({ canDelete: false, rsvpAvailable: true }), { shareLinks: true, vendors: true })).toEqual({
            groups: [
                { key: 'event', items: ['overview', 'settings', 'billing'] },
                { key: 'people', items: ['rsvp', 'shareLinks', 'members', 'vendors'] },
            ],
            showDanger: false,
        });
    });
```

Because the section order changes, update the expected arrays of the existing `visibleManageSections` tests:

| Test | Expected |
|---|---|
| invitation | `['overview', 'settings', 'billing', 'invitation', 'members']` |
| RSVP hidden | `['overview', 'settings', 'billing', 'members', 'danger']` |
| co-hosts | `['overview', 'settings', 'billing', 'rsvp', 'members']` |
| gift | `['overview', 'settings', 'billing', 'gift', 'members']` |
| theme | `['overview', 'settings', 'theme', 'billing', 'members']` |
| no members | `['overview', 'settings', 'billing', 'danger']` |

- [ ] **Step 2: Run them and make sure they fail**

Run: `npx vitest run lib/manageSections.test.ts`
Expected: FAIL. `isManagePage`, `manageNavGroups`, `manageNavHref` and `visibleManageNav` are not exported.

- [ ] **Step 3: Implement**

Replace the top of `lib/manageSections.ts` (the doc comment, the type and `manageSections`) with:

```ts
import { routes } from '@/lib/routes';

/**
 * The host dashboard's nav. The desktop sidebar and the mobile Overview list both
 * read `manageNavGroups`, in this exact order. Danger zone always sits apart, last.
 * A section opens inside the dashboard through `?tab=`; a page (Share links,
 * Vendors) has its own route under /manage and the same frame.
 */
export type ManageSection = 'overview' | 'settings' | 'theme' | 'billing' | 'gift' | 'rsvp' | 'invitation' | 'members' | 'danger';
export type ManagePage = 'shareLinks' | 'vendors';
export type ManageNavKey = ManageSection | ManagePage;
export type ManageNavGroup = { key: 'event' | 'people'; items: ManageNavKey[] };

export const manageNavGroups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing', 'gift'] },
    { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
];

// Every section, in nav order; `?tab=` accepts only these.
export const manageSections: ManageSection[] = ['overview', 'settings', 'theme', 'billing', 'gift', 'rsvp', 'invitation', 'members', 'danger'];

export function isManagePage(key: ManageNavKey): key is ManagePage {
    return key === 'shareLinks' || key === 'vendors';
}

export function manageNavHref(eventId: string, key: ManageNavKey): string {
    if (key === 'shareLinks') return routes.events.invitationsQr(eventId);
    if (key === 'vendors') return routes.events.manageVendors(eventId);
    return routes.events.manage(eventId, { tab: key === 'overview' ? null : key });
}

// The nav for this event: each group keeps its visible entries, an empty group goes.
export function visibleManageNav(
    visibleSections: ManageSection[],
    pages: Record<ManagePage, boolean>,
): { groups: ManageNavGroup[]; showDanger: boolean } {
    const isShown = (key: ManageNavKey) => (isManagePage(key) ? pages[key] : visibleSections.includes(key));
    return {
        groups: manageNavGroups.map((group) => ({ ...group, items: group.items.filter(isShown) })).filter((group) => group.items.length > 0),
        showDanger: visibleSections.includes('danger'),
    };
}
```

Keep `manageSectionModuleKeys`, `parseManageSection`, `visibleManageSections` and `resolveManageSection` as they are.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run lib/manageSections.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/manageSections.ts lib/manageSections.test.ts
git commit -m "KAN-223: group the dashboard nav under Event and People"
```

### Task 5: Labels for pages and group headings

**Files:**
- Modify: `hooks/useManageSectionLabel.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the approved headings** (Task 1, item 1)

`messages/en.json`, inside `ManagePage`, after `"sections": { … },`:

```json
        "navGroups": {
            "event": "Event",
            "people": "People"
        },
```

`messages/el.json`, at the same place, with the Greek the owner approved in Task 1:

```json
        "navGroups": {
            "event": "Η εκδήλωση",
            "people": "Άτομα"
        },
```

Approved on 2026-11-16: "Η εκδήλωση" and "Άτομα".

- [ ] **Step 2: Label pages as well as sections**

Replace the body of `hooks/useManageSectionLabel.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type ManageNavKey, manageSectionModuleKeys } from '@/lib/manageSections';
import { useActiveEvent } from '@/providers/EventProvider';

// The name of a dashboard entry: a page shows its own title, a module section its module's name.
export function useManageSectionLabel() {
    const t = useTranslations('ManagePage');
    const tShareLinks = useTranslations('InvitationsQrPage');
    const tVendors = useTranslations('Vendors.manage');
    const moduleCopy = useModuleCopy(useActiveEvent()?.eventType);

    return useCallback(
        (key: ManageNavKey) => {
            if (key === 'shareLinks') return tShareLinks('title');
            if (key === 'vendors') return tVendors('title');
            const moduleKey = manageSectionModuleKeys[key];
            return moduleKey ? moduleCopy(moduleKey).name : t(`sections.${key}`);
        },
        [moduleCopy, t, tShareLinks, tVendors],
    );
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useManageSectionLabel.ts messages/en.json messages/el.json
git commit -m "KAN-223: labels for the nav groups and pages"
```

### Task 6: `useManageNav`, one place for the visibility rules

**Files:**
- Create: `hooks/useManageNav.ts`
- Test: `hooks/useManageNav.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useManageNav.test.tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageNav } from '@/hooks/useManageNav';

const mocks = vi.hoisted(() => ({
    event: null as Record<string, unknown> | null,
    memberId: 'm1',
}));

vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: mocks.event, eventId: 'e1', isHost: true }),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => ({ id: mocks.memberId }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { planTiers: [] } }) }));
vi.mock('@/hooks/useGiftSection', () => ({ useGiftSection: () => ({ gift: null, available: false, isLoading: false }) }));
vi.mock('@/lib/invitation/invitationEvent', () => ({ offersOnlineInvitation: () => false }));

function event(moduleKeys: string[]) {
    return {
        id: 'e1',
        status: 'ACTIVE',
        deletedAt: null,
        suspended: false,
        eventType: 'BIRTHDAY',
        schedule: { startAt: '2027-06-01T10:00:00Z', endAt: null },
        hosts: [{ memberId: 'm1', displayOrder: 0 }],
        modules: moduleKeys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true, configuration: {} })),
    };
}

beforeEach(() => {
    mocks.memberId = 'm1';
});

describe('useManageNav', () => {
    it('lists Share links and Vendors among the People on a full event', () => {
        mocks.event = event(['posts', 'rsvp', 'vendors']);
        const { result } = renderHook(() => useManageNav());
        expect(result.current.groups).toEqual([
            { key: 'event', items: ['overview', 'settings', 'billing'] },
            { key: 'people', items: ['rsvp', 'shareLinks', 'members', 'vendors'] },
        ]);
        expect(result.current.showDanger).toBe(true);
    });

    // A lite event takes no guests: no share links, no members (without co-hosts).
    it('drops the People group on a lite event without vendors', () => {
        mocks.event = event(['gallery']);
        const { result } = renderHook(() => useManageNav());
        expect(result.current.groups).toEqual([{ key: 'event', items: ['overview', 'settings', 'billing'] }]);
    });

    it('hides Danger zone from a co-host', () => {
        mocks.event = event(['posts']);
        mocks.memberId = 'm2';
        expect(renderHook(() => useManageNav()).result.current.showDanger).toBe(false);
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run hooks/useManageNav.test.tsx`
Expected: FAIL, "Failed to resolve import @/hooks/useManageNav".

- [ ] **Step 3: Implement (rules moved from `ManageScreen.tsx`)**

```ts
// hooks/useManageNav.ts
'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useGiftSection } from '@/hooks/useGiftSection';
import { isEventDeleted, isModuleAvailable, isPrimaryHost, readableModuleKeys } from '@/lib/eventLifecycle';
import { canPickTheme } from '@/lib/eventTheme';
import { offersOnlineInvitation } from '@/lib/invitation/invitationEvent';
import { isLiteEvent } from '@/lib/liteEvents';
import { visibleManageNav, visibleManageSections } from '@/lib/manageSections';
import { useActiveMember } from '@/providers/EventProvider';

/** What the host's dashboard nav shows for this event, shared by every dashboard page. */
export function useManageNav() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const activeMember = useActiveMember();
    const { data: appConfig } = useAppConfig();
    const isDraft = activeEvent.status === 'DRAFT';
    const isDeleted = isEventDeleted(activeEvent);
    const canDelete = isPrimaryHost(activeEvent.hosts, activeMember?.id);
    const rsvpAvailable = isModuleAvailable(activeEvent.modules, 'rsvp');
    const isLite = isLiteEvent(activeEvent);
    const giftSection = useGiftSection(isHost && !isDraft && !isDeleted ? eventId : null, {
        isPrimaryHost: canDelete,
        eventModules: activeEvent.modules,
        planTiers: appConfig?.planTiers ?? [],
    });
    const visibleSections = visibleManageSections({
        canDelete,
        rsvpAvailable,
        giftAvailable: giftSection.available,
        themeAvailable: canPickTheme(activeEvent),
        invitationAvailable: offersOnlineInvitation(activeEvent.eventType),
        // A lite event takes no guests, so its Members tab is only for co-hosts, when its plan has them.
        membersAvailable: !isLite || isModuleAvailable(activeEvent.modules, 'co_hosts'),
    });
    // The same rules as the event menu's Share links and Vendors entries (useHostMenuItems).
    const { groups, showDanger } = visibleManageNav(visibleSections, {
        shareLinks: !isLite,
        vendors: readableModuleKeys(activeEvent).has('vendors'),
    });

    return { eventId, isDraft, isDeleted, canDelete, rsvpAvailable, giftSection, visibleSections, groups, showDanger };
}

export type ManageNav = ReturnType<typeof useManageNav>;
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run hooks/useManageNav.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useManageNav.ts hooks/useManageNav.test.tsx
git commit -m "KAN-223: useManageNav gathers the dashboard visibility rules"
```

### Task 7: `useManageSectionRoute`, `?tab=` to section

**Files:**
- Create: `hooks/useManageSectionRoute.ts`
- Test: `hooks/useManageSectionRoute.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useManageSectionRoute.test.tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useManageSectionRoute } from '@/hooks/useManageSectionRoute';
import type { ManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';

const mocks = vi.hoisted(() => ({ query: '', replacePageUrl: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock('@/lib/overlayHistory', () => ({ replacePageUrl: mocks.replacePageUrl }));

const visibleSections: ManageSection[] = ['overview', 'settings', 'rsvp', 'members', 'billing'];
const options = { eventId: 'e1', isDraft: false, isDeleted: false, visibleSections, pendingSections: [] };

beforeEach(() => {
    mocks.replacePageUrl.mockClear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

describe('useManageSectionRoute', () => {
    it('opens the section the URL asks for', () => {
        mocks.query = 'tab=settings';
        expect(renderHook(() => useManageSectionRoute(options)).result.current.section).toBe('settings');
        expect(mocks.replacePageUrl).not.toHaveBeenCalled();
    });

    it('sends a removed or hidden section back to the overview', () => {
        mocks.query = 'tab=help';
        const { result } = renderHook(() => useManageSectionRoute(options));
        expect(result.current.section).toBe('overview');
        expect(mocks.replacePageUrl).toHaveBeenCalledWith(routes.events.manage('e1'));
    });

    it('switches a section in place and scrolls to the top', () => {
        mocks.query = '';
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('rsvp'));
        expect(mocks.replacePageUrl).toHaveBeenCalledWith(`${routes.events.manage('e1')}?tab=rsvp`);
        expect(window.scrollTo).toHaveBeenCalled();
    });

    it('drops ?tab= when going back to the overview', () => {
        mocks.query = 'tab=rsvp';
        const { result } = renderHook(() => useManageSectionRoute(options));
        act(() => result.current.navigateToSection('overview'));
        expect(mocks.replacePageUrl).toHaveBeenLastCalledWith(routes.events.manage('e1'));
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run hooks/useManageSectionRoute.test.tsx`
Expected: FAIL, "Failed to resolve import @/hooks/useManageSectionRoute".

- [ ] **Step 3: Implement (moved from `ManageScreen.tsx`)**

```ts
// hooks/useManageSectionRoute.ts
'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { type ManageSection, parseManageSection, resolveManageSection } from '@/lib/manageSections';
import { replacePageUrl } from '@/lib/overlayHistory';
import { routes } from '@/lib/routes';

/** The dashboard section in `?tab=`, and the way to switch it without a server render. */
export function useManageSectionRoute({
    eventId,
    isDraft,
    isDeleted,
    visibleSections,
    pendingSections,
}: {
    eventId: string;
    isDraft: boolean;
    isDeleted: boolean;
    visibleSections: ManageSection[];
    pendingSections: ManageSection[];
}) {
    const searchParams = useSearchParams();
    const requestedSection = parseManageSection(searchParams.get('tab'));
    const section = resolveManageSection(requestedSection, { isDraft, visibleSections, pendingSections });

    const navigateToSection = useCallback(
        (next: ManageSection) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            if (next === 'overview') nextParams.delete('tab');
            else nextParams.set('tab', next);
            const query = nextParams.toString();
            const manageRoot = routes.events.manage(eventId);
            // Client-only, so a tab switch doesn't wait on a server render.
            replacePageUrl(query ? `${manageRoot}?${query}` : manageRoot);
            // On a phone the next page starts at its header, not where the list was scrolled to.
            window.scrollTo({ top: 0 });
        },
        [eventId, searchParams],
    );

    useEffect(() => {
        if (!isDeleted && requestedSection !== section) replacePageUrl(routes.events.manage(eventId));
    }, [eventId, isDeleted, requestedSection, section]);

    return { section, navigateToSection, cancelledCheckout: searchParams.get('cancelled') === 'true' };
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run hooks/useManageSectionRoute.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useManageSectionRoute.ts hooks/useManageSectionRoute.test.tsx
git commit -m "KAN-223: useManageSectionRoute for the dashboard tab"
```

### Task 8: `ManageNavLink` and the entry icons

**Files:**
- Create: `components/manage/nav/manageNavIcons.ts`, `components/manage/nav/ManageNavLink.tsx`
- Test: `components/manage/nav/ManageNavLink.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/nav/ManageNavLink.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { routes } from '@/lib/routes';

afterEach(cleanup);

describe('ManageNavLink', () => {
    it('opens a section in place inside the dashboard', () => {
        const onSelectSection = vi.fn();
        render(
            <ManageNavLink eventId="e1" navKey="rsvp" onSelectSection={onSelectSection}>
                RSVP
            </ManageNavLink>,
        );
        const link = screen.getByRole('link', { name: 'RSVP' });
        expect(link).toHaveAttribute('href', routes.events.manage('e1', { tab: 'rsvp' }));
        expect(fireEvent.click(link)).toBe(false);
        expect(onSelectSection).toHaveBeenCalledWith('rsvp');
    });

    it('follows the link for a page, and for a new-tab click', () => {
        const onSelectSection = vi.fn();
        render(
            <>
                <ManageNavLink eventId="e1" navKey="vendors" onSelectSection={onSelectSection}>
                    Vendors
                </ManageNavLink>
                <ManageNavLink eventId="e1" navKey="settings" onSelectSection={onSelectSection}>
                    Settings
                </ManageNavLink>
            </>,
        );
        expect(fireEvent.click(screen.getByRole('link', { name: 'Vendors' }))).toBe(true);
        fireEvent.click(screen.getByRole('link', { name: 'Settings' }), { metaKey: true });
        expect(onSelectSection).not.toHaveBeenCalled();
    });

    it('marks the open entry as the current page', () => {
        render(
            <ManageNavLink eventId="e1" navKey="settings" active>
                Settings
            </ManageNavLink>,
        );
        expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    });
});
```

`fireEvent.click` returns `false` when the handler called `preventDefault`.

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/nav/ManageNavLink.test.tsx`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implement**

```ts
// components/manage/nav/manageNavIcons.ts
import { CreditCard, Gift, LayoutDashboard, type LucideIcon, MailOpen, Palette, Settings, Store, Ticket, Trash2, Users } from 'lucide-react';

import type { ManageNavKey } from '@/lib/manageSections';

// Share links and Vendors keep the icons they have in the event menu.
export const manageNavIcons: Record<ManageNavKey, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    theme: Palette,
    billing: CreditCard,
    gift: Gift,
    rsvp: Users,
    invitation: MailOpen,
    shareLinks: Ticket,
    members: Users,
    vendors: Store,
    danger: Trash2,
};
```

```tsx
// components/manage/nav/ManageNavLink.tsx
'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { isManagePage, type ManageNavKey, manageNavHref, type ManageSection } from '@/lib/manageSections';

type ManageNavLinkProps = {
    eventId: string;
    navKey: ManageNavKey;
    active?: boolean;
    // Given inside the dashboard page: a section then opens in place, without a server render.
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
    children: ReactNode;
};

/** One dashboard entry. A page, a click outside the dashboard or a new-tab click follows the link. */
export function ManageNavLink({ eventId, navKey, active = false, onSelectSection, className, children }: ManageNavLinkProps) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!onSelectSection || isManagePage(navKey)) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onSelectSection(navKey);
    }

    return (
        <Link href={manageNavHref(eventId, navKey)} onClick={handleClick} aria-current={active ? 'page' : undefined} className={className}>
            {children}
        </Link>
    );
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run components/manage/nav/ManageNavLink.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/manage/nav/manageNavIcons.ts components/manage/nav/ManageNavLink.tsx components/manage/nav/ManageNavLink.test.tsx
git commit -m "KAN-223: ManageNavLink switches a section in place"
```

### Task 9: `ManageSidebar` (desktop, N1)

**Files:**
- Create: `components/manage/nav/ManageSidebar.tsx`
- Test: `components/manage/nav/ManageSidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/nav/ManageSidebar.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import type { ManageNavGroup } from '@/lib/manageSections';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));

afterEach(cleanup);

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings'] },
    { key: 'people', items: ['rsvp', 'vendors'] },
];

function renderSidebar(props: Partial<Parameters<typeof ManageSidebar>[0]> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSidebar eventId="e1" groups={groups} showDanger active="settings" {...props} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSidebar', () => {
    it('lists each entry under its group heading, Danger zone last', () => {
        renderSidebar();
        const event = screen.getByRole('group', { name: messages.ManagePage.navGroups.event });
        expect(within(event).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:overview', 'label:settings']);
        const people = screen.getByRole('group', { name: messages.ManagePage.navGroups.people });
        expect(within(people).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:rsvp', 'label:vendors']);
        expect(screen.getAllByRole('link').at(-1)).toHaveTextContent('label:danger');
    });

    it('marks the open entry', () => {
        renderSidebar();
        expect(screen.getByRole('link', { name: 'label:settings' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'label:overview' })).not.toHaveAttribute('aria-current');
    });

    it('leaves Danger zone out when the host may not delete', () => {
        renderSidebar({ showDanger: false });
        expect(screen.queryByRole('link', { name: 'label:danger' })).toBeNull();
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/nav/ManageSidebar.test.tsx`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implement**

```tsx
// components/manage/nav/ManageSidebar.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { manageNavIcons } from '@/components/manage/nav/manageNavIcons';
import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import type { ManageNavGroup, ManageNavKey, ManageSection } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

type ManageSidebarProps = {
    eventId: string;
    groups: ManageNavGroup[];
    showDanger: boolean;
    active: ManageNavKey;
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
};

/** The dashboard sidebar (desktop): every entry under its group heading, Danger zone apart at the end. */
export function ManageSidebar({ eventId, groups, showDanger, active, onSelectSection, className }: ManageSidebarProps) {
    const t = useTranslations('ManagePage');
    const idPrefix = useId();

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col gap-5', className)}>
            {/* Groups */}
            {groups.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`${idPrefix}-${group.key}`} className="flex flex-col gap-px">
                    <span id={`${idPrefix}-${group.key}`} className="px-3 pb-1.5 text-xs font-bold text-ink-muted">
                        {t(`navGroups.${group.key}`)}
                    </span>
                    {group.items.map((key) => (
                        <SidebarItem key={key} eventId={eventId} navKey={key} active={key === active} onSelectSection={onSelectSection} />
                    ))}
                </div>
            ))}

            {/* Danger zone */}
            {showDanger && (
                <div className="border-t border-border/70 pt-3">
                    <SidebarItem eventId={eventId} navKey="danger" active={active === 'danger'} onSelectSection={onSelectSection} />
                </div>
            )}
        </nav>
    );
}

function SidebarItem({
    eventId,
    navKey,
    active,
    onSelectSection,
}: {
    eventId: string;
    navKey: ManageNavKey;
    active: boolean;
    onSelectSection?: (section: ManageSection) => void;
}) {
    const label = useManageSectionLabel();
    const Icon = manageNavIcons[navKey];
    const isDanger = navKey === 'danger';

    return (
        <ManageNavLink
            eventId={eventId}
            navKey={navKey}
            active={active}
            onSelectSection={onSelectSection}
            className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors',
                active
                    ? 'bg-primary-light text-primary-dark'
                    : isDanger
                      ? 'text-status-danger hover:bg-status-danger-wash'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
            )}
        >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
            <span className="truncate">{label(navKey)}</span>
        </ManageNavLink>
    );
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run components/manage/nav/ManageSidebar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/manage/nav/ManageSidebar.tsx components/manage/nav/ManageSidebar.test.tsx
git commit -m "KAN-223: grouped dashboard sidebar"
```

### Task 10: `ManageSectionList` (mobile Overview, MN1)

**Files:**
- Create: `components/manage/nav/ManageSectionList.tsx`
- Test: `components/manage/nav/ManageSectionList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/nav/ManageSectionList.test.tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import type { ManageNavGroup } from '@/lib/manageSections';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));

afterEach(cleanup);

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'billing'] },
    { key: 'people', items: ['rsvp', 'shareLinks'] },
];

function renderList(props: Partial<Parameters<typeof ManageSectionList>[0]> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSectionList eventId="e1" groups={groups} showDanger {...props} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSectionList', () => {
    it('lists every entry but the Overview itself, by group, Danger zone last', () => {
        renderList();
        const event = screen.getByRole('group', { name: messages.ManagePage.navGroups.event });
        expect(within(event).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:settings', 'label:billing']);
        expect(screen.getAllByRole('link').at(-1)).toHaveTextContent('label:danger');
    });

    it('drops a group whose only entry is the Overview', () => {
        renderList({ groups: [{ key: 'event', items: ['overview'] }], showDanger: false });
        expect(screen.queryByRole('group')).toBeNull();
    });

    it('opens a section in place', () => {
        const onSelectSection = vi.fn();
        renderList({ onSelectSection });
        fireEvent.click(screen.getByRole('link', { name: 'label:billing' }));
        expect(onSelectSection).toHaveBeenCalledWith('billing');
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/nav/ManageSectionList.test.tsx`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implement**

```tsx
// components/manage/nav/ManageSectionList.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { manageNavIcons } from '@/components/manage/nav/manageNavIcons';
import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import type { ManageNavGroup, ManageNavKey, ManageSection } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

type ManageSectionListProps = {
    eventId: string;
    groups: ManageNavGroup[];
    showDanger: boolean;
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
};

/** Small screens: the Overview is the menu, listing every other entry by group, Danger zone last. */
export function ManageSectionList({ eventId, groups, showDanger, onSelectSection, className }: ManageSectionListProps) {
    const t = useTranslations('ManagePage');
    const idPrefix = useId();
    const listedGroups = groups
        .map((group) => ({ ...group, items: group.items.filter((key) => key !== 'overview') }))
        .filter((group) => group.items.length > 0);

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col gap-4', className)}>
            {/* Groups */}
            {listedGroups.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`${idPrefix}-${group.key}`} className="flex flex-col">
                    <span id={`${idPrefix}-${group.key}`} className="px-1 text-xs font-bold text-ink-muted">
                        {t(`navGroups.${group.key}`)}
                    </span>
                    {group.items.map((key) => (
                        <ListRow key={key} eventId={eventId} navKey={key} onSelectSection={onSelectSection} />
                    ))}
                </div>
            ))}

            {/* Danger zone */}
            {showDanger && (
                <div className="border-t border-border/70 pt-1.5">
                    <ListRow eventId={eventId} navKey="danger" onSelectSection={onSelectSection} />
                </div>
            )}
        </nav>
    );
}

function ListRow({ eventId, navKey, onSelectSection }: { eventId: string; navKey: ManageNavKey; onSelectSection?: (section: ManageSection) => void }) {
    const label = useManageSectionLabel();
    const Icon = manageNavIcons[navKey];
    const isDanger = navKey === 'danger';

    return (
        <ManageNavLink
            eventId={eventId}
            navKey={navKey}
            onSelectSection={onSelectSection}
            className={cn('flex min-h-14 items-center gap-3.5 px-1 text-[15px] font-semibold', isDanger ? 'text-status-danger' : 'text-ink')}
        >
            <span
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isDanger ? 'bg-status-danger-wash text-status-danger' : 'bg-surface-muted text-primary',
                )}
            >
                <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate">{label(navKey)}</span>
            {!isDanger && <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />}
        </ManageNavLink>
    );
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run components/manage/nav/ManageSectionList.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/manage/nav/ManageSectionList.tsx components/manage/nav/ManageSectionList.test.tsx
git commit -m "KAN-223: the Overview lists every section on mobile"
```

### Task 11: `ManageSectionHeader` (header B)

**Files:**
- Create: `components/manage/nav/ManageSectionHeader.tsx`
- Test: `components/manage/nav/ManageSectionHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/nav/ManageSectionHeader.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';
import { routes } from '@/lib/routes';
import messages from '@/messages/en.json';

afterEach(cleanup);

function renderHeader(onSelectSection?: (section: string) => void) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSectionHeader eventId="e1" title="Members" onSelectSection={onSelectSection} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSectionHeader', () => {
    it('shows the page title and a way back to the Overview', () => {
        renderHeader();
        expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: messages.ManagePage.sections.overview })).toHaveAttribute('href', routes.events.manage('e1'));
    });

    it('goes back in place inside the dashboard', () => {
        const onSelectSection = vi.fn();
        renderHeader(onSelectSection);
        fireEvent.click(screen.getByRole('link', { name: messages.ManagePage.sections.overview }));
        expect(onSelectSection).toHaveBeenCalledWith('overview');
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/nav/ManageSectionHeader.test.tsx`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implement**

```tsx
// components/manage/nav/ManageSectionHeader.tsx
'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import type { ManageSection } from '@/lib/manageSections';

/** Header B (small screens): an easy-to-spot way back to the Overview, and this page's title. */
export function ManageSectionHeader({
    eventId,
    title,
    onSelectSection,
}: {
    eventId: string;
    title: string;
    onSelectSection?: (section: ManageSection) => void;
}) {
    const t = useTranslations('ManagePage');

    return (
        <header className="sticky top-0 z-20 flex min-h-[4.25rem] items-center justify-center border-b border-border/60 bg-event/95 px-4 py-3 backdrop-blur lg:hidden">
            {/* Back */}
            <ManageNavLink
                eventId={eventId}
                navKey="overview"
                onSelectSection={onSelectSection}
                className="absolute top-1/2 left-3 inline-flex min-h-10 -translate-y-1/2 items-center gap-0.5 rounded-full bg-primary-light pr-3.5 pl-2 text-sm font-bold text-primary-dark"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                {t('sections.overview')}
            </ManageNavLink>

            {/* Title */}
            <h1 className="max-w-[9.5rem] text-center text-[17px] leading-tight font-bold text-ink">{title}</h1>
        </header>
    );
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run components/manage/nav/ManageSectionHeader.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/manage/nav/ManageSectionHeader.tsx components/manage/nav/ManageSectionHeader.test.tsx
git commit -m "KAN-223: header B for dashboard pages on mobile"
```

### Task 12: `ManageShell` and `ManagePageFrame`

**Files:**
- Create: `components/manage/nav/ManageShell.tsx`, `components/manage/nav/ManagePageFrame.tsx`
- Test: `components/manage/nav/ManageShell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/manage/nav/ManageShell.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageShell } from '@/components/manage/nav/ManageShell';
import type { ManageNav } from '@/hooks/useManageNav';
import messages from '@/messages/en.json';

vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: { id: 'e1', title: 'Maria & Nikos', status: 'ACTIVE' }, eventId: 'e1', isHost: true }),
}));
vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));
vi.mock('@/components/manage/nav/ManageSidebar', () => ({ ManageSidebar: () => <div data-testid="sidebar" /> }));
vi.mock('@/components/manage/nav/ManageSectionList', () => ({ ManageSectionList: () => <div data-testid="section-list" /> }));
vi.mock('@/components/manage/nav/ManageSectionHeader', () => ({
    ManageSectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));
vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => <div data-testid="draft-back" /> }));

afterEach(cleanup);

function nav(overrides: Partial<ManageNav> = {}): ManageNav {
    return { eventId: 'e1', isDraft: false, groups: [], showDanger: false, ...overrides } as ManageNav;
}

function renderShell(active: Parameters<typeof ManageShell>[0]['active'], navOverrides: Partial<ManageNav> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageShell nav={nav(navOverrides)} active={active}>
                <p>content</p>
            </ManageShell>
        </NextIntlClientProvider>,
    );
}

describe('ManageShell', () => {
    it('on the Overview: event title, sidebar and the mobile section list, no header B', () => {
        renderShell('overview');
        expect(screen.getByRole('heading', { level: 1, name: 'Maria & Nikos' })).toBeInTheDocument();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('section-list')).toBeInTheDocument();
        expect(screen.queryByTestId('section-header')).toBeNull();
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('on any other page: header B with its title, no mobile section list', () => {
        renderShell('vendors');
        expect(screen.getByTestId('section-header')).toHaveTextContent('label:vendors');
        expect(screen.queryByTestId('section-list')).toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: 'label:vendors' })).toBeInTheDocument();
    });

    it('on a draft: no nav at all, and a way back to the events', () => {
        renderShell('overview', { isDraft: true });
        expect(screen.queryByTestId('sidebar')).toBeNull();
        expect(screen.queryByTestId('section-list')).toBeNull();
        expect(screen.getByTestId('draft-back')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `npx vitest run components/manage/nav/ManageShell.test.tsx`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implement `ManageShell`**

The header markup is today's `ManageScreen` header without the "Host Dashboard" line (Task 1, item 2) and without the switcher.

```tsx
// components/manage/nav/ManageShell.tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';
import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { BackButton } from '@/components/ui/BackButton';
import type { ManageNav } from '@/hooks/useManageNav';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import type { ManageNavKey, ManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

type ManageShellProps = {
    nav: ManageNav;
    active: ManageNavKey;
    // Given by the dashboard page itself, so its sections switch in place.
    onSelectSection?: (section: ManageSection) => void;
    children: ReactNode;
};

/**
 * The host dashboard's frame, shared by its sections and its own pages.
 * Desktop: event header, grouped sidebar and the page heading.
 * Small screens: the Overview keeps the event header and lists every entry below its
 * content; every other page gets header B in its place. A draft has no nav.
 */
export function ManageShell({ nav, active, onSelectSection, children }: ManageShellProps) {
    const { activeEvent } = useEventRouteContext();
    const t = useTranslations('ManagePage');
    const label = useManageSectionLabel();
    const showNav = !nav.isDraft;
    const onOverview = active === 'overview';
    const showSectionHeader = showNav && !onOverview;
    const backToOverview = useCallback(() => onSelectSection?.('overview'), [onSelectSection]);

    return (
        // A draft ends in its sticky pay bar on mobile, which has to reach the tab bar.
        <div className={cn('mx-auto w-full max-w-6xl', nav.isDraft ? 'lg:pb-10' : 'pb-10')}>
            {/* Section header (small screens) */}
            {showSectionHeader && (
                <ManageSectionHeader eventId={nav.eventId} title={label(active)} onSelectSection={onSelectSection ? backToOverview : undefined} />
            )}

            {/* Header */}
            <div
                className={cn(
                    'sticky top-0 z-20 border-b border-border/60 bg-event/95 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none',
                    showSectionHeader && 'hidden lg:block',
                )}
            >
                <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-5">
                    {/* Back (draft): it has no feed or sections to move to */}
                    {nav.isDraft && <BackButton variant="icon" href={routes.home} label={t('draft.backToEvents')} className="-ml-2" />}
                    <h1 className="min-w-0 flex-1 truncate text-lg leading-tight font-bold text-ink sm:text-xl lg:text-2xl">{activeEvent.title}</h1>
                    <span
                        className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap',
                            eventStatusBadgeTone[activeEvent.status],
                        )}
                    >
                        {t(`status.${activeEvent.status}`)}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pt-4 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-5">
                {/* Sections (desktop) */}
                {showNav && (
                    <ManageSidebar
                        eventId={nav.eventId}
                        groups={nav.groups}
                        showDanger={nav.showDanger}
                        active={active}
                        onSelectSection={onSelectSection}
                        className="sticky top-6 hidden self-start lg:flex"
                    />
                )}

                <div
                    className={cn(
                        'min-w-0',
                        nav.isDraft && 'flex min-h-[60svh] flex-col justify-center lg:col-span-2 lg:min-h-0 lg:max-w-4xl lg:justify-start',
                    )}
                >
                    {/* Page heading (desktop) */}
                    {showNav && <h2 className="mb-4 hidden text-sm font-bold tracking-wide text-ink-muted uppercase lg:block">{label(active)}</h2>}

                    {children}

                    {/* Sections (small screens): the Overview is the menu */}
                    {showNav && onOverview && (
                        <ManageSectionList
                            eventId={nav.eventId}
                            groups={nav.groups}
                            showDanger={nav.showDanger}
                            onSelectSection={onSelectSection}
                            className="mt-8 lg:hidden"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
```

`backToOverview` keeps header B's back button in place. `ManageSectionHeader` passes `'overview'`, but the wrapper makes that explicit and stable.

- [ ] **Step 4: Implement `ManagePageFrame`**

```tsx
// components/manage/nav/ManagePageFrame.tsx
'use client';

import type { ReactNode } from 'react';

import { ManageShell } from '@/components/manage/nav/ManageShell';
import { useManageNav } from '@/hooks/useManageNav';
import type { ManagePage } from '@/lib/manageSections';

/** A dashboard page with its own route (Share links, Vendors), inside the dashboard's frame. */
export function ManagePageFrame({ active, children }: { active: ManagePage; children: ReactNode }) {
    const nav = useManageNav();

    return (
        <ManageShell nav={nav} active={active}>
            <div className="max-w-2xl">{children}</div>
        </ManageShell>
    );
}
```

- [ ] **Step 5: Run the test and make sure it passes**

Run: `npx vitest run components/manage/nav/ManageShell.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add components/manage/nav/ManageShell.tsx components/manage/nav/ManagePageFrame.tsx components/manage/nav/ManageShell.test.tsx
git commit -m "KAN-223: ManageShell, the shared dashboard frame"
```

### Task 13: `ManageScreen` uses the shell; the switcher goes

**Files:**
- Modify: `components/manage/ManageScreen.tsx`, `hooks/useRightContextPanel.ts`, `messages/en.json`, `messages/el.json`
- Delete: `components/manage/ManageSectionNav.tsx`

- [ ] **Step 1: Replace the top of `ManageScreen`**

**Imports:**
- Remove `ChevronDown`, `LayoutDashboard`, `useSearchParams`, `useCallback`, `ManageSectionNav`/`sectionIcons`, `BackButton`, `Modal` and `useGiftSection`.
- Remove `useManageSectionLabel`, `isEventDeleted`, `isModuleAvailable`, `isPrimaryHost`, `canPickTheme`, `offersOnlineInvitation` and `isLiteEvent`.
- Remove the `lib/manageSections` imports, `replacePageUrl`, `routes`, `eventStatusBadgeTone`, `cn` and `useActiveMember`.
- Add:

```tsx
import { ManageShell } from '@/components/manage/nav/ManageShell';
import { useManageNav } from '@/hooks/useManageNav';
import { useManageSectionRoute } from '@/hooks/useManageSectionRoute';
```

**Body:** replace everything from `const { activeEvent, eventId, isHost } = useEventRouteContext();` down to `const [switcherOpen, setSwitcherOpen] = useState(false);` with:

```tsx
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const nav = useManageNav();
    const { isDraft, isDeleted, canDelete, rsvpAvailable, giftSection } = nav;
    const { section, navigateToSection, cancelledCheckout } = useManageSectionRoute({
        eventId,
        isDraft,
        isDeleted,
        visibleSections: nav.visibleSections,
        pendingSections: giftSection.isLoading ? ['gift'] : [],
    });
    const { data: appConfig } = useAppConfig();
```

Delete these from the body:
- `navigateToSection` and its `useCallback`
- `openSwitcher` and `closeSwitcher`
- the `useEffect` that calls `replacePageUrl` (it now lives in `useManageSectionRoute`)
- `const ActiveIcon = …`

Keep the data hooks, `daysToGo` and its effect, `seatsClaimed`, the `isDeleted` early return and `renderedSection` exactly as they are.

- [ ] **Step 2: Replace the returned JSX**

Replace the whole `return ( … );` with:

```tsx
    return (
        <ManageShell nav={nav} active={section} onSelectSection={navigateToSection}>
            {renderedSection}
        </ManageShell>
    );
```

- [ ] **Step 3: Delete the old nav and the switcher's label**

```bash
git rm components/manage/ManageSectionNav.tsx
```

In `messages/en.json` and `messages/el.json`, delete `ManagePage.sectionSwitcher` (Task 1, item 5).

Run: `git grep -n "sectionSwitcher\|ManageSectionNav\|sectionIcons" -- "*.ts" "*.tsx"`
Expected: no output.

- [ ] **Step 4: Don't list Vendors twice on the Overview**

Vendors is now in the nav, so the Overview's host actions leave it out the way they leave out the dashboard link. In `hooks/useRightContextPanel.ts` (the line changed in Task 3), make it:

```ts
    if (!includeManageLinks) hostItemsForActions = hostItemsForActions.filter((item) => item.key !== 'manage' && item.key !== 'vendors');
```

Update the comment above it: on the manage page itself, "Manage" would link to the page you are on, and "Vendors" is already in its nav.

- [ ] **Step 5: Run everything that touches the dashboard**

Run: `npx vitest run components/manage hooks lib/manageSections.test.ts "app/(main)/(app)/(event)/events/[eventId]/manage"`
Expected: PASS.
Run: `npx tsc --noEmit && npx eslint components/manage hooks lib`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A components/manage hooks/useRightContextPanel.ts messages
git commit -m "KAN-223: the dashboard uses the grouped nav and header B"
```

### Task 14: Share links and Vendors inside the dashboard

**Files:**
- Modify: `components/manage/invitations/InvitationsQrScreen.tsx`, `components/vendors/manage/ManageVendorsScreen.tsx`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Share links**

In `InvitationsQrScreen.tsx`:

- Lift the subtitle into a constant above `return`:

```tsx
    // The join code also uploads when the plan has photo uploads (KAN-208).
    const subtitle = isGalleryQrFeatureEnabled(activeEvent?.modules) ? tPage('subtitleWithUpload') : tPage('subtitle');
```

- Move the JSX between `<ModulePageShell …>` and `</ModulePageShell>`, starting at `{isLoading ? (<QrLinksListSkeleton />) : (<> … </>)}`, into `const content = ( … );`, unchanged.
- Return:

```tsx
    // Hosts see their links inside the dashboard; a planner (QR_READ) keeps the standalone page.
    if (isHost) {
        return (
            <ManagePageFrame active="shareLinks">
                <p className="mb-6 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
                {content}
            </ManagePageFrame>
        );
    }

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={tPage('title')}
            icon={QrCode}
            backLabel={tPage('back')}
            backHref={routes.events.feed(eventId)}
            subtitle={subtitle}
        >
            {content}
        </ModulePageShell>
    );
```

- Add `import { ManagePageFrame } from '@/components/manage/nav/ManagePageFrame';`.

- [ ] **Step 2: Vendors**

`ManageVendorsScreen` is host-only (its route gate has `requireHost`).
- Replace `<ModulePageShell maxWidth="2xl" title={t('manage.title')} icon={Store} backLabel={t('manage.back')} backHref={routes.events.feed(eventId)}>` with `<ManagePageFrame active="vendors">`, and the matching closing tag with `</ManagePageFrame>`.
- Remove the `ModulePageShell` and `Store` imports, plus `routes` and `eventId` if nothing else in the file uses them.
- Add the `ManagePageFrame` import.

Then check whether anything else still reads the back key:

Run: `git grep -n "manage.back\|t('back')" -- components/vendors`

If the result is empty, delete `Vendors.manage.back` from both message files (Task 1, item 6).

- [ ] **Step 3: Run the page tests**

Run: `npx vitest run components/manage/invitations "app/(main)/(app)/(event)/events/[eventId]/manage/qr" "app/(main)/(app)/(event)/events/[eventId]/manage/vendors" components/vendors`
Expected: PASS.

If `InvitationsQrScreen.test.tsx` now fails because `useManageNav` is missing context, add this to its mocks:

```tsx
vi.mock('@/components/manage/nav/ManagePageFrame', () => ({ ManagePageFrame: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
```

Do the same in the vendors test if it fails for the same reason.

- [ ] **Step 4: Commit**

```bash
git add components/manage/invitations components/vendors messages
git commit -m "KAN-223: Share links and Vendors open inside the dashboard"
```

### Task 15: Stories for the visual check

**Files:**
- Create: `components/manage/nav/ManageSidebar.stories.tsx`, `components/manage/nav/ManageSectionList.stories.tsx`, `components/manage/nav/ManageSectionHeader.stories.tsx`

- [ ] **Step 1: Write the stories**

```tsx
// components/manage/nav/ManageSidebar.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import type { ManageNavGroup } from '@/lib/manageSections';

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing'] },
    { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
];

const meta = {
    title: 'Manage/Nav/ManageSidebar',
    component: ManageSidebar,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="w-56 bg-event p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['visual-desktop-only'],
    globals: { viewport: { value: 'desktop' } },
    args: { eventId: STORY_EVENT_ID, groups, showDanger: true, active: 'settings', onSelectSection: fn() },
} satisfies Meta<typeof ManageSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryHost: Story = {};

export const CoHost: Story = { args: { showDanger: false, active: 'vendors' } };
```

```tsx
// components/manage/nav/ManageSectionList.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import type { ManageNavGroup } from '@/lib/manageSections';

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'theme', 'billing'] },
    { key: 'people', items: ['rsvp', 'invitation', 'shareLinks', 'members', 'vendors'] },
];

const meta = {
    title: 'Manage/Nav/ManageSectionList',
    component: ManageSectionList,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="bg-event p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { eventId: STORY_EVENT_ID, groups, showDanger: true, onSelectSection: fn() },
} satisfies Meta<typeof ManageSectionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryHost: Story = {};

// A lite event: no People entries, no Danger zone for a co-host.
export const LiteCoHost: Story = { args: { groups: [{ key: 'event', items: ['overview', 'settings', 'billing'] }], showDanger: false } };
```

```tsx
// components/manage/nav/ManageSectionHeader.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { STORY_EVENT_ID } from '@/.storybook/fixtures';
import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';

const meta = {
    title: 'Manage/Nav/ManageSectionHeader',
    component: ManageSectionHeader,
    tags: ['visual-mobile-only'],
    globals: { viewport: { value: 'mobile' } },
    args: { eventId: STORY_EVENT_ID, title: 'Members', onSelectSection: fn() },
} satisfies Meta<typeof ManageSectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The longest existing entry name wraps onto two lines.
export const LongTitle: Story = { args: { title: 'Given as a gift' } };
```

These stories pass titles as fixed English props, which is enough for a layout check. If the visual check needs the Greek names, read them with `copyFor(globals)` instead.

- [ ] **Step 2: Lint the stories**

Run: `npx eslint components/manage/nav`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/manage/nav/*.stories.tsx
git commit -m "KAN-223: stories for the dashboard nav"
```

### Task 16: Full checks and a look in the browser

- [ ] **Step 1: Every automated check**

Run: `npx tsc --noEmit`, then `npx eslint .`, then `npx vitest run`.
Expected: all clean.
If the known save-my-date vitest timeouts appear (memory `release-2026-11-15-prs.md`), rerun those files on their own and note them in the PR.

- [ ] **Step 2: See it signed in**

Follow these memory notes:
- `dev-server-shared-next-cache.md`: only use `preview_start {url: "http://localhost:3000/"}`.
- `local-backend-cors-port-3000.md` and `browser-pane-cant-check-signed-in-ui.md`: ask the owner for the local test login.

Check each case at 375px and at 1280px:

| Case | Expect |
|---|---|
| Overview, primary host | Desktop: sidebar groups Event / People, Danger zone last below a divider. Mobile: setup steps, then the list by group, Danger zone last. |
| Tap Members on mobile | Header B "‹ Overview" + "Members", the page starts at the top. "‹ Overview" returns without a reload. |
| Share links and Vendors | Inside the dashboard, with the entry marked in the sidebar. Header B on mobile. |
| Co-host | No Danger zone. |
| Lite event | No Share links. |
| Draft event | Overview only, no nav, the back button to events. |
| Deleted event | Unchanged deletion screen. |
| `?tab=help` | Lands on the Overview and the URL drops `?tab=help`. |
| Event menu (gear) on mobile | No Help entry. |

- [ ] **Step 3: Undo the dev server's AGENTS.md edit** (memory `next-dev-edits-agents-md.md`)

Run: `git checkout -- AGENTS.md && git status --short`
Expected: nothing unexpected.

### Task 17: Pull request

- [ ] **Step 1: Bring the branch up to date and push**

```bash
git fetch origin staging
git merge origin/staging
git push -u origin claude/kan-223-host-dashboard-navigation
```

- [ ] **Step 2: Open the PR into staging**

Title: `KAN-223: Host dashboard navigation`. The body covers:
- what changed for hosts on mobile and desktop;
- the wording approved in Task 1, with old → new for each item;
- the browser check results from Task 16;
- "SEO: no public route changes (dashboard pages only)";
- "Visual check: new Manage/Nav stories; dashboard snapshots will change".

Name only KAN-223 in the body. End it with the attribution line.

- [ ] **Step 3: Follow up**

- Bind the PR with the ccd_pr tools.
- If the visual check is red, send the owner the report link and wait. Never approve it yourself.
