# Integration Guide: `likedByCurrentUser` on Posts

Added 2026-08-01. Scope: this single change only — see `frontend-integration-guide.md` for
everything else.

## What changed

`PostResponseDto` has a new field:

```ts
interface PostResponseDto {
  // ...existing fields unchanged...
  commentCount: number;
  reactionCount: number;
  likedByCurrentUser: boolean; // NEW
  // ...
}
```

`true` if the requesting user has **any** reaction (any `reactionType`) on the post. Returned
by both endpoints that already return `PostResponseDto`:

| Method | Path | Response |
|---|---|---|
| GET | `/api/events/{eventId}/posts?page=&size=` | `Page<PostResponseDto>` — every post in `content[]` has it |
| GET | `/api/posts/{id}` | `PostResponseDto` |

No request changes needed on your side — it's derived from the JWT on the backend. Nothing
else in the response shape changed, and no existing field's meaning changed.

## Why this exists

Previously the only way to know whether the current viewer had liked a post was to call `GET
/api/posts/{postId}/reactions` and scan the list for a `memberId` match — one full reaction
list per post, which doesn't scale to a feed of N posts. `likedByCurrentUser` gives you the
same answer inline, for free.

## Using it

```ts
const page: Page<PostResponseDto> = await fetch(`/api/events/${eventId}/posts`).then(r => r.json());

page.content.forEach(post => {
  renderLikeButton(post.id, { liked: post.likedByCurrentUser, count: post.reactionCount });
});
```

No polling, no follow-up request, no client-side matching against a member id you'd otherwise
have to look up separately.

**After the user reacts or un-reacts**, this field on your cached post object goes stale —
update it optimistically (flip it alongside `reactionCount`) when you call
`POST /api/reactions` or `DELETE /api/reactions/{id}`, the same way you'd already be updating
`reactionCount`. It only refreshes from the server on the next `GET`.

## What it does *not* tell you

Only whether the caller reacted, not *which* `reactionType` (e.g. `LIKE` vs. `LOVE`, if you
support more than one). If your UI needs that distinction, you still need `GET
/api/posts/{postId}/reactions` and match `memberId` yourself — `likedByCurrentUser` is a
cheap boolean shortcut for the common "did I react at all" case, not a replacement for that
endpoint.

## Edge cases

- **Caller isn't a member of the post's event.** `GET /api/events/{eventId}/posts` and `GET
  /api/posts/{id}` are `isAuthenticated()`-only, not membership-scoped — any logged-in user can
  read posts from an event they're not in. In that case `likedByCurrentUser` is simply `false`,
  no error.
- **Guests.** Works the same as registered users — resolved from the same JWT principal used
  everywhere else (`authentication.getPrincipal()`), so guest accounts get a correct value too.
- **Right after creating a post** (`POST /api/posts`). Always `false` — a post can't have
  reactions before it exists, so the backend skips the lookup rather than doing pointless work.

## Performance note (if you're curious, not required reading)

Resolving this for a whole page of posts costs exactly **2 extra queries total**, not one per
post: one to resolve the caller's `EventMember` ids (they can be a member of more than one
event), one batched lookup of which of the page's post ids they reacted to. Query count for a
feed page is constant regardless of how many posts are on it — same pattern already used for
`commentCount`/`reactionCount`.
