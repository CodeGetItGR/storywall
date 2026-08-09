# FE integration guide: event post feed

Covers the changes to `GET /api/events/{eventId}/posts` and `PostResponseDto` — the feed
now returns everything needed to render a post (author, media, engagement counts) in one
request, and the endpoint is paginated. This is a **breaking change** to the feed endpoint's
response shape; `GET /api/posts/{id}`, `POST /api/posts`, and `DELETE /api/posts/{id}` are
unaffected except for the same additive `PostResponseDto` fields.

## What changed

| | Before | After |
|---|---|---|
| Response shape | `PostResponseDto[]` | `Page<PostResponseDto>` |
| Page size | unbounded (whole feed) | 20/page by default, max 100 |
| Order | undefined | pinned first, then newest |
| Soft-deleted posts | included | excluded |
| Author | `authorMemberId` only | `authorMemberId` **+** `author` object (name, avatar) |
| Media | not included — separate call per post | `media[]`, presigned URLs, already ordered |
| Comments / reactions | not included | `commentCount` / `reactionCount` |

The net effect: rendering a feed used to take 1 (posts) + 1 (media list per post) + 1
(media URL per attachment) + N (member lookups for author names) requests. It now takes
**one**.

## Fetching a page

```
GET /api/events/{eventId}/posts?page=0&size=20
Authorization: Bearer {accessToken}
```

- `page` — 0-indexed, defaults to `0`.
- `size` — defaults to `20`, capped server-side at `100` (a larger value is silently
  clamped, not rejected).
- `sort` is accepted but you shouldn't need it — the server default is
  `isPinned desc, createdAt desc` and there's no other meaningful order for a feed yet.

**200 response:**

```json
{
  "content": [
    {
      "id": "f1a2...uuid",
      "eventId": "a1c2...uuid",
      "authorMemberId": "b3f1...uuid",
      "author": {
        "memberId": "b3f1...uuid",
        "displayName": "Jamie Rivera",
        "nickname": "Maid of Honour",
        "role": "ATTENDEE",
        "avatarMediaId": "c4e5...uuid",
        "avatarUrl": "https://...presigned..."
      },
      "type": "MEDIA",
      "content": "So happy for you two!",
      "isPinned": false,
      "media": [
        {
          "id": "d5f6...uuid",
          "eventId": "a1c2...uuid",
          "uploaderMemberId": "b3f1...uuid",
          "storageKey": "events/.../photo.jpg",
          "mediaUrl": "https://...presigned...",
          "originalFilename": "photo.jpg",
          "mimeType": "image/jpeg",
          "mediaType": "IMAGE",
          "fileSize": 204800,
          "width": 1600,
          "height": 1200,
          "durationSeconds": null,
          "metadata": {},
          "createdAt": "2026-07-31T18:02:00Z",
          "deletedAt": null
        }
      ],
      "commentCount": 3,
      "reactionCount": 12,
      "createdAt": "2026-07-31T18:02:00Z",
      "updatedAt": "2026-07-31T18:02:00Z",
      "deletedAt": null
    }
  ],
  "totalElements": 47,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

Render a feed row entirely from `content[i]` — no follow-up requests needed for author
name/avatar or for media.

### `author` can be `null`

Two cases: the post has no author at all (rare — media-only import), or the authoring
member has since left the event. `Post.authorMember` uses `ON DELETE SET NULL`, so the
post survives but authorship is dropped. Always null-check before rendering:

```ts
const authorName = post.author?.displayName ?? "Unknown";
```

### `author.avatarUrl` can be `null` even when `avatarMediaId` is set

The avatar reference has no DB foreign-key constraint, so a dangling `avatarMediaId` (its
`Media` row was deleted) resolves to `avatarUrl: null` rather than erroring. Fall back to a
placeholder avatar, same as you already do elsewhere for missing avatars.

### `media[]` is already ordered and URL-resolved

Ordered by `displayOrder` — render as-is, no client-side sort needed. `mediaUrl` is a
short-lived presigned R2 URL (currently 15 min TTL) — don't cache it long-term. If a page
is kept open long enough for URLs to expire, re-fetch the page rather than trying to
refresh individual media URLs.

## Pagination UI

```ts
interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page, 0-indexed
  size: number;
}
```

Infinite-scroll pattern:

```ts
let page = 0;
const posts: PostResponseDto[] = [];

async function loadNextPage() {
  const res = await fetch(`/api/events/${eventId}/posts?page=${page}&size=20`);
  const data: Page<PostResponseDto> = await res.json();
  posts.push(...data.content);
  page += 1;
  return page < data.totalPages; // more pages available?
}
```

## What did NOT change

These sub-resource endpoints still exist, unchanged, for when you need the full list
rather than just a count:

```
GET /api/posts/{postId}/comments   → CommentResponseDto[]  (full comment thread)
GET /api/posts/{postId}/reactions  → ReactionResponseDto[] (full reactor list)
GET /api/posts/{postId}/media      → PostMediaResponseDto[] (rarely needed now —
                                      the feed already embeds resolved media)
```

Use `commentCount`/`reactionCount` from the feed row to decide *whether* to show a
"3 comments" affordance; only call `GET /api/posts/{postId}/comments` when the user
actually expands it.

`GET /api/posts/{id}` (single post) and `POST /api/posts` (create) return the same
enriched `PostResponseDto` shape shown above — no pagination envelope, since they're
already scoped to one post.

## Migration checklist

- [ ] Update the feed fetch to read `response.content` instead of treating the response
      as an array directly.
- [ ] Add pagination state (`page`, `totalPages`) to whatever list/infinite-scroll
      component renders the feed.
- [ ] Remove any client-side logic that separately fetched member info to show the
      author's name/avatar on a post — use `post.author` instead.
- [ ] Remove any per-post `GET /api/posts/{postId}/media` + per-attachment media fetch
      used just to render a post's images — use `post.media` instead.
- [ ] If you were filtering out soft-deleted posts client-side, that filter is now
      redundant (server excludes them) — safe to remove but not harmful to keep.
- [ ] Null-check `post.author` and `post.author?.avatarUrl` as described above.
