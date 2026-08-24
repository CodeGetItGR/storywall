# Post modal portal + reusable modal system

Date: 2026-08-01

## Context

`PostModal` (see [2026-08-01-post-engagement-modal-design.md](2026-08-01-post-engagement-modal-design.md))
is currently rendered inline inside `FeedPage`'s JSX tree (`components/feed/PostModal.tsx`,
mounted from `app/(app)/feed/[eventId]/page.tsx`). It isn't a portal, its
open/close URL logic (`?post=` param) lives directly in `FeedPage`, and its
responsive layout breaks down at larger viewports: `min-h-[85vh]` combined
with an implicit-height `lg:grid-cols-5` layout lets content (the media
panel, the comment list) overflow the modal shell on both axes instead of
being contained and internally scrollable.

This spec covers: extracting a generic, reusable `Modal` UI primitive
(portal-based) with a provider/hook backing it, a `usePostModal` hook that
moves the `?post=` URL logic out of `FeedPage`, and fixing `PostModal`'s
layout so it never overflows the viewport regardless of screen size.

## Goals

- `PostModal` renders through a React portal instead of being inlined in
  the feed's DOM subtree.
- A generic `Modal` primitive + `ModalProvider`/`useModal()` exist and are
  wired app-wide, ready for future modals beyond posts.
- `?post=` open/close logic is extracted into a reusable `usePostModal()`
  hook instead of living in `FeedPage`.
- The modal shell never exceeds the viewport on X or Y at any breakpoint;
  overflow is handled internally (scrollable regions) by content that needs
  it, not by the shell growing past the viewport.

## Non-goals

- No modal stacking/multiple-simultaneous-modals support — a single active
  modal is enough for current usage (post modal only).
- No change to what `PostModal` displays or how comments/likes work — pure
  structural/layout refactor.
- No animation/transition work beyond whatever comes for free from the
  primitive's default styling.

## `Modal` primitive — `components/ui/modal.tsx`

Declarative API:

```tsx
<Modal open={boolean} onClose={() => void} size="sm" | "md" | "lg">
  <Modal.Body>{/* scrollable content */}</Modal.Body>
</Modal>
```

- Renders via `createPortal` into a lazily-created `#modal-root` div
  appended to `document.body` (created on first use, reused after).
- Owns: backdrop (click-to-close), `Escape`-to-close (`keydown` listener
  while `open`), and document body scroll lock while `open` (toggle
  `overflow: hidden` on `<body>`, restored on close/unmount).
- Shell sizing: `max-w-{size}` (mapped per `size` prop) and
  `max-h-[90dvh]` with `overflow-hidden` on the outer shell — the shell
  itself can never exceed the viewport in either axis.
- `Modal.Body`: a sub-component providing `flex-1 overflow-y-auto
min-h-0` — the designated scrollable region for content that can grow
  (e.g. a comment list). Consumers that need internal horizontal
  constraints (e.g. a media panel) are responsible for their own
  `min-w-0`/`object-contain`, same as any flex/grid child.
- No built-in header/footer/title — `PostModal` keeps its own header and
  comment-composer footer as children; the primitive only owns the
  portal/backdrop/sizing/scroll-lock behavior.
- Not exported with post-specific concerns (no knowledge of `postId`,
  routing, etc.) — stays fully generic.

## `ModalProvider` + `useModal()` — `providers/ModalProvider.tsx`

- Wired into `providers/Providers.tsx` alongside `AuthProvider`/
  `EventProvider`.
- Tracks a single active modal's open state generically: `{ isOpen,
openModal(), closeModal() }`. Deliberately minimal — it does not own
  _content_, since `PostModal`'s content stays URL-driven (see below).
  This keeps the provider reusable for a future modal that _does_ want the
  provider to own its open state, without forcing `PostModal` through an
  extra indirection it doesn't need.
- Follows the existing `EventProvider` context pattern (`createContext` +
  `useContext` + a `useXyz` accessor that throws outside the provider).

## `usePostModal()` — `hooks/usePostModal.ts`

- Reads `?post=` via `useSearchParams()`, exposes
  `{ postId: string | null, isOpen: boolean, open(postId: string): void, close(): void }`.
- `open`/`close` replicate `FeedPage`'s current URL logic exactly (push
  `?post=<id>` merged with existing params to open; strip `post` while
  preserving other params to close) — moved verbatim out of `FeedPage`
  into the hook so any component (e.g. `PostCard`'s comment button, which
  today hand-rolls the same `router.push`) can reuse it.
- URL remains the sole source of truth for which post is open — no
  duplicated React state, no dependency on `ModalProvider`/`useModal()`
  (that provider is for future non-URL-backed modals).

## `PostModal` changes

- Wrap existing content in `<Modal open={isOpen} onClose={close} size="lg">`,
  driven by `usePostModal()` instead of receiving `postId`/`onCloseAction` props
  directly from `FeedPage`.
- Move the comment list into `<Modal.Body>` so it scrolls internally
  instead of growing the shell.
- Media panel (`lg:col-span-3` black panel): constrain with `min-w-0
min-h-0` inside the grid cell and keep `object-scale-down` so the image
  never forces the grid — and therefore the shell — wider or taller than
  available space.
- Drop the existing manual `Escape`-key `useEffect` (now handled by
  `Modal`) and the manual backdrop `onClickAction`/`stopPropagation` (now
  handled by `Modal`).

## `FeedPage` changes

- Replace the local `openPostId`/`closeModal` logic and `searchParams.get('post')`
  read with `const { postId, isOpen, close } = usePostModal()`.
- Render `<PostModal />` unconditionally (it reads its own state via
  `usePostModal()` internally) instead of conditionally rendering based on
  `openPostId`.

## Testing

- `Modal`: renders children via portal into `#modal-root`; `Escape` and
  backdrop click call `onCloseAction`; body scroll is locked while open and
  restored on close; shell never exceeds `max-h-[90dvh]`.
- `usePostModal`: `open(id)` sets `?post=id` preserving other params;
  `close()` strips `post` preserving other params; `postId`/`isOpen`
  reflect the current URL.
- `PostModal`: existing behavior (loading, 404, comments, comment
  composer) unchanged; manual verification that at no breakpoint (mobile,
  tablet, desktop, and a large/ultra-wide viewport) does modal content
  overflow the viewport on X or Y, and that the comment list scrolls
  internally when long.

Manual verification in the browser (per this project's UI-change
workflow): open the modal from the feed and via a direct `/post/[id]`
link at multiple viewport widths (mobile, tablet, desktop, wide desktop),
confirm no horizontal/vertical overflow of the modal shell, confirm long
comment lists scroll internally, confirm Escape/backdrop/X/back-button
close behavior all still work.
