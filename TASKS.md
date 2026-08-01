# Deferred work

Things deliberately scoped out while building the feed migration and the post
reactions/comments/modal feature, so they don't get lost. None of these are
bugs in what shipped — each was an explicit scope decision at the time.

## From the reactions/comments/modal feature

- **Multiple reaction types.** Only a single LIKE toggle exists today. The
  backend's `reactionType` is a free string, so Facebook-style reactions
  (love, laugh, etc.) are possible later, but would need a picker UI and a
  decided fixed set of types.
- **Threaded comment replies.** Comments are a flat list. The API already
  supports `parentCommentId` on `CommentRequestDto` — nothing server-side
  blocks adding replies, it just isn't built.
- **Per-comment likes.** Removed entirely — the backend only supports
  reactions on posts, not comments. Would need a new backend endpoint first.
- **Deleting posts or comments.** `PostCard`'s "..." menu is still a no-op.
  Needs its own permission check (author-or-host) and confirmation UX.
- **`PostModal` accessibility.** No `role="dialog"`/`aria-modal`, no focus
  trap, no initial-focus management, no body-scroll lock while open. Flagged
  in review as a real gap, accepted for now since it's the first modal in
  the app and nothing else to pattern-match against yet.
- **`usePostLike`'s in-flight guard is per-component-instance, not
  per-post.** Two mounted instances of the same post's like button could
  race in theory; not reachable today because `PostModal` is a full-viewport
  overlay that blocks clicks on the feed behind it (documented in a code
  comment in `hooks/usePostLike.ts`). Would need a shared mutex if that UI
  structure ever changes (e.g. a non-modal side-by-side post view).

## Not yet migrated off mock data

- **Stories** (`components/feed/StoriesRow.tsx`, `StoryAvatar.tsx`,
  `app/(app)/story/[id]/page.tsx`) — still fully mock-data-driven.
- Everything under `app/(app)/tools/*` (gifts, wishbook, playlist, schedule,
  quiz, seating, future-messages) and `RightContextPanel.tsx` — still mock
  data, untouched by either of these two efforts.
