# Deleted Event Read-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an event has `deletedAt` set, hosts see only Manage (banner + billing), Gallery and Wishbook in download-only mode, with no undo and no billing/upgrade/usage requests that the backend now refuses.

**Architecture:** One predicate (`isEventDeleted`) in `lib/eventLifecycle.ts` drives every gate. A `DeletedEventRouteGuard` in the event layout redirects disallowed routes to `/manage`; the two menu hooks shrink their item lists; `ManageScreen` early-returns a reduced screen; gallery and wishbook drop their write affordances. Undo is removed entirely — deletion is terminal in the UI.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, next-intl, Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-22-deleted-event-read-only-design.md`

**Deviation from spec §6 (recorded here so nobody hunts for it):** the spec lists `MembersPanel`, `InvitationsQrScreen`, `StoragePackPurchase`, `usePlansPageData`, `CheckoutReviewBoundary`, `useEventWithdrawalFlow` as call sites to disable. All of them live on routes that the guard (Task 2) redirects away from, so they never mount for a deleted event. Only the call sites that still render are gated: `ManageScreen`, `useEventBillingPanel`, `useRightContextPanel`. Spec §10 (a deleted demo seed event) is replaced by a temporary local seed tweak during verification (Task 11) — the demo has exactly one event and it must stay live.

**Baseline:** `npx vitest run` → 194 passed, 1 failed (`hooks/useStoryFilterSwipe.test.ts`, pre-existing on `main`, unrelated). Do not try to fix it in this branch.

---

## File map

| File | Change |
|---|---|
| `lib/eventLifecycle.ts` | add `isEventDeleted`, `isDeletedEventRouteAllowed` |
| `lib/eventLifecycle.test.ts` | **new** — tests for both helpers |
| `components/event/DeletedEventRouteGuard.tsx` | **new** — redirect guard |
| `app/(app)/(event)/layout.tsx` | mount the guard |
| `hooks/useToolsMenuItems.ts` | shrink both menus when deleted |
| `hooks/useToolsMenuItems.test.tsx` | **new** — menu filtering tests |
| `components/layout/MobileTabBar.tsx` | home href → manage, hide playlist/RSVP tabs |
| `components/layout/DesktopNavRail.tsx` | home href → manage |
| `hooks/useRightContextPanel.ts` | disable usage/upgrade, hide summaries/QR |
| `components/manage/danger/EventPendingDeletionBanner.tsx` | **delete** (replaced) |
| `components/manage/danger/EventDeletedBanner.tsx` | **new** — no undo, gallery/wishbook links |
| `hooks/useEventDeletion.ts` | remove `useCancelEventDeletion` |
| `hooks/useEventDeletion.test.tsx` | remove its test |
| `components/manage/DeletedEventManageScreen.tsx` | **new** — header + banner + billing |
| `components/manage/ManageScreen.tsx` | early return, null-gate queries, drop `deletionScheduledFor` branches |
| `app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx` | drop the pending-deletion branch |
| `app/(app)/(event)/events/[eventId]/manage/page.tsx` | skip prefetches when deleted |
| `hooks/useEventBillingPanel.ts` | `isDeleted` option → no upgrade options, no add-on offers |
| `hooks/useEventBillingPanel.test.tsx` | add deleted case |
| `app/(app)/(event)/events/[eventId]/manage/BillingTab.tsx` | pass `isDeleted` |
| `hooks/useGalleryScreen.ts` | expose `isDeleted`, `canUpload` false |
| `components/gallery/GalleryScreen.tsx` | hide upload, notice, back → manage |
| `app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx` | hide delete, notice, back → manage |
| `components/home/EventsQuickRow.tsx` | "Deleting on {date}" label, link → manage |
| `components/home/HomeNextEventCard.tsx` | skip deleted events |
| `messages/en.json`, `messages/el.json` | copy |

---

### Task 1: `isEventDeleted` and `isDeletedEventRouteAllowed`

**Files:**
- Modify: `lib/eventLifecycle.ts`
- Create: `lib/eventLifecycle.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/eventLifecycle.test.ts
import { describe, expect, it } from 'vitest';

import { isDeletedEventRouteAllowed, isEventDeleted } from '@/lib/eventLifecycle';

describe('isEventDeleted', () => {
    it('is true only when deletedAt is set', () => {
        expect(isEventDeleted({ deletedAt: '2026-09-22T10:00:00Z' })).toBe(true);
        expect(isEventDeleted({ deletedAt: null })).toBe(false);
        expect(isEventDeleted(null)).toBe(false);
        expect(isEventDeleted(undefined)).toBe(false);
    });
});

