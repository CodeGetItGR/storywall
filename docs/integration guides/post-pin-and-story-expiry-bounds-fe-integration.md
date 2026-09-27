# FE integration: pinning and announcements are host-only; story `expiresAt` is bounded

Backend change dated 2026-09-27. No request or response shape changed. Three requests that used to
succeed are now refused, each with its own error code.

**Storywall needs no change.** Its current UI never sends any of the three refused requests (checked
2026-09-27, details below). The one optional follow-up is a friendlier message for 4007.

## Why

Both gaps were server-side input-validation holes. The frontend's own gating was right, but the
backend trusted the request body:

- **Any member could pin.** `POST /api/posts` accepted `isPinned: true` and `type: "ANNOUNCEMENT"`
  from any event member, guests included. `PATCH /api/posts/{id}` let a post's author set
  `isPinned`. The feed sorts pinned posts first, so a guest with a hand-written request could hold the
  top of the feed.
- **Stories could live forever.** `expiresAt` was used as sent, so a client could post a story that
  never expires, or one that had expired before anyone saw it.

## What changed

### Posts

"Host" means the primary host or a co-host: any member with an `EventHost` row. That is the same set
storywall's `useIsHost()` covers, since co-hosts carry `role: "HOST"`.

| Request | Non-host | Host |
|---|---|---|
| `POST /api/posts` with `isPinned: false` | allowed (unchanged) | allowed |
| `POST /api/posts` with `isPinned: true` | **403, 4007 `POST_PIN_NOT_HOST`** | allowed |
| `POST /api/posts` with `type: "ANNOUNCEMENT"` | **403, 4008 `ANNOUNCEMENT_NOT_HOST`** | allowed |
| `PATCH /api/posts/{id}` changing `isPinned`, pin or unpin | **403, 4007**, even for the post's author | allowed |
| `PATCH /api/posts/{id}` sending the post's current `isPinned` back | allowed: not a change | allowed |
| `PATCH /api/posts/{id}` with `content` only | author: allowed (unchanged) | allowed |

A refused request applies nothing. A PATCH carrying `{content, isPinned}` from a non-host that
changes the pin also leaves the content unedited.

### Stories

`expiresAt` stays optional, and omitting it still defaults to 24 hours after creation. When it is
sent, it must satisfy **now < `expiresAt` ≤ now + 24h** by server time, or the request fails with
**400, 3034 `STORY_EXPIRY_OUT_OF_RANGE`**. A client can shorten a story's life, not extend it.

- `POST /api/stories`: the single create returns a whole-request 400.
- `POST /api/stories/batch`: the bound is checked for every item up front, like the other field
  rules. One out-of-range item rejects the whole batch with 400/3034 and saves nothing. The message
  names the item, e.g. `Item 1: expiresAt must be …`. It does **not** appear as a per-item entry in
  `failed[]`.

## Error codes

| code | HTTP | when | what to show |
|---|---|---|---|
| `4007` `POST_PIN_NOT_HOST` | 403 | a non-host tried to create a pinned post, or to pin or unpin one | "Only hosts can pin posts." Only reachable from a host-gated toggle if the caller stopped being a host mid-session |
| `4008` `ANNOUNCEMENT_NOT_HOST` | 403 | a non-host tried to create an `ANNOUNCEMENT` post | "Only hosts can post announcements." Unreachable today, since storywall has no announcement composer |
| `3034` `STORY_EXPIRY_OUT_OF_RANGE` | 400 | `expiresAt` is in the past or more than 24h ahead | unreachable today, since storywall never sends `expiresAt` |

## What storywall does today (verified 2026-09-27)

Paths are relative to the storywall repo.

- **Post create:** one call site, `hooks/usePublishQueueController.ts:189-196`. It always sends
  `isPinned: false`, and `type` is `'MEDIA'` or `'TEXT'` depending on whether media is attached.
  Nothing on this path is affected.
- **Pin toggle:** `components/feed/PostCard.tsx:106-116` sends `PATCH {isPinned}`. It is gated by
  `canTogglePin = isHost && canWrite` (`PostCard.tsx:62`), so it already matches the new server rule.
  Authors who aren't hosts only see a read-only pin icon.
- **Edit post:** `components/feed/post/EditPostModal.tsx:42` sends `PATCH {content}` only, so it is
  not affected.
- **Announcements:** there is no composer. `ANNOUNCEMENT` appears only in the `PostType` union and in
  the demo seed data.
- **Stories:** the only live call site is the batch path, `hooks/usePublishQueueController.ts:270-277`,
  and it never sends `expiresAt`. `useCreateStory` (single `POST /api/stories`) has no callers.

## Optional follow-ups

1. **Map 4007 for the pin toggle.** Today it would fall back to `pinPostFailed` / `unpinPostFailed`
   ("Couldn't pin this post…"), which is acceptable. A specific message takes three steps, because
   `API_ERROR_MESSAGE_KEYS` must satisfy `Record<KnownApiErrorCode, …>`:
   1. an `ERROR_CODES` entry in `lib/api/errors.ts`;
   2. a key in the `ApiErrorMessageKey` union plus an `API_ERROR_MESSAGE_KEYS` entry in
      `lib/api/errorMessageKeys.ts`;
   3. `ApiErrors.<key>` strings in both `messages/en.json` and `messages/el.json`.
2. **Before building an announcement composer or a story-duration picker,** gate the first on
   `useIsHost()`, cap the second at 24h, and map 4008 / 3034 at that point.
3. **Refresh storywall's copy of our types.** `docs/integration guides/frontend-api-types.ts` in the
   storywall repo still describes `isPinned` on `PostPatchDto` as "author or host" and `expiresAt` as
   unbounded. The backend's [`docs/frontend-api-types.ts`](../frontend-api-types.ts) is current.

## TypeScript

No shape changes. `PostRequestDto`, `PostPatchDto` and `StoryRequestDto` keep the same fields and
optionality, and only the comments in [`docs/frontend-api-types.ts`](../frontend-api-types.ts)
changed.
