# FE integration: optional end date and the event coverage window

> **2026-09-23: `galleryOpensAt` and `coverage.maxPreEventDays` were removed.** There is no
> pre-event gallery gate. Everything below about the gallery opening is historical; see
> [`withdrawal-compliance-phase1-fe-integration.md`](withdrawal-compliance-phase1-fe-integration.md).

Shipped 2026-09-21. `endAt` is no longer required when creating an event, `startAt` is capped at
eighteen months out, and every activated event now carries two new dates — when its gallery opens
and when it is reclaimed. One new error code, no new endpoints. Read this if you touch event
creation, the event detail page, or anything that tells a host how long their photos are kept.

**2026-09-23:** the retention term is now the months of the **coverage option** the host picks — a
plan is sold at several durations — not the plan's. `projectedCoverage.hostingMonths` and the pinned
`coverageEndsAt` use those months, `coverage.defaultHostingMonths` is gone from `/api/config`, and a
paid upgrade to a longer duration moves `coverageEndsAt` later.
**`coverage-options-and-extensions-fe-integration.md` has the full reference.**

## Why

Retention used to be `endAt + plan.autoDeleteMonths` — a clock the host set. Anyone who noticed
could put their event two years out and get two extra years of hosting for the same one-time
price. Requiring an end date did nothing to stop that; it just made the host invent a finish time.

The clock now belongs to the plan — since 2026-09-23, to the duration of it the host bought. The
gallery opens a fixed span before the event, retention runs
from the event itself, and both are pinned at activation. A distant date moves the whole window
later without stretching it, and the gallery stays shut in the meantime, so there is nothing to
upload into. That is the entire defence — no rule the FE has to explain or enforce.

## What changed

### `endAt` is optional on `POST /api/events`

```ts
interface EventRequestDto {
  // ...existing fields unchanged...
  startAt: string;   // still required, ISO-8601 with offset
  endAt?: string;    // NEW: optional. Omit it and the server fills startAt + 24h.
}
```

- Omitted, `null`, or absent → the event gets `endAt = startAt + 24h`. The response always carries
  a non-null `endAt`; nothing downstream (RSVP, sessions, the post-event summary) ever sees a null.
- Sent explicitly → honoured as before, subject to the existing `endAt > startAt` check
  (`3008 EVENT_DATES_INCOMPLETE`).
- `endAt` no longer decides anything about retention. Show it as "when the event finishes", not as
  "how long we keep your photos".

**UX note:** you can drop the end-date field from the creation form entirely, or keep it as an
optional "runs until" for multi-day events. Either is fine. Do not pre-fill it as required.

### `startAt` is capped at 548 days ahead

**New error code on `POST /api/events` and `PATCH /api/events/{id}`** — the usual `ProblemDetail` shape, **`400`**,
`errorCode: 3032` / `errorKey: "EVENT_START_TOO_FAR_AHEAD"`:

```json
{
  "status": 400,
  "errorCode": 3032,
  "errorKey": "EVENT_START_TOO_FAR_AHEAD",
  "detail": "An event cannot be scheduled more than 548 days ahead."
}
```

Eighteen months clears a wedding booked early. Past that a date is a price lock, not a plan —
activation is a one-time charge, so a date years out would hold today's price and plan limits
indefinitely. Validate client-side with the same bound so a host gets an inline message rather
than a round-trip; the server enforces it regardless.

The bound is published as `coverage.maxLeadDays` on `GET /api/config` (since 2026-09-21, with
`maxPreEventDays` and `defaultEventDurationHours` beside it; `defaultHostingMonths` was removed on
2026-09-23). Read it from there; do not hard-code 548.

### Two new dates on every event response

Both `GET /api/events` (`EventResponseDto`) and `GET /api/events/{id}` (nested under `schedule`
on `EventDetailResponseDto`):