describe('isDeletedEventRouteAllowed', () => {
    const id = 'event-1';

    it('allows manage, gallery and wishbook', () => {
        expect(isDeletedEventRouteAllowed('/events/event-1/manage', id)).toBe(true);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/gallery', id)).toBe(true);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/wishbook', id)).toBe(true);
    });

    it('blocks every other event route, including nested ones under allowed roots', () => {
        expect(isDeletedEventRouteAllowed('/events/event-1/feed', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/story/schedule', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/settings/addons', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/checkout/review', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/manage/qr', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/gallery/qr', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/rsvp', id)).toBe(false);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/eventLifecycle.test.ts`
Expected: FAIL — `isEventDeleted is not a function` (or "is not exported").

- [ ] **Step 3: Implement the helpers**

Append to `lib/eventLifecycle.ts` (keep the existing imports and functions; add the `routes` import at the top):

```ts
import type { EventHostResponseDto, EventStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';
```

```ts
// deletedAt is the one signal for every soft-delete kind (OTP deletion,
// withdrawal, coverage expiry). status stays ACTIVE, so never gate on it.
// See soft-deleted-events-fe-integration.md §1.
export function isEventDeleted(event: { deletedAt: string | null } | null | undefined): boolean {
    return event?.deletedAt != null;
}

// A host of a deleted event keeps exactly three destinations: the reduced
// manage page, and the download-only gallery and wishbook. Exact match only —
// nested routes like /manage/qr or /tools/gallery/qr are write surfaces.
export function isDeletedEventRouteAllowed(pathname: string, eventId: string): boolean {
    const allowed = [routes.events.manage(eventId), routes.events.tools.gallery(eventId), routes.events.tools.wishbook(eventId)];
    return allowed.includes(pathname);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/eventLifecycle.test.ts`
Expected: PASS (2 test groups, 3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/eventLifecycle.ts lib/eventLifecycle.test.ts
git commit -m "Add isEventDeleted and deleted-event route allowlist helpers.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `DeletedEventRouteGuard`

**Files:**
- Create: `components/event/DeletedEventRouteGuard.tsx`
- Modify: `app/(app)/(event)/layout.tsx`

- [ ] **Step 1: Create the guard**

```tsx
// components/event/DeletedEventRouteGuard.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { isDeletedEventRouteAllowed, isEventDeleted } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// A deleted event is read-only for its hosts and 404s for everyone else, so
// only manage, gallery and wishbook stay reachable; anything else lands on
// the manage page's deletion banner. Sibling of DraftEventRouteGuard.
export function DeletedEventRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isLoading = useEventContextLoading();
    const isHost = useIsHost();
    const isDeletedHost = isHost && isEventDeleted(activeEvent);
    const manageRoot = activeEvent ? routes.events.manage(activeEvent.id) : null;
    const isAllowed = activeEvent ? isDeletedEventRouteAllowed(pathname, activeEvent.id) : true;

    useEffect(() => {
        if (!isLoading && isDeletedHost && !isAllowed && manageRoot) router.replace(manageRoot);
    }, [isAllowed, isDeletedHost, isLoading, manageRoot, router]);

    if (isDeletedHost && !isAllowed) return <EventRouteSpinner />;
    return children;
}
```

- [ ] **Step 2: Mount it inside the draft guard**

In `app/(app)/(event)/layout.tsx`, add the import and wrap `children`:

```tsx
import { DeletedEventRouteGuard } from '@/components/event/DeletedEventRouteGuard';
import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
```

```tsx
                <DraftEventRouteGuard>
                    <DeletedEventRouteGuard>
                        <div className="lg:max-w-none">{children}</div>
                    </DeletedEventRouteGuard>
                </DraftEventRouteGuard>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/event/DeletedEventRouteGuard.tsx "app/(app)/(event)/layout.tsx"
git commit -m "Redirect hosts of a deleted event to manage, gallery or wishbook only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Shrink the host and tools menus

**Files:**
- Modify: `hooks/useToolsMenuItems.ts`
- Create: `hooks/useToolsMenuItems.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// hooks/useToolsMenuItems.test.tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';

const mocks = vi.hoisted(() => ({
    activeEvent: null as Record<string, unknown> | null,
    isHost: true,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useGiftAccount', () => ({
    useGiftAccount: () => ({ data: null }),
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => mocks.activeEvent,
    useIsHost: () => mocks.isHost,
    useRouteEventId: () => 'event-1',
}));

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 'event-1',
        status: 'ACTIVE',
        deletedAt: null,
        modules: ['rsvp', 'gallery', 'wishbook', 'wishlist'].map((moduleKey) => ({ moduleKey, isAvailable: true })),
        ...overrides,
    };
}

describe('useToolsMenuItems', () => {
    beforeEach(() => {
        mocks.isHost = true;
    });

    it('lists every available tool for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['rsvp', 'schedule', 'gallery', 'wishbook', 'gifts']);
    });

    it('keeps only gallery and wishbook for a deleted event', () => {
        mocks.activeEvent = event({ deletedAt: '2026-09-22T10:00:00Z' });
        const { result } = renderHook(() => useToolsMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['gallery', 'wishbook']);
    });
});

describe('useHostMenuItems', () => {
    it('keeps only manage for a deleted event', () => {
        mocks.activeEvent = event({ deletedAt: '2026-09-22T10:00:00Z' });
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage']);
    });

    it('still lists manage, invitations QR and help for a live event', () => {
        mocks.activeEvent = event();
        const { result } = renderHook(() => useHostMenuItems());
        expect(result.current.map((item) => item.key)).toEqual(['manage', 'invitationsQr', 'help']);
    });
});
```

- [ ] **Step 2: Run the tests to verify the deleted cases fail**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx`
Expected: the two "deleted" tests FAIL (full lists returned); the two live tests PASS.

- [ ] **Step 3: Implement the filtering**

In `hooks/useToolsMenuItems.ts`:

```ts
import { isEventDeleted } from '@/lib/eventLifecycle';
```

In `useToolsMenuItems`, after `if (!activeEvent) return [];`:

```ts
    // A deleted event is download-only: the gallery archive and the wishbook
    // PDF are the only tools that still do anything.
    const isDeleted = isEventDeleted(activeEvent);
```

and add one more filter to the chain, before `.map(...)`:

```ts
        .filter((tool) => !isDeleted || tool.key === 'gallery' || tool.key === 'wishbook')
```

In `useHostMenuItems`, after `const isDraft = ...`:

```ts
    const isDeleted = isEventDeleted(activeEvent);
```

and change the definitions so everything but `manage` is hidden when deleted:

```ts
    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon; hidden?: boolean }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'galleryQr', href: routes.events.tools.galleryQr(activeEvent.id), icon: QrCode, hidden: isDeleted || !galleryQrEnabled },
        { key: 'invitationsQr', href: routes.events.invitationsQr(activeEvent.id), icon: Ticket, hidden: isDeleted || isDraft },
        { key: 'help', href: routes.events.manage(activeEvent.id, { tab: 'help' }), icon: HelpCircle, hidden: isDeleted },
    ];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run hooks/useToolsMenuItems.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useToolsMenuItems.ts hooks/useToolsMenuItems.test.tsx
