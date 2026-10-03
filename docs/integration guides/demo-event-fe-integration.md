# Demo events — FE integration

2026-09-28. New, nothing breaking. Revised 2026-09-29: persona pictures (§6–§8).

## Why

Visitors can try the host experience without an account. Each event type can have one demo
event, curated by an admin. The frontend loads it once, then runs everything locally: every
action a visitor takes stays on their machine and never reaches the backend.

## 1. Loading the demo

`GET /api/demo/{eventTypeKey}`, e.g. `/api/demo/WEDDING`. No login. This is the only demo route
that's public — every other `/api/demo/*` and `/api/admin/demo-events/*` request still needs
authentication, so don't reuse this snapshot call's un-authenticated client for anything else.

- 200 → `DemoSnapshotDto` (see `frontend-api-types.ts`).
- 404 → no demo for that type (or the key is unknown). Hide the "try the demo" entry point.
- 429 → more than 30 requests a minute from this IP.
- Sends an `ETag` computed over the canonically-ordered snapshot (nested lists are sorted, see
  §3), so two requests for an unchanged demo get the same value; send it back as `If-None-Match`
  and a 304 means nothing changed.
- The backend caches each type's snapshot for 60 seconds. So `snapshotAt` is when it was built,
  not when you asked, and an admin's edit to the demo can take up to a minute to show.
  - Taking a demo down (undesignated, event deleted, type disabled) takes effect at once.
  - So does pointing the type at a different event.
  - Polling faster than once a minute gains nothing.

**To know which types have a demo without probing this endpoint,** read `hasDemo` on each
`GET /api/config` → `eventTypes[]` entry (added 2026-10-02). It is `true` exactly when this endpoint
would answer 200, and a takedown flips it to `false` at once, as above.

**The only backend calls a demo session may make are this one and `GET /api/config`.** Every
write, and every other read, is served by the local mock from the snapshot.

**Fetch this from the visitor's browser, not from the Next.js server.** The endpoint is
rate-limited to 30 requests/minute per caller IP (`DemoSnapshotController`). A server-side fetch
from the FE server means every visitor's request leaves from the same IP, so all of them share one
bucket and start getting 429s well before 30 concurrent visitors. The only exception is a FE server
call that forwards the browser's address with `X-Storywall-Client-Ip` and
`X-Storywall-Client-Ip-Secret`, as its auth calls do (see `session-refresh-fe-integration.md`).
Without both headers, every caller behind the FE server is counted as one.

## 2. Who the visitor is

The visitor acts as the event's primary host: `viewerUserId` and `viewerMemberId`. Every
viewer-relative field (my reaction, is host, can delete…) was computed for that host.

## 3. Sections

Each section is exactly what the real endpoint returns, so the mock can return it unchanged:

| Snapshot field | Serves |
|---|---|
| `event` | `GET /api/events/{id}` — includes `hosts`, `modules`, `sessions`, `rsvpSummary` |
| `members` | `GET /api/events/{id}/members` |
| `posts` | `GET /api/events/{id}/posts` (newest 50, pinned first) |
| `comments` | `GET /api/posts/{postId}/comments` — group by `postId` (up to 100 per post) |
| `reactions` | `GET /api/posts/{postId}/reactions` — group by `postId` |
| `stories` | `GET /api/events/{id}/stories` — **includes expired stories**, see §4 |
| `rsvps` | `GET /api/events/{id}/rsvps` — `phone` is always null |
| `media` | `GET /api/events/{id}/media` and `GET /api/medias/{id}` — **only `READY` media**, any context |
| `playlistSuggestions` | `GET /api/events/{id}/playlist-suggestions` |
| `wishbookEntries` | `GET /api/events/{id}/wishbook` (up to 200) |
| `giftAccount` | `GET /api/events/{id}/gift-account` — **a fixed fake**, never real payout details |
| `qrLinks` | `GET /api/events/{id}/qr-links` — `token` is a `demo-qr-…` placeholder |
| `usage` | `GET /api/events/{id}/usage` |

A module that is off gives an empty list (`giftAccount`: null). The plan's module configs come from
`/api/config` → `planTiers[]`, joined on `usage.planTier` as elsewhere.

Lists that don't come back in a stable database order are sorted before the response is built, so
repeated requests for the same demo hash to the same ETag:

- `event.hosts`, `event.modules`, `event.sessions`, `members`, `rsvps`, `reactions`,
  `playlistSuggestions` and `qrLinks` — by `id`
- `stories` and `wishbookEntries` — by `createdAt` then `id` as a tiebreaker
- `posts` and `comments` are not re-sorted here: `posts` already comes back ordered (pinned first,
  then `createdAt`, then `id`) and `comments` is built by iterating those posts in that same order,
  so both are already deterministic without an extra sort

Don't rely on this order for anything the frontend cares about display-wise — sort each list
yourself the way the real endpoint's own consumers already do.

Only `READY` media is ever included — a video still processing, or one that failed, is left out of
`media` entirely (its `metadata.processingError`, when present, is internal failure text that must
never reach a visitor).

## 4. Time

Rebase every timestamp from `snapshotAt` to the visitor's "now", so the demo always looks current
and stories look fresh.

## 5. Media URLs

