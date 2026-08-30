# Integration Guide: Post reactions — your own reaction and per-type counts

Added 2026-08-01, superseded 2026-08-30. Scope: this single change only — see
`frontend-integration-guide.md` for everything else.

## What changed

⚠️ **BREAKING (2026-08-30):** `PostResponseDto.likedByCurrentUser` is removed. Two fields
replace it:

```ts
interface PostResponseDto {
  // ...existing fields unchanged...
  commentCount: number;
  reactionCount: number;              // unchanged: total across all types
  reactionCounts: Record<string, number>; // NEW — per-type breakdown, zero-count codes omitted
  myReactionType: string | null;      // NEW — the caller's own reaction code, or null
  // ...
}
```

Returned by both endpoints that already return `PostResponseDto`:

| Method | Path | Response |
|---|---|---|
| GET | `/api/events/{eventId}/posts?page=&size=` | `Page<PostResponseDto>` — every post in `content[]` has it |
| GET | `/api/posts/{id}` | `PostResponseDto` |

No request changes needed on your side — both fields are derived from the JWT on the backend.

Also as of 2026-08-30, `POST /api/reactions` is an **upsert**: a member has at most one reaction
per post. See "The upsert behavior" below.

## Why this exists

Previously the only way to know *which* reaction type the current viewer had left, or to get a
breakdown by type, was to call `GET /api/posts/{postId}/reactions` and scan the list — one full
reaction list per post, which doesn't scale to a feed of N posts. `myReactionType` and
`reactionCounts` give you both answers inline, for free, at the same query cost as the old
`likedByCurrentUser` boolean.

## Using it

```ts
const page: Page<PostResponseDto> = await fetch(`/api/events/${eventId}/posts`).then(r => r.json());

page.content.forEach(post => {
  renderReactionPicker(post.id, {
    myReaction: post.myReactionType,     // e.g. "LIKE", or null if the caller hasn't reacted
    counts: post.reactionCounts,         // e.g. { LIKE: 3, LOVE: 5 }
    total: post.reactionCount,           // 8
  });
});
```

**After the user reacts**, update your cached post object optimistically — set
`myReactionType` to the new code, adjust `reactionCounts`/`reactionCount` accordingly — when you
call `POST /api/reactions`. It only refreshes from the server on the next `GET`.

## The upsert behavior

`POST /api/reactions` (`{ postId, memberId, reactionType }`) no longer rejects a second reaction
from the same member on the same post. Instead:

| Caller's existing reaction on this post | Result |
|---|---|
| None | Creates a new reaction. |
| Same `reactionType` | No-op — returns the existing reaction unchanged. |
| Different `reactionType` | Switches it in place (same `id`, `reactionType` updated, `createdAt` unchanged). |

**Positive callout:** changing your reaction now takes one `POST` call instead of a
`DELETE` + `POST` pair. `DUPLICATE_REACTION` (5005) is no longer returned by this endpoint —
there's no longer a state where reacting is rejected for "already reacted here."

`GET /api/posts/{postId}/reactions` and `DELETE /api/reactions/{id}` are unchanged — no need to
re-audit either of them for this change.

## What it does *not* tell you

Who reacted with what — `reactionCounts` and `myReactionType` are aggregate/caller-scoped only,
by design (no per-member reaction visibility in the feed response). If your UI needs to know
which specific members left which reaction, use `GET /api/posts/{postId}/reactions`, which still
returns `memberId` per reaction and is unaffected by this change.

## Edge cases

- **Caller isn't a member of the post's event.** `GET /api/events/{eventId}/posts` and `GET
  /api/posts/{id}` are `isAuthenticated()`-only, not membership-scoped — any logged-in user can
  read posts from an event they're not in. In that case `myReactionType` is simply `null`, no
  error.
- **Guests.** Works the same as registered users — resolved from the same JWT principal used
  everywhere else (`authentication.getPrincipal()`), so guest accounts get a correct value too.
- **Right after creating a post** (`POST /api/posts`). `myReactionType` is always `null` and
  `reactionCounts` is empty — a post can't have reactions before it exists, so the backend skips
  the lookup rather than doing pointless work.
- **No caller at all** (e.g. an anonymous/system context). `myReactionType` is `null`, same as
  "haven't reacted" — the two aren't distinguished in the response.

## Performance note (if you're curious, not required reading)

Resolving both fields for a whole page of posts costs exactly **2 extra queries total**, not one
per post: one to resolve the caller's `EventMember` ids (they can be a member of more than one
event), one batched lookup of the caller's own reaction type per post id on the page, plus the
existing per-type count query. Query count for a feed page is constant regardless of how many
posts are on it — same pattern already used for `commentCount`/`reactionCount`, unchanged by this
reshaping.