git commit -m "Reduce host and tools menus to manage, gallery and wishbook for deleted events.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Tab bar, nav rail and right context panel

**Files:**
- Modify: `components/layout/MobileTabBar.tsx`
- Modify: `components/layout/DesktopNavRail.tsx`
- Modify: `hooks/useRightContextPanel.ts`

- [ ] **Step 1: MobileTabBar — home goes to manage, no playlist/RSVP tabs**

```ts
import { isEventDeleted } from '@/lib/eventLifecycle';
```

Replace the `isDraft` / `homeHref` / `playlistAvailable` / `rsvpTabAvailable` lines with:

```ts
    const isDraft = activeEvent?.status === 'DRAFT';
    // Draft and deleted events have no feed to land on; the manage page is home.
    const isDeleted = isEventDeleted(activeEvent);
    const homeHref = activeEvent ? (isDraft || isDeleted ? routes.events.manage(activeEvent.id) : routes.events.feed(activeEvent.id)) : homeTabItem.href;

    const homeActive = isPathActive(pathname, homeHref) || isPathActive(pathname, homeTabItem.href);
    const availableModules = new Set(activeEvent?.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey) ?? []);
    const playlistAvailable = availableModules.has('playlist') && !isDeleted;
    const playlistActive = playlistAvailable && Boolean(activeEvent) && isPathActive(pathname, routes.events.tools.playlist(activeEvent?.id ?? ''));
    const rsvpTabAvailable = isHost && !isDraft && !isDeleted;
```

`contextItems` needs no change — `hostItems` and `toolItems` are already filtered by Task 3 (the `!== 'help'` / `!== 'rsvp'` filters are no-ops on the reduced lists).

- [ ] **Step 2: DesktopNavRail — home goes to manage**

```ts
import { isEventDeleted } from '@/lib/eventLifecycle';
```

Replace the `homeHref` line:

```ts
    const homeHref = activeEvent ? (isDraft || isEventDeleted(activeEvent) ? routes.events.manage(activeEvent.id) : routes.events.feed(activeEvent.id)) : null;
```

(If `isDraft` is not already defined in that file, define it as `const isDraft = activeEvent?.status === 'DRAFT';` next to it — check the existing line 31 context first.)

- [ ] **Step 3: useRightContextPanel — no usage/upgrade, no summaries**

```ts
import { isEventDeleted } from '@/lib/eventLifecycle';
```

Replace the block from `const { data: eventUsage = null } = useEventUsage(...)` through `const showInvitationsQr = ...` with:

```ts
    // Deleted events keep no plan, no upgrade path and no live counts —
    // every summary below is a write surface or a number that can't change.
    const isDeleted = isEventDeleted(activeEvent);
    const { data: eventUsage = null } = useEventUsage(isHost && !isDeleted ? (activeEvent?.id ?? null) : null);
    const { data: appConfig } = useAppConfig();

    const isDraft = activeEvent?.status === 'DRAFT';
    const { data: upgradeOptions = [] } = useUpgradeOptions(isHost && !isDeleted ? (activeEvent?.id ?? null) : null, !isDraft);
    const availableModuleKeys = new Set((activeEvent?.modules ?? []).filter((module) => module.isAvailable).map((module) => module.moduleKey));

    const isLiveHost = isHost && !isDraft && !isDeleted;
    const showRsvpSummary = isLiveHost && availableModuleKeys.has('rsvp');
    const showMediaSummary = isLiveHost && availableModuleKeys.has('gallery');
    const showWishbookSummary = isLiveHost && availableModuleKeys.has('wishbook');
    const showGalleryQr = isLiveHost && isGalleryQrFeatureEnabled(activeEvent?.modules);
    const showInvitationsQr = isLiveHost;
```

`actionItems` needs no change: for a deleted host it becomes `[manage, gallery, wishbook]` from the already-filtered hooks.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/layout/MobileTabBar.tsx components/layout/DesktopNavRail.tsx hooks/useRightContextPanel.ts`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/layout/MobileTabBar.tsx components/layout/DesktopNavRail.tsx hooks/useRightContextPanel.ts
git commit -m "Hide feed, RSVP, playlist and plan summaries for deleted events.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `EventDeletedBanner` replaces the undo banner; remove `useCancelEventDeletion`

**Files:**
- Create: `components/manage/danger/EventDeletedBanner.tsx`
- Delete: `components/manage/danger/EventPendingDeletionBanner.tsx`
- Modify: `hooks/useEventDeletion.ts`
- Modify: `hooks/useEventDeletion.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Remove the cancel test**

In `hooks/useEventDeletion.test.tsx`, delete the whole `it('cancels a pending deletion through the shared resource', …)` block, remove `useCancelEventDeletion` from the import, and remove the `apiDelete` mock if nothing else in the file uses it (check with grep; keep it if `api.del` is still mocked as part of a shared `vi.mock('@/lib/api/client', …)` object literal — just drop the unused variable).

- [ ] **Step 2: Remove the hook**

In `hooks/useEventDeletion.ts`, delete the `useCancelEventDeletion` function and its comment block. Nothing else changes.

- [ ] **Step 3: Run the deletion tests**

Run: `npx vitest run hooks/useEventDeletion.test.tsx`
Expected: PASS (2 tests remaining).

- [ ] **Step 4: Replace the copy keys**

In `messages/en.json`, under `ManagePage.settings`, replace the `pendingDeletion` object with:

```json
            "deleted": {
                "title": "This event is being deleted",
                "body": "It will be permanently deleted on {date}. Guests can't see it. Only the gallery and wishes stay available until then.",
                "galleryLink": "Gallery",
                "wishbookLink": "Wishes"
            }
```

In `messages/el.json`, same location, replace `pendingDeletion` with:

```json
            "deleted": {
                "title": "Αυτή η εκδήλωση διαγράφεται",
                "body": "Θα διαγραφεί οριστικά στις {date}. Οι καλεσμένοι δεν μπορούν να τη δουν. Μόνο η συλλογή και οι ευχές παραμένουν διαθέσιμες μέχρι τότε.",
                "galleryLink": "Συλλογή",
                "wishbookLink": "Ευχές"
            }
```

- [ ] **Step 5: Create the banner**

```tsx
// components/manage/danger/EventDeletedBanner.tsx
'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function EventDeletedBanner({
    eventId,
    deletionScheduledFor,
    modules,
}: {
    eventId: string;
    deletionScheduledFor: string | null;
    modules: EventModuleResponseDto[];
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = deletionScheduledFor ? formatDate(locale, deletionScheduledFor, { dateStyle: 'long' }) : null;
    const available = new Set(modules.filter((module) => module.isAvailable).map((module) => module.moduleKey));
    const links = [
        { key: 'gallery', href: routes.events.tools.gallery(eventId), label: t('settings.deleted.galleryLink'), show: available.has('gallery') },
        { key: 'wishbook', href: routes.events.tools.wishbook(eventId), label: t('settings.deleted.wishbookLink'), show: available.has('wishbook') },
    ].filter((link) => link.show);

    return (
        <>
            {/* Deleted */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-rose-700">{t('settings.deleted.title')}</p>
                {date && <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.deleted.body', { date })}</p>}
                {links.length > 0 && (
                    <div className="mt-4 flex justify-center gap-2">
                        {links.map((link) => (
                            <Link
                                key={link.key}
                                href={link.href}
                                className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
```

- [ ] **Step 6: Delete the old banner**

