# FE integration guide: playlist digest posts

Covers a new, purely additive behavior: the event feed (`GET /api/events/{eventId}/posts`)
can now contain system-generated posts summarising playlist activity — e.g. "🎵 3 new songs
were added to the playlist!". No endpoint signatures changed and no existing fields changed
shape; this guide only tells you how to recognise and render these rows.

## What changed

A background sweep periodically checks each event's song suggestions and, if any are new
since the last check, creates **one** `PostResponseDto` in that event's feed summarising them.
It does not call any endpoint you invoke — it shows up the same way any other post does, the
next time you fetch or refresh the feed.

- Runs roughly hourly (server-configured; not something the client controls or triggers).
- Posts at most once per sweep per event — several suggestions added in the same window become
  a single combined post, not one post per song.
- Deleted suggestions are **not** reconciled after the fact — if a suggestion is added and then
  deleted before the next sweep, the digest post may still mention it. This is intentional: it's
  a casual "here's what's new" update, not a live/authoritative record of the playlist.

## Identifying a digest post

Digest posts are ordinary feed rows with two distinguishing traits:

```ts
post.type === "PLAYLIST"   // no other post type is ever system-generated today
post.authorMemberId === null
post.author === null
```

`type: "PLAYLIST"` was already a valid value in `PostRequestDto`/`PostResponseDto` (reserved for
this use), so no type union changes are needed on the FE side.

**200 response excerpt** (a digest post as it appears in a feed page):

```json
{
  "id": "9e21...uuid",
  "eventId": "a1c2...uuid",
  "authorMemberId": null,
  "author": null,
  "type": "PLAYLIST",
  "content": "🎵 3 new songs were added to the playlist!",
  "isPinned": false,
  "media": [],
  "commentCount": 0,
  "reactionCount": 0,
  "likedByCurrentUser": false,
  "createdAt": "2026-08-05T09:00:00Z",
  "updatedAt": "2026-08-05T09:00:00Z",
  "deletedAt": null
}
```

When exactly one song was added since the last digest, `content` names it instead of just
counting:

```json
{ "content": "🎵 \"Dancing Queen\" by ABBA was just added to the playlist!" }
```

There is no separate field for the suggestion(s) involved — `content` is a plain, pre-formatted
string. Don't try to parse song titles back out of it; if you need the current suggestion list,
that's still `GET /api/events/{eventId}/playlist-suggestions` (unchanged, unaffected by this
feature).

## Rendering

Treat it like any other feed post, with two adjustments:

- Since `author` is always `null` for these, don't show the usual "Unknown" author fallback you
  use for orphaned posts (see the [post feed guide](post-feed-fe-integration.md)) — render it
  more like a system/announcement row (e.g. a music-note icon in place of an avatar, or a
  visually distinct compact style), since a blank/"Unknown" author would read as a bug rather
  than an intentional system message.
- `media` is always empty and `commentCount`/`reactionCount` start at 0 — reactions and comments
  on it work exactly like any other post if you want to allow them; nothing server-side prevents
  it.

```ts
function isPlaylistDigest(post: PostResponseDto): boolean {
  return post.type === "PLAYLIST" && post.author === null;
}
```

## What did NOT change

- `GET /api/events/{eventId}/posts` response shape, pagination, and ordering — unchanged.
- `POST /api/posts`, `DELETE /api/posts/{id}` — unaffected; digest posts aren't created through
  these and can be deleted through the normal delete endpoint like any other post if a host
  wants to remove one.
- Playlist suggestion endpoints (`/api/playlist-suggestions/...`) — unaffected. Suggestions and
  votes are still their own resource, fetched separately from the feed.

## Migration checklist

- [ ] Handle `post.type === "PLAYLIST"` with `post.author === null` as a system row in whatever
      component renders a feed post (avatar/author line, action menu, etc.).
- [ ] Don't assume every feed post has a non-null `author` going forward — this was already
      possible (see the post feed guide) but digest posts make it a routine case rather than an
      edge case.
- [ ] No new endpoints to call, no polling to add — digest posts arrive through the feed fetch
      you already have.
