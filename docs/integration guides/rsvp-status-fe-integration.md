# Integration Guide: `rsvpId` on `EventMemberResponseDto`

Added 2026-08-26. Scope: this single change only — see `frontend-integration-guide.md` for
everything else.

## What changed

`EventMemberResponseDto` has a new field:

```ts
interface EventMemberResponseDto {
  // ...existing fields unchanged...
  isFeatured: boolean;
  avatarMediaId: string | null;
  rsvpId: string | null; // NEW
  joinedAt: string;
  // ...
}
```

The id of this member's own `Rsvp` row, or `null` if they haven't submitted one yet. Returned
by every endpoint that already returns `EventMemberResponseDto`:

| Method | Path | Response |
|---|---|---|
| GET | `/api/me/events` | `EventMemberResponseDto[]` — every membership has it |
| GET | `/api/events/{eventId}/members` | `EventMemberResponseDto[]` |
| GET | `/api/event-members/{id}` | `EventMemberResponseDto` |
| PATCH | `/api/event-members/{id}` | `EventMemberResponseDto` |
| POST | `/api/event-members/{id}/claim` | `EventMemberResponseDto` |

`POST /api/event-members` (create) always returns `rsvpId: null` — a brand-new membership
can't have an RSVP yet. No request changes needed anywhere — it's resolved from existing data
on the backend. Nothing else in the response shape changed.

## Why this exists

There was previously no reliable way to answer "has the current member already RSVP'd?" from
the client. `GET /api/events/{eventId}/rsvps` (list every RSVP for an event) is host-only.
`GET /api/rsvps/{id}` requires already knowing the RSVP's own id, which only comes back from
the original `POST /api/rsvps` response — lost on refresh, a new device, or cleared client
state. `rsvpId` gives you the answer for free on `GET /api/me/events`, which the FE already
calls to restore the active event / membership context.

## Using it

```ts
const memberships: EventMemberResponseDto[] = await fetch('/api/me/events').then(r => r.json());
const myMembership = memberships.find(m => m.eventId === eventId);

if (myMembership.rsvpId === null) {
  showRsvpPrompt();
} else {
  // already responded — fetch the full RSVP if you need attendanceStatus/counts/notes
  const rsvp = await fetch(`/api/rsvps/${myMembership.rsvpId}`).then(r => r.json());
}
```

No polling, no follow-up request just to learn *whether* they responded — only fetch the full
`Rsvp` (`GET /api/rsvps/{rsvpId}`) when you actually need its fields (`attendanceStatus`,
`adultCount`/`childCount`, `phone`, `notes`), not just the yes/no.

**After the member submits, edits, or withdraws their RSVP**, `rsvpId` on your cached
membership object goes stale — update it optimistically the same way you'd already update
`likedByCurrentUser` after a reaction:

- `POST /api/rsvps` succeeds → set `myMembership.rsvpId` to the returned `id`.
- `DELETE /api/rsvps/{id}` succeeds → set `myMembership.rsvpId` back to `null`.
- `PATCH /api/rsvps/{id}` doesn't change `rsvpId` at all (same row, same id) — no update needed
  here.

It only refreshes from the server on the next `GET` of the membership.

## Edge cases

- **Visible to every member of the event, not just the host.** `GET
  /api/events/{eventId}/members` is membership-scoped (`isAuthenticated()` + "you're a member
  of this event"), not host-only — so any attendee can see whether any other attendee has
  `rsvpId: null`. That's deliberate: unlike the host-only `GET /api/events/{eventId}/rsvps`
  endpoint, `rsvpId` alone carries no contact info (phone, notes, guest counts) — just whether a
  response exists. Don't build a per-attendee "who hasn't responded yet" list from this data
  without checking whether that's an intended surface for non-hosts.
- **Membership deleted.** Deleting an `EventMember` cascade-deletes its `Rsvp` row too (a hard
  DB constraint, not just app logic) — there's no scenario where a membership is gone but its
  RSVP lingers.
- **RSVP deleted directly** (`DELETE /api/rsvps/{id}`). The membership itself is untouched;
  `rsvpId` just goes back to `null` on the next fetch (or update it optimistically, per above).

## Performance note (if you're curious, not required reading)

Resolving `rsvpId` for a whole membership list costs exactly **one extra batched query**, not
one per member — same pattern already used for `commentCount`/`reactionCount`/
`likedByCurrentUser` on posts. Query count is constant regardless of how many memberships are
in the list.
