# Composer provider — design

## Problem

Post-composer logic (caption, pending images, upload, submit, reset) is trapped inside
`components/feed/ComposerCard.tsx`, which only renders inline in the feed's post list. Story
creation logic is separately duplicated inside `components/feed/StoriesRow.tsx`'s "Your story"
button. Neither is reachable from outside those two components, so there's no way to start
composing a post or story from elsewhere in the app (e.g. the tab bar).

## Goal

Extract both flows into a single `ComposerProvider` with a `useComposer()` hook that any
component can call to open the post composer or launch story capture, regardless of what page
it's mounted on. Add a "+" button to `MobileTabBar` that uses this hook to let a user instantly
start composing a post or story from anywhere. Make story capture skip straight to the device
camera (Instagram-style, no gallery/filter detour), and add the "add another story" affordance
that's currently missing once a user already has an active story.

## Scope

**In scope:** `ComposerProvider` + `useComposer()`; converting the post composer from an
inline-expanding card into a global modal; moving story upload/create logic out of `StoriesRow`
and into the provider; wiring `capture="environment"` onto the shared story file input; the "+"
tab-bar button and its Post/Story popup menu; the "add another story" badge on `StoryAvatar`;
removing the now-dead `?compose=1` query-string relay.

**Out of scope:** any change to the actual post/story data model, upload endpoints, or the feed
list's mock-data status (unrelated pre-existing gap, see
`docs/superpowers/specs/2026-07-31-feed-composer-card-design.md`). No filters/editing UI for
captured photos — capture and immediately upload, matching the existing story-creation flow's
behavior today.

## Architecture

### `providers/ComposerProvider.tsx` (new)

Follows the existing `ModalProvider`/`EventProvider` pattern (plain context + hook, `'use client'`,
throws if used outside the provider). Mounted in `providers/Providers.tsx`, nested inside
`EventProvider` (needs `useActiveMember`/`useActiveEvent`) and outside `ModalProvider`:

```tsx
<EventProvider>
    <ComposerProvider>
        <ModalProvider>{children}</ModalProvider>
    </ComposerProvider>
</EventProvider>
```

**State owned by the provider** (moved wholesale from `ComposerCard`'s internals):

- `isPostComposerOpen: boolean`
- `caption: string`
- `images: PendingImage[]` (same shape as today: `key`, `file`, `previewUrl`, `status`, `mediaId?`,
  `error?`)
- `sizeError` / `countError` / `submitError`
- Derived: `canSubmitPost`, `isPostBusy` (from `useCreatePost().isPending` /
  `useUploadMediaBatch().isPending`)
- `isCreatingStory: boolean`, `storyError: string | null` (from `useUploadMedia` /
  `useCreateStory`)

**Actions exposed via `useComposer()`:**

- `openPostComposer()` — sets `isPostComposerOpen = true`. No `eventId` argument; reads
  `useActiveEvent()`/`useActiveMember()` internally. No-ops (or could show an error) if there's no
  active member, mirroring today's `canSubmit` guard.
- `closePostComposer()` — resets all post-composer state (revoking object URLs, same as today's
  `reset()`) and closes.
- `updateCaption(value: string)`
- `addImages(fileList: FileList | null)` — same `MAX_IMAGES` / `MAX_FILE_SIZE_BYTES` validation
  logic as today's `handleFiles`.
- `removeImage(key: string)`
- `retryImage` (re-runs upload for a single failed image — today this just calls
  `uploadPendingImages()` again for all pending/failed; behavior unchanged)
- `submitPost()` — same two-step upload-then-create flow as today's `handleSubmit`, using
  `activeEvent.id` / `activeMember.id` read internally instead of props. On success, closes and
  resets (matching current behavior).
- `openStoryCapture()` — programmatically clicks the provider's hidden capture `<input>`.
- (internal, not exposed) `handleStoryFileChange` — runs on the hidden input's `onChange`: same
  sequence as today's `StoriesRow.handleFileChange` (`useUploadMedia` →
  `useCreateStory` → `router.push('/story/{id}')`), using `activeEvent.id` / `activeMember.id`
  from context. Sets `isCreatingStory` / `storyError` for consumers that want to show inline
  feedback.

**Rendered by the provider itself** (so it works regardless of which page is mounted):

1. A hidden `<input type="file" accept="image/*" capture="environment" />`, ref-controlled,
   `onChange` → `handleStoryFileChange`, `value` reset after each change (same pattern as existing
   file inputs in the codebase).
2. A `Modal` (reusing `components/ui/modal.tsx`, the same component `PostModal` already uses) that
   renders the _expanded_ composer form — the caption textarea, image thumbnail grid, add-photos
   button, cancel/post buttons — currently the `expanded` branch of `ComposerCard`'s JSX, moved
   here as the modal's body. Content is functionally identical to today's expanded state; only the
   container changes from an inline card to `<Modal open={isPostComposerOpen}
onClose={closePostComposer}>`.
3. This means the router-based `?compose=1` deep link and its scroll-into-view behavior are no
   longer needed (see "Removed" below) — the modal opens instantly wherever `openPostComposer()`
   is called from.

### `components/feed/ComposerCard.tsx` (shrinks)