```ts
interface EventScheduleDto {
  startAt: string;
  endAt: string;
  galleryOpensAt: string | null;   // NEW
  coverageEndsAt: string | null;   // NEW
  projectedCoverage: ProjectedCoverageDto | null;   // NEW — DRAFT only
  timezone: string;
  rsvpDeadline: string | null;
}

interface ProjectedCoverageDto {
  galleryOpensAt: string;   // what galleryOpensAt would be pinned to if paid for right now
  coverageEndsAt: string;   // likewise
  hostingMonths: number;    // the months of the coverage option the draft is on
}
```

- **`galleryOpensAt`** — when uploads become available. `startAt - 90 days`, clamped so it never
  precedes activation. This is the run-up a host shooting preparations gets without asking.
- **`coverageEndsAt`** — when the event and its media are reclaimed. `startAt + the coverage
  option's months`, clamped so it never precedes activation.
- **Both are `null` while the event is `DRAFT`.** They are computed once at activation — editing
  `startAt` or `endAt` afterwards does not move them. The one thing that does: a paid upgrade to a
  longer duration moves `coverageEndsAt` later by the months it adds. Render "your gallery is
  open from … until …" from these two, never from `startAt`/`endAt` arithmetic.
- **`projectedCoverage`** is the mirror image: **set while `DRAFT`, `null` once `ACTIVE`.** It is
  the window the event *would* get if activated at the moment of the request — the same arithmetic
  activation pins, with `now` standing in for the activation instant — and it is recomputed on
  every read, so it follows `startAt` and the chosen duration as the host edits the draft. It is
  also on the top-level
  `EventResponseDto`, so the `POST /api/events` and `PATCH /api/events/{id}` replies carry it: the
  request that saves a date change returns the new projection, no second fetch needed. Exactly one
  of `projectedCoverage` / `coverageEndsAt` is non-null on any event; render whichever is.

**This plan is not yet enforced on the upload path.** `galleryOpensAt` is informational today; a
guest can still upload before it. Enforcement is a separate change with its own guide.

### The auto-delete warning has moved with it

`EVENT_AUTO_DELETE_WARNING` notifications now count down to `coverageEndsAt` rather than to
`endAt + months`. Payload shape is unchanged (`deletionDate`, `daysRemaining`, `autoDeleteMonths`,
`whenKey`); only the date they describe has moved. Nothing to do unless you compute a deletion
date yourself, in which case stop and read `coverageEndsAt` off the event instead.

## What did not change

- The `events.end_at` column is still `NOT NULL`. Optionality is purely at the API boundary.
- `startAt` on `PATCH /api/events/{id}` is still locked once it has passed and free to move
  *forward* before that. Two edges are now enforced on PATCH as well (both pre-existing on POST or
  on `endAt`): it cannot be moved **into the past** on a live event (`409` /
  `EVENT_SCHEDULE_LOCKED`, same code as the "already started" case), and it cannot go beyond the
  lead-day cap above (`400` / `EVENT_START_TOO_FAR_AHEAD`). Apply the same picker bounds to the
  edit form as to creation. Moving it after activation does nothing to the window because the
  window is pinned.
- Moving a live event's schedule is now recorded server-side (`audit_logs`, action
  `EVENT_RESCHEDULED`, with before/after and the actor). Nothing for the FE to render; it is
  reviewer evidence. The date the host paid for is kept internally as `activatedStartAt` and is
  **not** on the response DTO.
- Refund pro-rating no longer reads `endAt` at all: "performed" is `now >= startAt`, and hosting is
  pro-rated over `paidAt → coverageEndsAt`. No response shape changes. A withdrawal on an event
  whose `startAt` was moved after payment is always **HELD** for review rather than auto-refunded —
  if you show a refund preview, the preview endpoint still returns the computed lines, but the
  request's `status` will be `HELD`, not `REFUNDED`.

## UX & disclosures

The API contract above is the easy half. This is what the screens need to do with it. Both backend
prerequisites listed at the end have shipped; nothing here is blocked.

