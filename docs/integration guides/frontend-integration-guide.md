# FE integration guide

Master reference for what's wireable against the backend today, what isn't, and where FE
assumptions have drifted from actual backend behavior. Companion to
[`frontend-api-types.ts`](../frontend-api-types.ts) (the wire-shape source of truth — read that
file alongside this one, don't duplicate its interfaces from memory) and the feature-specific
guides it links out to:
[`stories-fe-integration-guide.md`](stories-fe-integration-guide.md),
[`invite-onboarding-fe-integration.md`](invite-onboarding-fe-integration.md),
[`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md),
[`post-liked-by-current-user-integration-guide.md`](post-liked-by-current-user-integration-guide.md),
[`app-config-fe-integration.md`](app-config-fe-integration.md),
[`billing-fe-guide.md`](billing-fe-guide.md) (plans, payments, refunds — see the
"Billing & payments" entry in §1 below),
[`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md),
[`gallery-archive-download-fe-integration.md`](gallery-archive-download-fe-integration.md)
(host-only bulk gallery zip download), and
[`gallery-media-pagination-fe-integration.md`](gallery-media-pagination-fe-integration.md)
(the gallery listing itself is now paginated), and
[`admin-list-endpoints-pagination-fe-integration.md`](admin-list-endpoints-pagination-fe-integration.md)
(users, audit logs, moderation actions, reports, and telemetry events are now paginated),
[`comments-pagination-fe-integration.md`](comments-pagination-fe-integration.md) (post
comment threads are now paginated, oldest first), and
[`rsvp-status-fe-integration.md`](rsvp-status-fe-integration.md) (a member's own membership
record now carries their `rsvpId`, so you can tell whether they've responded without knowing
that id in advance), and
[`event-creation-initial-session-fe-integration.md`](event-creation-initial-session-fe-integration.md)
(event creation can now seed a first `EventSession` anchored to `startAt`/`endAt`), and
[`event-session-main-flag-fe-integration.md`](event-session-main-flag-fe-integration.md) (that
seeded session is now flagged `isMain` and its schedule is a read-only mirror of the event's own),
and
[`event-session-secondary-flag-fe-integration.md`](event-session-secondary-flag-fe-integration.md)
(an optional, freely-editable `isSecondary` flag for a second session per `eventType` convention,
e.g. a wedding's venue/reception alongside its `isMain` ceremony), and
[`account-profile-and-password-fe-integration.md`](account-profile-and-password-fe-integration.md)
(self-service `GET /api/me`, profile editing via `PATCH /api/me`, changing your own password, and the
previously-undocumented forgot/reset-password flow).

This doc was originally written 2026-08-04 directly from the controller/DTO source. Refreshed
2026-08-09 to correct a stale claim that no billing integration existed — it now does,
extensively; see the section below. Refreshed again 2026-08-16: **wishlist and wishbook moved out
of §2 ("not wireable") and into §1** — they are real modules now — and co-host invitations gained
a pending-invitation flow. Refreshed again 2026-08-26: `EventMemberResponseDto` gained `rsvpId`,
closing the gap where the FE had no reliable way to tell whether a member had already submitted
an RSVP. Refreshed again same day: `EventSessionResponseDto` gained `isMain`, and the main
session's `startAt`/`endAt` are now a read-only mirror of the event's own — see
[`event-session-main-flag-fe-integration.md`](event-session-main-flag-fe-integration.md). Refreshed
again same day: `EventSession` request/response/patch DTOs all gained a writable `isSecondary` flag
(at most one per event, no backend semantics beyond that) — see
[`event-session-secondary-flag-fe-integration.md`](event-session-secondary-flag-fe-integration.md).
Refreshed again 2026-08-28: `UserResponseDto` gained `displayName`/`lastName`/`profilePicUrl`, and
three new self-service endpoints were added — `GET /api/me`, `PATCH /api/me`, and
`POST /api/me/change-password` — see
[`account-profile-and-password-fe-integration.md`](account-profile-and-password-fe-integration.md).
Refreshed again same day: profile picture is now a real file upload rather than a client-supplied
URL. `profilePicUrl` was renamed to `profilePictureUrl` (a short-lived presigned URL, same as
`MediaResponseDto.mediaUrl`) and removed from `PATCH /api/me`'s request body; setting it now goes
through a new `POST /api/me/profile-picture` multipart endpoint, which runs the upload through the
same magic-byte validation and EXIF-stripping pipeline as event media. See
[`account-profile-and-password-fe-integration.md`](account-profile-and-password-fe-integration.md)
§3.

## 0. Base setup

- **Auth header**: `Authorization: Bearer {accessToken}` on every endpoint except
  `/api/auth/**`, `GET /api/event-invitations/{inviteToken}/preview`, and `GET /api/config`.
- **Error shape**: every non-2xx response is an RFC 7807 `ApiError` — see the interface in
  `frontend-api-types.ts`. Validation failures (400) carry `errors.<fieldName>`.
- **Pagination**: some list endpoints return `Page<T>` (Spring Data shape:
  `content`/`totalElements`/`totalPages`/`number`/`size`), not a bare array — currently
  `GET /api/events/{eventId}/posts`, `GET /api/events/{eventId}/wishbook`,
  `GET /api/events/{eventId}/media`, `GET /api/notifications`, `GET /api/users`,
  `GET /api/audit-logs`, `GET /api/moderation-actions`, `GET /api/reports`,
  `GET /api/telemetry-events`, and `GET /api/posts/{postId}/comments` (the last one sorts
  oldest-first — every other paginated endpoint sorts newest-first). Every other list
  endpoint below returns a plain `T[]`. Don't assume one shape across all list endpoints.
- **Media URLs are not permanent.** `MediaResponseDto.mediaUrl` is a presigned, time-limited
  Cloudflare R2 GET URL. Don't persist it client-side beyond the current session/cache window
  — re-fetch the parent resource to get a fresh URL once it expires. This applies everywhere
  a `MediaResponseDto` appears (post media, story media, cover media, avatars).
- **Stored media is served as `Content-Disposition: attachment`.** `<img src>`, `<video src>`
  and `fetch` are unaffected — this only changes what a browser does when the user *navigates
  directly* to a presigned URL, which now downloads the file instead of rendering it. If you
  have an "open in new tab" affordance that relied on the old behaviour, render the media in
  your own lightbox instead. The header is deliberate: it is the second line of defence behind
  server-side content-type detection against a file being served as something executable on the
  bucket's origin.

---

## 1. Wireable today

Everything below has a real controller, service, and persisted entity on `main`. Grouped to
match the feature list from the FE inventory.

### Authentication

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | public | `email` + `password` (8-100 chars) → `AuthResponseDto`, immediately authenticated |
| POST | `/api/auth/login` | public | captures IP/User-Agent server-side for session auditing |
| POST | `/api/auth/refresh` | public | registered users only — see §3 for the guest gap |
| POST | `/api/auth/logout` | public | body is `{ refreshToken }`; revokes it, access token still works until natural expiry (~15 min) |
| POST | `/api/auth/guest-login` | public | body is `{ inviteToken }`; idempotent per token; returns `refreshToken: null` |
| POST | `/api/auth/forgot-password` | public | always `204`, same response whether or not the address has an account — see [`account-profile-and-password-fe-integration.md`](account-profile-and-password-fe-integration.md) |
| POST | `/api/auth/reset-password` | public | consumes the mailed token, sets a new password, revokes every session |
| GET | `/api/me` | `USER`/`GUEST`/`ADMIN` | (2026-08-28) fetch your own account details |
| PATCH | `/api/me` | `USER`/`GUEST`/`ADMIN` | (2026-08-28) edit your own `displayName`/`lastName` |
| POST | `/api/me/profile-picture` | `USER`/`GUEST`/`ADMIN` | (2026-08-28) multipart upload; sets `profilePictureUrl`, replacing any existing picture |
| POST | `/api/me/change-password` | `USER`/`ADMIN` | (2026-08-28) requires `currentPassword`; revokes every session on success |

### Invite onboarding

Fully covered in [`invite-onboarding-fe-integration.md`](invite-onboarding-fe-integration.md).
Summary: `GET /api/event-invitations/{inviteToken}/preview` (public) →
guest-login / login+accept / register+accept. Host-side invite CRUD is `/api/event-invitations`
and `/api/events/{eventId}/invitations` (list), all `ROLE_USER` + host-only.

**As of 2026-08-16 an invitation carries a `role`.** The list endpoint returns co-host invitations
alongside guest ones, so filter on `role` or they will show up in the guest list. Accepting a
`role: 'HOST'` invitation is bound to the exact address it names, on a verified account — a
mismatch is `403`/`5044 CO_HOST_INVITE_NOT_YOURS`, and the error deliberately doesn't say which of
the two conditions failed. Guest invitations are unchanged and stay forwardable.

### Event selection / context

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/me/events` | any authenticated (incl. guest) | every `EventMemberResponseDto` for the caller — this is what backs "restore active event"; each entry's `rsvpId` (2026-08-26) tells you whether that membership has an RSVP yet, see [`rsvp-status-fe-integration.md`](rsvp-status-fe-integration.md) |
| GET | `/api/events` | authenticated | flat list, `EventResponseDto[]` |
| GET | `/api/events/{id}` | authenticated | `EventDetailResponseDto` — grouped/enriched: `schedule`, `location`, resolved `coverMedia`, `hosts[]`, `modules[]`, `sessions[]`, `rsvpSummary` (aggregate only). Posts/comments/reactions/stories/individual RSVPs are deliberately excluded — fetch from their own endpoints. |

### Event creation & host management

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/events` | `ROLE_USER` | atomically creates the `Event` + host's `EventMember` + `EventHost` + (2026-08-26) an optional initial `EventSession` when `initialSessionTitle` is sent — see [`event-creation-initial-session-fe-integration.md`](event-creation-initial-session-fe-integration.md) |
| PATCH | `/api/events/{id}` | host of the event | all fields editable **except `eventType`** (see §3) |
| DELETE | `/api/events/{id}` | host of the event | |
| POST | `/api/events/{eventId}/hosts` | existing host | promote a co-host **immediately** (`{ userId }`) — target must be a registered, non-guest user whose id you already hold |
| POST | `/api/events/{eventId}/host-invitations` | existing host | new 2026-08-16 — invite a co-host **by email**, pending until they accept; works for people with no account yet. Returns an `EventInvitationResponseDto` with `role: 'HOST'`. See [`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md) §1 |
| GET | `/api/events/{eventId}/hosts` | authenticated | |
| PATCH | `/api/events/{eventId}/hosts/{id}` | host | only `displayOrder` is editable |
| DELETE | `/api/event-hosts/{id}` | `ROLE_USER` | |

### Event feed / modules

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/modules` | authenticated | `EventModuleResponseDto[]` — see §3; 7 keys exist (`posts`, `rsvp`, `playlist`, `stories`, `gallery`, `wishlist`, `wishbook`) |
| PATCH | `/api/event-modules/{id}` | host | `isEnabled`, `configuration` |
| GET/POST | `/api/event-sessions`, `/api/events/{eventId}/sessions` | authenticated / `ROLE_USER` | agenda items — bounded list, `displayOrder` |
| PATCH/DELETE | `/api/event-sessions/{id}` | host | |

### Posts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/posts` | authenticated | **`Page<PostResponseDto>`**, default 20/page, max 100, sorted pinned-desc then newest-first; `likedByCurrentUser` pre-resolved per post in one batched query |
| GET | `/api/posts/{id}` | authenticated | |
| POST | `/api/posts` | `ROLE_USER`, or guest scoped to that event | `type` is server-validated against exactly `TEXT \| MEDIA \| ANNOUNCEMENT \| PLAYLIST`; `mediaIds` max 10, no duplicates, must belong to the same event |
| DELETE | `/api/posts/{id}` | `ROLE_USER` | |

### Multi-image post upload

Fully covered in
[`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md).
Two-step: `POST /api/events/{eventId}/media/batch` (1-10 files, 20MB/file, 220MB/request) →
collect `mediaId`s → `POST /api/posts` with `mediaIds`. Batch upload always returns `200`; check
`created`/`failed` in the body, don't infer success from status code alone.

### Post media viewing

`MediaResponseDto[]` embedded on `PostResponseDto.media`, already ordered by `displayOrder`
with presigned URLs resolved — no separate fetch needed for the grid/lightbox/carousel. For a
single media record: `GET /api/medias/{id}`.

### Comments — paginated (2026-08-25) ⚠️ BREAKING

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/posts/{postId}/comments` | authenticated | Now returns a **page** (`Page<CommentResponseDto>`), oldest first, 30/page default (max 100). No nested-reply tree in the response — `parentCommentId` is on the DTO but building threading is still a client-side concern. See [`comments-pagination-fe-integration.md`](comments-pagination-fe-integration.md) for why it sorts oldest-first (unlike every other paginated endpoint) and a migration checklist. |
| POST | `/api/comments` | authenticated | |
| DELETE | `/api/comments/{id}` | authenticated | |

No PATCH — see §3.

### Likes / reactions

Fully covered in
[`post-liked-by-current-user-integration-guide.md`](post-liked-by-current-user-integration-guide.md)
for the read side. Write side:

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/reactions` | authenticated | `{ postId, memberId, reactionType }`; duplicate `(postId, memberId, reactionType)` → `409 DUPLICATE_REACTION` |
| DELETE | `/api/reactions/{id}` | authenticated | **by the reaction's own id**, not by `postId`/`memberId` — see §3 |
| GET | `/api/posts/{postId}/reactions` | authenticated | |

### Stories

Fully covered in [`stories-fe-integration-guide.md`](stories-fe-integration-guide.md). Create
(`POST /api/stories`, `expiresAt` optional → defaults to +24h, **not** clamped to event end —
see §3), batch-create (`POST /api/stories/batch`, one `StoryRequestDto[]` body, all sharing
one `eventId`, default cap 5), list (`GET /api/events/{eventId}/stories`), delete
(author/host), mark-viewed (`POST /api/stories/{id}/views`, idempotent), list viewers (`GET
/api/stories/{id}/views`, author/host only). No comments/reactions on stories — not
supported, don't build for it.

### Wishlist — new (2026-08-16)

The `wishlist` module, deliberately scoped to **one bank account per event** — no named products,
no per-item claiming, no "who gave what". Fully covered in
[`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md) §3.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/gift-account` | any member, incl. guest tokens | `404` is the **normal empty state** — the host hasn't set one up. Not an error to surface. |
| PUT | `/api/events/{eventId}/gift-account` | host | upsert; `400`/`5045 INVALID_IBAN` on failed mod-97 check digits |
| DELETE | `/api/events/{eventId}/gift-account` | host | `204` |

Deliberately **not** on `EventDetailResponseDto` — that endpoint is reachable by anonymous QR
scanners, so nothing loaded there may carry a payment destination. The IBAN is stored encrypted at
rest; don't undo that by caching it in localStorage, a URL, or an analytics event.

Unlike every other module write path, the host may configure this while the event is still a
`DRAFT` (it belongs in the setup wizard), not just once `ACTIVE`. Reading has no lifecycle check at
all.

### Wishbook — new (2026-08-16)

The `wishbook` module: written wishes every member can read. Fully covered in
[`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md) §4.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/wishbook` | authenticated | **`Page<WishbookEntryResponseDto>`**, default 20/page, newest first — the second paginated endpoint, see §0 |
| GET | `/api/events/{eventId}/wishbook/count` | authenticated | a plain number, for a summary tile |
| POST | `/api/events/{eventId}/wishbook` | authenticated, incl. guest tokens | `{ message, guestName? }`; multiple wishes per guest are allowed by design |
| DELETE | `/api/wishbook/{entryId}` | author or host | `204`. Note: **not** nested under the event |

Draw the delete control off the server-computed `canDelete`, not off `authorMemberId` — deriving it
client-side gets the host case wrong. Writing requires the event to be `ACTIVE` (`409
EVENT_NOT_ACTIVE` otherwise); deleting works on a `DRAFT` event too, so a host can still take down
something offensive before publishing.

### RSVP — guest flow

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/rsvps` | authenticated | `{ eventMemberId, attendanceStatus, adultCount, childCount, submittedAt, ... }` |
| PATCH | `/api/rsvps/{id}` | the RSVP's own member, or host | `attendanceStatus`, `phone`, `adultCount`, `childCount`, `notes` — counts are now bounds-validated server-side (adults 1-5, children 0-4), see [`app-config-fe-integration.md`](app-config-fe-integration.md) |
| GET | `/api/rsvps/{id}` | authenticated | requires already knowing the RSVP's own id — to check *whether* the caller has one at all, read `rsvpId` off their `EventMemberResponseDto` instead, see below |
| POST/GET/DELETE | `/api/rsvp-session-responses` | authenticated | per-session attendance, `{ rsvpId, eventSessionId, isAttending }` |

**"Has this member already RSVP'd?" (2026-08-26).** `EventMemberResponseDto.rsvpId` is `null`
until they submit one, then holds the `Rsvp`'s id — no need to track it client-side across
sessions. Fully covered in [`rsvp-status-fe-integration.md`](rsvp-status-fe-integration.md).

### RSVP — host dashboard

`GET /api/events/{eventId}/rsvps` (host-only, full attendee contact info) +
`GET /api/events/{eventId}/members` for the member roster. `EventDetailResponseDto.rsvpSummary`
gives aggregate counts (`totalMembers`/`attending`/`declined`/`maybe`/`noResponse`) cheaply for
an overview tile without pulling every individual RSVP.

### Host manage dashboard

Composable from data you're already pulling elsewhere: `EventDetailResponseDto.rsvpSummary` +
`GET /api/events/{eventId}/members` (count) + `GET /api/events/{eventId}/invitations`
(claimed/unclaimed via `usedAt`). No dedicated "dashboard summary" endpoint — it's assembled
client-side from the above.

### Invitations management

Fully covered in Part A of
[`invite-onboarding-fe-integration.md`](invite-onboarding-fe-integration.md): create, list,
get-by-id, patch (`maxGuests`, `firstName`, `lastName`, `email`, `expiresAt`), delete
(revoke). All host-only.

### Event settings

`PATCH /api/events/{id}` — title, subtitle, description, visibility, startAt, endAt, timezone,
locationName, locationAddress, mapsUrl, coverMediaId, brandingSettings, rsvpDeadline. Cover photo itself goes through the normal media-upload endpoint first
(`POST /api/events/{eventId}/media`), then the returned `mediaId` gets PATCHed onto
`coverMediaId`. `eventType` is **not** patchable (§3).

### Playlist — voting rework and host leaderboard (2026-08-05) ⚠️ BREAKING

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/playlist-suggestions` | authenticated | now carries `upvoteCount`, `downvoteCount`, `myVote` per song — see below |
| GET | `/api/events/{eventId}/playlist-suggestions/leaderboard` | **HOST only** | new; ranked, ties share a `rank` |
| POST | `/api/playlist-suggestions` | authenticated | `title` required, `artist`/`youtubeUrl`/`spotifyUrl`/`comment` optional |
| DELETE | `/api/playlist-suggestions/{id}` | authenticated | own or host (service-enforced, not visible at controller level) |
| GET | `/api/playlist-suggestions/{suggestionId}/votes` | authenticated | raw vote rows; no longer needed just to render counts, see below |
| POST | `/api/playlist-votes` | authenticated | `{ playlistSuggestionId, voteType }` — now an upsert, see below |
| DELETE | `/api/playlist-votes/{id}` | authenticated | unvote — same id-based delete pattern as reactions, see §3 |

#### What broke

| Change | What to do |
|---|---|
| `memberId` **removed** from `POST /api/playlist-votes` | The voter is now derived from the access token server-side, never from the request body. Stop sending it — unknown fields are ignored, so this degrades quietly rather than 400ing, but the value was never trusted anyway even before this change made it impossible to send. |
| `authorMemberId` **removed** from `POST /api/playlist-suggestions` | Same reasoning — the author is now always the caller. **Anonymous suggestions are no longer possible.** If any UI let a member post a song with no name attached, that affordance is gone. |
| `voteType` is now **required** on `POST /api/playlist-votes` | `"UPVOTE"` or `"DOWNVOTE"`. Previously a vote had no type at all — every existing vote in the database has been backfilled to `UPVOTE`, so nothing already cast changes meaning. |
| A second vote from the same member is no longer a duplicate-conflict error | It's an **upsert**. Posting the opposite `voteType` switches the member's existing vote; re-posting the same `voteType` is a no-op that returns the current vote unchanged. There is no `ConflictException`/409 case to handle on this endpoint anymore. |

#### Voting semantics

**A member holds exactly one stance per song at a time — up or down, never both.** `POST` always represents "this is now my stance," not "add another vote."

**Downvotes are cosmetic on the backend as well as the frontend.** `downvoteCount` is stored and returned so the UI can offer a genuine "no" affordance, not just a disabled-looking upvote button, but it **never reduces `upvoteCount`** and never lowers a song's position anywhere. Ranking — both the plain suggestion list's implicit ordering and the leaderboard's explicit `rank` — is upvotes alone. Treat `downvoteCount` as a display-only signal ("N people aren't into this"), the same way you'd treat a dislike count on a video that doesn't affect its view count.

To clear a stance entirely (go back to no opinion) rather than flip it, use `DELETE /api/playlist-votes/{id}` with the vote's own id — same pattern as unvoting today, unchanged.

#### The enriched suggestion list

`PlaylistSuggestionResponseDto` (full shape in [`frontend-api-types.ts`](../frontend-api-types.ts)) now includes:

- **`upvoteCount`** / **`downvoteCount`** — `long`, always present, `0` for a song nobody has voted on. Never absent or `null` — a song with no votes is a real zero, not a missing field.
- **`myVote`** — `"UPVOTE"` | `"DOWNVOTE"` | `null`. `null` means the calling member hasn't voted on that song, not that the data failed to load.

This means **`GET /api/playlist-suggestions/{suggestionId}/votes` is no longer needed to render vote counts or the caller's own vote state** — that was previously an N-requests-per-screen problem (one `/votes` call per song to build a tally client-side). The list endpoint now carries everything a song card needs in the same response. The `/votes` endpoint still exists for anything that genuinely needs the raw per-member rows (e.g. an "who voted" list), but don't call it in a loop over the suggestion list anymore.

#### The host leaderboard

`GET /api/events/{eventId}/playlist-suggestions/leaderboard` returns `PlaylistSuggestionLeaderboardDto[]`, **host-only** — a `403`/`FORBIDDEN` for anyone else, including the suggestion's own author. Each entry carries the suggestion's fields plus `upvoteCount`, `downvoteCount`, and a 1-based `rank`.

- **Sort:** upvotes descending, then downvotes ascending (a divisive song loses a tie to a clean one), then `createdAt` ascending as a stable tiebreaker.
- **Ties share a rank, and the next rank skips accordingly** — two songs tied for first are both `rank: 1`, and whatever comes next is `rank: 3`, not `rank: 2`. Don't assume `rank` values are contiguous; render them as-is rather than re-deriving position from array index.
- **Not paginated.** A party playlist is bounded in size; the host gets the whole board in one call.

### Profile

`GET /api/me/events` → `EventMemberResponseDto[]`, one per event the caller belongs to
(covers both registered-user memberships and guest invitations sharing the same email). Join
with `GET /api/events/{id}` per event for cover image / member count if the list view needs
more than the membership record carries. Each entry's `rsvpId` (2026-08-26) doubles as "has
this member RSVP'd" — see [`rsvp-status-fe-integration.md`](rsvp-status-fe-integration.md).

### Notifications — repurposed for hosts (2026-08-04), paginated (2026-08-25) ⚠️ BREAKING

The notification feature no longer targets guests with social activity ("X liked your post"). It
now delivers **operational messages to event hosts**: approaching usage limits, upgrade offers, and
tips. Notifications are produced **exclusively by a backend scheduled sweep** — nothing a user does
creates one.

#### What broke

| Change | What to do |
|---|---|
| `POST /api/notifications` **removed** (404) | Delete any create call. Notifications cannot be authored by clients, by design. |
| `type` values completely replaced | Old `POST_LIKED` / `COMMENT_ADDED` / `NEW_POST` / `NEW_ANNOUNCEMENT` / `RSVP_REMINDER` no longer occur. See the new enum below. |
| `recipientMemberId` is now **nullable** | Account-level notifications have no membership. Any code dereferencing it unguarded will break. |
| `DELETE` is now a **soft** delete | The notification disappears from the feed but the row is retained (it suppresses re-notification). Behaviourally the same to you; still returns `200`. |
| Feed now **excludes** expired and dismissed rows | No client-side filtering needed. |
| `GET /api/notifications` now returns `Page<NotificationResponseDto>`, not an array (2026-08-25) | Read `response.content`, not the response itself. Default 30/page, max 100, via `?page=&size=`. `?unreadOnly=true` still works, combined with paging params. See [`Page<T>`](../frontend-api-types.ts) and the reusable paging loop in [`post-feed-fe-integration.md`](post-feed-fe-integration.md#pagination-ui). |

#### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications` | authenticated | A **page** of the caller's feed, newest first, across all their events. Excludes dismissed and expired. Optional `?unreadOnly=true`, `?page=`, `?size=` (default 30, max 100). |
| GET | `/api/notifications/unread-count` | authenticated | `{ "unreadCount": 3 }` — for the badge, without fetching the feed. |
| GET | `/api/notifications/{id}` | authenticated | `403` for non-recipients. |
| PATCH | `/api/notifications/{id}/read` | authenticated | Idempotent; returns the updated DTO. |
| PATCH | `/api/notifications/read-all` | authenticated | `204 No Content`. |
| DELETE | `/api/notifications/{id}` | authenticated | Dismiss (soft). `200`. |

#### The payload

`NotificationResponseDto` (full shape in [`frontend-api-types.ts`](../frontend-api-types.ts)):

- **`title` / `body`** — pre-rendered server-side with the figures as they were measured
  ("This event has used 4.6 GB of its 2 GB storage"). **Render them verbatim**; don't rebuild the
  copy from `payload`, and don't re-fetch usage to "correct" them — they are a historical record of
  what was true when the notification fired.
- **`category`** — `LIMIT` | `OFFER` | `TIP` | `SYSTEM`. The natural grouping for tabs.
- **`severity`** — `INFO` | `WARNING` | `CRITICAL`. Drives visual weight. Note 80%-full and
  100%-full are the *same* `type` with different severities, so style on `severity`, not `type`.
- **`ctaLabel` / `ctaRoute`** — at most one action. `ctaRoute` is **app-relative**
  (`/events/{id}/settings/plan`); route with it directly, never treat it as an external URL.
- **`eventId` / `eventTitle`** — present for per-event notifications, `null` for account-level ones.
  Group by `eventId` and put the `null` bucket under something like "Your account". As of 2026-08-24
  (`EVENT_CAP_WARNING` removed) no current `type` is actually account-level, so this bucket is
  currently always empty — keep the grouping code, since the fields stay nullable.
- **`expiresAt`** — already filtered server-side. Useful only if you want to show "offer ends in 3
  days".
- **`payload`** — the raw measurement, for progress bars. Shape varies by `type`:

| `type` | `payload` keys |
|---|---|
| `STORAGE_LIMIT_WARNING` | `usedBytes`, `limitBytes`, `percent`, `planTier` |
| `MEMBER_LIMIT_WARNING` | `memberCount`, `memberLimit`, `percent`, `planTier` |
| `UPGRADE_OFFER` | `storagePercent`, `memberPercent`, `planTier` |
| `HOST_TIP` | `startAt` |

`percent` is **uncapped** — a value above 100 means the quota is exceeded. Clamp before feeding a
progress bar.

#### Things that will surprise you

- **The feed is normally empty.** The sweep is disabled by default
  (`NOTIFICATIONS_SWEEP_ENABLED=false`). Until ops enables it in an environment, no notifications
  exist at all. Build the empty state first; you'll be looking at it a lot.
- **Only hosts ever receive these.** An attendee's feed is permanently empty. That's correct, not a
  bug.
- **A host is told a given thing once.** Dismissing does not "reset" it — the same warning will not
  come back. Crossing a *further* threshold (80% → 100%) produces a separate notification.

### Plans and usage

Every event carries a `planTier` (`EVENT` scope), governing that event's storage and member quotas.
Every user account also carries a `planTier` (`ACCOUNT` scope), but as of 2026-08-24 it grants no
quota at all — the account-level active-event cap that used to live here has been removed outright,
along with `GET /api/me/usage`. See
[`account-event-quota-removed-fe-integration.md`](account-event-quota-removed-fe-integration.md).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/usage` | **HOST only** | `403` for attendees and non-members. Storage/member consumption for that event. |

Plan codes are **not** a fixed `FREE`/`PLUS`/`PRO` union any more — the catalog is admin-editable at
runtime (`GET /api/config` → `planTiers[]`, filtered to `isAssignable && isPublic`). Any FE type
declaring a closed tier union needs to widen to `string` and read the actual set at runtime. A
`null` limit means **unlimited**, not zero — never render it as an empty progress bar. Storage and
member caps are **enforced at write time** (not just advisory) — uploads and joins can return `409`
with `EVENT_STORAGE_LIMIT_EXCEEDED` / `EVENT_MEMBER_LIMIT_EXCEEDED`, each carrying a `details`
object (`planCode`, `used`, `limit`, and for storage `incomingBytes`) so the FE can render an
upgrade prompt without a second round-trip. Full detail, plus the module-gating (`isAvailable`)
rules that ship alongside the plan catalog: [`billing-fe-guide.md`](billing-fe-guide.md).

**Modules can also be sold à la carte (2026-08-16).** A plan listing a module key is no longer the
only way an event gets it: a `MODULE_UNLOCK` paid service grants one module to one event, and the
commercial gate is the **OR** of the two. `POST /api/events/{eventId}/addons` with
`{ paidServiceCode }` opts a **draft** event in — nothing is charged at that moment, the price
folds into the activation order, once. There is no mid-cycle purchase path, so the module picker
belongs in the setup wizard; on a live event a plan-excluded module should render unavailable with no
buy affordance, because that call always `409`s with `EVENT_NOT_DRAFT`.
See [`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md) §2.

### Billing & payments — event activation, upgrades, storage packs, refunds

An event is not usable until paid for — `POST /api/events` returns a `DRAFT`, and only a completed
checkout turns it `ACTIVE`. There is no free plan. **As of 2026-08-26, every purchase on the platform
is one-time** — the monthly "preservation" subscription is gone, and so is the lifecycle it existed
for: an `ACTIVE` event stays `ACTIVE` permanently, with no coverage window, no dunning, no freeze, no
purge.

**Build against [`billing-fe-guide.md`](billing-fe-guide.md) — the single current, consolidated
reference** for all of this. Summary of what it covers:

- **Four one-time purchases, not one**: **activation** (goes live, permanent, `DRAFT` only),
  **upgrade** (moves an `ACTIVE` event onto a pricier plan for the price of the difference, `ACTIVE`
  only), a **storage pack** (permanently raises the ceiling, `ACTIVE` only), and the **"keep
  originals" add-on / a module unlock** (fold straight into the activation charge, `DRAFT` only,
  no checkout of their own).
- **Event lifecycle**: `DRAFT → ACTIVE`, full stop. An approved refund is the only backwards
  transition, and it's a refund decision, never a lapsed payment — there is nothing left to lapse.
- **Checkout**: `POST /api/events/{id}/checkout` (activation), `.../upgrade-checkout`,
  `.../storage-checkout` — all return `{ orderId, redirectUrl }`, redirect top-level to Stripe's
  hosted page, never an iframe/popup. **Landing on `/checkout/success` does not mean paid** — poll
  `GET /api/events/{id}/billing` for the order's own status; a lost webhook is reconciled within ~15
  minutes by a scheduled sweep.
- **Refunds**: host-requested, admin-decided, activation-only, gated on the event being genuinely
  unused (no other members ever, no content ever, inside the refund window, not yet started).
  Approval reverses the activation charge (and any settled upgrade charge on the same event) and
  drops the event back to `DRAFT`. A storage pack is never reversed by a refund, under any
  circumstance.
- **Rate limiting is global**: every `/api/**` endpoint has a request budget (default 300/min);
  tighter limits on auth, checkout, and refund/admin-money routes. A `3010 RATE_LIMITED` / `429` with
  `Retry-After` — handle it once in the API client, never auto-retry a checkout or approval.
- **Dev/staging vs. production**: unless `app.billing.provider=STRIPE`, checkout runs a `MANUAL`
  provider — the redirect goes straight back to the success route and the event stays `DRAFT` until
  an admin calls `POST /api/admin/orders/{orderId}/settle`. Not a bug; keep `orderId` visible in dev
  builds.

All of `billing-fe-guide.md`'s admin-only endpoints (settle, webhook replay, refund queue, plan-tier
CRUD) require `ROLE_ADMIN` and live under `/api/admin`. There is no admin freeze/purge endpoint any
more.

