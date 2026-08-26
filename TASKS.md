# Deferred work

Things deliberately scoped out while building the feed migration and the post
reactions/comments/modal feature, so they don't get lost. None of these are
bugs in what shipped β€” each was an explicit scope decision at the time.

## From the reactions/comments/modal feature

- **Multiple reaction types.** Only a single LIKE toggle exists today. The
  backend's `reactionType` is a free string, so Facebook-style reactions
  (love, laugh, etc.) are possible later, but would need a picker UI and a
  decided fixed set of types.
- **Threaded comment replies.** Comments are a flat list. The API already
  supports `parentCommentId` on `CommentRequestDto` β€” nothing server-side
  blocks adding replies, it just isn't built.
- **Per-comment likes.** Removed entirely β€” the backend only supports
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
  `app/(app)/story/[id]/page.tsx`) still fully mock-data-driven.
- **`app/(app)/notifications/page.tsx`** and **`components/layout/DesktopNavRail.tsx`** β€” still read from `lib/mock-data.ts`.
- **`app/(app)/tools/schedule/page.tsx`**, **`app/(app)/tools/gifts/page.tsx`**, **`app/(app)/tools/wishbook/page.tsx`**, **`app/(app)/tools/quiz/page.tsx`**, **`app/(app)/tools/seating/page.tsx`**, **`app/(app)/tools/future-messages/page.tsx`** β€” still mock-data-driven.
- **`app/(app)/tools/playlist/page.tsx`** now wired to the real playlist API and no longer part of the mock-data backlog.

## 26-08-2026

- Check why stories persist after 24h.
- Event creation form step titles.
- Keep originals is included in every plan and should be explicitly mentioned in the plan selection step.
- Create set-up wizard for new hosts. Show them around.
- Remove paid addons step.
- Map pin opens schedule (it should open location)?

- Plan selection stop - Title and price needs to grow in size, below the title goes the member count, then the storage (we need to emphasize those, these are basically the differentiators between the plans), then the rest.
- Move the "Logout" button towards the top of the side bar to prevent accidental press. Also add some confirmation before logout.
- Posts comment and like icons (make them larger)
- Change the placeholder of the composer bar (feed), same as the composer modal.
- In plan selection step, remove the plan modules hint (top right corner), and add a "more info" at the bottom of the card, and it should open a bottom-top pop-up with all the extra info.
- Change the schedule story's icon with the event's date badge (similar to how the schedule story shows when it opens).
- When you press an image in a feed post, the comments modal briefly appears, this is a visual bug.
