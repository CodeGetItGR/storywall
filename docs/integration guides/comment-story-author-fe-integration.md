# FE integration guide: author info on comments and stories

Added 2026-09-15. **Breaking change** to `CommentResponseDto` and `StoryResponseDto`: the
presigned-avatar-only `authorAvatarUrl` field is replaced with a nested `author` object —
the same shape posts already return — so comments and stories no longer need a separate
member lookup to show the author's name.

Posts are unaffected — `PostResponseDto.author` already had this shape (see
[`post-feed-fe-integration.md`](post-feed-fe-integration.md)). This just brings comments and
stories in line with it.

## What changed

| | Before | After |
|---|---|---|
| `CommentResponseDto` | `authorMemberId` + `authorAvatarUrl` | `authorMemberId` **+** `author` object (name, nickname, role, avatar) |
| `StoryResponseDto` | `authorMemberId` + `authorAvatarUrl` | `authorMemberId` **+** `author` object (name, nickname, role, avatar) |

`author` is the same `AuthorDto` shape used by `PostResponseDto.author`:

```ts
interface AuthorDto {
  memberId: string;
  displayName: string;
  nickname: string | null;
  role: "HOST" | "ATTENDEE"; // EventRole
  avatarUrl: string | null; // short-lived presigned URL, resolved from the author's account profilePictureKey
}

interface CommentResponseDto {
  id: string;
  postId: string;
  authorMemberId: string | null;
  author: AuthorDto | null; // NEW — replaces authorAvatarUrl
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface StoryResponseDto {
  id: string;
  eventId: string;
  authorMemberId: string | null;
  author: AuthorDto | null; // NEW — replaces authorAvatarUrl
  mediaId: string;
  caption: string | null;
  songUrl: string | null;
  expiresAt: string;
  createdAt: string;
  deletedAt: string | null;
  viewedByCurrentUser: boolean;
}
```

Every endpoint that returns either DTO is affected — nothing to opt into:

| Resource | Endpoints |
|---|---|
| Comments | `GET /api/posts/{postId}/comments`, `GET /api/comments/{id}`, `POST /api/comments` |
| Comments (embedded) | `recentComments[]` on `GET /api/events/{eventId}/posts` and `GET /api/posts/{id}` — see [`post-recent-comments-preview-fe-integration.md`](post-recent-comments-preview-fe-integration.md) |
| Stories | `GET /api/events/{eventId}/stories`, `GET /api/stories/{id}`, `POST /api/stories`, `POST /api/stories/batch` |

## Why

Comments and stories only ever returned `authorMemberId` (plus, since 2026-09-12, a resolved
avatar URL) — no name. The FE had to resolve the id to a display name itself, typically
against a cached event-members list fetched separately. That's an extra round trip (or a
staleness risk if the cached member list is out of date) for something the backend can supply
for free: the author `EventMember` is already loaded to resolve the avatar URL, and
`displayName`/`nickname`/`role` are plain columns on that same row — no additional query, same
batched-resolution pattern posts already use.

## Migration checklist

- [ ] Stop resolving comment/story author names from a separately-fetched member list — read
      `author.displayName` (and `author.nickname`/`author.role` if your UI uses them) directly.
- [ ] Replace any `comment.authorAvatarUrl` / `story.authorAvatarUrl` read with
      `comment.author?.avatarUrl` / `story.author?.avatarUrl`.
- [ ] Null-check `author` the same way `post-feed-fe-integration.md` documents for posts: a
      comment/story can have no author (the authoring member left the event — the FK is set
      null, content survives). `author.avatarUrl` can independently be `null` even when
      `author` itself is present (account-less author, or no profile picture uploaded).

```ts
const authorName = comment.author?.displayName ?? "Unknown";
const avatarSrc = comment.author?.avatarUrl ?? placeholderAvatar;
```

## Not changed

- `authorMemberId` is still present on both DTOs, unchanged — keep using it for anything keyed
  by member id (e.g. matching against the caller's own membership).
- Ordering, pagination, and every other field on `CommentResponseDto`/`StoryResponseDto` are
  untouched.