Becomes just the collapsed placeholder row (avatar + fake input), which was previously the
`!expanded` branch. No props (`eventId`/`autoExpand` both removed — callers don't pass anything).
`onClick` calls `openPostComposer()`. Still rendered inline at the top of the feed's post list in
`app/(app)/feed/[eventId]/page.tsx`, unchanged position.

### `components/feed/StoriesRow.tsx`

- Removes its own `fileRef`, `handleFileChange`, `uploadMedia`/`createStory` calls, and
  `uploadError` state — all superseded by the provider.
- The "no story yet" placeholder button (shown when `!ownGroup`) now calls `openStoryCapture()`
  from `useComposer()` instead of `fileRef.current?.click()`.
- Can optionally surface `useComposer().storyError` near that button instead of its own local
  `uploadError` (same visual treatment, different state source).
- `isBusy` for disabling the button comes from `useComposer().isCreatingStory`.

### `components/feed/StoryAvatar.tsx` — "add another story" badge

Currently, `isCurrentUser` renders one plain `<Link>` wrapping the whole ring + label, with no way
to add a new story once one exists. Adds an Instagram-style badge:

- Becomes a client component (needs `useComposer()`).
- When `isCurrentUser`, the ring is wrapped in a `relative` container. The existing `<Link
href="/story/{firstStoryId}">` (ring + avatar) is unchanged — tapping it still opens the viewer.
- A new `<button>`, sibling to the `Link` (not nested inside it — `<button>` can't nest in `<a>`),
  absolutely positioned at the ring's bottom-right corner: small circle, `bg-gradient-brand`,
  white `Plus` icon, calls `openStoryCapture()`. `aria-label` distinct from the link's (e.g.
  `t('addAnotherStory')` vs the existing `t('yourStory')`).
- Non-current-user avatars are unaffected.

### `components/layout/MobileTabBar.tsx` — "+" tab

- Adds a center tab item using the `isCenter` styling that already exists in the component but is
  currently unused by any `tabItems` entry.
- Tapping it opens a `@base-ui/react/menu` popup (same library `Modal` already uses via
  `@base-ui/react/dialog`) anchored to the button, with two items: "Post" → `openPostComposer()`,
  "Story" → `openStoryCapture()`. Menu closes automatically on selection (base-ui default).
- Both actions are usable from any page since `ComposerProvider` is mounted above the whole
  `(app)` layout.

### `components/layout/DesktopNavRail.tsx`

"New Post" changes from a `<Link href="/feed?compose=1">` to a `<button onClick={openPostComposer}>`
with the same visual styling — it no longer needs to navigate anywhere first.

### Removed

- `app/(app)/feed/[eventId]/page.tsx`: the `shouldCompose`/`composerRef`/scroll-into-view
  `useEffect`, and the `?compose=1` param handling. `ComposerCard` no longer takes `autoExpand`.
- `app/(app)/feed/page.tsx`: the query-string-forwarding behavior on redirect (added specifically
  to carry `?compose=1` through) is no longer needed — reverts to a plain redirect to
  `/feed/{eventId}`.

## Behavior change flagged and confirmed with the user

Story capture (`openStoryCapture()`, wired to `capture="environment"`) now launches the device
camera directly everywhere a story is started (tab bar, `StoriesRow`'s own "no story yet" button,
and the new "add another story" badge) — no more OS gallery-or-camera chooser. Confirmed as
desired (Instagram-style instant capture, no filters).

## i18n

- `MobileTabBar`: add a label for the new center "+" tab and its Post/Story menu items (reusing
  `ComposerCard.placeholder`-style copy where sensible, or new keys under `MobileTabBar` /a new
  `ComposerMenu` namespace).
- `StoryAvatar`: new key for the add-badge's `aria-label` (e.g. `addAnotherStory`), distinct from
  the existing `yourStory`.
- Remove now-orphaned `StoriesRow.uploadFailed` if fully superseded by a provider-sourced message
  reusing existing copy (or keep the same key, just sourced differently — no i18n change needed if
  so).

## Files touched

- New: `providers/ComposerProvider.tsx`
- Edit: `providers/Providers.tsx` (mount `ComposerProvider`)
- Edit: `components/feed/ComposerCard.tsx` (shrink to collapsed-only trigger)
- Edit: `components/feed/StoriesRow.tsx` (delegate to `useComposer()`)
- Edit: `components/feed/StoryAvatar.tsx` (add-another-story badge, becomes client component)
- Edit: `components/layout/MobileTabBar.tsx` (center "+" tab + popup menu)
- Edit: `components/layout/DesktopNavRail.tsx` (New Post button calls hook instead of navigating)
- Edit: `app/(app)/feed/[eventId]/page.tsx` (remove `?compose=1` handling, drop
  `autoExpand`/eventId props on `ComposerCard`)
- Edit: `app/(app)/feed/page.tsx` (drop query-string forwarding)
- Edit: `messages/en.json`, `messages/el.json`

## Testing

No existing test suite covers `components/feed/*` or `components/layout/*` (consistent with prior
specs in this repo). Verification will be manual: open the post composer modal from the tab bar
on a non-feed page, from the nav rail, and from the feed's collapsed card; confirm caption/image
upload/submit still works identically to today; confirm story capture opens the camera directly
from the tab bar, the "no story yet" button, and the new add-badge on an existing story group;
confirm the add-badge doesn't interfere with tapping through to the story viewer.
