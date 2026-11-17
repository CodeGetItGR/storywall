# Members on One Page Implementation Plan (KAN-226)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the host's Members page (two sub-tabs, Members and Co-hosts) with the agreed M1 layout: one page with usage tiles, then Current hosts with pending co-host invitations, then one Members list, every row with a ⋯ menu.

**Architecture:** `MembersPanel` becomes a thin composition shell. Its state and permission logic move into a new `hooks/useMembersPage.ts`. List shaping (pending invitations, expiry, guests without hosts) goes into `lib/` helpers with unit tests. A small reusable `components/ui/RowActionsMenu.tsx` (base-ui `Menu`, same pattern as `PlaylistItemActionsMenu`) gives every row its ⋯ menu. The co-host invite form opens in a sheet (`Modal variant="sheet"`) instead of inline. No backend change: members, invitations and usage are already prefetched by the root manage page.

**Tech Stack:** Next.js App Router, React 19, next-intl, TanStack Query, Tailwind v4, `@base-ui/react` Menu, Vitest + Testing Library, Storybook.

**Mockups:** `project/M1-mobile.dc.html` and `project/M1-desktop.dc.html` on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

---

## Decisions (owner, 2026-11-17)

- **Usage:** M1 tiles. Two tiles side by side in one soft panel: Members `used / limit` and, when the plan includes co-hosts, Co-hosts `used / limit`, each with a thin bar. No title, no plan line, no upgrade chip. The amber "limit reached" notices stay under the tiles.
- **Hosts are not repeated:** the Members list leaves out every member who is a host (by `hosts[].memberId`). Tapping a host's name in Current hosts opens the role sheet, as tapping a member does today (only when roles can be managed and the member is not featured).
- **No co-hosts in the plan:** Current hosts still shows (the primary host only), with no Invite co-host button and no Co-hosts tile.
- **Invitations:** only pending co-host invitations are listed (role `HOST`, `usedAt` null). A claimed one is hidden because that person is already a host. An expired one says "Expired" and can still be revoked.
- **Invite co-host** opens today's form in a sheet (the repo rule: creation forms never sit inline above the list).

## Wording (approved 2026-11-17)

New keys:

| Key | English | Greek |
|---|---|---|
| `ManagePage.invitations.coHosts.expiresOn` | `Expires {date}` | `Λήγει {date}` |
| `ManagePage.members.moreFor` | `More options for {name}` | `Περισσότερες επιλογές για {name}` |

Reused as they are: `ManagePage.qr.status.EXPIRED` ("Expired" / "Έληξε"), `ManagePage.members.promote`, `.report`, `.remove`, `ManagePage.invitations.coHosts.transfer`, `.remove`, `.cta`, `.currentTitle`, `.primary`, `.coHost`, `ManagePage.invitations.copyLink`, `.copied`, `.revoke`, `ManagePage.members.title`, `PlanUsage.items.members`, `PlanUsage.unlimited`, the co-hosts module name.

Removed from the page, and their keys deleted from `messages/en.json` and `messages/el.json` because nothing else uses them:

- `ManagePage.invitations.capacity.coHostsTitle` ("Guests and co-hosts")
- `ManagePage.invitations.coHosts.summary`, `.guideTitle`, `.guideBody`, `.emptyTitle`, `.emptyBody`, `.singleRecipient`, `.currentSummary`
- `ManagePage.invitations.claimed`, `ManagePage.invitations.unclaimed`
- `ManagePage.members.roleHost`

