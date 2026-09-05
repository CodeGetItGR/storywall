# Help Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating "?" host onboarding wizard with a passive, always-reachable "Help" section on the host management page (vertical narrative, no stepper), plus a shortcut to it in the MobileTabBar gear menu.

**Architecture:** `help` becomes a new flat entry in the existing `ManageSection` system (`lib/manageSections.ts` → `ManageSectionNav` → `ManageScreen`), rendered by a new `HelpTab.tsx` built from two small presentational blocks. The old wizard (`HostOnboardingWizard`, `useOnboardingProgress`, `lib/onboardingSteps.ts`, the `components/onboarding/` tree, and the checkout-success "remember to show the guide" prompt) is deleted outright — nothing replaces its trigger/progress logic, since the new Help page is just a page you visit.

**Tech Stack:** Next.js App Router, React, next-intl, vitest (unit tests for the two pure-logic touch points: `lib/manageSections.ts` and `lib/routes.ts`).

---

## Reference: current vs. new translation keys

Existing `HostOnboarding` namespace (in `messages/en.json` / `messages/el.json`) keeps its
`welcome`, `dashboard`, `venue`, `invite`, `tools`, `done.title`, `done.body` keys unchanged —
`HelpTab` reads them as-is. The stepper-only keys (`close`, `reopen`, `back`, `skip`, `continue`,
`checkoutGuide`, `done.close`) are removed since there's no stepper anymore.

New keys added: `ManagePage.sections.help` and `MobileTabBar.hostMenu.help.{label,description}`.

---

### Task 1: Add `help` as a manage section

**Files:**
- Modify: `lib/manageSections.ts`
- Modify: `components/manage/ManageSectionNav.tsx:1-19`
- Modify: `lib/routes.ts:7`
- Test: `lib/manageSections.test.ts` (new)
- Test: `lib/routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/manageSections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isBillingSection, manageSectionGroups, parseManageSection } from '@/lib/manageSections';

describe('manageSections', () => {
    it('places help in the event group, after settings and before danger', () => {
        const eventGroup = manageSectionGroups.find((entry) => entry.group === 'event');
        expect(eventGroup?.sections).toEqual(['overview', 'settings', 'help', 'danger']);
    });

    it('parseManageSection resolves "help"', () => {
        expect(parseManageSection('help')).toBe('help');
    });

    it('help is not a billing section', () => {
        expect(isBillingSection('help')).toBe(false);
    });
});
```

Add one case to the existing `lib/routes.test.ts` (append inside the existing `describe` block, after the `manage()` test):