### App config — new (2026-08-05)

Fully covered in [`app-config-fe-integration.md`](app-config-fe-integration.md).
`GET /api/config` (public, no auth) bundles feature flags, upload/pagination limits, plan-tier
quotas, the canonical `eventModuleKeys` list, and RSVP guest-count bounds into one fetch-once,
cache-it response — the single place to source values previously hardcoded on the FE.

### Admin — notification sweep

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/admin/notifications/sweep` | `ROLE_ADMIN` | Runs the quota rules immediately. Returns `{ "quota.storage": 1, "quota.members": 0, ... }` — notifications *actually created* per rule. |

This is **not** a broadcast/compose endpoint — it cannot author a message, only run the same rules
the scheduler runs. It's safe to call repeatedly: everything is deduplicated, so a second call over
unchanged data returns all zeroes. Useful for an admin panel button ("run sweep now") and for
demoing the notification feed without waiting for the hourly cron.

There is deliberately no admin endpoint to send an arbitrary notification or email to users.

### Admin — list endpoint pagination (2026-08-25) ⚠️ BREAKING

`GET /api/users`, `GET /api/audit-logs`, `GET /api/moderation-actions`, `GET /api/reports`, and
`GET /api/telemetry-events` (all `ROLE_ADMIN`) used to return their entire table in one response;
each now returns a `Page<T>` instead, 50/page by default (max 100), newest first. Full details,
example response, and a migration checklist in
[`admin-list-endpoints-pagination-fe-integration.md`](admin-list-endpoints-pagination-fe-integration.md).

### Other endpoints with hooks already built, but no UI wired to them yet

Not backend gaps — the backend and the FE data-fetching layer are both ready, but no screen
calls these hooks. Listed here so the "wireable today" work doesn't get miscounted as done or
missed:

- **Co-host management** (`useEventHosts` and friends) — zero UI callers.
- **Event modules management** (`useUpdateEventModule`/create/delete) — read-only in practice;
  no settings screen to actually flip `isEnabled` for a module.
- **Event sessions / agenda** (full CRUD hooks) — unused; the live "Schedule" tool page still
  reads from `lib/mock-data` instead of these.
- **RSVP per-session responses** (`rsvp-session-responses` hooks) — unused.

---

## 2. Not wireable — no backend support at all

Checked for models, controllers, services, and migrations; none exist for these. This is a
genuine backend gap, not a FE oversight — nothing to wire against yet.

- **Schedule** (as a standalone agenda/timeline feature) — the only backend "schedule" concept
  is `EventScheduleDto` (`startAt`/`endAt`/`timezone`/`rsvpDeadline`), which is just a grouped
  view of fields already on `Event`/`EventDetailResponseDto`. If the FE's Schedule page means
  something richer (multi-item day-by-day itinerary beyond `EventSession`), that doesn't exist.
  `EventSession` (title/description/start/end/location, `displayOrder`) is the closest real
  primitive and **is** wireable (see §1) if that covers the need.
- ~~**Gifts**~~ / ~~**Wishbook / wishlist**~~ — **shipped 2026-08-16, moved to §1.** "Gifts" is
  the `wishlist` module and is one IBAN per event, nothing more: no `Gift` entity, no per-item
  claiming, no gift registry. If the FE's Gifts page implies a product list, that layer still
  doesn't exist and isn't planned.
- **Quiz** — nothing exists.
- **Seating** — same; the only occurrence in the entire codebase is a comment example in
  `EventMember.java:125` ("...or seating charts"), never implemented.
- **Future / scheduled messages** ("wish for the future" / time capsule) — no entity or
  job/scheduler backing a "send this later" flow. Explicitly deferred to a later version, not an
  oversight; don't build against a placeholder for it.
- **Venue (rich content)** — partially real: `Event.locationName` / `Event.locationAddress` /
  `Event.mapsUrl` exist and are wireable today (via `PATCH /api/events/{id}` and
  `EventDetailResponseDto.location`). But if the FE's Venue page implies photos, maps embeds,
  or directions beyond a name/address/link, that layer isn't backed by anything.

**Why this matters for module gating**: `EventModule.moduleKey` is now backed by a server-side
`ModuleKey` enum (as of 2026-08-05 — see [`app-config-fe-integration.md`](app-config-fe-integration.md)),
restricted to exactly `posts, rsvp, playlist, stories, gallery, wishlist, wishbook` — also the only
keys `DevDataSeeder` creates. The last two were added 2026-08-16.
`POST /api/event-modules` with any other key now returns `400`/`INVALID_MODULE_KEY`
instead of silently accepting it. There's still no `schedule`/`quiz`/`seating`/`venue` module row
for any event — and now there provably can't be one, short of adding
a new enum value server-side first. If FE module-gating logic does something like
`modules.find(m => m.moduleKey === "schedule")?.isEnabled`, it'll still resolve to
falsy/undefined and produce the right "hide this" behavior — but treat that as "this feature
doesn't exist yet," not as a per-event toggle you could ever expect to flip.

---

## 3. FE assumptions — resolved 2026-08-04

Checked against the actual FE codebase; full detail and file references in
[`fe-be-open-questions.md`](fe-be-open-questions.md). Nine of ten were already handled
correctly — only #4 turned out to be a real gap.

1. **Guest token refresh — OK.** `lib/api/client.ts:38` already branches correctly: registered
   sessions hit `/api/auth/refresh`, guest sessions re-run `guest-login` with the stored
   `inviteToken`.

2. **Posts feed pagination shape — OK.** `hooks/usePosts.ts:41` correctly unwraps
   `Page<PostResponseDto>.content` via `useInfiniteQuery`; `lib/api/pagination.ts` even flags
   this as the one paginated endpoint.

3. **Unlike/unvote tracking — OK.** `hooks/usePostLike.ts:16` retains real reaction ids (a
   `knownReactionIds` map with GET-and-find fallback), not just a boolean; playlist votes do the
   same. Deletes correctly target the resource's own id.

4. **Notification read state — BE GAP, confirmed real.** `NotificationController` has no PATCH,
   so there's no way to persist `readAt`. The FE already has a working `useNotifications` hook
   and a "mark as read" UI (currently against mock data) — this is now a scoped backend task,
   not an open question. See §1 above.

5. **Relinking a member to an account — N/A today.** No host-driven relink UI exists; the
   self-claim hook has zero callers. Nothing blocked, not urgent.

6. **Event type immutability — OK.** `SettingsTab.tsx` has no `eventType` field at all — no
   silent no-op risk.

7. **Story expiry vs. event schedule — OK.** `providers/ComposerProvider.tsx:270` omits
   `expiresAt` on create, letting the backend's 24h default apply as intended.

8. **Editing comments/playlist suggestions — not needed.** No edit affordance exists or is
   stubbed for either.

9. **Route casing — OK.** Zero hits for the stale camelCase/nested-path forms anywhere in FE
   application code; `endpoints.ts` maps everything to the correct kebab-case paths.

10. **RSVP guest-count validation — resolved 2026-08-05.** Was a low-risk gap (UI steppers
    incidentally clamped adults 1–5 / children 0–4, but nothing enforced it). Now a real
    server-side validator exists with the same bounds — see
    [`app-config-fe-integration.md`](app-config-fe-integration.md). `hooks/useRsvps.ts:36`'s
    comment flagging the missing bounds check is now stale and can be removed; a host-edit UI
    for counts still doesn't exist, so this was purely a backend hardening, not a new FE
    requirement.

**Extra — module gating.** `ModuleKeyConvention` is typed to exactly the real keys, so
TypeScript already prevents gating against nonexistent keys — and as of 2026-08-05 the backend
enforces the same set via a `ModuleKey` enum, so the two lists can now drift into a real `400`
instead of silent inconsistency. **That set grew to 7 on 2026-08-16** (`wishlist`, `wishbook`), so
a hand-maintained union is now stale and will reject two valid keys. Source `ModuleKeyConvention`
from `GET /api/config`'s
`eventModuleKeys` instead of maintaining it by hand — see
[`app-config-fe-integration.md`](app-config-fe-integration.md). The `tools/schedule` page isn't
module-gated at all — it unconditionally renders mock data.
