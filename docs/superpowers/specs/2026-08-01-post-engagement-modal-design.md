# Post engagement + modal design

Date: 2026-08-01

## Context

The feed (`/feed/[eventId]`) now renders real `PostResponseDto` posts (see
[2026-07-11-api-migration-design.md](2026-07-11-api-migration-design.md)), but
liking and commenting are not wired up:

- `PostCard`'s heart button is a local-only optimistic toggle seeded from
  `reactionCount`; it never calls the reactions API.
- `/post/[id]` (the post detail page) is entirely mock-data-driven — mock
  posts, mock comments, mock users.
- Real hooks already exist for both (`useReactions.ts`, `useComments.ts`)
  but nothing in the UI calls them.

The backend has since added `likedByCurrentUser: boolean` to
`PostResponseDto`, returned on both `GET /api/events/{eventId}/posts` and
`GET /api/posts/{id}` — `true` if the requesting member has any reaction on
the post. This makes it possible to render accurate liked/unliked state on
every feed row without an extra request per post.

This spec covers: wiring reactions and comments to the real backend, and
turning the post detail experience into a modal opened from the feed
(Facebook/Instagram-style) instead of a full page navigation.

## Goals

- Feed heart button reflects and mutates real reaction state.
- Post detail (content, media, comments) opens as a modal over the feed,
  is deep-linkable, and is backed by real data end to end.
- Comments can be read and posted for real.

## Non-goals (explicitly out of scope for this pass)

- Multiple reaction types (love, laugh, etc.) — single LIKE toggle only.
- Threaded comment replies — flat list only. `CommentRequestDto.parentCommentId`
  is left unused; nothing forecloses adding replies later.
- Per-comment likes — no backend support (reactions are post-scoped only);
  the like button on comments is removed, not stubbed.
- Deleting posts or comments — the post's "..." menu remains a no-op.

## Data layer

### `PostResponseDto.likedByCurrentUser`

Add to `lib/api/types.ts`:

```ts
export interface PostResponseDto {
    // ...existing fields...
    commentCount: number;
    reactionCount: number;
    likedByCurrentUser: boolean; // NEW
    // ...
}
```

Always `false` immediately after `POST /api/posts` (a fresh post can't have
reactions yet) and `false` for a caller who isn't a member of the post's
event — both are server-resolved, no client handling needed.

### `usePostLike(post)` — new hook, `hooks/usePostLike.ts`

Shared by the feed card and the modal. Takes the post object currently in
hand (from either the feed's infinite-query cache or the single-post
`postKeys.detail` cache) and returns `{ liked, count, toggle, isPending }`.

Behavior on `toggle()`:

1. Optimistically flip `likedByCurrentUser` and `reactionCount` (±1) on the
   post in **both** caches that might hold it —
   `postKeys.list(post.eventId)` (patch the matching post inside whichever
   page of `InfiniteData` contains it) and `postKeys.detail(post.id)` — via
   `queryClient.setQueryData`.
2. **Liking** (`liked` was `false`): call `useCreateReaction` with
   `{ postId: post.id, memberId: activeMember.id, reactionType: "LIKE" }`.
   On success, remember the returned `reaction.id` in a small in-memory map
   (`Map<postId, reactionId>` module-level in the hook file, not persisted)
   so a later unlike in the same session doesn't need a lookup.
3. **Unliking** (`liked` was `true`): if the reaction id is known (from step
   2, or because the modal already loaded the full reactor list this
   session), call `useDeleteReaction` directly. If not known — the user
   liked this post in an earlier session and we've only ever seen the
   boolean — fall back once to `usePostReactions(postId)`, find the entry
   where `memberId === activeMember.id`, then delete it. This fallback
   fetch only ever happens on that specific unlike action, not on render.
4. On mutation error, roll back the optimistic patch in both caches.

`activeMember` comes from `useActiveMember()` (`providers/EventProvider`),
same as `ComposerCard`. If there's no active member (shouldn't normally
happen inside an event's feed), `toggle` is a no-op.

### Comment count sync