### Creation form

- **End date becomes optional.** Relabel "Runs until (optional)", hint "Leave empty for a
  single-day event." Remove the required marker. Keeping the field is fine for multi-day events;
  removing it entirely is also fine.
- **Start date is capped.** Picker max = today + `config.coverage.maxLeadDays`; inline copy "Events can
  be scheduled up to 18 months ahead." Handle `3032` as the server-side fallback, not the primary UX.
- **Live projection as the date moves.** Under the date picker: "Gallery opens 15 Jul · Photos kept
  until 14 Oct 2027." Watching it move is how a host learns the model without reading anything.
  Render from `projectedCoverage` on the create/patch response (or the detail `schedule`): the
  request that saves the date returns the new projection. Never approximate it client-side.

### Checkout — before the pay button

A "What you're buying" block, in this order. Every line is load-bearing.

| Line | Copy shape | Why it must be here |
|---|---|---|
| **Activates today** | "Your event goes live the moment payment completes." | Activation ≠ event date. Hosts assume they are the same. |
| **Gallery opens [date]** | "[N] days before your event — upload preparations from then." Or "immediately" if inside the run-up. | Sets the prep expectation; explains why a far-out event has a shut gallery. |
| **Photos kept until [date]** | "[N] months after your event date — the duration you chose. After that everything is permanently deleted — we'll remind you 7 days and 1 day before." | The thing they are paying for. |
| **These dates are fixed at payment** | "Changing your event date later won't move them." | **The support-ticket line.** It is the pinning — the whole abuse defence — and it is counter-intuitive. Place it next to the consent checkbox, not in a tooltip. |
| Plan limits | Storage, max guests — from the plan tier. | Existing. |
| Withdrawal terms | 14-day window + consent. | Existing. |

### Host dashboard (after activation)

- **Status strip** from the two dates: "Gallery opens in N days" → "Gallery open · closes [date]" →
  "Closing in N days — download your gallery" (final 30 days, escalating).
- **Coverage card**: activated on, gallery opens, kept until, plan and duration (`coverageMonths` from
  `GET /api/events/{id}/billing`). Same four facts as checkout, now real instead of projected.
- **Download CTA** promoted in the final month. `EVENT_AUTO_DELETE_WARNING` already fires at 7 and
  1 days with `deletionDate` in its payload; render from that, never recompute.

### Editing a live event

- Changing `startAt` on an `ACTIVE` event: **inline notice, not a block** — "Your coverage window
  was fixed at payment and won't move. Photos are still kept until [coverageEndsAt]." Without this a
  host moves the date, expects the window to follow, and feels cheated a year later.
- On `DRAFT`: the projection updates live; nothing else.

### Guests

Nothing yet. `galleryOpensAt` is informational — uploads are not gated on it. When enforcement
lands it will need a "This gallery opens on [date]" empty state; that is a separate guide.

### Backend prerequisites

1. ~~**`projectedCoverage` on the DRAFT event**~~ — **shipped 2026-09-21**; see "Two new dates"
   above. The live projection and the "Gallery opens / Photos kept until" checkout lines are
   unblocked.
2. ~~**Coverage constants on `/api/config`**~~ — **shipped 2026-09-21** as `coverage {
   maxLeadDays, maxPreEventDays, defaultEventDurationHours }` (plus `defaultHostingMonths` until
   2026-09-23). Drop the hard-coded 548/90.

Everything in this section can start now.

## Backend reference

- `CoverageWindow` — the arithmetic, with the invariants as tests.
- `EventService#activate` — the one place the window is written.
- `BillingProperties.Coverage` — the three knobs: `maxPreEventDays` (90), `maxLeadDays` (548),
  `defaultEventDurationHours` (24). The retention term is the event's coverage option's `months`.
- Plan: [`2026-09-21-event-coverage-window.md`](../superpowers/plans/2026-09-21-event-coverage-window.md).
