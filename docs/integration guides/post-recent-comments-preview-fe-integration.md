# Integration Guide: Post feed comment preview (`recentComments`)

Added 2026-09-04. Scope: this single change only — see
`post-feed-fe-integration.md` for the rest of `PostResponseDto`, and
`comments-pagination-fe-integration.md` for the full paginated comment thread.

## What changed

A new field on `PostResponseDto`, non-breaking:

```ts
interface PostResponseDto {
  // ...existing fields unchanged...
  commentCount: number;
  recentComments: CommentResponseDto[]; // NEW — the post's 2 most recent comments
  // ...
}
```

Returned by both endpoints that already return `PostResponseDto`:

| Method | Path | Response |
|---|---|---|
| GET | `/api/events/{eventId}/posts?page=&size=` | `Page<PostResponseDto>` — every post in `content[]` has it |
| GET | `/api/posts/{id}` | `PostResponseDto` |

No request changes needed — `recentComments` is always included, same as `commentCount`.

## Why this exists

The goal is a "latest comments" preview under a feed row — the kind you see on Instagram or
Facebook — without opening the full comment thread and without triggering a
`GET /api/posts/{postId}/comments` call per post as the feed scrolls (an N+1 problem). Since
`PostService` already batch-resolves media, author, and engagement counts for a whole feed page
in a fixed number of queries, `recentComments` is resolved the same way — one extra batched query
for the entire page, not one per post. See "Performance note" below.

## Using it

```ts
const page: Page<PostResponseDto> = await fetch(`/api/events/${eventId}/posts`).then(r => r.json());

page.content.forEach(post => {
  if (post.commentCount === 0) return; // nothing to preview

  renderCommentPreview(post.id, post.recentComments);
  // e.g. "Jamie: Congrats!! · Alex: Thank you!"

  if (post.commentCount > post.recentComments.length) {
    renderViewAllLink(post.id, post.commentCount);
    // opens the full thread — GET /api/posts/{postId}/comments, see
    // comments-pagination-fe-integration.md
  }
});
```

### Ordering: oldest-first, same convention as the full thread

`recentComments` is sorted **oldest-first** — the same convention
`comments-pagination-fe-integration.md` documents for the full paginated endpoint, and for the
same reason: if both entries happen to be a parent/reply pair, the parent renders before the
reply, never after it.

### It counts replies too, not just top-level comments

`recentComments` is simply "the 2 most recently created comments on this post," regardless of
`parentCommentId`. It does not attempt to reconstruct or filter by thread structure — that stays
a concern of the full paginated endpoint only.

### `recentComments` uses the plain `CommentResponseDto` shape

Same shape as `GET /api/posts/{postId}/comments` — `authorMemberId` only, no embedded display
name or avatar. Resolve author info for these the same way you already do for the full thread
(e.g. from a cached event-members list).

## What it does *not* give you

- **No pagination of the preview itself.** It's always at most 2 comments, always the 2 newest.
  If a comment is added or deleted, `recentComments` on that post's row is stale until the feed
  page is refetched — this is a preview, not a live subscription.
- **No thread reconstruction.** Don't try to stitch `recentComments` into whatever nested-reply
  tree you build from the full paginated thread; treat them as two independent pieces of UI.

## Edge cases

- **No comments on the post.** `recentComments` is `[]` (never `null`) and `commentCount` is `0`
  — gate rendering the preview UI on `commentCount > 0`, same check you already use for the
  "N comments" affordance.
- **Exactly 1 or 2 comments total.** `recentComments` has all of them; don't show a "view all"
  link in that case (`commentCount > recentComments.length` is `false`).
- **Right after creating a post** (`POST /api/posts`). `recentComments` is `[]` — a fresh post
  can't have comments yet.
- **Soft-deleted comments.** Not filtered out by this query (same pre-existing behavior as the
  full paginated comments endpoint and `commentCount` — this change doesn't alter that).

## Performance note (if you're curious, not required reading)

Resolving `recentComments` for a whole feed page costs exactly **one extra query total**, not one
per post: a single native query ranks each post's comments by recency with a SQL window function
and returns only the top 2 per post, for every post id on the page at once. Query count for a
feed page stays constant regardless of how many posts are on it — same pattern already used for
`commentCount`/`media`/`author`, unchanged by this addition.
