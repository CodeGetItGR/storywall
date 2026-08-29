# FE integration guide: Stories

Covers the full Stories feature as of 2026-08-01: the existing CRUD endpoints, plus two
things that were missing until now and have just been added — **story views** and a
**default expiry**. See `frontend-integration-guide.md` §1–2 for base setup (auth header,
error shape) and the common Java→TypeScript type table; this doc only covers what's specific
to stories.

**2026-08-29:** new **`POST /api/stories/batch`** endpoint — turn several already-uploaded
`mediaId`s into that many stories in one request (e.g. "post these 5 photos as stories").
See §Batch create below.

Scope note: comments and reactions are **intentionally not supported** on stories (unlike
posts) — don't build UI expecting `commentCount`/`reactionCount` on a story. Stories also
don't carry any per-session grouping — a story belongs to an `Event`, full stop, regardless
of how many `EventSession` records that event has.

## Resource shape

```ts
interface StoryRequestDto {
  eventId: string;
  authorMemberId?: string;
  mediaId: string;          // required, must already exist
  caption?: string;
  songUrl?: string;
  expiresAt?: string;       // NEW: now optional — see "Expiry" below
}

interface StoryResponseDto extends StoryRequestDto {
  id: string;
  expiresAt: string;        // always present in the response, even if omitted on create
  createdAt: string;
  deletedAt: string | null; // see "Known quirk" below — in practice always null
  viewedByCurrentUser: boolean; // NEW — has the caller already viewed this story
}

interface StoryViewResponseDto {
  id: string;
  storyId: string;
  memberId: string;         // the viewer's EventMember id
  createdAt: string;        // when they viewed it
}

// NEW — POST /api/stories/batch, see §Batch create
interface StoryBatchCreateResponseDto {
  created: StoryResponseDto[];
  failed: StoryBatchFailureDto[];
}
interface StoryBatchFailureDto {
  mediaId: string;
  errorCode: string; // ErrorCode enum name, e.g. "RESOURCE_NOT_FOUND"
  message: string;   // clean, user-facing text — safe to show directly in the UI
}
```

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events/{eventId}/stories` | event member | all stories for the event |
| GET | `/api/stories/{id}` | event member | single story |
| POST | `/api/stories` | event member | create; `expiresAt` optional (see below) |
| POST | `/api/stories/batch` | event member | **NEW** — create several stories in one request, see below |
| DELETE | `/api/stories/{id}` | author or HOST | **hard delete** — see known quirk |
| POST | `/api/stories/{id}/views` | event member | **NEW** — mark viewed by caller |
| GET | `/api/stories/{id}/views` | story author or HOST | **NEW** — list viewers |

## Creating a story — `expiresAt` is now optional

`POST /api/stories` used to reject a request with no `expiresAt` (400, `VALIDATION_FAILED`).
It no longer does. Omit the field and the server sets it to **24 hours from creation time**:

```ts
await fetch("/api/stories", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ eventId, mediaId, caption: "Best day ever! 💍" }),
  // no expiresAt — server defaults it to createdAt + 24h
});
```

If you pass `expiresAt` explicitly, it's used as-is (no minimum/maximum enforced) — that path
is unchanged.

**Important: the default is *not* clamped to the event's `endAt`.** A story posted on day 1 of
a multi-day event still expires 24h later, even though the event (and its feed) is still
active. This is deliberate — the feed stays live after the event ends, so tying story
lifetime to event duration would either make stories outlive their "ephemeral" purpose (long
events) or vanish immediately (events ending sooner than 24h out). Treat story expiry as
independent of the event's own schedule.

As before, expiry is **not server-enforced removal** — an expired story still exists and is
still returned by `GET /api/events/{eventId}/stories` / `GET /api/stories/{id}`. Filter
`expiresAt < now` client-side to hide expired stories from the active story tray.

## Batch create

`POST /api/stories/batch` turns a batch of already-uploaded media into that many stories in
one request — the "select 5 photos from the just-uploaded batch and post them all as
stories" flow. Same two-step shape as multi-image posts (see
[`multi-image-post-upload-fe-integration.md`](multi-image-post-upload-fe-integration.md)):
upload the files first via `POST /api/events/{eventId}/media/batch` to get `mediaId`s, then
call this endpoint with one `StoryRequestDto` per story you want created. There's no
single endpoint that uploads files and creates stories in the same call.

```
POST /api/stories/batch
Authorization: Bearer {accessToken}
Content-Type: application/json