Also gone from this page, keys kept because other screens use them: the sub-tab labels (`ManagePage.members.title` is now the list heading), "Current plan: {plan}" and "Upgrade to {plan}" (`PlanUsage`, still used by `UsagePanel` elsewhere), the crown "Primary host" badge (the row's second line still says it), the invite code on invitation rows.

## File structure

| File | Responsibility |
|---|---|
| `lib/eventInvitations.ts` (modify) | `selectPendingCoHostInvitations`, `invitationExpiry` |
| `lib/eventMembers.ts` (create) | `guestMembers(members, hosts)`, `sortHosts(hosts)` |
| `components/ui/RowActionsMenu.tsx` (create) | The ⋯ button and its menu, given a list of items |
| `hooks/useMembersPage.ts` (create) | Everything `MembersPanel` computes today, as plain values and actions |
| `components/manage/members/MembersUsageTiles.tsx` (create) | The two tiles and the full notices |
| `components/manage/members/CurrentHostsSection.tsx` (create) | Heading, Invite co-host, host rows, pending invitation rows, the host confirm modals |
| `components/manage/members/HostRow.tsx` (create, replaces `CoHostManagementRow.tsx`) | One host row |
| `components/manage/members/PendingInvitationRow.tsx` (create, replaces `components/manage/invitations/CoHostInvitationRow.tsx`) | One pending invitation row and its revoke confirm |
| `components/manage/members/InviteCoHostSheet.tsx` (create) | The sheet around `CreateCoHostInvitationForm` |
| `components/manage/members/MemberRow.tsx` (modify) | Role and joined date on one line, ⋯ menu |
| `components/manage/members/MembersPanel.tsx` (rewrite) | Composition only |
| `components/manage/ManageSkeletons.tsx` (modify) | `ManageMembersSkeleton` without sub-tabs |
| Delete | `CoHostManagementList.tsx`, `CoHostManagementRow.tsx`, `components/manage/invitations/CoHostInvitationRow.tsx` |

---

### Task 1: List helpers

**Files:**
- Modify: `lib/eventInvitations.ts`
- Create: `lib/eventInvitations.test.ts`, `lib/eventMembers.ts`, `lib/eventMembers.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/eventInvitations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { EventInvitationResponseDto } from '@/lib/api/types';

import { invitationExpiry, selectCoHostInvitations, selectPendingCoHostInvitations } from './eventInvitations';

function invitation(overrides: Partial<EventInvitationResponseDto>): EventInvitationResponseDto {
    return {
        id: 'i1',
        eventId: 'e1',
        inviteCode: 'ABC',
        inviteToken: 't1',
        email: 'eleni@example.com',
        firstName: null,
        lastName: null,
        maxGuests: 1,
        expiresAt: null,
        usedAt: null,
        createdAt: '2026-11-01T10:00:00Z',
        role: 'HOST',
        ...overrides,
    };
}

describe('selectCoHostInvitations', () => {
    it('keeps host invitations only', () => {
        const guest = invitation({ id: 'g', role: 'ATTENDEE' as never });
        const host = invitation({ id: 'h' });
        expect(selectCoHostInvitations([guest, host])).toEqual([host]);
    });
});

describe('selectPendingCoHostInvitations', () => {
    it('leaves out claimed invitations', () => {
        const claimed = invitation({ id: 'c', usedAt: '2026-11-02T10:00:00Z' });
        const pending = invitation({ id: 'p' });
        expect(selectPendingCoHostInvitations([claimed, pending])).toEqual([pending]);
    });
});

describe('invitationExpiry', () => {
    const now = new Date('2026-11-17T12:00:00Z');

    it('is null without an expiry date', () => {
        expect(invitationExpiry(invitation({}), now)).toBeNull();
    });

    it('gives the date while it is still open', () => {
        expect(invitationExpiry(invitation({ expiresAt: '2026-11-20T10:00:00Z' }), now)).toEqual({ kind: 'expires', at: '2026-11-20T10:00:00Z' });
    });

    it('says expired once the date has passed', () => {
        expect(invitationExpiry(invitation({ expiresAt: '2026-11-17T11:59:59Z' }), now)).toEqual({ kind: 'expired' });
    });
});
```

`lib/eventMembers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';

import { guestMembers, sortHosts } from './eventMembers';

const member = (id: string) => ({ id, displayName: id }) as unknown as EventMemberResponseDto;
const host = (id: string, memberId: string, displayOrder: number) => ({ id, memberId, displayOrder }) as unknown as EventHostResponseDto;

describe('guestMembers', () => {
    it('leaves out every member who is a host', () => {
        expect(guestMembers([member('m1'), member('m2'), member('m3')], [host('h1', 'm1', 0), host('h2', 'm3', 1)])).toEqual([member('m2')]);
    });
});

describe('sortHosts', () => {
    it('puts the primary host first, then by display order', () => {
        const sorted = sortHosts([host('h2', 'm2', 2), host('h0', 'm0', 0), host('h1', 'm1', 1)]);
        expect(sorted.map((item) => item.id)).toEqual(['h0', 'h1', 'h2']);
    });

    it('does not change the list it was given', () => {
        const hosts = [host('h2', 'm2', 2), host('h0', 'm0', 0)];
        sortHosts(hosts);
        expect(hosts[0].id).toBe('h2');
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/eventInvitations.test.ts lib/eventMembers.test.ts`
Expected: FAIL, `selectPendingCoHostInvitations`, `invitationExpiry` and `./eventMembers` don't exist.

- [ ] **Step 3: Implement**

Append to `lib/eventInvitations.ts`:

```ts
// Pending only: a claimed invitation's person is already listed as a host.
export function selectPendingCoHostInvitations(invitations: EventInvitationResponseDto[]): EventInvitationResponseDto[] {
    return selectCoHostInvitations(invitations).filter((invitation) => !invitation.usedAt);
}

export type InvitationExpiry = { kind: 'expires'; at: string } | { kind: 'expired' };

export function invitationExpiry(invitation: EventInvitationResponseDto, now: Date = new Date()): InvitationExpiry | null {
    if (!invitation.expiresAt) return null;
    return new Date(invitation.expiresAt).getTime() > now.getTime() ? { kind: 'expires', at: invitation.expiresAt } : { kind: 'expired' };
}
```

Create `lib/eventMembers.ts`:

```ts
import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';

// The Members list: everyone who isn't already shown under Current hosts.
export function guestMembers(members: EventMemberResponseDto[], hosts: EventHostResponseDto[]): EventMemberResponseDto[] {
    const hostMemberIds = new Set(hosts.map((host) => host.memberId));
    return members.filter((member) => !hostMemberIds.has(member.id));
}

// Primary host (display order 0) first.
export function sortHosts(hosts: EventHostResponseDto[]): EventHostResponseDto[] {
    return [...hosts].sort((first, second) => first.displayOrder - second.displayOrder);
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run lib/eventInvitations.test.ts lib/eventMembers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/eventInvitations.ts lib/eventInvitations.test.ts lib/eventMembers.ts lib/eventMembers.test.ts
git commit -m "KAN-226: Add the Members page list helpers"
```

### Task 2: Row ⋯ menu

**Files:**
- Create: `components/ui/RowActionsMenu.tsx`, `components/ui/RowActionsMenu.test.tsx`, `components/ui/RowActionsMenu.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Flag, Trash2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RowActionsMenu } from './RowActionsMenu';

afterEach(cleanup);

describe('RowActionsMenu', () => {
    it('runs the chosen item', async () => {
        const onReport = vi.fn();
        render(
            <RowActionsMenu
                label="More options for Anna"
                items={[
                    { key: 'report', label: 'Report', icon: Flag, onSelect: onReport },
                    { key: 'remove', label: 'Remove', icon: Trash2, tone: 'danger', onSelect: vi.fn() },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'More options for Anna' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Report' }));

        expect(onReport).toHaveBeenCalled();
    });

    it('renders nothing without items', () => {
        const { container } = render(<RowActionsMenu label="More" items={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/ui/RowActionsMenu.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { Menu } from '@base-ui/react/menu';
import { type LucideIcon, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';

export type RowAction = {
    key: string;
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
    tone?: 'default' | 'danger';
    // Keep the menu open after the click, e.g. so "Copied!" can show.
    keepOpen?: boolean;
};

// A row's ⋯ button. `label` names it for screen readers ("More options for Anna").
export function RowActionsMenu({ label, items }: { label: string; items: RowAction[] }) {
    if (items.length === 0) return null;

    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={label}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={12} className="z-50">
                    <Menu.Popup className="motion-popover w-52 rounded-2xl border border-border bg-background p-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        {items.map(({ key, label: itemLabel, icon: Icon, onSelect, tone = 'default', keepOpen }) => (
                            <Menu.Item
                                key={key}
                                onClick={onSelect}
                                closeOnClick={!keepOpen}
                                className={cn(
                                    'motion-menu-item flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium outline-none',
                                    tone === 'danger' ? 'text-destructive hover:bg-destructive/10' : 'text-ink hover:bg-surface-muted',
                                )}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                {itemLabel}
                            </Menu.Item>
                        ))}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
```

`closeOnClick` is a `Menu.Item` prop in the installed `@base-ui/react` (`menu/item/MenuItem.d.ts`).

Note on `react/jsx-no-bind`: `onSelect` comes in as a prop and is passed straight through, so no inline function is created here.

- [ ] **Step 4: Add stories**

`components/ui/RowActionsMenu.stories.tsx`, following the repo's story conventions (`docs/storybook.md`): a `Default` story with Make co-host / Report / Remove (danger), and an `Open` story with a `play` that clicks the trigger so the menu shows in the snapshot. Pass the labels as plain strings in `args`; the component takes no translations.

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run components/ui/RowActionsMenu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ui/RowActionsMenu.tsx components/ui/RowActionsMenu.test.tsx components/ui/RowActionsMenu.stories.tsx
git commit -m "KAN-226: Add the row actions menu"
```

### Task 3: Messages

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the two approved keys**

In `ManagePage.invitations.coHosts` add `"expiresOn": "Expires {date}"` (en) and `"expiresOn": "Λήγει {date}"` (el).
In `ManagePage.members` add `"moreFor": "More options for {name}"` (en) and `"moreFor": "Περισσότερες επιλογές για {name}"` (el).

- [ ] **Step 2: Leave the removals for Task 9**

The keys listed under Wording → Removed are still used by today's components until Task 9 deletes them. Removing them now would break the build between commits.

- [ ] **Step 3: Check the JSON**

Run: `node -e "require('./messages/en.json');require('./messages/el.json');console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "KAN-226: Add the Members page wording"
```

### Task 4: `useMembersPage` hook

**Files:**
- Create: `hooks/useMembersPage.ts`, `hooks/useMembersPage.test.tsx`

Move every value `MembersPanel` computes today into this hook. It takes the same props `MembersPanel` takes (`MembersPanelProps`, export that type from the hook file and import it in the panel) and returns plain values and actions. It no longer reads the `section` search param: there are no sub-tabs.

- [ ] **Step 1: Write the failing test**

Mock the same modules `MembersPanel.report.test.tsx` mocks (`next-intl`, `useAppConfig`, `useBilling`, `useCoHostCapacity`, `usePromoteCoHost`, `useMemberModeration`, `useModuleCopy`, `EventProvider`), plus `@/hooks/useMemberRoleSheet` (return `{ member: null, open: vi.fn(), close: vi.fn() }`). Then with `renderHook`:

```tsx
it('lists guests without the hosts and pending invitations only', () => {
    const { result } = renderHook(() =>
        useMembersPage({
            ...baseProps,
            members: [member('m1', 'Maria'), member('m2', 'Anna', 'ATTENDEE')],
            hosts: [{ id: 'h1', memberId: 'm1', displayOrder: 0 } as never],
            invitations: [invitation({ id: 'p' }), invitation({ id: 'c', usedAt: '2026-11-02T10:00:00Z' })],
        }),
    );

    expect(result.current.guests.map((item) => item.id)).toEqual(['m2']);
    expect(result.current.pendingInvitations.map((item) => item.id)).toEqual(['p']);
    expect(result.current.hostRows).toEqual([{ host: expect.objectContaining({ id: 'h1' }), member: expect.objectContaining({ id: 'm1' }) }]);
});

it('offers Invite co-host only when the plan has co-hosts and seats are free', () => {
    coHostsFull = false;
    expect(renderHook(() => useMembersPage(baseProps)).result.current.canInviteCoHost).toBe(true);

    coHostsFull = true;
    expect(renderHook(() => useMembersPage(baseProps)).result.current.canInviteCoHost).toBe(false);

    coHostsFull = false;
    expect(renderHook(() => useMembersPage({ ...baseProps, eventModules: [] })).result.current.canInviteCoHost).toBe(false);
});

it('opens and closes the invite sheet', () => {
    const { result } = renderHook(() => useMembersPage(baseProps));
    act(() => result.current.openInvite());
    expect(result.current.inviteOpen).toBe(true);
    act(() => result.current.closeInvite());
    expect(result.current.inviteOpen).toBe(false);
});
```

`baseProps` is `MembersPanel`'s props with `canModerate`, `canWrite`, `isPrimaryHost` true, `eventModules: [{ moduleKey: 'co_hosts', isAvailable: true }]`, `eventUsage: null`, and empty lists. `member` and `invitation` are the helpers from Task 1's tests (copy them into this file).

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useMembersPage.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useCoHostCapacity } from '@/hooks/useCoHostCapacity';
import { useMemberModeration } from '@/hooks/useMemberModeration';
import { useMemberRoleSheet } from '@/hooks/useMemberRoleSheet';
import { usePromoteCoHost } from '@/hooks/usePromoteCoHost';
import type {
    EventHostResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventModuleResponseDto,
    EventUsageResponseDto,
    PlanTierResponseDto,
} from '@/lib/api/types';
import { selectPendingCoHostInvitations } from '@/lib/eventInvitations';
import { guestMembers, sortHosts } from '@/lib/eventMembers';
import { canManageMemberRoles } from '@/lib/memberRoles';
import { findPlanByCode } from '@/lib/planTiers';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export type MembersPanelProps = {
    canModerate: boolean;
    canWrite: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
    invitations: EventInvitationResponseDto[];
    eventUsage: EventUsageResponseDto | null;
    planTiers: PlanTierResponseDto[];
    eventModules: EventModuleResponseDto[];
    hosts: EventHostResponseDto[];
    isPrimaryHost: boolean;
};

export type HostRowData = { host: EventHostResponseDto; member: EventMemberResponseDto | undefined };

export function useMembersPage({
    canModerate,
    canWrite,
    eventId,
    members,
    invitations,
    eventUsage,
    planTiers,
    eventModules,
    hosts,
    isPrimaryHost,
}: MembersPanelProps) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const { data: upgradeOptions = [] } = useUpgradeOptions(eventId, isPrimaryHost);
    const moderation = useMemberModeration(eventId, canModerate);
    const roleSheet = useMemberRoleSheet(members);
    const promoteFlow = usePromoteCoHost(eventId);
    const [inviteOpen, setInviteOpen] = useState(false);

    const coHostsAvailable = eventModules.find((module_) => module_.moduleKey === 'co_hosts')?.isAvailable ?? false;
    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const membersFull = memberLimit !== null && memberCount >= memberLimit;
    const currentPlan = eventUsage ? findPlanByCode(planTiers, 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = upgradeOptions[0] ? findPlanByCode(planTiers, 'EVENT', upgradeOptions[0].planTierCode) : undefined;
    const coHostCapacity = useCoHostCapacity(hosts, currentPlan, nextPlan, activeEvent?.modules);

    // Same wording and rule as today's notice under the bars.
    const membersFullNotice =
        canWrite && membersFull
            ? nextPlan
                ? nextPlan.maxMembers === null
                    ? t('invitations.full.noticeWithUnlimitedUpgrade', { plan: nextPlan.name })
                    : t('invitations.full.noticeWithUpgrade', { plan: nextPlan.name, seats: nextPlan.maxMembers })
                : t('invitations.full.notice')
            : null;

    const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
    const hostRows = useMemo<HostRowData[]>(() => sortHosts(hosts).map((host) => ({ host, member: membersById.get(host.memberId) })), [hosts, membersById]);
    const guests = useMemo(() => guestMembers(members, hosts), [members, hosts]);
    const pendingInvitations = useMemo(() => selectPendingCoHostInvitations(invitations), [invitations]);

    const canInviteCoHost = canWrite && coHostsAvailable && !membersFull && !coHostCapacity.isFull;
    const openInvite = useCallback(() => setInviteOpen(true), []);
    const closeInvite = useCallback(() => setInviteOpen(false), []);

    return {
        eventId,
        locale,
        canWrite,
        canModerate,
        coHostsAvailable,
        // Tiles
        memberUsage: eventUsage
            ? { used: memberCount, limit: memberLimit, percent: eventUsage.memberPercent }
            : null,
        coHostUsage: coHostsAvailable ? coHostCapacity : null,
        membersFullNotice,
        coHostsFullNotice: canWrite ? coHostCapacity.fullNotice : null,
        // Current hosts
        hostRows,
        pendingInvitations,
        canManageHosts: isPrimaryHost && canWrite,
        canInviteCoHost,
        inviteOpen,
        openInvite,
        closeInvite,
        // Members
        guests,
        activeMemberId: activeMember?.id ?? null,
        eventTypeKey: activeEvent?.eventType ?? null,
        canManageRoles: canManageMemberRoles(activeEvent, canModerate),
        canReport: canModerate && Boolean(appConfig?.reportTargetTypes?.includes('MEMBER')),
        // Promoting takes no member seat (they are already in), only a co-host one.
        canPromote: canWrite && coHostsAvailable && !coHostCapacity.isFull,
        moderation,
        roleSheet,
        promoteFlow,
    };
}

export type MembersPageState = ReturnType<typeof useMembersPage>;
```

The `isFull` used for `canInviteCoHost` matches today's `canCreate` (`canWrite && !isFull && !coHostCapacity.isFull`), plus the plan check that today came from the tab being hidden.

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run hooks/useMembersPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useMembersPage.ts hooks/useMembersPage.test.tsx
git commit -m "KAN-226: Move the Members page logic into a hook"
```

### Task 5: Usage tiles

**Files:**
- Create: `components/manage/members/MembersUsageTiles.tsx`, `.test.tsx`, `.stories.tsx`

- [ ] **Step 1: Write the failing test**

With `next-intl` mocked to return keys (`useTranslations: () => (key, values) => values ? \`${key} ${JSON.stringify(values)}\` : key`) and `useActiveModuleCopy` mocked to `{ name: 'Co-hosts' }`:

```tsx
it('shows both tiles with used / limit', () => {
    render(<MembersUsageTiles members={{ used: 58, limit: 100, percent: 58 }} coHosts={{ used: 1, limit: 2, percent: 50 }} notices={[]} />);
    expect(screen.getByText('items.members')).toBeInTheDocument();
    expect(screen.getByText('Co-hosts')).toBeInTheDocument();
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
});

it('leaves out the co-hosts tile when the plan has none', () => {
    render(<MembersUsageTiles members={{ used: 3, limit: 100, percent: 3 }} coHosts={null} notices={[]} />);
    expect(screen.queryByText('Co-hosts')).toBeNull();
});

it('says unlimited instead of a bar when there is no limit', () => {
    render(<MembersUsageTiles members={{ used: 3, limit: null, percent: 0 }} coHosts={null} notices={[]} />);
    expect(screen.getByText('unlimited')).toBeInTheDocument();
});

it('shows the limit notices under the tiles', () => {
    render(<MembersUsageTiles members={{ used: 100, limit: 100, percent: 100 }} coHosts={null} notices={['Guest limit reached']} />);
    expect(screen.getByText('Guest limit reached')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/members/MembersUsageTiles.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import { cn } from '@/lib/utils';

type Usage = { used: number; limit: number | null; percent: number };

// M1: members and co-hosts side by side in one soft panel, the limit notices under it.
export function MembersUsageTiles({ members, coHosts, notices }: { members: Usage | null; coHosts: Usage | null; notices: string[] }) {
    const t = useTranslations('PlanUsage');
    const coHostsName = useActiveModuleCopy('co_hosts').name;
    if (!members && !coHosts) return null;

    return (
        <section className="flex flex-col gap-2">
            {/* Tiles */}
            <div className={cn('grid gap-4 rounded-[20px] bg-surface-muted px-4 py-3.5 sm:px-5 sm:py-4', coHosts && members ? 'grid-cols-2' : 'grid-cols-1')}>
                {members && <UsageTile label={t('items.members')} usage={members} unlimitedLabel={t('unlimited')} />}
                {coHosts && <UsageTile label={coHostsName} usage={coHosts} unlimitedLabel={t('unlimited')} />}
            </div>

            {/* Limit notices */}
            {notices.map((notice) => (
                <p key={notice} className="text-xs leading-relaxed text-amber-700">
                    {notice}
                </p>
            ))}
        </section>
    );
}

function UsageTile({ label, usage, unlimitedLabel }: { label: string; usage: Usage; unlimitedLabel: string }) {
    const over = usage.limit !== null && usage.percent > 100;
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">{label}</span>
            <span className={cn('text-base font-bold text-ink tabular-nums', over && 'text-destructive')}>
                {usage.used}
                {usage.limit !== null && <span className="font-medium text-ink-muted"> {`/ ${usage.limit}`}</span>}
            </span>
            {usage.limit !== null ? (
                <span className="block h-1.5 overflow-hidden rounded-full bg-background">
                    <span
                        className={cn('block h-full rounded-full bg-gradient-brand', over && 'bg-destructive')}
                        style={{ width: `${Math.max(0, Math.min(100, usage.percent))}%` }}
                    />
                </span>
            ) : (
                <span className="text-[11px] text-ink-faint">{unlimitedLabel}</span>
            )}
        </div>
    );
}
```