```bash
git rm components/manage/danger/EventPendingDeletionBanner.tsx
```

`DangerZoneTab.tsx` still imports it — that is fixed in Task 6. Expect a transient tsc error until then.

- [ ] **Step 7: Commit**

```bash
git add components/manage/danger/EventDeletedBanner.tsx hooks/useEventDeletion.ts hooks/useEventDeletion.test.tsx messages/en.json messages/el.json
git commit -m "Replace the undo banner with a terminal deleted-event banner.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Manage page in deleted mode

**Files:**
- Create: `components/manage/DeletedEventManageScreen.tsx`
- Modify: `components/manage/ManageScreen.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/manage/page.tsx`
- Modify: `hooks/useEventBillingPanel.ts`, `hooks/useEventBillingPanel.test.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/manage/BillingTab.tsx`

- [ ] **Step 1: Write the failing billing-panel test**

Append to `hooks/useEventBillingPanel.test.tsx` inside the `describe`:

```tsx
    it('never requests upgrade options or offers add-ons for a deleted event', () => {
        mocks.useAppConfig.mockReturnValue(
            queryResult({ planTiers: [], paidServices: [{ id: 'svc-1', planTierIds: [] }] })
        );

        const { result } = renderHook(() => useEventBillingPanel('event-1', { isDeleted: true }));

        expect(mocks.useUpgradeOptions).toHaveBeenCalledWith('event-1', false);
        expect(result.current.nextUpgradeOption).toBeNull();
        expect(result.current.paidAddonOffers).toEqual([]);
    });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run hooks/useEventBillingPanel.test.tsx`
Expected: FAIL — `useUpgradeOptions` called with `('event-1')`, and `paidAddonOffers` non-empty.

- [ ] **Step 3: Add the `isDeleted` option to the hook**

In `hooks/useEventBillingPanel.ts`:

```ts
export function useEventBillingPanel(eventId: string, { isDeleted = false }: { isDeleted?: boolean } = {}) {
```

```ts
    // upgrade-options 404s on purpose for a deleted event, and nothing can be
    // bought for it — keep billing (the refund shows there) and drop the rest.
    const upgradeOptions = useUpgradeOptions(eventId, !isDeleted);
```

```ts
    const paidAddonOffers = useMemo(
        () =>
            isDeleted
                ? []
                : (appConfigQuery.data?.paidServices ?? []).filter(
                      (service) => service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false)
                  ),
        [appConfigQuery.data?.paidServices, currentPlan, isDeleted]
    );
```

Check `useUpgradeOptions`'s disabled result: `isLoading` is `false` and `error` is `null` for a disabled query in TanStack v5, so `isLoading` / `hasError` need no change.

- [ ] **Step 4: Run the billing-panel tests**

Run: `npx vitest run hooks/useEventBillingPanel.test.tsx`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Thread `isDeleted` through `BillingTab`**

```tsx
export default function BillingTab({ eventId, schedule, isDeleted = false }: { eventId: string; schedule: EventScheduleDto; isDeleted?: boolean }) {
    const tPageError = useTranslations('PageErrorState.billing');
    const tPageErrorCommon = useTranslations('PageErrorState');
    const panel = useEventBillingPanel(eventId, { isDeleted });
```

- [ ] **Step 6: Create the reduced manage screen**

```tsx
// components/manage/DeletedEventManageScreen.tsx
'use client';

import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventDeletedBanner } from '@/components/manage/danger/EventDeletedBanner';
import type { EventDetailResponseDto } from '@/lib/api/types';

import BillingTab from '../../app/(app)/(event)/events/[eventId]/manage/BillingTab';

/** The manage page for a deleted event: the deletion notice and the billing
 * record. No sections, no switcher — there is nothing left to manage. */
