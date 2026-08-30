# FE integration guide: Reaction types catalog

Shipped 2026-08-30. `reactionType` on `POST /api/reactions` used to accept exactly two hardcoded,
globally-shared strings (`LIKE`, `LAUGH`) enforced by a DB `CHECK` constraint. It is now validated
against an admin-managed catalog scoped **per event type** — the same code (e.g. `LOVE`) can exist
independently for `WEDDING` and `BIRTHDAY`, with different display detail, or exist for one and not
the other. See `frontend-integration-guide.md` §0 for base setup (auth header, error shape) — this
doc only covers what's new.

⚠️ **BREAKING for anything that hardcoded the old two-value set.** If your reaction picker only
ever rendered `LIKE`/`LAUGH`, or validated client-side against those two literals, that allowlist is
now wrong and stale — see §1.

---

## 0. The whole thing in one table

| # | what changed | your work |
|---|---|---|
| 1 | The reaction picker's option set is no longer a hardcoded 2-value constant | source it from `GET /api/config` → `reactionTypesByEventType[event.eventType]` — §1 |
| 2 | Every event type now seeds 4 defaults: `LIKE` 👍, `LOVE` ❤️, `LAUGH` 😂, `CELEBRATE` 🎉 | update any UI that assumed only `LIKE`/`LAUGH` exist — §1 |
| 3 | `reactionType` is validated against the calling post's **event's** event type, not globally | a code valid for one event's posts may 404/409 for another's — §2 |
| 4 | Two new error responses on `POST /api/reactions`: unknown code (`404`), archived code (`409 REACTION_TYPE_NOT_USABLE`) | handle both — §2 |
| 5 | `POST /api/reactions` request/response wire shape | **unchanged** — still `{ postId, memberId, reactionType }` in, `reactionType` echoed back as the same string code — §2 |
| 6 | New admin CRUD surface at `/api/admin/reaction-types`, capped at 5 active rows per event type | build the admin catalog screen — §3 |
| 7 | `DELETE /api/reactions/{id}`, `GET /api/posts/{postId}/reactions`, `likedByCurrentUser`/`reactionCount` | **unchanged** — §4 |

---

## 1. Where the option set comes from now

`GET /api/config` gained `reactionTypesByEventType`, a map keyed by `eventTypeKey`:

```jsonc
// GET /api/config
"reactionTypesByEventType": {
  "WEDDING": [
    { "id": "…", "eventTypeKey": "WEDDING", "code": "LIKE",      "name": "Like",      "emoji": "👍", "sortOrder": 0, "isAssignable": true },
    { "id": "…", "eventTypeKey": "WEDDING", "code": "LOVE",      "name": "Love",      "emoji": "❤️", "sortOrder": 1, "isAssignable": true },
    { "id": "…", "eventTypeKey": "WEDDING", "code": "LAUGH",     "name": "Laugh",     "emoji": "😂", "sortOrder": 2, "isAssignable": true },
    { "id": "…", "eventTypeKey": "WEDDING", "code": "CELEBRATE", "name": "Celebrate", "emoji": "🎉", "sortOrder": 3, "isAssignable": true }
  ],
  "BIRTHDAY": [ /* same 4 defaults, own rows */ ],
  // … one entry per enabled event type
}
```

Only active (`isAssignable: true`) rows appear here — an archived type is resolvable for reactions
that already used it (see §2) but is not offered for new ones, so it never shows up in this map.
Rows are pre-sorted by `sortOrder`; render the picker in that order rather than re-sorting
client-side.

**Build the picker from the post's event's `eventType`**, not a flat global list:

```ts
const options = config.reactionTypesByEventType[post.eventType] ?? [];
```

This is a **breaking change** if you previously hardcoded `['LIKE', 'LAUGH']` (or similar) anywhere
— that list is now wrong in two directions: it's missing `LOVE`/`CELEBRATE`, and it isn't scoped per
event type, so an admin who archives or adds a type for one event type won't be reflected. Fetch and
cache `GET /api/config` once at app boot per the existing convention (`app-config-fe-integration.md`)
and read from it.

## 2. `POST /api/reactions` — same shape, new validation

Request and response are byte-for-byte unchanged:

```ts
interface ReactionRequestDto { postId: string; memberId: string; reactionType: string; }
interface ReactionResponseDto {
  id: string; postId: string; memberId: string; reactionType: string; createdAt: string;
}
```

`reactionType` is still a plain string code, echoed back as-is — **not** a UUID, and not the
catalog row's `id`. What changed is what the server accepts:

1. It must be a `code` that exists in `reactionTypesByEventType[thatPost'sEvent.eventType]`
   (active **or** archived — see next point).
2. If it exists but is archived (`isAssignable: false`), the reaction is refused so the option
   never becomes newly assignable through this endpoint, even though existing reactions using it
   are left alone.

```jsonc
// unknown code for this post's event type — 404
{ "status": 404, "detail": "ReactionType WEDDING/NOPE not found", "errorCode": 2001, "errorKey": "RESOURCE_NOT_FOUND" }

// archived code — 409
{ "status": 409, "detail": "Reaction type OLDCODE is not available for event type WEDDING.",
  "errorCode": 5057, "errorKey": "REACTION_TYPE_NOT_USABLE" }
```

| code | HTTP | when | what to show |
|---|---|---|---|
| `2001` `RESOURCE_NOT_FOUND` | 404 | `reactionType` doesn't exist for this post's event type at all | shouldn't happen if the picker is built from §1's map — treat as stale client cache, refetch config |
| `5057` `REACTION_TYPE_NOT_USABLE` | 409 | `reactionType` exists but was archived by an admin after your config cache was fetched | refetch config and re-render the picker; the option the user tapped just disappeared |
| `5005` `DUPLICATE_REACTION` | 409 | same `(postId, memberId, reactionType)` already exists | **unchanged** from before this change |

