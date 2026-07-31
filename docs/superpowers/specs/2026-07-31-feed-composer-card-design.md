# Feed composer card — design

## Problem

The event feed has no way to create a post. A full create-post page exists at
`app/(app)/new-post/page.tsx`, but it's mock-only (`handleSubmit` just does
`router.push('/feed')`) and disconnected from the feed itself.

## Goal

Add a Facebook-style placeholder card at the top of the feed's posts section.
Collapsed, it's a compact row (avatar + fake input). Focusing/clicking it
expands into a real form — caption + up to 10 images — that actually creates
a post via the backend.

## Scope

**In scope:** the composer card (collapsed + expanded states, caption input,
multi-image picker/upload, real `useCreatePost` + new batch-media-upload
wiring), removing the now-redundant `/new-post` page, and repointing its nav
entry points at the feed's inline composer.

**Out of scope:** migrating the feed's post *list* off mock data. The list
at `app/(app)/feed/[eventId]/page.tsx` currently renders
`useState(initialPosts)` (mock `Post[]`), not the real `useEventPosts` result
(fetched, but presently only `console.log`'d). `PostCard` also expects the
mock `Post` shape (`userId`, `likes`, `tags`), not `PostResponseDto`. A post
created through the new composer will be real and persisted, but it will
**not** visually appear in the list afterward — the list keeps showing the
same mock posts it does today. This is a pre-existing gap, not something
this change introduces or fixes. Migrating the list to real data (author
lookup via `authorMemberId`, real media via `usePostMedia`, reactions/
comments) is a separate, larger follow-up.

## New backend plumbing (none of this exists yet)

The batch upload endpoint is new — only single-file upload
(`useUploadMedia`) exists today.

- `lib/api/endpoints.ts`: add `events.mediaBatch = (eventId) =>
  \`/api/events/${eventId}/media/batch\``.
- `lib/api/types.ts`: add
  ```ts
  export interface MediaBatchFailedItemDto {
    filename: string;
    errorCode: string;
    message: string;
  }
  export interface MediaBatchUploadResponseDto {
    created: MediaResponseDto[];
    failed: MediaBatchFailedItemDto[];
  }
  ```
- `hooks/useMedia.ts`: add `useUploadMediaBatch()` — a mutation mirroring
  `useUploadMedia`, POSTing multipart/form-data with a repeated `files`
  field (1–10 files, shared `mediaType`, optional `uploaderMemberId`) to
  `endpoints.events.mediaBatch(eventId)`, returning
  `MediaBatchUploadResponseDto`. On success, invalidate
  `mediaKeys.list(eventId)` like the existing hook does.

Client-side guards mirror the documented backend limits so bad requests
never leave the browser: block adding an 11th file, block any file over
20MB, with an inline message explaining why.

## Component: `components/feed/ComposerCard.tsx`

Props: `{ eventId: string }`. Internally uses `useActiveMember()` (from
`providers/EventProvider.tsx`) for the current member's `id` (→
`authorMemberId`) and `displayName` (→ avatar initials — no avatar image
resolution; `Avatar` only renders initials/color today).

**Collapsed state:** avatar + a button styled like a text input, containing
placeholder copy (reusing `FeedPage.celebrateTheMoment`, relocated to a new
`ComposerCard` i18n namespace since the standalone new-post page it was
seemingly written for never used it). Clicking/focusing it expands the card.

**Expanded state:**
- Autofocused `<textarea>` for the caption (no character limit — the
  backend's `PostRequestDto.content` declares none).
- "Add photos" button opening a hidden multi-file `<input type="file"
  accept="image/*" multiple>`.
- Thumbnail grid of pending/uploading/uploaded images, each with a remove
  (×) button. Failed uploads show an inline error + per-thumbnail Retry.
- Cancel button: resets all state and collapses.
- Post button: disabled unless caption is non-empty or ≥1 image is
  attached, or while a submit is in flight.
- Clicking outside collapses the card only if it's empty (no caption, no
  images) — avoids silently discarding a draft.

**Submit flow:**
1. If there are pending (not-yet-uploaded) images, call
   `useUploadMediaBatch()` with all of them.
2. Partition the response: `created[]` media IDs are kept (marked
   "uploaded", never re-sent); `failed[]` items are shown with a Retry
   action. If anything is still failed, stop here — Post stays disabled
   until every image is either uploaded or removed.
3. Once there are zero unresolved failures, call `useCreatePost()`:
   ```ts
   {
     eventId,
     authorMemberId: activeMember.id,
     type: images.length ? "MEDIA" : "TEXT",
     content: caption.trim() || undefined,
     isPinned: false,
     mediaIds: uploadedMediaIds.length ? uploadedMediaIds : undefined,
   }
   ```
4. On success: clear the form and collapse. (`useCreatePost`'s existing
   `onSuccess` already invalidates `postKeys.list(eventId)` — irrelevant to
   the mock-rendered list today, but correct for when it's migrated.)

## Removing `/new-post`

- Delete `app/(app)/new-post/page.tsx`.
- `components/layout/DesktopNavRail.tsx`: change the "New Post" link from
  `/new-post` to `/feed?compose=1`.
- `app/(app)/feed/page.tsx` (the bare redirect page): forward the current
  query string when it replaces to `/feed/{eventId}`, so `?compose=1`
  survives the hop.
- `app/(app)/feed/[eventId]/page.tsx`: on mount, if `?compose=1` is present,
  auto-expand the composer and scroll it into view (then strip the param
  via `router.replace` so refreshing doesn't re-trigger it).
- `components/layout/MobileTabBar.tsx` is left untouched — its center "new
  post" tab item is already dead code (no `tabItems` entry sets
  `isCenter: true`), and fixing that is unrelated to this task.

## i18n

- New `ComposerCard` namespace in `messages/en.json` / `el.json`:
  `placeholder` (moved from `FeedPage.celebrateTheMoment`), plus caption
  placeholder/aria-label, add-photos label, remove-image aria-label,
  post/cancel button labels, per-file error/retry copy, max-images-reached
  copy.
- Remove the now-orphaned `NewPostPage` namespace (its page is deleted).
- `FeedPage.celebrateTheMoment` key is removed once its string moves to
  `ComposerCard.placeholder`.

## Files touched

- New: `components/feed/ComposerCard.tsx`
- Edit: `components/feed/index.ts` (export `ComposerCard`)
- Edit: `app/(app)/feed/[eventId]/page.tsx` (render the card, handle
  `?compose=1`)
- Edit: `app/(app)/feed/page.tsx` (forward query string on redirect)
- Edit: `components/layout/DesktopNavRail.tsx` (repoint New Post link)
- Edit: `hooks/useMedia.ts` (add `useUploadMediaBatch`)
- Edit: `lib/api/endpoints.ts`, `lib/api/types.ts` (batch upload plumbing)
- Edit: `messages/en.json`, `messages/el.json`
- Delete: `app/(app)/new-post/page.tsx`

## Testing

No test suite currently exercises the feed or post-creation flow (verified
by grepping for existing test files touching these areas — none found).
Verification will be manual: run the dev server, walk through
collapsed→expanded, add/remove images, trigger and retry a failed upload
(if reproducible), submit a text-only post and a post with images, confirm
network requests hit the right endpoints with the right payloads, and
confirm the card resets/collapses on success.