export function DeletedEventManageScreen({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');

    return (
        <div className="mx-auto w-full max-w-6xl pb-28 lg:pb-10">
            {/* Header */}
            <div className="px-4 pb-3 pt-4 lg:px-6 lg:pb-5 lg:pt-6">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {t('title')}
                </p>
                <h1 className="mt-0.5 truncate text-lg leading-tight font-bold text-ink sm:text-xl lg:text-2xl">{event.title}</h1>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6 px-4 pt-4 lg:max-w-4xl lg:px-6 lg:pt-5">
                {/* Deleted */}
                <EventDeletedBanner eventId={event.id} deletionScheduledFor={event.deletionScheduledFor} modules={event.modules} />

                {/* Billing */}
                <section>
                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-muted">{t('sections.billing')}</h2>
                    <BillingTab eventId={event.id} schedule={event.schedule} isDeleted />
                </section>
            </div>
        </div>
    );
}
```

- [ ] **Step 7: Wire `ManageScreen`**

In `components/manage/ManageScreen.tsx`:

```ts
import { DeletedEventManageScreen } from '@/components/manage/DeletedEventManageScreen';
import { isEventDeleted, isEventWritable, isPrimaryHost } from '@/lib/eventLifecycle';
```

Replace

```ts
    const canDelete = isPrimaryHost(activeEvent.hosts, activeMember?.id);
    const canOpenDangerZone = canDelete || Boolean(activeEvent.deletionScheduledFor);
    const visibleSections = canOpenDangerZone ? manageSections : manageSections.filter((entry) => entry !== 'danger');
```

with

```ts
    const isDeleted = isEventDeleted(activeEvent);
    const canDelete = isPrimaryHost(activeEvent.hosts, activeMember?.id);
    const visibleSections = canDelete ? manageSections : manageSections.filter((entry) => entry !== 'danger');
```

Replace

```ts
    const activeHostEventId = isHost && !isDraft ? eventId : null;
    ...
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(isHost ? eventId : null);
```

with

```ts
    // Deleted events are read-only: no roster, RSVPs, invitations or usage to load.
    const activeHostEventId = isHost && !isDraft && !isDeleted ? eventId : null;
    ...
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(isHost && !isDeleted ? eventId : null);
```

Immediately after the last hook call in the component (after the second `useEffect` and the `seatsClaimed` `useMemo` — hooks must stay unconditional), add:

```tsx
    if (isDeleted) return <DeletedEventManageScreen event={activeEvent} />;
```

Also fix the `useEffect` that normalises `?tab`: it must not fire for a deleted event (the reduced screen ignores tabs). Change it to:

```ts
    useEffect(() => {
        if (!isDeleted && requestedSection !== section) router.replace(routes.events.manage(eventId));
    }, [eventId, isDeleted, requestedSection, router, section]);
```

- [ ] **Step 8: Simplify `DangerZoneTab`**

Remove the `EventPendingDeletionBanner` import and the `if (event.deletionScheduledFor) { … }` block. Everything else stays.

- [ ] **Step 9: Skip prefetches on the server**

In `app/(app)/(event)/events/[eventId]/manage/page.tsx`, inside the `try`, right after `const isDraft = …`:

```ts
            // A deleted event's manage page shows only the banner and billing;
            // ManageScreen passes null ids for everything else, so don't prefetch it.
            if (event.deletedAt) throw new Error('deleted');
```

(The surrounding `catch` swallows it; this is the same best-effort path used for a failed fetch. Add the `isEventDeleted` import instead if you prefer `if (isEventDeleted(event))` — `lib/eventLifecycle.ts` has no client-only imports, so it is safe in a Server Component.)

- [ ] **Step 10: Typecheck, lint, tests**

Run: `npx tsc --noEmit && npx eslint components/manage "app/(app)/(event)/events/[eventId]/manage" hooks/useEventBillingPanel.ts && npx vitest run hooks/useEventBillingPanel.test.tsx lib/manageSections.test.ts`
Expected: clean, tests pass.

- [ ] **Step 11: Commit**

```bash
git add components/manage/DeletedEventManageScreen.tsx components/manage/ManageScreen.tsx "app/(app)/(event)/events/[eventId]/manage" hooks/useEventBillingPanel.ts hooks/useEventBillingPanel.test.tsx
git commit -m "Show only the deletion banner and billing on a deleted event's manage page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Gallery download-only

**Files:**
- Modify: `hooks/useGalleryScreen.ts`
- Modify: `components/gallery/GalleryScreen.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the read-only copy**

`messages/en.json`, under `GalleryPage` (next to `moduleUnavailable`):

```json
        "deletedReadOnly": "Read-only. This event will be deleted on {date}.",
```

`messages/el.json`, same location:

```json
        "deletedReadOnly": "Μόνο για προβολή. Αυτή η εκδήλωση θα διαγραφεί στις {date}.",
```

- [ ] **Step 2: Expose `isDeleted` from the hook and block uploads**

In `hooks/useGalleryScreen.ts`:

```ts
import { isEventDeleted, isEventWritable } from '@/lib/eventLifecycle';
```

Replace the `canUpload` line:

```ts
    const isDeleted = isEventDeleted(activeEvent);
    const canUpload = Boolean(eventId && activeMember && galleryEnabled && isEventWritable(activeEvent?.status) && !isDeleted);
```

Add `isDeleted,` to the returned object (right after `isHost,`).

- [ ] **Step 3: Hide the upload section, show the notice, point back to manage**

In `components/gallery/GalleryScreen.tsx`:

```ts
import { useLocale, useTranslations } from 'next-intl';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { formatDate } from '@/lib/datetime';
```

Destructure `isDeleted` and `activeEvent` from `useGalleryScreen()` (both are already returned). Then:

```tsx
    const locale = useLocale();
    const deletionDate = activeEvent?.deletionScheduledFor ? formatDate(locale, activeEvent.deletionScheduledFor, { dateStyle: 'long' }) : null;
```

Change the shell props:

```tsx
            backHref={isDeleted ? routes.events.manage(eventId) : routes.events.feed(eventId)}
            subtitle={isHost ? t('hostSubtitle') : t('guestSubtitle')}
            notice={
                <>
                    {!galleryEnabled && <ModuleNotice>{t('moduleUnavailable')}</ModuleNotice>}
                    {isDeleted && deletionDate && <ModuleNotice tone="warning">{t('deletedReadOnly', { date: deletionDate })}</ModuleNotice>}
                </>
            }
```

Wrap the upload section:

```tsx
            {/* Upload */}
            {!isDeleted && (
                <GalleryUploadSection
                    …unchanged props…
                />
            )}
```

Selection mode, archive download and the viewer stay as they are — they are all downloads.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint hooks/useGalleryScreen.ts components/gallery/GalleryScreen.tsx`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add hooks/useGalleryScreen.ts components/gallery/GalleryScreen.tsx messages/en.json messages/el.json
git commit -m "Make the gallery download-only for deleted events.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Wishbook download-only

**Files:**
- Modify: `app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the read-only copy**

`messages/en.json`, under `WishbookPage`:

```json
        "deletedReadOnly": "Read-only. This event will be deleted on {date}.",
```

`messages/el.json`, under `WishbookPage`:

```json
        "deletedReadOnly": "Μόνο για προβολή. Αυτή η εκδήλωση θα διαγραφεί στις {date}.",
```

- [ ] **Step 2: Gate delete, back link and notice**

In `PageClient.tsx`:

```ts
import { useLocale, useTranslations } from 'next-intl';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { formatDate } from '@/lib/datetime';
import { isEventDeleted } from '@/lib/eventLifecycle';
```

After `const isHost = useIsHost();`:

```ts
    const locale = useLocale();
    const isDeleted = isEventDeleted(event);
    const deletionDate = event?.deletionScheduledFor ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'long' }) : null;
