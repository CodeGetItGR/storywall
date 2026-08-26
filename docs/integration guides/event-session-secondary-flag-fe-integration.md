# FE integration guide: secondary session flag (`isSecondary`)

Shipped 2026-08-26. Adds a second, purely-conventional marker alongside `isMain`
([guide](event-session-main-flag-fe-integration.md)) so the frontend can label a second session per
`eventType` without the backend knowing what that label means. For a wedding: `isMain` = ceremony,
`isSecondary` = venue/reception. For a baptism: same shape. For a birthday: no secondary session at
all. Read this alongside the `isMain` guide — the two are siblings, but `isSecondary` behaves very
differently in one key way: it carries **no** backend semantics beyond cardinality.

## Why

Some event types naturally have two focal sessions a host wants to distinguish in the UI (ceremony
vs. reception), but the backend has no business reason to know or care which is which — there's no
date mirroring, no schedule lock, no cascade. It's a display convention the frontend owns entirely,
keyed off `eventType` + this flag. The only thing worth enforcing server-side is that a host can't
end up with two sessions both claiming to be "the secondary one" — that's a data-integrity
constraint, not a business rule.

## What changed

**New field on `EventSessionResponseDto`, `EventSessionRequestDto`, and `EventSessionPatchDto`:**

```ts
interface EventSessionResponseDto {
  // ...existing fields, including isMain from the sibling guide...
  isSecondary: boolean; // NEW
}

interface EventSessionRequestDto {
  // ...existing fields...
  isSecondary?: boolean; // NEW, optional, defaults to false
}

interface EventSessionPatchDto {
  // ...existing fields...
  isSecondary?: boolean; // NEW, optional
}
```

Unlike `isMain`, **`isSecondary` is writable** — you set it yourself on `POST /api/event-sessions`
or `PATCH /api/event-sessions/{id}`, on any session, at any time. There's no concept of "the
secondary session is fixed at creation"; a host can assign it to a newly created session, move it to
a different existing session later, or leave it unset (`false`) entirely for event types that don't
use it (e.g. `BIRTHDAY`).

**Cardinality is enforced — at most one secondary session per event:**

```jsonc
POST /api/event-sessions
{ "eventId": "...", "title": "Reception", "isSecondary": true, ... }

→ 409  // if another non-deleted session in this event already has isSecondary: true
{
  "status": 409,
  "errorCode": 5056,
  "errorKey": "EVENT_SESSION_SECONDARY_ALREADY_ASSIGNED",
  "detail": "Event ... already has a secondary session (...); unset it first."
}
```

The same check applies on `PATCH /api/event-sessions/{id}` when setting `isSecondary: true`. There is
no dedicated "unset" or "reassign" endpoint — to move the flag to a different session, `PATCH` the
old one to `isSecondary: false` first, then `PATCH` (or set at creation) the new one to `true`.
Re-sending `isSecondary: true` on the session that already holds it is a no-op, not a conflict.

**Nothing else about a secondary session is special.** Its `startAt`/`endAt`, `title`,
`locationName`, `mapsUrl`, `displayOrder` are all ordinary, freely editable fields — there is no
read-only mirroring like `isMain`'s, and no interaction with the event's own dates.

## What did not change

- `isMain` and its guide are entirely unaffected — the two flags are independent. Nothing stops a
  session from being neither, and the backend does not check that `isMain` and `isSecondary` aren't
  both set on the same session (there's no product reason for a session to be both, but nothing
  enforces "not both" either — treat it as a UI convention to avoid, not a constraint you can rely
  on the API to catch).
- The event-level and session-level schedule locks (`EVENT_SCHEDULE_LOCKED` 5048,
  `EVENT_SESSION_SCHEDULE_LOCKED` 5052) apply to a secondary session exactly as they do to any
  ordinary session — no exemption, no special-casing.
- `EventRequestDto`, `EventPatchDto`, `EventResponseDto`, `EventDetailResponseDto` shapes are
  unchanged.

## Action

- [ ] Add `isSecondary` to your local `EventSessionResponseDto`, `EventSessionRequestDto`, and
      `EventSessionPatchDto` types / query cache normalization.
- [ ] Decide, per `eventType`, whether your UI offers a "mark as secondary" action at all — for
      types like `BIRTHDAY` with no secondary concept, simply never send `isSecondary: true` and
      the field stays `false` on every session.
- [ ] When offering that action, disable it (or block the request) for any session once another
      session in the event already has `isSecondary: true`, and handle `errorCode: 5056` /
      `EVENT_SESSION_SECONDARY_ALREADY_ASSIGNED` defensively in case of a race.
- [ ] To let a host reassign which session is secondary, implement it client-side as two PATCH
      calls (unset old, then set new) — there is no atomic reassignment endpoint.
- [ ] Do not build any date-mirroring or schedule-lock UI specific to the secondary session — its
      schedule behaves like any other satellite session.
