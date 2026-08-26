# FE integration: event creation can seed an initial schedule session

Shipped 2026-08-26. Small, additive change to `POST /api/events` — one new optional request
field, no new endpoints, no new error codes, no change to any response shape. Read this if you're
building or touching the event-creation flow described in
[`event-creation-flow-design.md`](../superpowers/specs/2026-06-14-event-creation-flow-design.md)
(Stage 1 in particular).

## Why

`Event.startAt` has always been a bare field — the date/time the host picks at creation, with no
schedule entry backing it. Meanwhile `EventSession` (the agenda/programme model) only ever got
populated later, one at a time, via `POST /api/event-sessions` in Stage 3 of the creation flow.
For event types built around one specific moment — a wedding or baptism ceremony — that meant the
date the host cared about most lived only on the event, disconnected from the agenda the guest
actually sees.

`EventService#create` now optionally creates that first `EventSession` in the same transaction as
the event, anchored to the exact `startAt`/`endAt` the host just entered.

## What changed

**New optional field on `EventRequestDto`:**

```ts
interface EventRequestDto {
  // ...existing fields unchanged...
  initialSessionTitle?: string;  // max 255
}
```

**Behavior on `POST /api/events`:**

- If `initialSessionTitle` is a non-blank string, an `EventSession` is created alongside the event:
  `title` = what you sent, `startAt`/`endAt` = the event's own `startAt`/`endAt`, `displayOrder: 0`.
- If it's omitted, `null`, or blank/whitespace-only, **no session is created** — identical to
  today's behavior. This is a purely additive, opt-in field; a client that never sends it sees no
  change at all.
- Validation is the ordinary shape: over 255 chars → `400` with `errors.initialSessionTitle`, same
  as every other `@Size`-bounded field on this DTO. There's no new error code — this can't conflict
  with anything, since it's the very first session on a brand-new event.

```jsonc
// Request
POST /api/events
{
  "title": "Maria & Nick's Wedding",
  "eventType": "WEDDING",
  "visibility": "PRIVATE",
  "startAt": "2026-09-12T17:00:00+03:00",
  "timezone": "Europe/Athens",
  "brandingSettings": {},
  "planTierCode": "EVENT_STANDARD",
  "initialSessionTitle": "Ceremony"
}

// Response — EventResponseDto, unchanged shape, no session info in it
{
  "id": "...",
  "title": "Maria & Nick's Wedding",
  "startAt": "2026-09-12T17:00:00+03:00",
  // ...
}
```

**The response doesn't tell you the session was created or what its id is.** `POST /api/events`
still returns the flat `EventResponseDto` — same shape as before, no `sessions` field on it (that's
only on the detail DTO). If you need the new session's id — e.g. to let the host rename it inline
right after creation — follow up with `GET /api/events/{id}` and read `sessions[]`
(`EventDetailResponseDto.sessions`); the seeded one is the entry with `displayOrder === 0` on a
freshly created event.

## Whose job is the label text

**The backend does not own or hardcode any per-type copy here** — it just persists whatever string
you send. There's no server-side concept of "Ceremony" tied to `WEDDING`, and no locale handling:
the value you send is stored byte-for-byte as the session's `title`. This is deliberate — the app
has no stored host/user locale to pick English vs. Greek on the backend's own, and it mirrors how
the honoree-role catalog in Stage 2 already works (frontend owns the per-`eventType` catalog,
backend just stores what arrives).

**Action:** build a small per-`eventType` catalog on the frontend for both the `startAt` field's
label and whether to send `initialSessionTitle` at all. Starting point (extend as needed — this
isn't enforced or validated against any list):

| eventType | `startAt` field label | `initialSessionTitle` sent as |
|---|---|---|
| `WEDDING` | "Date & time of the ceremony" | `"Ceremony"` (or the localized equivalent, e.g. `"Τελετή"`) |
| `BAPTISM` | "Date & time of the ceremony" | `"Ceremony"` |
| anything else | "Date & time of the event" | omit — don't send the field |

Event types with no natural "first session" (generic social events, conferences, etc.) should
simply not send `initialSessionTitle`. Stage 1 stays a single generic date/time field for those,
and the host builds the agenda from scratch via the existing Stage 3 "add session" checklist item.

## What did not change

- `POST /api/event-sessions` (Stage 3 "add agenda/session") is untouched — for event types that
  got a seeded session, this is now for *additional* entries (e.g. "Reception"); for types that
  didn't, it's unchanged from today.
- `PATCH /api/event-sessions/{id}` — the seeded session is an ordinary session row from the moment
  it exists. It can be renamed, rescheduled, or relocated like any other, subject to the existing
  schedule lock (see `event-lifecycle-locks-and-event-types-fe-integration.md` §4) — DRAFT events
  are exempt, same as elsewhere.
- No RSVP session-response back-fill happens for the seeded session beyond what already happens for
  any brand-new session on a brand-new event: there are no RSVPs yet at creation time, so there's
  nothing to back-fill.
- `EventDetailResponseDto` / `EventSessionResponseDto` shapes are unchanged.

## Checklist

- [ ] Decide, per `eventType`, whether Stage 1 sends `initialSessionTitle` and what text/label to
      use — this is entirely a frontend catalog decision, not something to look up from the API.
- [ ] If the creation flow needs the seeded session's id right after creation (e.g. to let the host
      immediately edit it), fetch `GET /api/events/{id}` and read `sessions[]` — `POST /api/events`
      itself won't give it to you.
- [ ] If Stage 3's "add session" step currently assumes the agenda starts empty, that assumption no
      longer holds for event types that seed one — the step should say "add another session," or at
      minimum not look broken when one entry already exists.
- [ ] No handling needed for a new error code — there isn't one. A too-long title just 400s the
      normal validation way.