The panel uses the existing `bg-surface-muted` token (the app's soft cream), with a white track under each bar. Don't add a new colour.

The test expects `/ 100` as its own text node; keep the `{\`/ ${usage.limit}\`}` form so it renders as one.

- [ ] **Step 4: Stories**

`MembersUsageTiles.stories.tsx`: `Both` (58/100, 1/2), `MembersOnly` (no co-hosts), `Unlimited`, `Full` (100/100 with a notice). Use the real `next-intl` provider the other manage stories use.

- [ ] **Step 5: Run the test to see it pass, then commit**

Run: `npx vitest run components/manage/members/MembersUsageTiles.test.tsx`
Expected: PASS.

```bash
git add components/manage/members/MembersUsageTiles.tsx components/manage/members/MembersUsageTiles.test.tsx components/manage/members/MembersUsageTiles.stories.tsx
git commit -m "KAN-226: Add the members usage tiles"
```

### Task 6: Host rows, invitation rows and the invite sheet

**Files:**
- Create: `components/manage/members/HostRow.tsx`, `PendingInvitationRow.tsx`, `InviteCoHostSheet.tsx`, `CurrentHostsSection.tsx`, `CurrentHostsSection.test.tsx`, `CurrentHostsSection.stories.tsx`
- Modify: `components/manage/invitations/CreateCoHostInvitationForm.tsx`

- [ ] **Step 1: Write the failing test** (`CurrentHostsSection.test.tsx`)

Mock `next-intl` (keys back, with values appended as in Task 5), `@/hooks/useMemberAvatarUrl`, `@/hooks/useCoHostManagement` (return `{ canTransfer: true, requestTransfer, requestRemove, transferTarget: null, removeTarget: null, closeTransfer, closeRemove, confirmTransfer, confirmRemove, isTransferring: false, isRemoving: false, error: null }`), `@/hooks/useDeleteEventInvitation` via `@/hooks/useEventInvitations` (`useDeleteEventInvitation: () => ({ mutateAsync: vi.fn(), isPending: false })`), `@/hooks/useCopyText` (`{ copied: false, copy }`), `@/hooks/useShareLink` (identity), and `./InviteCoHostSheet` (renders `open ? <p>sheet</p> : null`). Then:

```tsx
it('shows the primary host without a menu and a co-host with Transfer and Remove', async () => {
    renderSection({ canManageHosts: true });
    expect(screen.queryByRole('button', { name: /members.moreFor.*Maria/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /members.moreFor.*Nikos/ }));
    expect(await screen.findByRole('menuitem', { name: 'invitations.coHosts.transfer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'invitations.coHosts.remove' }));
    expect(requestRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'h2' }));
});

it('gives a co-host no menu when the viewer cannot manage hosts', () => {
    renderSection({ canManageHosts: false });
    expect(screen.queryByRole('button', { name: /members.moreFor/ })).toBeNull();
});

it('lists a pending invitation by email with its expiry, and copies its link', async () => {
    renderSection({ pendingInvitations: [invitation({ email: 'eleni@example.com', expiresAt: '2099-11-20T10:00:00Z' })] });
    expect(screen.getByText('eleni@example.com')).toBeInTheDocument();
    expect(screen.getByText(/invitations.coHosts.expiresOn/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /members.moreFor.*eleni@example.com/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'invitations.copyLink' }));
    expect(copy).toHaveBeenCalled();
});

it('marks an expired invitation', () => {
    renderSection({ pendingInvitations: [invitation({ expiresAt: '2020-01-01T00:00:00Z' })] });
    expect(screen.getByText('qr.status.EXPIRED')).toBeInTheDocument();
});

it('opens the invite sheet from Invite co-host, and hides the button when not allowed', () => {
    const openInvite = vi.fn();
    renderSection({ canInviteCoHost: true, openInvite });
    fireEvent.click(screen.getByRole('button', { name: 'invitations.coHosts.cta' }));
    expect(openInvite).toHaveBeenCalled();

    cleanup();
    renderSection({ canInviteCoHost: false });
    expect(screen.queryByRole('button', { name: 'invitations.coHosts.cta' })).toBeNull();
});
```

`renderSection(overrides)` renders `<CurrentHostsSection page={{ ...basePage, ...overrides }} />`, where `basePage` is a `MembersPageState`-shaped object (cast `as never`) with `eventId: 'e1'`, `locale: 'en'`, `canWrite: true`, two `hostRows` (Maria, `displayOrder: 0`, id `h1`; Nikos, `displayOrder: 1`, id `h2`), `pendingInvitations: []`, `canManageHosts: true`, `canInviteCoHost: false`, `inviteOpen: false`, `openInvite`/`closeInvite` mocks, `canManageRoles: false`, `roleSheet: { open: vi.fn() }`.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/members/CurrentHostsSection.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: `HostRow.tsx`**

Built from today's `CoHostManagementRow` and `MemberRow`'s `MemberIdentity`:

- Avatar (`Avatar`, `size="sm"`, `alt={displayName}`), name (`text-[15px] font-semibold`), second line `t('primary')` or `t('coHost')` (`text-[13px] text-ink-muted`). No crown badge.
- The avatar + name block is a button with `aria-label={tRoles('host.edit', { name })}` when `onEditRoleAction` is given (same as `MemberIdentity` today; move `MemberIdentity` into its own file `components/manage/members/MemberIdentity.tsx` and use it from both rows).
- `RowActionsMenu` with `label={tMembers('moreFor', { name: displayName })}` and items, only for a co-host (`host.displayOrder !== 0`) when `canManage`: Transfer ownership (`ArrowRightLeft`, only when `canTransfer`), Remove co-host (`Trash2`, `tone: 'danger'`).
- Row: `<li className="flex min-h-[60px] items-center gap-3">`.
- Props: `{ host, member, canManage, canTransfer, onTransferAction, onRemoveAction, onEditRoleAction? }`. Build the menu items with `useMemo`; the item handlers are `useCallback`s that call the action with `host` (jsx-no-bind).

- [ ] **Step 4: `PendingInvitationRow.tsx`**

Built from today's `CoHostInvitationRow` (same `useDeleteEventInvitation`, `useShareLink`, `useCopyText`, revoke `ConfirmActionModal` with the same keys):

- Left: a 40px round dashed circle (`border-[1.5px] border-dashed border-border text-ink-faint`) with lucide `Mail` (`aria-hidden`).
- Title: `invitation.email ?? invitation.inviteCode`.
- Second line, joined with ` · ` and left out when empty: the recipient's name (`firstName lastName`), then the expiry from `invitationExpiry(invitation)`: `t('invitations.coHosts.expiresOn', { date: formatDate(locale, at, { dateStyle: 'medium' }) })` or `t('qr.status.EXPIRED')`.
- `RowActionsMenu` (`label={tMembers('moreFor', { name: title })}`): Copy link (`Copy` icon, label `copied ? t('invitations.copied') : t('invitations.copyLink')`, `keepOpen: true`), and, when `canWrite`, Revoke (`Trash2`, `tone: 'danger'`, opens the confirm).
- `<li className="flex min-h-[60px] items-center gap-3">`.

- [ ] **Step 5: `InviteCoHostSheet.tsx` and the form**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { CreateCoHostInvitationForm } from '@/components/manage/invitations/CreateCoHostInvitationForm';
import { Modal } from '@/components/ui/modal';

// Today's invite form, in a sheet instead of inline above the hosts.
export function InviteCoHostSheet({ eventId, open, onCloseAction }: { eventId: string; open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('ManagePage.invitations.coHosts');

    return (
        <Modal open={open} onClose={onCloseAction} closeLabel={t('cancel')} variant="sheet" size="md" showCloseButton={false} labelledBy="invite-co-host-title">
            <Modal.Body className="px-1 pt-2 pb-2">{open && <CreateCoHostInvitationForm eventId={eventId} onDoneAction={onCloseAction} />}</Modal.Body>
        </Modal>
    );
}
```

In `CreateCoHostInvitationForm.tsx`, give the title paragraph `id="invite-co-host-title"` so the sheet is named by it. The form keeps its own header (title, subtitle, X), so the sheet hides its own close button. Nothing else in the form changes.

- [ ] **Step 6: `CurrentHostsSection.tsx`**

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ShareLanguageNote } from '@/components/manage/invitations/ShareLanguageNote';
import type { MembersPageState } from '@/hooks/useMembersPage';

import { HostConfirmModals } from './HostConfirmModals';
import { HostRow } from './HostRow';
import { InviteCoHostSheet } from './InviteCoHostSheet';
import { PendingInvitationRow } from './PendingInvitationRow';
import { useCoHostManagement } from '@/hooks/useCoHostManagement';

export function CurrentHostsSection({ page }: { page: MembersPageState }) {
    const t = useTranslations('ManagePage');
    const management = useCoHostManagement(page.eventId);

    return (
        <section aria-labelledby="current-hosts-title" className="flex flex-col gap-1">
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <h2 id="current-hosts-title" className="flex-1 text-[17px] font-bold text-ink">
                    {t('invitations.coHosts.currentTitle')}
                </h2>
                {page.canInviteCoHost && (
                    <button
                        type="button"
                        onClick={page.openInvite}
                        className="flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap text-white bg-gradient-brand transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('invitations.coHosts.cta')}
                    </button>
                )}
            </div>

            {/* Read-only */}
            {!page.canWrite && <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('invitations.readOnly')}</p>}

            {/* Hosts and pending invitations */}
            <ul className="flex flex-col">
                {page.hostRows.map(({ host, member }) => (
                    <HostRow
                        key={host.id}
                        host={host}
                        member={member}
                        canManage={page.canManageHosts}
                        canTransfer={management.canTransfer}
                        onTransferAction={management.requestTransfer}
                        onRemoveAction={management.requestRemove}
                        onEditRoleAction={page.canManageRoles && member && !member.isFeatured ? page.roleSheet.open : undefined}
                    />
                ))}
                {page.pendingInvitations.map((invitation) => (
                    <PendingInvitationRow key={invitation.id} eventId={page.eventId} invitation={invitation} canWrite={page.canWrite} />
                ))}
            </ul>

            {/* Link language */}
            {page.pendingInvitations.length > 0 && <ShareLanguageNote className="mt-1" />}

            {/* Invite sheet */}
            <InviteCoHostSheet eventId={page.eventId} open={page.inviteOpen} onCloseAction={page.closeInvite} />

            {/* Transfer and remove confirmations */}
            <HostConfirmModals management={management} hostRows={page.hostRows} />
        </section>
    );
}
```

`HostConfirmModals.tsx` holds today's two `ConfirmActionModal`s from `CoHostManagementList` unchanged (same keys, same props), looking names up from `hostRows` instead of `membersById`. Sort the imports as eslint wants (`@/hooks/...` before relative imports).

`HostRow.onEditRoleAction` receives the member: `HostRow` calls `onEditRoleAction(member)` from a `useCallback`, like `MemberRow` does.

- [ ] **Step 7: Stories**

`CurrentHostsSection.stories.tsx`: `PrimaryOnly`, `WithCoHostAndInvitation` (Maria primary, Nikos co-host, eleni@example.com expiring), `ExpiredInvitation`, `ReadOnly`, and `MenuOpen` with a `play` that clicks Nikos's ⋯. Mock the hooks the same way other manage stories mock data (look at `GuestChoicesList.stories.tsx` and `docs/storybook.md`).

- [ ] **Step 8: Run the test to see it pass, then commit**

Run: `npx vitest run components/manage/members/CurrentHostsSection.test.tsx`
Expected: PASS.

```bash
git add components/manage/members components/manage/invitations/CreateCoHostInvitationForm.tsx
git commit -m "KAN-226: Add Current hosts with pending invitations"
```

### Task 7: Member rows with a ⋯ menu

**Files:**
- Modify: `components/manage/members/MemberRow.tsx`
- Create: `components/manage/members/MemberRow.test.tsx`, `MemberRow.stories.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('puts the role and joined date on one line', () => {
    roleLabel = 'Bride’s friend';
    renderRow();
    expect(screen.getByText('Bride’s friend · Joined 3 Nov 2026')).toBeInTheDocument();
});

it('shows only the joined date without a role', () => {
    roleLabel = null;
    renderRow();
    expect(screen.getByText('Joined 3 Nov 2026')).toBeInTheDocument();
});

it('offers Make co-host, Report and Remove in the menu', async () => {
    renderRow({ canPromote: true, canReport: true, canRemove: true });
    fireEvent.click(screen.getByRole('button', { name: 'More options for Anna' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Make co-host' }));
    expect(onPromote).toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Report' })).toBeNull(); // the menu closed
});

it('has no menu when no action is allowed', () => {
    renderRow({ canPromote: false, canReport: false, canRemove: false });
    expect(screen.queryByRole('button', { name: 'More options for Anna' })).toBeNull();
});
```

Mock `@/hooks/useMemberRoleLabel` to return the module-level `roleLabel` and `@/hooks/useMemberAvatarUrl`. `renderRow` passes `joinedLabel="Joined 3 Nov 2026"`, `moreLabel="More options for Anna"`, the three labels, and `vi.fn()` actions.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/members/MemberRow.test.tsx`
Expected: FAIL (no `moreLabel` prop, no menu).

- [ ] **Step 3: Implement**

Change `MemberRow`:

- Props: drop `canModerate` and `roleLabel` (hosts are no longer in this list); add `moreLabel: string`.
- Second line: `[memberRole, joinedLabel].filter(Boolean).join(' · ')`, `text-[13px] text-ink-muted`. Remove the `RoleChip` and the uppercase Host label.
- Name: `text-[15px] font-semibold`.
- Replace the three buttons with one `RowActionsMenu label={moreLabel}` whose items (built in `useMemo`) are: Make co-host (`UserCog`) when `canPromote`, Report (`Flag`) when `canReport`, Remove (`Trash2`, `tone: 'danger'`) when `canRemove`.
- Row: `<li className="flex min-h-16 items-center gap-3 border-t border-border/60">`.
- Use the shared `MemberIdentity` from Task 6.

- [ ] **Step 4: Stories**

`MemberRow.stories.tsx`: `WithRole`, `WithoutRole`, `NoActions`, `MenuOpen` (play clicks ⋯).

- [ ] **Step 5: Run the test to see it pass, then commit**

Run: `npx vitest run components/manage/members/MemberRow.test.tsx`
Expected: PASS.

```bash
git add components/manage/members/MemberRow.tsx components/manage/members/MemberRow.test.tsx components/manage/members/MemberRow.stories.tsx
git commit -m "KAN-226: Give member rows a menu"
```

### Task 8: Compose the page

**Files:**
- Modify: `components/manage/members/MembersPanel.tsx`, `components/manage/members/MembersPanel.report.test.tsx`, `components/manage/ManageSkeletons.tsx`
- Create: `components/manage/members/MembersList.tsx`

- [ ] **Step 1: Update the existing test first**

In `MembersPanel.report.test.tsx`:

- Remove the `next/navigation`, `CoHostInvitationRow`, `UsagePanel` and `./CoHostManagementList` mocks. Add mocks for `./CurrentHostsSection` (`() => null`), `./MembersUsageTiles` (`() => null`) and `@/hooks/useMemberRoleSheet` (`{ member: null, open: vi.fn(), close: vi.fn() }`).
- Actions are in the ⋯ menu now. Change each check to open the row's menu first, for example:

```tsx
fireEvent.click(within(otherRow).getByRole('button', { name: /members.moreFor/ }));
expect(await screen.findByRole('menuitem', { name: 'report' })).toBeInTheDocument();
```

and for the viewer's own row, open its menu and expect no `report` item.

- The members in `renderPanel` default to role `HOST` with `hosts={[]}`. Since hosts are left out by `hosts[].memberId`, they still show. Keep it that way, and add one case: with `hosts={[{ id: 'h1', memberId: 'm1', displayOrder: 0 }]}`, `Me` is not in the Members list.

Run: `npx vitest run components/manage/members/MembersPanel.report.test.tsx`
Expected: FAIL until Step 2.

- [ ] **Step 2: `MembersList.tsx`**

The heading `t('members.title')` (`<h2 className="mb-1.5 text-[17px] font-bold text-ink">`), today's empty state unchanged (`members.emptyTitle`, `members.emptyBody`, the `Users` icon), and the rows:

```tsx
<MemberRow
    key={member.id}
    member={member}
    canPromote={page.canPromote && member.role !== 'HOST' && member.userId !== null}
    canRemove={page.canModerate && member.role !== 'HOST'}
    canReport={page.canReport && member.id !== page.activeMemberId}
    joinedLabel={tMembers('joined', { date: formatDate(page.locale, member.joinedAt, { dateStyle: 'medium' }) })}
    eventTypeKey={page.eventTypeKey}
    editRoleLabel={tRoles('host.edit', { name: member.displayName })}
    moreLabel={tMembers('moreFor', { name: member.displayName })}
    onEditRoleAction={page.canManageRoles && !member.isFeatured ? page.roleSheet.open : undefined}
    onPromoteAction={page.promoteFlow.requestForMember}
    onReportAction={page.moderation.requestReport}
    onRemoveAction={page.moderation.requestRemove}
    promoteLabel={tMembers('promote')}
    reportLabel={tMembers('report')}
    removeLabel={tMembers('remove')}
/>
```

The `canPromote` / `canRemove` / `canReport` rules are today's, unchanged.

- [ ] **Step 3: Rewrite `MembersPanel.tsx`**

```tsx
'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { MemberRoleSheet } from '@/components/manage/members/MemberRoleSheet';
import { ReportTargetModal } from '@/components/reports/ReportTargetModal';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type MembersPanelProps, useMembersPage } from '@/hooks/useMembersPage';

import { CurrentHostsSection } from './CurrentHostsSection';
import { MembersList } from './MembersList';
import { MembersUsageTiles } from './MembersUsageTiles';
import { PromoteCoHostModal } from './PromoteCoHostModal';

export function MembersPanel(props: MembersPanelProps) {
    const tMembers = useTranslations('ManagePage.members');
    const page = useMembersPage(props);
    const { moderation, roleSheet, promoteFlow } = page;
    const handleConfirmRemove = useCallback(() => moderation.confirmRemove(tMembers('removeFailed')), [moderation, tMembers]);
    const notices = [page.membersFullNotice, page.coHostsFullNotice].filter((notice): notice is string => Boolean(notice));

    return (
        <div className="flex flex-col gap-6">
            {/* Usage */}
            <MembersUsageTiles members={page.memberUsage} coHosts={page.coHostUsage} notices={notices} />

            {/* Current hosts */}
            <CurrentHostsSection page={page} />

            {/* Members */}
            <MembersList page={page} />

            {/* Remove member confirmation */}
            <ConfirmActionModal ...today's props, unchanged... />

            {/* Promote to co-host confirmation */}
            <PromoteCoHostModal flow={promoteFlow} />

            {/* Role sheet */}
            {roleSheet.member && <MemberRoleSheet eventId={props.eventId} member={roleSheet.member} onCloseAction={roleSheet.close} />}

            {/* Report member */}
            {moderation.memberToReport && <ReportTargetModal ...today's props, unchanged... />}
        </div>
    );
}
```

Copy the remove `ConfirmActionModal` and the `ReportTargetModal` blocks from today's file exactly; only their source (`moderation` from `page`) changes. Fix the import order eslint asks for.

`coHostUsage` from the hook is `useCoHostCapacity`'s object, which has `used`, `limit` and `percent`, so it fits `MembersUsageTiles`'s `Usage` as it is.

- [ ] **Step 4: Skeleton**

In `ManageSkeletons.tsx`, `ManageMembersSkeleton`: replace `SubTabsSkeleton` with a tiles block (`<Skeleton className="h-[86px] w-full rounded-[20px]" />`), then a heading bar and two `MemberRowSkeleton`s for Current hosts, then a heading bar and six `MemberRowSkeleton`s. Keep the section comments.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/manage/members hooks/useMembersPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/manage/members components/manage/ManageSkeletons.tsx
git commit -m "KAN-226: Lay out Members as one page (M1)"
```

### Task 9: Remove what's left over

**Files:**
- Delete: `components/manage/members/CoHostManagementList.tsx`, `components/manage/members/CoHostManagementRow.tsx`, `components/manage/invitations/CoHostInvitationRow.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Delete the old components**

```bash
git rm components/manage/members/CoHostManagementList.tsx components/manage/members/CoHostManagementRow.tsx components/manage/invitations/CoHostInvitationRow.tsx
```

Then `grep -rn "CoHostManagementList\|CoHostManagementRow\|CoHostInvitationRow" --include=*.ts --include=*.tsx . --exclude-dir=node_modules --exclude-dir=.next` must print nothing.

- [ ] **Step 2: Delete the removed keys**

From both `messages/en.json` and `messages/el.json`: `ManagePage.invitations.capacity.coHostsTitle`, `ManagePage.invitations.coHosts.summary`, `.guideTitle`, `.guideBody`, `.emptyTitle`, `.emptyBody`, `.singleRecipient`, `.currentSummary`, `ManagePage.invitations.claimed`, `ManagePage.invitations.unclaimed`, `ManagePage.members.roleHost`.

Before deleting each one, grep its last segment with its parent (for example `coHosts.guideTitle`, `'guideTitle'`, `capacity.coHostsTitle`, `members.roleHost`, `roleHost`) across `components hooks lib app` and the stories. Delete a key only when nothing uses it. If one is still used, stop and report it instead of deleting.

- [ ] **Step 3: Checks**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tsc clean, eslint 0 errors, vitest all pass (the save-my-date editor `PageClient*.test.tsx`, `lib/overlayHistory.test.ts` and `hooks/useCampaignsPage.test.tsx` can time out under full-suite load; rerun them alone).

- [ ] **Step 4: Commit**

```bash
git add -A components/manage messages
git commit -m "KAN-226: Remove the old co-host rows and unused wording"
```

### Task 10: Check it and open the PR

- [ ] **Step 1: Signed-in check at 375 and 1280**

Start the backend from a checkout up to date with backend staging and `next dev --webpack -p 3000` in this worktree. Screenshot `/events/<id>/manage?tab=members` signed in as the test host (bob's "Nick and Maria", and alice's lite event, which has no co-hosts in its plan). Check:

- tiles side by side, the bar colours and the soft panel;
- Current hosts: primary host with no menu, Invite co-host on the right of the heading, and the sheet it opens;
- a pending invitation row (create one in the sheet) with "Expires …" when an expiry was set, and its menu;
- the Members list without the hosts, the one-line role and date, and the ⋯ menu;
- the lite event: no Co-hosts tile, no Invite button, Current hosts with the primary host only.

Afterwards run `git checkout -- AGENTS.md` and stop both servers.

- [ ] **Step 2: Merge staging in if it moved, rerun the checks, push, open the PR**

Title: `KAN-226: Members on one page`. Body sections: Summary, What changes, Wording (approved; list removed keys), Visual check notes (new stories, the nav and skeleton diffs), SEO (signed-in `/events/` page, private in `app/robots.ts`, no blockers), Checks, attribution line. Name only KAN-226 in the body.

- [ ] **Step 3: Update the roadmap's piece 4 notes and the host-pages memory.**

---

## Self-review

- **M1 coverage:** usage tiles (Task 5), Current hosts with Invite co-host and pending invitation rows (Task 6), one Members list (Task 7, 8), a ⋯ menu per row (Tasks 2, 6, 7), no sub-tabs (Task 8). All owner decisions above map to Tasks 1, 4, 6 and 8.
- **Repo rules:** creation form in a sheet (Task 6), destructive actions keep their confirm modals, logic in a hook (Task 4) and `lib/` (Task 1), section comments in every new component, real alt text on avatars (`alt={displayName}`, as today), no fact shown twice (no host count beside Current hosts, no hosts in the Members list, no crown badge repeating "Primary host").
- **Types:** `MembersPanelProps` and `MembersPageState` come from `hooks/useMembersPage.ts` and are used by Tasks 6 and 8. `RowAction` comes from `components/ui/RowActionsMenu.tsx`.