Presigned URLs work until `presignedUrlsValidUntil` (at least 39 minutes after you receive them). Before then, re-fetch
the snapshot and swap URLs by media id. Media a visitor "uploads" stays local (object URLs).

## 6. No account photos; persona pictures are published

**Account avatars are always `null`** in the snapshot: on `members`, and on every
post/comment/story `author`, even for members who do have a real profile picture. A demo's hosts
are real admin accounts, so their photos are never published.

**A name-only persona's picture is published** (since 2026-09-29). A persona is a member with
`userId: null`. If an admin set a picture on one (§8), its `avatarUrl` is a presigned URL on its
`members` row and on everything it authored. Removing a persona (`DELETE /api/event-members/{id}`)
deletes its row and its picture. What it authored stays, with `author: null`, as on any event.

Render the app's normal placeholder/initials avatar whenever `avatarUrl` is `null`. In a demo that
is every host and any persona without a picture. Don't read a null `avatarUrl` here as "this
person set none."

**Display names are NOT redacted.** Member rows and every post/comment/story `author` show that
member's real `displayName`. For the admin's own member row this is whatever `EventMember` was
seeded with — by default the admin's real full name — and their user id appears in
`viewerUserId`, `members[].userId` and `qrLinks[].createdByUserId`. Before designating an event as
a demo, an admin should either rename their member row (`PATCH /api/event-members/{id}` with
`displayName`) or host the event from a dedicated persona admin account, not their everyday one.

**Designation makes every admin a co-host** (since 2026-10-01). Every `ACTIVE` admin account that
isn't already a host gets a host row, so any admin can edit the demo. New member rows are named
`Demo Host`. An admin who was already a member keeps their name and is promoted to `HOST`. An admin
removed from the event stays removed, and one banned from it by a moderation decision is skipped. The plan's co-host and member caps and the `co_hosts` module
don't apply. This only happens at designation: invite anyone made admin later by hand. Expect
several `Demo Host` entries in `members` and `event.hosts`.

## 7. Errors the admin may see while building a demo

| Code | Name | HTTP | Meaning |
|---|---|---|---|
| 5101 | `DEMO_EVENT_LOCKED` | 403 | Someone tried to join, claim a place on, or anonymously upload to a demo event |
| 5102 | `DEMO_ACT_AS_REFUSED` | 403 | `X-Demo-Act-As-Member` sent by a non-admin, on a non-demo event, or naming a member with an account |
| 5103 | `DEMO_DESIGNATION_INVALID` | 409 | The event can't be a demo: not live, wrong type, non-admin primary host, or a non-admin member |
| 5104 | `DEMO_PERSONA_AVATAR_REFUSED` | 403 | Picture set or cleared on a member that isn't a demo event's name-only, non-removed guest |

A plain 403 with no demo code, on a host screen (adding a guest, listing QR links, editing
sessions), used to mean the admin's token was stopped by a `hasRole('USER')` gate. Since
2026-09-29 `ROLE_ADMIN` implies `ROLE_USER`, so an admin who hosts the event gets through like any
host. A 403 on an event the admin doesn't host is still correct: the host check is unchanged.

## 8. Admin endpoints (for an admin screen, if one is built)

- `GET /api/admin/demo-events` → `DemoEventResponseDto[]`
- `PUT /api/admin/demo-events/{eventTypeKey}` body `{ "eventId": "…" }` → `DemoEventResponseDto`
- `DELETE /api/admin/demo-events/{eventTypeKey}` → 204
- Any content endpoint + header `X-Demo-Act-As-Member: <name-only member id>` → authored as that guest.
- `POST /api/event-members/{id}/demo-avatar`, multipart `file` → `EventMemberResponseDto` with the
  new `avatarUrl`. Sets a persona's picture, replacing any earlier one. Same image formats, limits
  and rejection codes as `/api/me/profile-picture`.
- `DELETE /api/event-members/{id}/demo-avatar` → `EventMemberResponseDto`. Clears the picture.
  Clearing a member that has none changes nothing and still returns the member.

Both are admin only: a `ROLE_USER` token gets a 403. The admin must also host the demo event. The
checks run in this order, and the first that fails answers:

1. Unknown member → 404.
2. The caller doesn't host the member's event → 403 (4001 `FORBIDDEN`).
3. The event can't be written to (soft-deleted, or not `ACTIVE`) → 409, 5014 `EVENT_NOT_ACTIVE`.
4. The event isn't a demo, the member has an account, or the member was removed → 403, 5104.

An upload that fails on the way to storage → 409, 5004 `STORAGE_UPLOAD_FAILED`, as for profile
pictures. Set and clear share one rate-limit budget of 60 requests an hour per admin
(`event-member.demo-avatar`); past it, 429.

After a change, the instance that handled it drops its cached snapshot at once. Another instance
can keep serving the old snapshot until its 60-second cache expires (§1). For up to a minute a
visitor may get the previous `avatarUrl`, whose object is already deleted, so the image fails to
load. Fall back to the initials avatar when an avatar image fails to load.

## 9. Storywall note

`public/mockServiceWorker.js` was deleted in storywall `f17ac4c` and is not on its main branch, so
`/demo` can't start. Regenerate it with `npx msw init public --save=false` before building on it.