[
  { "eventId": "a1c2...uuid", "mediaId": "d4e5...uuid", "caption": "🎉" },
  { "eventId": "a1c2...uuid", "mediaId": "f6a7...uuid" }
]
```

**The body is a bare JSON array (`StoryRequestDto[]`), not wrapped in an object** — unlike
most POST bodies in this API. Each item is a full `StoryRequestDto`, same shape as the
single-create endpoint.

- **Every item must share the same `eventId`.** Mixed `eventId`s return `400`, `errorCode:
  3025` (`MULTIPLE_EVENT_IDS_IN_REQUEST`), before anything is created — a batch always
  targets one event, so build one request per event if the user is somehow posting to
  multiple events at once (shouldn't happen from normal UI).
- **Max `story.batch.max-items` per request — 5 by default.** Read the live cap from `GET
  /api/config` (`media.maxBatchStoryItems`) rather than hardcoding 5; it's independently
  configurable from `media.maxBatchUploadFiles` (the upload-side cap, default 10) since these
  are cheap DB writes, not file uploads. Exceeding it returns `400`, `errorCode: 3024`
  (`TOO_MANY_STORY_ITEMS`).
- **Any field-validation failure on *any* item rejects the *entire* batch** with `400`,
  `errorCode: 3001` (`VALIDATION_FAILED`) — a missing `mediaId`, a caption over the length
  limit, anything `@Valid` would catch on the single-create endpoint. Nothing is created, not
  even the valid items. This is different from the media batch-upload endpoint, which never
  fails the whole request for a per-file problem — validate client-side before submitting
  (required fields present, caption length) so this path is rare in practice.
- **A `mediaId` that doesn't resolve to a live `Media` row is isolated per item**, not a
  whole-batch failure — it lands in `failed[]` and the rest of the batch still succeeds. This
  is the *only* per-item failure mode; everything else above is all-or-nothing.
- Caller must be a member of the shared event — a non-member gets `403`. The `STORIES` module
  must be enabled for the event, same as the single-create endpoint.
- Shares the `story.write` rate-limit bucket with `POST /api/stories` (20/min per caller as
  of this writing — read the live value from `GET /api/config` `rateLimits`, don't hardcode
  it) — a 5-item batch costs one unit, not five.

**200 response** (`StoryBatchCreateResponseDto`) — `200` whenever the batch-level checks
pass, even if every item's `mediaId` turned out to be missing:

```json
{
  "created": [
    { "id": "e1a2...uuid", "eventId": "a1c2...uuid", "mediaId": "d4e5...uuid", "caption": "🎉", "...": "…rest of StoryResponseDto" }
  ],
  "failed": [
    { "mediaId": "f6a7...uuid", "errorCode": "RESOURCE_NOT_FOUND", "message": "This media could not be found. It may have been deleted." }
  ]
}
```

- `created[]` — one `StoryResponseDto` per story that succeeded, `viewedByCurrentUser` always
  `false` (nobody has viewed a story that was just created).
- `failed[].errorCode` is the `ErrorCode` **name**, not the number — match on the string, same
  convention as the media batch endpoint's `failed[]`.
- `failed[].message` is clean, user-facing text — safe to show next to the failed thumbnail
  without building your own copy.

Suggested flow, reusing step 1 from the multi-image post upload:

```
1. POST /api/events/{eventId}/media/batch with the selected files
   - created[] → keep these mediaIds, in order
2. POST /api/stories/batch with one { eventId, mediaId, caption? } per kept mediaId
   - created[] → stories are live, refresh the story tray
   - failed[]  → show which items didn't become stories, offer retry per item
