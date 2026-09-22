# Deleted events: read-only host experience

Date: 2026-09-22
Status: approved for planning

## Problem

When an event has `deletedAt` set (OTP deletion, withdrawal, or coverage expiry), the app still
treats it as fully live for its hosts: the full host menu, every manage section, the feed/composer,
and every billing/usage/upgrade request. The backend now closes every module write and 404s
`upgrade-options` and all checkouts for such an event
(`docs/integration guides/soft-deleted-events-fe-integration.md`), so the UI offers actions that
can only fail.

## Decisions

- **Deletion is terminal in the UI.** No Undo anywhere, regardless of how the event was deleted.
  The backend's `DELETE .../deletion-requests` is not called. All three soft-delete kinds look
  identical to the host; no billing-order discrimination.
- **The host keeps three destinations:** Manage (reduced), Gallery (download-only), Wishbook
  (download-only).
- **Recognise the state by `deletedAt !== null`**, never by `deletionScheduledFor` alone.
- No backend change. Guests need nothing — the backend already 404s them.

## Design

### 1. State helper — `lib/eventLifecycle.ts`

```ts
export function isEventDeleted(event: { deletedAt: string | null } | null | undefined): boolean
```

Returns `event?.deletedAt != null`. Every gate below uses this and nothing else. Works for both
`EventDetailResponseDto` and `EventResponseDto` (event-list rows).

### 2. Route guard — `components/event/DeletedEventRouteGuard.tsx`

Sibling of `DraftEventRouteGuard`, mounted in `app/(app)/(event)/layout.tsx` inside it. For a host
of a deleted event, allowed paths are exactly:

- `routes.events.manage(id)` (query string ignored)
- `routes.events.tools.gallery(id)`
- `routes.events.tools.wishbook(id)`

Any other event route (`/feed`, `/story/*`, `/location`, `/settings/*`, `/checkout/*`,
`/tools/gallery/qr`, `/manage/qr`, other `/tools/*`, `/post/*`) replaces to `/manage` and renders
`EventRouteSpinner` meanwhile. The allowed-path decision lives in a pure helper in
`lib/eventLifecycle.ts` (`isDeletedEventRouteAllowed(pathname, eventId)`) so it is unit-testable.

### 3. Navigation — `hooks/useToolsMenuItems.ts`

- `useHostMenuItems`: when deleted, only `manage`.
- `useToolsMenuItems`: when deleted, only `gallery` and `wishbook` (still subject to module
  availability and the existing host gate on gallery).
- `useRightContextPanel`, `MobileTabBar`, `DesktopNavRail`: audited for hardcoded feed/post/
  invite CTAs; any found are hidden when deleted. Usage/upgrade queries there are disabled (see §6).

### 4. Manage page — `components/manage/ManageScreen.tsx`

When deleted:

- No section nav, no switcher, no `?tab` handling (any `tab` is ignored).
- Renders, in order: `EventDeletedBanner`, then `BillingTab`.
- `useEventMembers`, `useEventRsvps`, `useEventInvitations`, `useEventUsage` receive `null`.
- Manage `page.tsx` server prefetch mirrors this (skips members/rsvps/invitations/usage).

`EventPendingDeletionBanner` is renamed `EventDeletedBanner` (`components/manage/danger/`), drops
the mutation, and shows:

- title: "This event is being deleted"
- body: "It will be permanently deleted on {date}. Guests can't see it. Only the gallery and
  wishes stay available until then."
- two links: Gallery, Wishbook (hidden individually if the module is unavailable).

`DangerZoneTab` no longer branches on deletion — it is never rendered for a deleted event.

### 5. Gallery and wishbook — download-only

Gallery (`hooks/useGalleryScreen.ts`, `components/gallery/*`): when deleted, hide
`GalleryUploadSection`, selection delete/moderation actions, and upgrade/storage-pack CTAs. Keep
grid, viewer, selection for download, ZIP archive. `useEventBilling` in the gallery stays as is.

Wishbook (`app/(app)/(event)/events/[eventId]/tools/wishbook/*`): hide the add-wish form and any
per-wish edit/delete; keep list and PDF export.

Both pages show one read-only line above the content: "Read-only. This event will be deleted on
{date}." — the only place the date appears on those pages.

### 6. Requests

Disabled (`enabled=false` / `null` id) when deleted, at every call site:

- `useUpgradeOptions` — ManageScreen/BillingTab via `useEventBillingPanel`, `RightContextPanel`,
  `MembersPanel`, `InvitationsQrScreen`, `usePlansPageData`, `CheckoutReviewBoundary`
- `useEventUsage` — ManageScreen, `useRightContextPanel`, `InvitationsQrScreen`, `StoragePackPurchase`
- `useWithdrawalPreview`, `useEventWithdrawals` — `useEventWithdrawalFlow`
- checkout / upgrade-checkout / storage-checkout mutations are unreachable because their routes redirect

Kept enabled: `useEventBilling` (200 on deleted events; the billing panel needs it).

`useEventBillingPanel` gets the deleted flag so it can keep billing while disabling upgrade options
and hiding upgrade CTAs. Server prefetches in gallery/wishbook/manage `page.tsx` skip usage and
upgrade-options when `deletedAt` is set on the prefetched event.

### 7. Confirmation copy (before the host acts) — `messages/en.json`, `messages/el.json`

`ManagePage.settings.dangerZone`:

- `body`: "Deleting this event hides it from guests right away. This can't be undone."
- `confirmBody`: "Guests lose access right away and the event is permanently deleted later. This
  can't be undone. Until then you can still view and download the gallery and wishes."

`ManagePage.…withdrawal.confirmBody` (existing key at the withdrawal block): "This permanently
takes the event offline and can't be undone. You can still view and download the gallery and
wishes until it's deleted."

`ManagePage.settings.pendingDeletion` → renamed `deleted` with `title`, `body`, `galleryLink`,
`wishbookLink`; `undo` / `undoing` removed. New `ToolsPage`-level key for the read-only line (§5).

Greek strings added for every new/changed key.

### 8. Removals

- `useCancelEventDeletion` in `hooks/useEventDeletion.ts` and its test case
- the demo mock handler for `DELETE /api/events/{id}/deletion-requests`
- `pendingDeletion.undo` / `pendingDeletion.undoing` keys
- the `deletionScheduledFor` branches in `ManageScreen` (`canOpenDangerZone`) and `DangerZoneTab`

Kept: the `eventWithdrawn` API error message key (the backend can still emit it).

### 9. Home event list — `components/home/*`

Event cards for a deleted event show a compact "Deleting on {date}" label. Tapping still opens the
event; the guard lands the host on `/manage`.

### 10. Demo provider

`lib/demo/seedData.ts` gains one deleted event (`deletedAt` + `deletionScheduledFor` set) so the
state can be exercised locally without the backend.

## Out of scope

- Any backend change (`deletionReason`, undo removal server-side)
- Guest-facing behaviour
- Distinguishing withdrawn from OTP-deleted or coverage-expired in the UI

## Testing

- Vitest: `isEventDeleted`, `isDeletedEventRouteAllowed`, `useHostMenuItems` / `useToolsMenuItems`
  filtering when deleted, `useEventBillingPanel` disabling upgrade options when deleted.
- `tsc` and lint clean.
- Browser check via the demo seed at mobile and desktop widths: `/manage` (banner + billing only),
  gallery and wishbook (no composers, read-only line), a blocked route redirecting to `/manage`,
  home card label.