Both new codes are realistically only reachable from a stale client-side cache racing an admin
edit — refetching `GET /api/config` (it's cheap; see caching note in §1) is the correct recovery for
both.

**Scoping trap:** the same code string can mean a different row (or not exist at all) depending on
which event the post belongs to. Never reuse a `reactionType` value across posts from different
events without re-checking that event's own entry in `reactionTypesByEventType` — a code valid on a
`WEDDING` post can 404 on a `CORPORATE` post if no admin ever added it there.

## 3. Admin panel: the reaction-type catalog

New controller, `hasRole('ADMIN')` on every route, including reads:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/reaction-types?eventTypeKey=WEDDING&includeArchived=false` | `eventTypeKey` required; `includeArchived` optional, default `false` |
| GET | `/api/admin/reaction-types/{id}` | |
| POST | `/api/admin/reaction-types` | see body below |
| PATCH | `/api/admin/reaction-types/{id}` | display fields only — `eventTypeKey`/`code` are immutable |
| DELETE | `/api/admin/reaction-types/{id}` | hard delete — blocked if any reaction still references it |

```ts
interface ReactionTypeRequestDto {
  eventTypeKey: string;   // must be a known EventTypeKey, e.g. "WEDDING"
  code: string;           // max 20, ^[A-Z0-9_]+$ — immutable after creation
  name: string;           // max 30
  emoji: string;          // max 16, a single emoji
  sortOrder: number;      // >= 0
  isAssignable: boolean;
}
interface ReactionTypePatchDto {
  name?: string; emoji?: string; sortOrder?: number; isAssignable?: boolean;
  // eventTypeKey and code are NOT here — not patchable, create a new row instead
}
interface ReactionTypeResponseDto {
  id: string; eventTypeKey: string; code: string; name: string; emoji: string;
  sortOrder: number; isAssignable: boolean;
}
```

### The 5-active cap

At most 5 rows with `isAssignable: true` may exist per `eventTypeKey` — not global, per event type.
Every event type ships with 4 defaults, leaving exactly 1 free slot for a custom addition out of the
box.

```jsonc
// POST or PATCH pushing a 6th active row for the same eventTypeKey — 409
{ "status": 409,
  "detail": "WEDDING already has 5 active reaction types; archive one first.",
  "errorCode": 5059, "errorKey": "REACTION_TYPE_LIMIT_EXCEEDED" }
```

Disable the create button (or show a live counter) once
`reactionTypesByEventType[eventTypeKey].length === 5` for the event type being edited — the same
pattern as any other capped catalog in this codebase. A `PATCH` that flips `isAssignable: false → true`
on an existing row is checked against the same cap; flipping `true → false` (archiving) always frees
a slot and is never rejected for this reason.

### Duplicate code, per event type

`(eventTypeKey, code)` is unique. The same `code` is fine across different event types — that's the
whole point of the scoping — but a duplicate within one event type is rejected:

```jsonc
// 409
{ "status": 409, "detail": "WEDDING already has a reaction type with code LOVE.",
  "errorCode": 3001, "errorKey": "VALIDATION_FAILED" }
```

### Delete vs. archive

`DELETE` is a hard delete and is refused if any `Reaction` row still references it:

```jsonc
// 409
{ "status": 409, "detail": "Cannot delete reaction type LOVE: it is still referenced by 42 reaction(s).",
  "errorCode": 5058, "errorKey": "REACTION_TYPE_IN_USE" }
```

Mirrors the paid-service catalog's `isAssignable` pattern (`billing-fe-guide.md` §13): an
already-used row is archived (`PATCH { isAssignable: false }`), never deleted. `DELETE` only
succeeds for a row nobody has reacted with yet — realistically, one created by mistake and
abandoned immediately. Build the admin UI around archive as the normal "retire this reaction" action
and treat `DELETE` as a narrow cleanup affordance, disabled (or hidden) once the row has any usage.

## 4. Explicitly unchanged — nothing to build

- **`DELETE /api/reactions/{id}`** — by the reaction's own id, same as before.
- **`GET /api/posts/{postId}/reactions`**, **`GET /api/reactions/{id}`** — same shape.
- **`likedByCurrentUser` / `reactionCount`** on post DTOs — see
  `post-liked-by-current-user-integration-guide.md`, entirely unaffected. Still only tells you
  *whether* the caller reacted, not *which* code.
- **Rate limit** on `POST`/`DELETE /api/reactions` — unchanged, `reaction.write`, 80/60s.

## 5. Checklist

- [ ] Fetch `reactionTypesByEventType` from `GET /api/config` and build the reaction picker from
      `reactionTypesByEventType[post.eventType]` instead of any hardcoded list.
- [ ] Handle `404 RESOURCE_NOT_FOUND` and `409 REACTION_TYPE_NOT_USABLE` on `POST /api/reactions` by
      refetching config and re-rendering the picker.
- [ ] Build (or update) the admin reaction-types screen: list scoped by `eventTypeKey`, create/patch
      form, a visible "X/5 active" counter, archive as the primary retire action, delete disabled once
      a row has usage.
- [ ] Handle `409 REACTION_TYPE_LIMIT_EXCEEDED` (5059) on admin create/patch.
- [ ] Handle `409 REACTION_TYPE_IN_USE` (5058) on admin delete.
- [ ] Grep for any client-side allowlist of `LIKE`/`LAUGH` reaction codes and remove it.
