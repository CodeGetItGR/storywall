# FE integration guide: main session flag (`isMain`)

Shipped 2026-08-26. Fixes a design gap: `Event.startAt`/`endAt` and an `EventSession`'s own
`startAt`/`endAt` were two independently-writable schedules with nothing keeping them aligned. This
adds `isMain` to `EventSessionResponseDto`, makes the main session's schedule a read-only mirror of
the event's, and changes what `PATCH /api/event-sessions/{id}` accepts for that one session.
Read this alongside
[`event-creation-initial-session-fe-integration.md`](event-creation-initial-session-fe-integration.md)
(the seeded-session feature this builds on) and
[`event-lifecycle-locks-and-event-types-fe-integration.md`](event-lifecycle-locks-and-event-types-fe-integration.md)
§4 (the schedule lock this narrows).

## Why

`EventRequestDto.startAt` is required at creation — every event has one from the start, draft or
not — and it's what billing, reminders, and refund eligibility all key off. Separately, if you sent
`initialSessionTitle` at creation, a matching `EventSession` was seeded with the same dates, but
nothing kept the two in sync afterward: a host could edit the session's time (or the event's own
time) independently, and the two would silently drift. A guest could see a schedule that
contradicted what the backend believed about "when this event starts."

The fix is not to sync two independently-writable fields — that's fragile. Instead, exactly one
session per event can be flagged `isMain`, and that session's schedule is no longer independently
editable at all. `Event.startAt`/`endAt` stays the single writable source of truth; the main
session is a read-only view of it.

## What changed

**New field on `EventSessionResponseDto` (response only — never sent by the client):**

```ts
interface EventSessionResponseDto {
  // ...existing fields unchanged...
  isMain: boolean; // NEW
}
```

- `isMain: true` on exactly the session created via `initialSessionTitle` at event creation (see
  the linked guide). There is at most one per event.
- `isMain: false` on every other session — including on events created before this change, or
  created without `initialSessionTitle`. **Those events have no main session at all**; `sessions[]`
  simply has no `isMain: true` entry. This is not backfilled after the fact — there's no API to
  designate a main session later, and none is planned. It's decided once, at creation.
- `isMain` is **not** a field on `EventSessionRequestDto` or `EventSessionPatchDto` — you cannot
  set or unset it yourself, on this or any other session. It's entirely system-managed.

**`PATCH /api/event-sessions/{id}` now rejects `startAt`/`endAt` on the main session:**

```jsonc
PATCH /api/event-sessions/{mainSessionId}
{ "startAt": "2026-10-01T18:00:00Z" }

→ 409
{
  "status": 409,
  "errorCode": 5055,
  "errorKey": "EVENT_SESSION_MAIN_DATES_READ_ONLY",
  "detail": "Session ... is the event's main session; edit the event's startAt/endAt instead — this session's schedule always mirrors it."
}
```

This applies **unconditionally** — before the event has started, while it's still `DRAFT`,
whatever the value. It's not a variant of the existing schedule lock (§4 of the lifecycle-locks
guide); it fires even in cases where that lock would have allowed the edit. Every other field on
the main session — `title`, `description`, `locationName`, `mapsUrl`, `displayOrder` — is
unaffected and stays freely editable, same as any other session.

**`PATCH /api/events/{id}` now cascades `startAt`/`endAt` onto the main session, if there is one:**

```jsonc
PATCH /api/events/{eventId}
{ "startAt": "2026-10-01T18:00:00Z", "endAt": "2026-10-01T22:00:00Z" }

→ 200 EventResponseDto  // as before — this response shape is unchanged
```

No visible change in this response, but a follow-up `GET /api/events/{id}` now shows the main
session's `startAt`/`endAt` in `sessions[]` already updated to match. The existing event-level
schedule lock (`EVENT_SCHEDULE_LOCKED`, 5048) is unaffected and unchanged — it still gates whether
the event's own `startAt`/`endAt` can move at all; the cascade only runs after that check passes.

Non-main sessions are never touched by an event-level patch — a satellite session (rehearsal
dinner, afterparty) keeps whatever time a host gave it regardless of what happens to the event's
own dates.

## What did not change

- `POST /api/event-sessions` — creating additional sessions is unaffected. A newly created session
  is never `isMain` (there's no field to request it), so it's freely schedulable like today.
- The event-level schedule lock (`EVENT_SCHEDULE_LOCKED`, 5048) and the non-main session lock
  (`EVENT_SESSION_SCHEDULE_LOCKED`, 5052) are both unchanged for everything they already governed.
- `EventRequestDto`, `EventPatchDto`, `EventResponseDto`, `EventDetailResponseDto` shapes are
  unchanged.
- `EventSessionRequestDto`, `EventSessionPatchDto` shapes are unchanged — no writable `isMain`.

## Action

- [ ] Add `isMain` to your local `EventSessionResponseDto` type / query cache normalization.
- [ ] In the session-editing UI, disable (don't just soft-validate) the start/end time inputs when
      `session.isMain === true` — point the host at the event's own date field instead of letting
      them hit a 409. Every other field on that form stays enabled.
- [ ] Handle `errorCode: 5055` / `EVENT_SESSION_MAIN_DATES_READ_ONLY` defensively wherever a
      session PATCH is fired from a generic form, in case the disabled-input guard above is
      bypassed (bulk edit, stale cached `isMain`, etc.) — surface the `detail` message rather than
      a generic save-failed toast.
- [ ] After a successful `PATCH /api/events/{id}` that changed `startAt`/`endAt`, invalidate/refetch
      the event's `sessions[]` too if you have them cached — the main session's dates changed
      server-side even though the event PATCH response itself doesn't show it.
- [ ] Don't build any UI for assigning/reassigning which session is main — there is no such
      endpoint. It's decided once, at creation, via `initialSessionTitle`.
- [ ] For events with no main session (created before this change, or without
      `initialSessionTitle`), the agenda screen should look and behave exactly as it does today —
      nothing here forces every event to have one.
