# Post media lightbox design

Date: 2026-08-02

## Context

`PostModal` (see [2026-08-01-post-engagement-modal-design.md](2026-08-01-post-engagement-modal-design.md))
already opens as a `?post=id`-driven overlay with a desktop split layout
(media left, comments right via `lg:grid-cols-5`), but:

- media isn't clickable on `PostCard` — the only way into the modal is the
  comment icon.
- only `post.media[0]` ever renders, capped inside a `max-w-4xl` centered
  box — no carousel for posts with multiple media items.
- on mobile the media pane is `hidden lg:block` — mobile users never see
  the photo at all inside the modal, only the comment thread.

This spec adds a Facebook-style full-screen lightbox: clicking any media
thumbnail opens the modal full-screen at that item, with a swipeable
carousel if the post has more than one; on mobile the photo fills the
screen and comments live in a sheet that's collapsed (showing just an
overview) or expanded, depending on how the modal was opened.

## Goals

- Clicking a post's media opens the modal full-screen, at the clicked item.
- Multiple media per post are navigable via a carousel (arrows + swipe).
- Desktop: full-viewport split, media left / comments right (comments
  always visible).
- Mobile: full-viewport media; comments start collapsed to an overview
  (author, truncated caption, reaction/comment counts) and expand into a
  sheet on tap — except when entered via the comment icon, which opens
  straight into the expanded sheet.
- Media index and view state live in the URL — deep-linkable, back-button
  friendly, survives refresh.
- Text-only posts (no media) keep today's centered-modal layout unchanged.

## Non-goals

- Video/audio/document rendering — nothing in the codebase renders these
  media types today (`PostCard`/`PostModal` both assume images); this pass
  doesn't add that. `MediaResponseDto.mediaType` values other than
  `IMAGE` are out of scope and untouched.
- New reaction/comment data logic — this is a pure layout/navigation
  change on top of the existing `usePost`/`usePostComments`/`usePostLike`
  data hooks.
- Pinch-to-zoom or dragging within a single image.

## `usePostModal` changes

Extend `hooks/usePostModal.ts` to track two more URL params alongside
`post`:

- `media` — 0-based index into `post.media`, defaults to `0` when absent.
- `view` — `'media' | 'comments'`, defaults to `'media'` when absent.
  Only meaningful on mobile (desktop always shows comments alongside
  media); ignored when the post has no media.

```ts
function usePostModal() {
    const postId = searchParams.get('post');
    const mediaIndex = Number(searchParams.get('media') ?? 0);
    const view = (searchParams.get('view') as 'media' | 'comments') ?? 'media';

    function open(id: string, opts?: { mediaIndex?: number; view?: 'media' | 'comments' }) {
        // sets post, and media/view only when non-default, then router.push
    }

    function setMediaIndex(index: number) {
        // same params with media replaced, router.replace (no history entry per slide)
    }

    function close() {
        // strips post, media, view; router.push
    }

    return { postId, mediaIndex, view, isOpen: postId !== null, open, setMediaIndex, close };
}
```

`open` omits `media`/`view` from the query string when they're the
default, so a plain comment-icon click on a single-media post still
produces the same `?post=id` URL as today when nothing needs it —
`view=comments` is only appended when non-default (i.e. always, since
`'media'` is the default), and `media` only when `mediaIndex > 0`.

## Carousel

Add the shadcn carousel component (`npx shadcn add carousel`, pulls in
`embla-carousel-react`) as `components/ui/carousel.tsx` — first new
runtime dependency for media browsing in this project.

New `components/feed/post/PostMediaCarousel.tsx`:

- Props: `media: MediaResponseDto[]`, `initialIndex: number`,
  `onIndexChange: (index: number) => void`, `alt: string`.
- Wraps the shadcn `Carousel`/`CarouselContent`/`CarouselItem` primitives,
  seeded to `initialIndex` via Embla's `startIndex` option; listens for
  Embla's `select` event and calls `onIndexChange`.
- Renders each item with `next/image` (`object-contain`, fills the
  slide), matching how `PostModal` already renders `post.media[0]` today.