`useCreateComment`'s existing `onSuccess` (in `hooks/useComments.ts`)
additionally patches `commentCount + 1` on the post in both caches, the same
way `usePostLike` patches reaction fields — keeps the feed row's comment
count correct after commenting from the modal without waiting on a refetch.

## `PostCard` changes

- Heart button: replace local `useState` liked/count with
  `usePostLike(post)`; `onClickAction` calls `toggle()`; disable while
  `isPending` to prevent double-taps.
- Comment affordance: instead of `<Link href="/post/${post.id}">`, render a
  button that opens the modal by pushing `?post=${post.id}` onto the
  current URL (`router.push` with the same pathname + merged search
  params, not a full navigation). `showCommentLink` prop is repurposed to
  mean "clicking the comment count opens the modal" (kept `true` by
  default; `false` still used by the modal itself so it doesn't render a
  button that reopens itself).

## Post modal — new component, `components/feed/PostModal.tsx`

- Props: `postId: string`, `onClose: () => void`.
- Data: `usePost(postId)` for the post (works standalone, so the modal
  doesn't require the post to already be in the feed's cache — needed for
  direct deep links), `usePostComments(postId)` for the flat comment list,
  `useEventMembers(post.eventId)` once the post loads, to resolve each
  comment's `authorMemberId` to a display name.
- Layout: reuses the same content/media rendering as `PostCard` (extract
  the header/content/media block into a shared internal render, or render
  `<PostCard post={post} showCommentLink={false} />` at the top — simplest
  is composing the existing `PostCard`) followed by a comment list and a
  comment composer.
- Comment rows: initials-only `Avatar` (`initials={initialsFromName(member?.displayName ?? '?')}`,
  `color={avatarColorFromId(comment.authorMemberId ?? comment.id)}`) — no
  avatar image, since `CommentResponseDto` has no embedded author/avatar
  and resolving one per commenter would reintroduce an N+1. No per-comment
  like button.
- Comment composer: posts via `useCreateComment({ postId, authorMemberId: activeMember.id, content })`.
- Loading: skeleton/placeholder while `usePost`/`usePostComments` are
  pending. Error: if the post 404s, show the same `EventNotFound`-style
  empty state, scoped to "post not found" copy.
- Closing: calls `onCloseAction`, which the feed page wires to remove `?post=`
  from the URL. Also closable via Escape key and backdrop click.

## Routing

- **Feed page** (`app/(app)/feed/[eventId]/page.tsx`): reads `post` from
  `useSearchParams()`. When present, renders `<PostModal postId={post} onClose={...} />`
  as an overlay on top of the existing feed content (not a route change —
  the feed underneath stays mounted). `onCloseAction` calls
  `router.push(pathname)` (strips the query param) — using `push` (not
  `back`) so closing always lands on the plain feed URL regardless of how
  the modal was reached, while still letting the browser back button close
  it naturally (back button undoes the `push` that opened it).
- **`/post/[id]` page**: replaced with a thin resolver — `usePost(id)` to
  learn the post's `eventId`, then `router.replace(/feed/${eventId}?post=${id})`.
  Shows a loading state while resolving; shows the existing
  `EventNotFound` component if the post doesn't exist. This removes the
  standalone mock-data-driven post page entirely (including its
  now-unused mock comment-composer UI) — one modal implementation instead
  of two.

## Testing

- `usePostLike`: like → unlike → like cycle updates both caches; unlike
  without a known reaction id falls back to the reactor-list lookup;
  mutation failure rolls back the optimistic state.
- `PostCard`: heart tap calls the reaction mutation with the right
  `reactionType`; comment tap updates the URL instead of navigating.
- `PostModal`: renders comments with resolved member names; posting a
  comment appends it and bumps the feed's cached `commentCount`; 404 post
  shows the not-found state.
- `/post/[id]` → redirects to `/feed/{eventId}?post={id}`.

Manual verification in the browser (per this project's UI-change workflow):
like/unlike a post from the feed and confirm count + fill persist across a
refresh; open a post from the feed and via a direct `/post/[id]` link;
post a comment and confirm it appears and the feed's comment count updates;
close the modal via X, Escape, backdrop, and browser back.