```ts
    it('manage() with a tab param includes it in the query string', () => {
        expect(routes.events.manage('real-event-id', { tab: 'help' })).toBe('/events/real-event-id/manage?tab=help');
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/manageSections.test.ts lib/routes.test.ts`
Expected: FAIL — `lib/manageSections.test.ts` fails to import (`help` isn't a valid section / module has no such export behavior), and the new `routes.test.ts` case fails type-check because `'help'` isn't a valid `ManageTab`.

- [ ] **Step 3: Add `help` to the section list and route type**

In `lib/manageSections.ts`, change:

```ts
export type ManageSection = 'overview' | 'settings' | 'danger' | 'rsvp' | 'invitations' | 'plan' | 'coverage' | 'orders';
```

to:

```ts
export type ManageSection = 'overview' | 'settings' | 'help' | 'danger' | 'rsvp' | 'invitations' | 'plan' | 'coverage' | 'orders';
```

and change:

```ts
    { group: 'event', sections: ['overview', 'settings', 'danger'] },
```

to:

```ts
    { group: 'event', sections: ['overview', 'settings', 'help', 'danger'] },
```

In `components/manage/ManageSectionNav.tsx`, add the icon (keep alphabetical-by-appearance order matching `ManageSection`) — change:

```ts
import { CreditCard, LayoutDashboard, type LucideIcon, Receipt, Settings, ShieldCheck, Ticket, Trash2, Users } from 'lucide-react';
```

to:

```ts
import { CreditCard, HelpCircle, LayoutDashboard, type LucideIcon, Receipt, Settings, ShieldCheck, Ticket, Trash2, Users } from 'lucide-react';
```

and change:

```ts
export const sectionIcons: Record<ManageSection, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    danger: Trash2,
```

to:

```ts
export const sectionIcons: Record<ManageSection, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    help: HelpCircle,
    danger: Trash2,
```

In `lib/routes.ts`, change:

```ts
export type ManageTab = 'billing' | 'coverage' | 'danger' | 'invitations' | 'orders' | 'overview' | 'plan' | 'rsvp' | 'settings';
```

to:

```ts
export type ManageTab = 'billing' | 'coverage' | 'danger' | 'help' | 'invitations' | 'orders' | 'overview' | 'plan' | 'rsvp' | 'settings';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/manageSections.test.ts lib/routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/manageSections.ts lib/manageSections.test.ts lib/routes.ts lib/routes.test.ts components/manage/ManageSectionNav.tsx
git commit -m "feat: add help manage section"
```

---

### Task 2: Translations

**Files:**
- Modify: `messages/en.json:1655-1704` (`HostOnboarding`), `:865-875` (`ManagePage.sections`), `:166-171` (`MobileTabBar.hostMenu`)
- Modify: `messages/el.json` (same three spots — line numbers may drift slightly, match by key path)

No tests — plain JSON content, verified by the app running with real copy in Task 6.

- [ ] **Step 1: Trim `HostOnboarding` down to the content-only keys, in `messages/en.json`**

Replace:

```json
    "HostOnboarding": {
        "close": "Close",
        "reopen": "Open guide",
        "back": "Back",
        "skip": "Skip",
        "continue": "Continue",
        "checkoutGuide": "Set up your event",
        "welcome": {
            "title": "Welcome! Let's set up {eventTitle}",
            "body": "A few quick steps to get things ready for your guests."
        },
```

with:

```json
    "HostOnboarding": {
        "welcome": {
            "title": "Welcome! Let's set up {eventTitle}",
            "body": "A few quick steps to get things ready for your guests."
        },
```

and replace:

```json
        "done": {
            "title": "You're all set",
            "body": "You can always come back and change things later.",
            "close": "Let's go"
        }
    },
    "GiftsPage": {
```

with:

```json
        "done": {
            "title": "You're all set",
            "body": "You can always come back and change things later."
        }
    },
    "GiftsPage": {
```

- [ ] **Step 2: Same trim in `messages/el.json`**

Replace:

```json
    "HostOnboarding": {
        "close": "Κλείσιμο",
        "reopen": "Άνοιγμα οδηγού",
        "back": "Πίσω",
        "skip": "Παράλειψη",
        "continue": "Συνέχεια",
        "checkoutGuide": "Ρύθμισε την εκδήλωσή σου",
        "welcome": {
            "title": "Καλωσόρισες! Ας ετοιμάσουμε το {eventTitle}",
            "body": "Λίγα βήματα ακόμα για να είναι όλα έτοιμα για τους καλεσμένους σου."
        },
```

with:

```json
    "HostOnboarding": {
        "welcome": {
            "title": "Καλωσόρισες! Ας ετοιμάσουμε το {eventTitle}",
            "body": "Λίγα βήματα ακόμα για να είναι όλα έτοιμα για τους καλεσμένους σου."
        },
```

and replace:

```json
        "done": {
            "title": "Όλα έτοιμα",
            "body": "Μπορείς πάντα να επιστρέψεις και να τα αλλάξεις αργότερα.",
            "close": "Ας ξεκινήσουμε"
        }
    },
    "GiftsPage": {
```

with:

```json
        "done": {
            "title": "Όλα έτοιμα",
            "body": "Μπορείς πάντα να επιστρέψεις και να τα αλλάξεις αργότερα."
        }
    },
    "GiftsPage": {
```

- [ ] **Step 3: Add `ManagePage.sections.help` in `messages/en.json`**

Replace:

```json
        "sections": {
            "overview": "Overview",
            "settings": "Settings",
            "danger": "Danger zone",
```

with:

```json
        "sections": {
            "overview": "Overview",
            "settings": "Settings",
            "help": "Help",
            "danger": "Danger zone",
```

- [ ] **Step 4: Add `ManagePage.sections.help` in `messages/el.json`**

Replace:

```json
        "sections": {
            "overview": "Επισκόπηση",
            "settings": "Ρυθμίσεις",
            "danger": "Ζώνη κινδύνου",
```

with:

```json
        "sections": {
            "overview": "Επισκόπηση",
            "settings": "Ρυθμίσεις",
            "help": "Βοήθεια",
            "danger": "Ζώνη κινδύνου",
```

- [ ] **Step 5: Add `MobileTabBar.hostMenu.help` in `messages/en.json`**

Replace:

```json
        "hostMenu": {
            "manage": {
                "label": "Dashboard",
                "description": "Overview of your event"
            }
        },
```

with:

```json
        "hostMenu": {
            "manage": {
                "label": "Dashboard",
                "description": "Overview of your event"
            },
            "help": {
                "label": "Help",
                "description": "Setup guide and tips"
            }
        },
```

- [ ] **Step 6: Add `MobileTabBar.hostMenu.help` in `messages/el.json`**

Replace:

```json
        "hostMenu": {
            "manage": {
                "label": "Πίνακας",
                "description": "Επισκόπηση της εκδήλωσης"
            }
        },
```

with:

```json
        "hostMenu": {
            "manage": {
                "label": "Πίνακας",
                "description": "Επισκόπηση της εκδήλωσης"
            },
            "help": {
                "label": "Βοήθεια",
                "description": "Οδηγός ρύθμισης και συμβουλές"
            }
        },
```

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "feat: add and trim translations for the help section"
```

---

### Task 3: `HelpInfoBlock` and `HelpLinksBlock` components

**Files:**
- Create: `components/manage/help/HelpInfoBlock.tsx`
- Create: `components/manage/help/HelpLinksBlock.tsx`

These replace `components/onboarding/steps/OnboardingInfoStep.tsx` and
`OnboardingLinksStep.tsx` — same visuals, minus the `onNavigate`/`onLinkClick` props that used
to close the modal (there's no modal to close now, so links are just plain navigation).

No unit tests — purely presentational, verified visually in Task 6.

- [ ] **Step 1: Create `components/manage/help/HelpInfoBlock.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface HelpInfoBlockProps {
    icon: LucideIcon;
    title: string;
    body: string;
    linkHref?: string;
    linkLabel?: string;
}

export function HelpInfoBlock({ icon: Icon, title, body, linkHref, linkLabel }: HelpInfoBlockProps) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
                <Icon className="h-8 w-8 text-primary-dark" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
            {linkHref && linkLabel && (
                <Link href={linkHref} className="text-sm font-semibold text-primary hover:underline">
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Create `components/manage/help/HelpLinksBlock.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface HelpLinkItem {
    key: string;
    icon: LucideIcon;
    iconClassName: string;
    href: string;
    label: string;
}

interface HelpLinksBlockProps {
    title: string;
    body: string;
    items: HelpLinkItem[];
}

export function HelpLinksBlock({ title, body, items }: HelpLinksBlockProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary/30 hover:bg-primary-light/20"
                        >
                            <Icon className={cn('h-5 w-5 shrink-0', item.iconClassName)} aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add components/manage/help/HelpInfoBlock.tsx components/manage/help/HelpLinksBlock.tsx
git commit -m "feat: add HelpInfoBlock and HelpLinksBlock presentational components"
```

---

### Task 4: `HelpTab.tsx` and wiring into `ManageScreen`

**Files:**
- Create: `app/(app)/(event)/events/[eventId]/manage/HelpTab.tsx`
- Modify: `components/manage/ManageScreen.tsx:25-30` (imports), `:145-149` (render)

- [ ] **Step 1: Create `app/(app)/(event)/events/[eventId]/manage/HelpTab.tsx`**

```tsx
import { BookHeart, Calendar, Gift, Images, MapPin, Music, PartyPopper, Settings, Sparkles, UserPlus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HelpInfoBlock } from '@/components/manage/help/HelpInfoBlock';
import { HelpLinksBlock } from '@/components/manage/help/HelpLinksBlock';
import type { EventModuleResponseDto, EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { routes } from '@/lib/routes';

export default function HelpTab({
    eventId,
    eventTitle,
    eventType,
    sessions,
    eventModules,
}: {
    eventId: string;
    eventTitle: string;
    eventType: EventTypeConvention;
    sessions: EventSessionResponseDto[];
    eventModules: EventModuleResponseDto[];
}) {
    const t = useTranslations('HostOnboarding');

    const hasVenueConvention = Boolean(getCreateEventCatalogEntry(eventType)?.secondarySessionTitleKey);
    const hasVenue = sessions.some((session) => session.isSecondary && !session.deletedAt);

    const enabledModuleKeys = new Set(
        eventModules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey)
    );
    const toolCatalog = [
        { moduleKey: null, icon: Calendar, iconClassName: 'text-amber-500', href: routes.events.tools.schedule(eventId), labelKey: 'schedule' },
        { moduleKey: 'rsvp', icon: Users, iconClassName: 'text-emerald-500', href: routes.events.tools.rsvp(eventId), labelKey: 'rsvp' },
        { moduleKey: 'gallery', icon: Images, iconClassName: 'text-cyan-600', href: routes.events.tools.gallery(eventId), labelKey: 'gallery' },
        { moduleKey: 'playlist', icon: Music, iconClassName: 'text-violet-500', href: routes.events.tools.playlist(eventId), labelKey: 'playlist' },
        { moduleKey: 'wishbook', icon: BookHeart, iconClassName: 'text-rose-500', href: routes.events.tools.wishbook(eventId), labelKey: 'wishbook' },
        { moduleKey: 'wishlist', icon: Gift, iconClassName: 'text-rose-500', href: routes.events.tools.gifts(eventId), labelKey: 'gifts' },
    ] as const;
    const toolItems = toolCatalog
        .filter((entry) => entry.moduleKey === null || enabledModuleKeys.has(entry.moduleKey))
        .map((entry) => ({
            key: entry.labelKey,
            icon: entry.icon,
            iconClassName: entry.iconClassName,
            href: entry.href,
            label: t(`tools.items.${entry.labelKey}`),
        }));

    return (
        <div className="flex flex-col gap-10 pb-6">
            {/* Welcome */}
            <HelpInfoBlock icon={PartyPopper} title={t('welcome.title', { eventTitle })} body={t('welcome.body')} />

            {/* Dashboard */}
            <HelpLinksBlock
                title={t('dashboard.title')}
                body={t('dashboard.body')}
                items={[
                    {
                        key: 'settings',
                        icon: Settings,
                        iconClassName: 'text-slate-500',
                        href: routes.events.manage(eventId, { tab: 'settings' }),
                        label: t('dashboard.items.settings'),
                    },
                    {
                        key: 'schedule',
                        icon: Calendar,
                        iconClassName: 'text-amber-500',
                        href: routes.events.tools.schedule(eventId),
                        label: t('dashboard.items.schedule'),
                    },
                ]}
            />

            {/* Venue */}
            {hasVenueConvention && (
                <HelpInfoBlock
                    icon={MapPin}
                    title={t(hasVenue ? 'venue.readyTitle' : 'venue.askTitle')}
                    body={t(hasVenue ? 'venue.readyBody' : 'venue.askBody')}
                    linkHref={routes.events.tools.schedule(eventId, { section: 'venue-session' })}
                    linkLabel={t(hasVenue ? 'venue.edit' : 'venue.add')}
                />
            )}

            {/* Invite */}
            <HelpInfoBlock
                icon={UserPlus}
                title={t('invite.title')}
                body={t('invite.body')}
                linkHref={routes.events.manage(eventId, { tab: 'invitations', section: 'qr' })}
                linkLabel={t('invite.link')}
            />

            {/* Tools */}
            <HelpLinksBlock title={t('tools.title')} body={t('tools.body')} items={toolItems} />

            {/* Done */}
            <HelpInfoBlock icon={Sparkles} title={t('done.title')} body={t('done.body')} />
        </div>
    );
}
```

- [ ] **Step 2: Wire it into `ManageScreen.tsx`**

Change the tab imports:

```ts
import BillingTab from '../../app/(app)/(event)/events/[eventId]/manage/BillingTab';
import DangerZoneTab from '../../app/(app)/(event)/events/[eventId]/manage/DangerZoneTab';
import InvitationsTab from '../../app/(app)/(event)/events/[eventId]/manage/InvitationsTab';
import OverviewTab from '../../app/(app)/(event)/events/[eventId]/manage/OverviewTab';
import RsvpTab from '../../app/(app)/(event)/events/[eventId]/manage/RsvpTab';
import SettingsTab from '../../app/(app)/(event)/events/[eventId]/manage/SettingsTab';
```

to:

```ts
import BillingTab from '../../app/(app)/(event)/events/[eventId]/manage/BillingTab';
import DangerZoneTab from '../../app/(app)/(event)/events/[eventId]/manage/DangerZoneTab';
import HelpTab from '../../app/(app)/(event)/events/[eventId]/manage/HelpTab';
import InvitationsTab from '../../app/(app)/(event)/events/[eventId]/manage/InvitationsTab';
import OverviewTab from '../../app/(app)/(event)/events/[eventId]/manage/OverviewTab';
import RsvpTab from '../../app/(app)/(event)/events/[eventId]/manage/RsvpTab';
import SettingsTab from '../../app/(app)/(event)/events/[eventId]/manage/SettingsTab';
```

Change the render block:

```tsx
            {section === 'settings' && <SettingsTab event={activeEvent} canWrite={canEditDetails} canUploadCover={canWrite} />}

            {section === 'danger' && <DangerZoneTab event={activeEvent} />}
```

to:

```tsx
            {section === 'settings' && <SettingsTab event={activeEvent} canWrite={canEditDetails} canUploadCover={canWrite} />}

            {section === 'help' && (
                <HelpTab
                    eventId={eventId}
                    eventTitle={activeEvent.title}
                    eventType={activeEvent.eventType}
                    sessions={activeEvent.sessions}
                    eventModules={activeEvent.modules}
                />
            )}

            {section === 'danger' && <DangerZoneTab event={activeEvent} />}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/manage/HelpTab.tsx" components/manage/ManageScreen.tsx
git commit -m "feat: add HelpTab and wire it into the manage screen"
```

---

### Task 5: Gear menu shortcut

**Files:**
- Modify: `hooks/useToolsMenuItems.ts:1-68`
- Modify: `components/layout/MobileTabBar.tsx:49-58`

- [ ] **Step 1: Add the `help` entry to `useHostMenuItems`**

Change the import line:

```ts
import { BookHeart, CalendarCheck, CalendarDays, Gift, Images, LayoutDashboard, type LucideIcon } from 'lucide-react';
```

to:

```ts
import { BookHeart, CalendarCheck, CalendarDays, Gift, HelpCircle, Images, LayoutDashboard, type LucideIcon } from 'lucide-react';
```

Change:

```ts
    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
    ];
```

to:

```ts
    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'help', href: routes.events.manage(activeEvent.id, { tab: 'help' }), icon: HelpCircle },
    ];
```

- [ ] **Step 2: Hide the `help` gear-menu item for draft events in `MobileTabBar.tsx`**

Change:

```tsx
    const contextItems: ContextNavItem[] =
        showEventNavigation && activeEvent
            ? isHost
                ? [
                      ...hostItems,
                      // Hosts answer RSVPs from the dashboard's RSVP section, not the guest self-RSVP tool.
                      ...(isDraft ? [] : toolItems.filter((item) => item.key !== 'rsvp')),
                  ]
                : toolItems
            : [];
```

to:

```tsx
    const contextItems: ContextNavItem[] =
        showEventNavigation && activeEvent
            ? isHost
                ? [
                      // Help links into the manage page's Help section, which is hidden for draft events.
                      ...(isDraft ? hostItems.filter((item) => item.key !== 'help') : hostItems),
                      // Hosts answer RSVPs from the dashboard's RSVP section, not the guest self-RSVP tool.
                      ...(isDraft ? [] : toolItems.filter((item) => item.key !== 'rsvp')),
                  ]
                : toolItems
            : [];
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useToolsMenuItems.ts components/layout/MobileTabBar.tsx
git commit -m "feat: add Help shortcut to the MobileTabBar gear menu"
```

---

### Task 6: Remove the old wizard

**Files:**
- Delete: `components/onboarding/HostOnboardingWizard.tsx`
- Delete: `components/onboarding/OnboardingStepIcon.tsx`
- Delete: `components/onboarding/steps/OnboardingInfoStep.tsx`
- Delete: `components/onboarding/steps/OnboardingLinksStep.tsx`
- Delete: `components/onboarding/steps/OnboardingToolsStep.tsx`
- Delete: `components/onboarding/steps/OnboardingVenueStep.tsx`
- Delete: `hooks/useOnboardingProgress.ts`
- Delete: `lib/onboardingSteps.ts`
- Modify: `components/layout/AppShell.tsx:6-42`
- Modify: `app/(app)/(event)/events/[eventId]/checkout/success/page.tsx:12`, `:53-66`
- Modify: `lib/billing.ts:12-14`, `:71-84`

- [ ] **Step 1: Delete the onboarding component tree and its hook/lib**

```bash
git rm components/onboarding/HostOnboardingWizard.tsx
git rm components/onboarding/OnboardingStepIcon.tsx
git rm components/onboarding/steps/OnboardingInfoStep.tsx
git rm components/onboarding/steps/OnboardingLinksStep.tsx
git rm components/onboarding/steps/OnboardingToolsStep.tsx
git rm components/onboarding/steps/OnboardingVenueStep.tsx
git rm hooks/useOnboardingProgress.ts
git rm lib/onboardingSteps.ts
```

(This empties `components/onboarding/`; the directory itself is removed automatically once it has no tracked files.)

- [ ] **Step 2: Remove the wizard from `AppShell.tsx`**

Change:

```tsx
import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DesktopNavRail, MobileTabBar } from '@/components/layout';
import { HostOnboardingWizard } from '@/components/onboarding/HostOnboardingWizard';
import { useAuth } from '@/hooks/useAuth';
```

to:

```tsx
import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DesktopNavRail, MobileTabBar } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
```

Change:

```tsx
            <MobileTabBar />
            <HostOnboardingWizard />
        </div>
```

to:

```tsx
            <MobileTabBar />
        </div>
```

- [ ] **Step 3: Remove the checkout-success prompt call**

In `app/(app)/(event)/events/[eventId]/checkout/success/page.tsx`, change:

```tsx
import { clearPendingCheckout, readPendingCheckout, rememberCheckoutSetupPrompt } from '@/lib/billing';
```

to:

```tsx
import { clearPendingCheckout, readPendingCheckout } from '@/lib/billing';
```

Change:

```tsx
    useEffect(() => {
        if (!paid) return;

        rememberCheckoutSetupPrompt(eventId);
        const redirectTimer = window.setTimeout(() => router.replace(feedHref), REDIRECT_SECONDS * 1000);
        const countdownTimer = window.setInterval(() => {
            setSecondsRemaining((current) => Math.max(current - 1, 0));
        }, 1000);

        return () => {
            window.clearTimeout(redirectTimer);
            window.clearInterval(countdownTimer);
        };
    }, [eventId, feedHref, paid, router]);
```

to:

```tsx
    useEffect(() => {
        if (!paid) return;

        const redirectTimer = window.setTimeout(() => router.replace(feedHref), REDIRECT_SECONDS * 1000);
        const countdownTimer = window.setInterval(() => {
            setSecondsRemaining((current) => Math.max(current - 1, 0));
        }, 1000);

        return () => {
            window.clearTimeout(redirectTimer);
            window.clearInterval(countdownTimer);
        };
    }, [feedHref, paid, router]);
```

- [ ] **Step 4: Remove the now-unused functions from `lib/billing.ts`**

Change:

```ts
function pendingCheckoutKey(eventId: string): string {
    return `storywall.pendingCheckout.${eventId}`;
}

function checkoutSetupPromptKey(eventId: string): string {
    return `storywall.checkoutSetupPrompt.${eventId}`;
}
```

to:

```ts
function pendingCheckoutKey(eventId: string): string {
    return `storywall.pendingCheckout.${eventId}`;
}
```

Change:

```ts
export function clearPendingCheckout(eventId: string): void {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(pendingCheckoutKey(eventId));
}

export function rememberCheckoutSetupPrompt(eventId: string): void {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem(checkoutSetupPromptKey(eventId), '1');
}

export function consumeCheckoutSetupPrompt(eventId: string): boolean {
    if (typeof window === 'undefined') return false;

    const key = checkoutSetupPromptKey(eventId);
    const shouldShow = window.sessionStorage.getItem(key) === '1';
    window.sessionStorage.removeItem(key);
    return shouldShow;
}

export function navigateToCheckout(eventId: string, checkout: CheckoutResponseDto, planTierCode?: string | null): void {
```

to:

```ts
export function clearPendingCheckout(eventId: string): void {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(pendingCheckoutKey(eventId));
}

export function navigateToCheckout(eventId: string, checkout: CheckoutResponseDto, planTierCode?: string | null): void {
```

- [ ] **Step 5: Search for stale references**

Run: `grep -rn "HostOnboardingWizard\|useOnboardingProgress\|onboardingSteps\|OnboardingStepIcon\|OnboardingInfoStep\|OnboardingLinksStep\|OnboardingToolsStep\|OnboardingVenueStep\|rememberCheckoutSetupPrompt\|consumeCheckoutSetupPrompt" --include="*.ts" --include="*.tsx" .`
Expected: no matches outside `docs/superpowers/` (the spec/plan files mention these names by design).

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors (no unused imports, no unused exports left behind).

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no test referenced the deleted files.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove the floating onboarding wizard and its dead checkout-prompt plumbing"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Start the dev server and open a non-draft event's manage page as its host**

Confirm:
- No floating "?" button appears anywhere.
- The manage page's section nav (desktop sidebar and mobile section sheet) shows a "Help" entry between "Settings" and "Danger zone".
- Opening Help renders all narrative blocks top-to-bottom: Welcome, Dashboard (with working Settings/Schedule links), Venue (only if the event type has a secondary-session convention — verify against an event type that has one and one that doesn't), Invite (with a working QR-links link), Tools (only the event's enabled modules), Done. No Back/Skip/Continue/Close buttons anywhere.
- On mobile width, tapping the gear/context menu shows "Dashboard" and "Help" as sibling rows above the tool items, and tapping Help navigates to `manage?tab=help`.

- [ ] **Step 2: Repeat against a `DRAFT` event as its host**

Confirm:
- The manage page shows only the draft overview panel — no section nav, so no Help entry (unchanged from before).
- The gear/context menu does **not** show a "Help" row (still shows "Dashboard" and no tools).

- [ ] **Step 3: Confirm the checkout flow still works with no dead-guide references**

Complete (or simulate) a checkout success redirect and confirm no console errors reference the removed `rememberCheckoutSetupPrompt`.

- [ ] **Step 4: Screenshot the Help page (desktop and mobile) and the gear menu, and share them**

No commit for this task — it's verification only. If any issue is found, fix it, re-run the relevant checks from Tasks 1-6, and re-verify here.
