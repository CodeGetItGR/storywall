# FE integration guide: presigned URLs are signed per window

**Date:** 2026-09-27. Backend branch `fix/presigned-url-window`.

Testers saw feed images stop loading in quiet events. The cause was on both sides of the wire, and
this guide covers what changed and what the frontend has to do.

## What was wrong

Every media and avatar URL the API returns is a presigned R2 URL. It used to be signed at the
instant the response was built and to expire 15 minutes later.

The feed (`GET /api/events/{eventId}/posts`) and comments (`GET /api/posts/{postId}/comments`)
answer `304 Not Modified` while their ETag still matches, and the ETag was built from the event's
post/comment version counter only. In an event where nobody posted or commented, every poll got a
`304`, and a `304` means "keep what you have", so the client kept rendering URLs that had expired
15 minutes after the last real change.

Images already on screen stayed visible. Anything that loaded later broke: lazy images further
down, the lightbox (a new width through the image optimizer), avatars, and videos that buffered or
seeked.

A second cost came from signing "now": two viewers never received the same URL for the same
photo, and every refetch re-signed everything. Vercel's image optimizer keys its cache on the full
source URL, so almost every optimized image was a cache miss, billed once per viewer and again
after every post or comment.

## What changed

| | Before | Now |
|---|---|---|
| Signing time | the moment the response is built | the start of the current **signing window** |
| Window length | — | a third of `presignedUrlTtlMinutes` (20 min at the default) |
| Validity | 15 min from signing | `presignedUrlTtlMinutes` from the window start (default **60 min**, was 15) |
| Same file, same window | a different URL on every request | the **same URL** for every request and every viewer |
| Feed/comments ETag | event version + page | event version + page + **signing window** |

What follows from that:

- **A URL always arrives with at least 40 minutes left** (two-thirds of the TTL): it was signed at
  the start of a window, and the window is a third of the TTL.
- **The feed and comments ETags change when the window does.** A client polling with
  `If-None-Match` gets a `200` with fresh URLs within one poll of the window rolling over, even
  when nothing was posted. Expect roughly three extra `200`s an hour from a quiet feed.
- **Refetches inside a window return identical URLs.** React Query's structural sharing keeps the
  same objects, nothing re-renders, and the browser and Vercel caches hit.

`presignedUrlTtlMinutes` in `GET /api/config` (`media` block) still reports the TTL. It now also
tells you the window: a third of it.

## What the frontend has to do

**The rule:** anything holding presigned URLs must be refreshed at least once per signing window.
Held for one more window after that, a URL still has a third of its TTL to spare.

| Surface | Endpoint | What's needed |
|---|---|---|
| Feed | `GET /api/events/{id}/posts` | nothing new — the 60s conditional poll now picks up new URLs by itself |
| Comments | `GET /api/posts/{id}/comments` | nothing new — same as the feed |
| Gallery | `GET /api/events/{id}/media` | poll at `presignedUrlTtlMinutes / 3`; no ETag, so each poll is a `200` |
| Stories list | `GET /api/events/{id}/stories` | same as the gallery |
| Anything showing a copied item | — | read the item from the list by id instead of keeping a copy, or the copy's URL goes stale |

**Videos:** once per window a refetch hands down a new URL for the same file. Assigning it to a
playing `<video>` restarts playback. Keep the URL the element already has, and only switch to the
newest when the current one fails (it expired). Compare URLs without their query string to tell
"same file, re-signed" from "a different file". Storywall does this in
`components/common/PresignedVideo.tsx`.

**Images** need no special handling. A changed `src` loads the new URL, and the old image stays on
screen until the new one has loaded.

## What the frontend can observe

- `presignedUrlTtlMinutes` defaults to `60` (was `15`).
- `X-Amz-Date` in a URL is the start of a window, up to 20 minutes in the past, and
  `X-Amz-Expires` is the full TTL in seconds.
- Feed and comments ETags have a fourth segment. They were always opaque, so nothing should parse
  them.
- A feed `200` can carry a page identical to the last one except for its URLs. That is the window
  rolling over, not a bug.

## How the backend does it

`R2StorageService.generatePresignedUrl` signs with the AWS SDK's V4 signer and a clock fixed to the
window start. `S3Presigner` can't be used for this: it always signs at the current instant and
ignores both a per-request and a client-level signing clock (both were tried). For the same instant
the output is byte-for-byte what `S3Presigner` produced, and `R2StorageServiceTest` pins that for
both virtual-hosted and path-style addressing, so R2 receives exactly the URL shape it did before.

`StorageService.presignedUrlWindow()` returns the current window number. `PostService.feedETag` and
`CommentService.commentsETag` append it. Any future endpoint that sends an ETag over a body with
presigned URLs has to do the same.

**Security trade-off of the longer TTL:** a URL someone already holds keeps working for up to an
hour after they leave the event or a photo is soft-deleted, as long as the object is still in the
bucket. It was 15 minutes before.
