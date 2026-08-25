# FE integration guide: comment pagination

Covers a **breaking change** to `GET /api/posts/{postId}/comments` — it used to return a
post's entire comment thread in one response; it's now paginated. No other comment
endpoint is affected: `GET /api/comments/{id}`, `POST /api/comments`, and
`DELETE /api/comments/{id}` all keep their current shapes.

## What changed

| | Before | After |
|---|---|---|
| Response shape | `CommentResponseDto[]` | `Page<CommentResponseDto>` |
| Page size | unbounded (whole thread) | 30/page by default, max 100 |
| Order | insertion order | **oldest first** — see below |

## Why oldest-first, not newest-first

Every other paginated list endpoint in this API (posts, gallery media, notifications, the
admin logs) sorts newest-first, because it's showing a feed where the most recent item is
the most relevant. Comments are different: `parentCommentId` links a reply to its parent
for client-side thread reconstruction, and a reply always has a later `createdAt` than its
parent (you can't reply to a comment that doesn't exist yet).

Sorting **ascending** on `createdAt` (then `id` as a tiebreaker) guarantees a comment's
parent is always on the same page or an earlier page than the reply — never a later one.
If this endpoint sorted newest-first instead, page 1 could show a reply with its parent
comment several pages away, breaking thread reconstruction for anything but the very first
page.

## Fetching a page

```
GET /api/posts/{postId}/comments?page=0&size=30
Authorization: Bearer {accessToken}
```

- `page` — 0-indexed, defaults to `0`.
- `size` — defaults to `30`, capped server-side at `100`.
- Sort is fixed server-side (oldest first) — there's no `sort` param to pass.

**200 response:**

```json
{
  "content": [
    {
      "id": "e7a1...uuid",
      "postId": "f1a2...uuid",
      "authorMemberId": "b3f1...uuid",
      "parentCommentId": null,
      "content": "Congrats!!",
      "createdAt": "2026-07-31T18:10:00Z",
      "updatedAt": "2026-07-31T18:10:00Z",
      "deletedAt": null
    },
    {
      "id": "e7a2...uuid",
      "postId": "f1a2...uuid",
      "authorMemberId": "c4e5...uuid",
      "parentCommentId": "e7a1...uuid",
      "content": "Thank you!",
      "createdAt": "2026-07-31T18:12:00Z",
      "updatedAt": "2026-07-31T18:12:00Z",
      "deletedAt": null
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "number": 0,
  "size": 30
}
```

Same `Page<T>` envelope as the post feed — see
[`post-feed-fe-integration.md`](post-feed-fe-integration.md#pagination-ui) for the
`interface Page<T>` shape and a reusable paging loop (swap the endpoint and item type).
Use the feed row's `commentCount` (from `GET /api/events/{eventId}/posts`) to decide
*whether* to show a "3 comments" affordance before making this call at all.

## Migration checklist

- [ ] Update the comment-thread fetch to read `response.content` instead of treating the
      response as an array directly.
- [ ] If the UI builds a nested reply tree from the flat list client-side, keep doing that
      per-page — since ordering guarantees a parent is never on a later page than its
      reply, a straightforward "append this page's comments, rebuild the tree" works
      without needing all pages loaded at once.
- [ ] Add "load more comments" (or infinite scroll) using `totalPages`/`totalElements`,
      the same way it already exists for the post feed.
- [ ] Do not add a client-side "sort by newest" toggle without also re-fetching further
      pages first — reversing only the loaded page's order will visually separate replies
      from parents that haven't been fetched yet.