- Prev/next arrow buttons (Embla's `scrollPrev`/`scrollNext`) shown when
  `media.length > 1`, hidden otherwise. A small dot/counter indicator
  (`1 / 4`) overlaid bottom-center, also only when `media.length > 1`.
- Swipe/drag works out of the box via Embla on touch devices.

`onIndexChange` is wired straight to `usePostModal().setMediaIndex`, so
paging through the carousel keeps the URL in sync without adding history
entries.

## `Modal` changes

Add a `full` size to `components/ui/modal.tsx`'s `sizeMap`: full viewport
(`w-screen h-dvh` or equivalent), no rounded corners, no centering
transform — used only by `PostModal` when the post has media. Existing
consumers (composer, etc.) are untouched since they pass `sm`/`md`/`lg`.

## `PostModal` changes

Branch on `post.media.length`:

**No media:** unchanged — `size="lg"` centered modal, existing
header/author/reaction row + comment list + composer layout as-is.

**Has media:** `size="full"`.

- **Desktop (`lg:` and up):** `lg:grid-cols-5` split, unchanged
  proportions from today (`lg:col-span-3` media / `lg:col-span-2`
  comments) but now filling the full viewport instead of a capped box.
  Left pane renders `PostMediaCarousel`. Right pane is the existing
  author/reaction/comment-list/composer block, always visible — `view`
  is not read on desktop.
- **Mobile (below `lg:`):** `PostMediaCarousel` fills the screen. A
  bottom-anchored gradient overlay (visible when the comments sheet is
  collapsed) shows `PostAuthorAvatar`, a line-clamped `post.content`, and
  `ReactionCount`/`CommentCount`, tappable to expand the sheet. The
  comments sheet is the same author/reaction row + comment list +
  composer block used on desktop, rendered as a panel that covers ~85dvh
  sliding up from the bottom (`translate-y-full` ↔ `translate-y-0`
  transition) instead of `hidden`/`flex`.
    - Sheet expanded state is local `useState`, seeded from
      `usePostModal().view === 'comments'` on mount (not re-derived from
      URL after that, so dragging the sheet down doesn't fight the URL and
      vice versa — `view` only decides the _initial_ state for this pass).
    - Tapping the overlay or the sheet's own close affordance toggles the
      local state; it does not change the URL. Closing the whole modal
      (X / Escape / backdrop / back) behaves exactly as it does today.

## `PostCard` changes

- Single-media and grid media blocks: wrap each `<Image>` in a `button`
  (was a plain `<div>`) with `onClick={() => openPostModal(post.id, { mediaIndex: i })}`
  (`i` is `0` for the single-media case). The "+N more" tile (4th grid
  slot when `media.length > 4`) opens at index `3`, same as clicking any
  other grid tile.
- Comment button (`showCommentLink` branch): `onClick={() => openPostModal(post.id, { mediaIndex: 0, view: 'comments' })}`.
  On a text-only post this is equivalent to today's `openPostModal(post.id)`
  since `view` is ignored when there's no media.

## Testing

- `usePostModal`: `open` with/without `mediaIndex`/`view` produces the
  expected query string (omits defaults); `setMediaIndex` uses `replace`
  and doesn't touch `view`; `close` strips all three params.
- `PostMediaCarousel`: seeds to `initialIndex`; calling Embla's
  prev/next fires `onIndexChange` with the right index; arrows/indicator
  hidden for single-item media.
- `PostModal`: text-only post renders the unchanged `lg` layout; posts
  with media render `size="full"` with the split on desktop; mobile sheet
  starts expanded when opened with `view=comments`, collapsed otherwise.
- `PostCard`: clicking the Nth grid thumbnail calls `openPostModal` with
  `mediaIndex: N`; clicking the comment icon passes `view: 'comments'`.

Manual verification in the browser: click through single-media and
multi-media posts from the feed grid, confirm the lightbox opens at the
clicked item; swipe/arrow through a multi-media post and confirm the URL
`media` param follows; on a mobile viewport, open via media (sheet
collapsed, overview visible) and via the comment icon (sheet expanded);
drag the sheet down and back up; confirm closing via X/Escape/backdrop/
back all still work; confirm a text-only post's modal is unchanged.

## Translations

New copy needed in both `messages/en.json` and `messages/el.json` under
the `PostModal` namespace: sheet collapse/expand affordance label(s) if
any icon-only controls need `aria-label`s (carousel prev/next, sheet
toggle). Reuse existing `PostCard`/`PostModal` keys (`photoBy`, author
name fallback, etc.) wherever the copy is already covered.