```

If step 2's batch-level checks fail (too many items, mixed events, a bad field), nothing is
created — fix the request and resubmit the whole thing, no partial state to reconcile.

## Story views

**The server owns "have I viewed this," not just "who has viewed this."** `StoryResponseDto`
now carries `viewedByCurrentUser`, resolved for the caller on every story returned by `GET
/api/events/{eventId}/stories` and `GET /api/stories/{id}` — the same pattern as
`likedByCurrentUser` on posts (see
[`post-liked-by-current-user-integration-guide.md`](post-liked-by-current-user-integration-guide.md)).
You do **not** need to be the story's author or a HOST to see this field — it's your own view
status, scoped to your own caller identity, computed in one batched query for the whole list
(constant query count regardless of how many stories are in the tray).

The `GET /api/stories/{id}/views` full-viewer-list endpoint is a separate, more sensitive
thing — "who has seen my story," which only the author/HOST get, same as Instagram-style
stories. Don't confuse the two:

| Question | Field/endpoint | Who can see it |
|---|---|---|
| "Have **I** viewed this story?" | `StoryResponseDto.viewedByCurrentUser` | anyone who can read the story (any event member) |
| "Who has viewed this story?" | `GET /api/stories/{id}/views` | the story's author, or a HOST |

```ts
function renderTrayItem(story: StoryResponseDto) {
  ring.classList.toggle("seen", story.viewedByCurrentUser);
  ring.classList.toggle("unseen", !story.viewedByCurrentUser);
}
```

No client-side tracking needed — don't cache "have I seen this" in local storage or component
state as the source of truth; always trust the field on the latest fetched `StoryResponseDto`.

### Marking a story as viewed

```
POST /api/stories/{id}/views
Authorization: Bearer {accessToken}
```

Call this once when the viewer opens a story (e.g. on tray-item mount, or after your existing
"seen" debounce). **It's idempotent** — call it every time the viewer re-opens the story, no
need to track client-side whether you've already sent it. The caller's own `EventMember` in
that story's event is resolved from the JWT, recorded once, and the same
`StoryViewResponseDto` is returned on repeat calls (no duplicate, no error):

```json
{
  "id": "e1a2...uuid",
  "storyId": "f1a2...uuid",
  "memberId": "b3f1...uuid",
  "createdAt": "2026-08-01T20:14:03Z"
}
```

Requires the caller to be a member of the story's event — a non-member gets a 403
(`FORBIDDEN`), same as every other story endpoint.

**After this call succeeds, your locally cached `StoryResponseDto.viewedByCurrentUser` for
that story is stale** (still whatever it was before) — the field only refreshes on the next
`GET`. Flip it optimistically in your client state right after a successful `POST`, the same
way you'd already optimistically update `likedByCurrentUser` after reacting to a post:

```ts
await fetch(`/api/stories/${story.id}/views`, { method: "POST", headers: authHeaders });
story.viewedByCurrentUser = true; // optimistic; confirmed by the next GET anyway
```

### Listing viewers

```
GET /api/stories/{id}/views
Authorization: Bearer {accessToken}
```

Returns `StoryViewResponseDto[]`, one entry per member who's viewed the story. **Restricted to
the story's author or a HOST of the event** — anyone else (including other regular members)
gets a 403. This is the "who's seen my story" list, so it's intentionally not public the way
the story itself is.

```ts
async function loadViewers(storyId: string): Promise<StoryViewResponseDto[]> {
  const res = await fetch(`/api/stories/${storyId}/views`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 403) return []; // caller isn't the author/HOST — hide the affordance
  return res.json();
}
```

There's no separate "view count" field on `StoryResponseDto` — derive the count from
`viewers.length` after calling this endpoint (e.g. lazily, when the author opens the "seen by"
sheet), rather than fetching it for every story in the tray up front.

## Permissions summary

| Action | Who |
|---|---|
| Read stories / mark viewed | any member of the event |
| Create a story | any member of the event |
| Delete a story | the story's author, or a HOST |
| List a story's viewers | the story's author, or a HOST |

## Known quirk: `deletedAt` is always `null`

`StoryResponseDto.deletedAt` exists in the shape but `DELETE /api/stories/{id}` currently does
a **hard delete** — the row is gone, not soft-deleted. In practice you'll never see a non-null
`deletedAt` on a story; don't build any "restore a deleted story" UI around it. If this changes
to a real soft delete later, it'll be called out as a breaking change here.

## Migration checklist

- [ ] Stop sending `expiresAt` from the create-story form if you want the 24h default — or
      keep sending it if you need a custom expiry.
- [ ] Do **not** default `expiresAt` client-side to the event's end time — send nothing and
      let the server apply the 24h default, or pick your own value explicitly.
- [ ] Use `story.viewedByCurrentUser` to render seen/unseen state in the story tray — remove
      any client-side "have I seen this" tracking, it's server-owned now.
- [ ] Call `POST /api/stories/{id}/views` when a viewer opens a story; safe to call on every
      open, not just the first. Optimistically flip `viewedByCurrentUser` locally after it
      succeeds.
- [ ] Add a "seen by" UI for story authors/hosts backed by `GET /api/stories/{id}/views`;
      handle the 403 for non-author/non-host viewers by simply not showing the affordance.
- [ ] Don't build comment/reaction UI for stories — not supported, and not planned as part of
      this change.
- [ ] For "post multiple photos as stories" flows, use `POST /api/stories/batch` instead of
      N sequential `POST /api/stories` calls — send a bare `StoryRequestDto[]`, all sharing one
      `eventId`. Read the item cap from `GET /api/config` `media.maxBatchStoryItems` (default 5)
      rather than hardcoding it.
- [ ] Handle `failed[]` on the batch response for a missing `mediaId` (`RESOURCE_NOT_FOUND`) —
      but note a validation problem (missing field, caption too long) rejects the *whole* batch
      with `400`/`VALIDATION_FAILED` instead, so validate client-side before submitting.
