# FE integration guide: Stories

Covers the full Stories feature as of 2026-08-01: the existing CRUD endpoints, plus two
things that were missing until now and have just been added — **story views** and a
**default expiry**. See `frontend-integration-guide.md` §1–2 for base setup (auth header,
error shape) and the common Java→TypeScript type table; this doc only covers what's specific
to stories.

Scope note: comments and reactions are **intentionally not supported** on stories (unlike
posts) — don't build UI expecting `commentCount`/`reactionCount` on a story. Stories also
don't carry any per-session grouping — a story belongs to an `Event`, full stop, regardless
of how many `EventSession` records that event has.

## Resource shape

```ts
interface StoryRequestDto {
    eventId: string;
    authorMemberId?: string;
    mediaId: string; // required, must already exist
    caption?: string;
    songUrl?: string;
    expiresAt?: string; // NEW: now optional — see "Expiry" below
}

interface StoryResponseDto extends StoryRequestDto {
    id: string;
    expiresAt: string; // always present in the response, even if omitted on create
    createdAt: string;
    deletedAt: string | null; // see "Known quirk" below — in practice always null
    viewedByCurrentUser: boolean; // NEW — has the caller already viewed this story
}

interface StoryViewResponseDto {
    id: string;
    storyId: string;
    memberId: string; // the viewer's EventMember id
    createdAt: string; // when they viewed it
}
```

## Endpoints

| Method | Path                            | Auth                 | Notes                                    |
| ------ | ------------------------------- | -------------------- | ---------------------------------------- |
| GET    | `/api/events/{eventId}/stories` | event member         | all stories for the event                |
| GET    | `/api/stories/{id}`             | event member         | single story                             |
| POST   | `/api/stories`                  | event member         | create; `expiresAt` optional (see below) |
| DELETE | `/api/stories/{id}`             | author or HOST       | **hard delete** — see known quirk        |
| POST   | `/api/stories/{id}/views`       | event member         | **NEW** — mark viewed by caller          |
| GET    | `/api/stories/{id}/views`       | story author or HOST | **NEW** — list viewers                   |

## Creating a story — `expiresAt` is now optional

`POST /api/stories` used to reject a request with no `expiresAt` (400, `VALIDATION_FAILED`).
It no longer does. Omit the field and the server sets it to **24 hours from creation time**:

```ts
await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ eventId, mediaId, caption: 'Best day ever! 💍' }),
    // no expiresAt — server defaults it to createdAt + 24h
});
```

If you pass `expiresAt` explicitly, it's used as-is (no minimum/maximum enforced) — that path
is unchanged.

**Important: the default is _not_ clamped to the event's `endAt`.** A story posted on day 1 of
a multi-day event still expires 24h later, even though the event (and its feed) is still
active. This is deliberate — the feed stays live after the event ends, so tying story
lifetime to event duration would either make stories outlive their "ephemeral" purpose (long
events) or vanish immediately (events ending sooner than 24h out). Treat story expiry as
independent of the event's own schedule.

As before, expiry is **not server-enforced removal** — an expired story still exists and is
still returned by `GET /api/events/{eventId}/stories` / `GET /api/stories/{id}`. Filter
`expiresAt < now` client-side to hide expired stories from the active story tray.

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

| Question                        | Field/endpoint                         | Who can see it                                   |
| ------------------------------- | -------------------------------------- | ------------------------------------------------ |
| "Have **I** viewed this story?" | `StoryResponseDto.viewedByCurrentUser` | anyone who can read the story (any event member) |
| "Who has viewed this story?"    | `GET /api/stories/{id}/views`          | the story's author, or a HOST                    |

```ts
function renderTrayItem(story: StoryResponseDto) {
    ring.classList.toggle('seen', story.viewedByCurrentUser);
    ring.classList.toggle('unseen', !story.viewedByCurrentUser);
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
await fetch(`/api/stories/${story.id}/views`, { method: 'POST', headers: authHeaders });
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

| Action                     | Who                           |
| -------------------------- | ----------------------------- |
| Read stories / mark viewed | any member of the event       |
| Create a story             | any member of the event       |
| Delete a story             | the story's author, or a HOST |
| List a story's viewers     | the story's author, or a HOST |

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