```

Shell props:

```tsx
            backHref={isDeleted ? routes.events.manage(eventId) : routes.events.feed(eventId)}
            subtitle={subtitle}
            notice={isDeleted && deletionDate ? <ModuleNotice tone="warning">{t('deletedReadOnly', { date: deletionDate })}</ModuleNotice> : undefined}
```

Per-entry delete button condition:

```tsx
                                {entry.canDelete && !isDeleted && (
```

`canWrite` is already `false` for hosts, and guests never reach this page for a deleted event, so the composer needs no change.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint "app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx" messages/en.json messages/el.json
git commit -m "Make the wishbook download-only for deleted events.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Confirmation copy before deleting or withdrawing

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: English**

`ManagePage.settings.dangerZone`:

```json
                "body": "Deleting this event hides it from guests right away. This can't be undone.",
                "confirmBody": "Guests lose access right away and the event is permanently deleted later. This can't be undone. Until then you can still view and download the gallery and wishes.",
```

`EventPlanSettingsPage.withdrawal.confirmBody`:

```json
            "confirmBody": "This permanently takes the event offline and can't be undone. You can still view and download the gallery and wishes until it's deleted.",
```

- [ ] **Step 2: Greek**

`ManagePage.settings.dangerZone`:

```json
                "body": "Η διαγραφή αυτής της εκδήλωσης την αποκρύπτει άμεσα από τους καλεσμένους. Δεν μπορεί να αναιρεθεί.",
                "confirmBody": "Οι καλεσμένοι χάνουν άμεσα την πρόσβαση και η εκδήλωση διαγράφεται οριστικά αργότερα. Δεν μπορεί να αναιρεθεί. Μέχρι τότε μπορείτε να βλέπετε και να κατεβάζετε τη συλλογή και τις ευχές.",
```

`EventPlanSettingsPage.withdrawal.confirmBody`:

```json
            "confirmBody": "Αυτό θέτει οριστικά την εκδήλωση εκτός σύνδεσης και δεν μπορεί να αναιρεθεί. Μπορείτε να βλέπετε και να κατεβάζετε τη συλλογή και τις ευχές μέχρι να διαγραφεί.",
```

- [ ] **Step 3: Verify both files still parse and no stale key is referenced**

Run: `node -e "require('./messages/en.json'); require('./messages/el.json')" && grep -rn "pendingDeletion" --include=*.ts --include=*.tsx . | grep -v node_modules`
Expected: no parse error; grep prints nothing.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "State that deletion and withdrawal are final and what stays available.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Home event list

**Files:**
- Modify: `components/home/EventsQuickRow.tsx`
- Modify: `components/home/HomeNextEventCard.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Copy**

`messages/en.json`, under `EventsPage`:

```json
        "deletingOn": "Deleting on {date}",
```

`messages/el.json`, under `EventsPage`:

```json
        "deletingOn": "Διαγράφεται στις {date}",
```

- [ ] **Step 2: Quick-row card**

In `components/home/EventsQuickRow.tsx`:

```ts
import { formatDate, formatEventListDate } from '@/lib/datetime';
import { isEventDeleted } from '@/lib/eventLifecycle';
```

Inside `EventQuickCard`, after `const eventDate = …`:

```ts
    const isDeleted = isEventDeleted(event);
    const secondaryLabel =
        isDeleted && event?.deletionScheduledFor
            ? tEvents('deletingOn', { date: formatDate(locale, event.deletionScheduledFor, { dateStyle: 'medium' }) })
            : (eventDate ?? roleLabel);
```

Change the link and the second line:

```tsx
            href={isDeleted ? routes.events.manage(member.eventId) : routes.events.feed(member.eventId)}
```

```tsx
                <p className="mt-0.5 truncate text-xs text-white/75">{secondaryLabel}</p>
```

- [ ] **Step 3: Next-event card skips deleted events**

In `components/home/HomeNextEventCard.tsx`:

```ts
import { isEventDeleted } from '@/lib/eventLifecycle';
```

```ts
    const liveItems = items.filter((item) => !isEventDeleted(item.event));
    const [next] = useRecentEventItems(liveItems, 1);
```

Note `liveItems` is a new array every render, which retriggers `useRecentEventItems`'s effect each render. Wrap it: `const liveItems = useMemo(() => items.filter((item) => !isEventDeleted(item.event)), [items]);` and import `useMemo` from `react`.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint components/home`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/home/EventsQuickRow.tsx components/home/HomeNextEventCard.tsx messages/en.json messages/el.json
git commit -m "Label deleted events on the home list and keep them out of the next-event card.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Full verification

**Files:** none committed (a temporary local edit to `lib/demo/seedData.ts` that is reverted).

- [ ] **Step 1: Whole suite, types, lint**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tsc clean; eslint clean; vitest `1 failed` (`useStoryFilterSwipe`, pre-existing) and everything else passing — the total should be 194 + new tests (3 lifecycle + 4 menu + 1 billing = 8) = 202 passed.

- [ ] **Step 2: Temporarily mark the demo event deleted**

In `lib/demo/seedData.ts` `buildSeedEvent()`, change (do NOT commit):

```ts
        deletedAt: DAYS(-1),
        deletionScheduledFor: DAYS(29),
```

- [ ] **Step 3: Browser check (demo route uses the real components; the layout guard is not mounted there, so routes are checked by the unit tests)**

Use `preview_start` for the dev server (add a `.claude/launch.json` entry `{"name":"dev","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":3000}` if none exists), then at mobile width (375) and desktop:

1. `/demo/manage` — header, red "This event is being deleted" banner with the date and Gallery / Wishes buttons, then the Billing section. No section switcher, no nav, no Danger/Settings/Overview.
2. Event menu (mobile tab bar ⚙) — only Manage, Gallery, Wishes. No RSVP or Music tab. Home tab points to `/demo/manage`.
3. `/demo/tools/gallery` — amber "Read-only…" notice, no upload card, Select / Download gallery still present. Back link goes to manage.
4. `/demo/tools/wishbook` — amber notice, no trash icons on entries, Export PDF present.
5. Desktop right panel — only the three action links; no plan usage, no RSVP/media/wishbook summaries, no QR section.
6. `read_console_messages` and `read_network_requests` — no request to `/upgrade-options` or `/usage` after load; no console errors.

Take one screenshot each of manage (mobile) and gallery (desktop) for the handoff.

- [ ] **Step 4: Revert the seed tweak**

```bash
git checkout -- lib/demo/seedData.ts
git status --short
```

Expected: clean tree.

- [ ] **Step 5: Copy review against CLAUDE.md**

Re-read every string added in Tasks 5, 7, 8, 9, 10: one short sentence each, no mechanism explanations, no "grace period", no "undo". Fix inline and amend the relevant copy commit if anything reads like documentation.

---

## Self-review

- **Spec coverage:** §1 → T1; §2 → T1+T2; §3 → T3+T4; §4 → T5+T6; §5 → T7+T8; §6 → T4+T6 (with the recorded deviation); §7 → T9; §8 → T5+T6 (no demo mock handler for `DELETE deletion-requests` exists, so nothing to remove there); §9 → T10; §10 → replaced by T11 step 2 (recorded deviation); Testing → T1, T3, T6, T11.
- **Type consistency:** `isEventDeleted(event)` takes `{ deletedAt } | null | undefined` everywhere; `useEventBillingPanel(eventId, { isDeleted })` matches T6 steps 1, 3, 5; `EventDeletedBanner` props `{ eventId, deletionScheduledFor, modules }` match T6 step 6; `useGalleryScreen` returns `isDeleted` and `activeEvent` as consumed in T7.
