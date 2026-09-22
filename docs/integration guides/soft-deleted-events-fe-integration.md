# FE integration guide: what a host can still do with a soft-deleted event

Covers a change shipped 2026-09-22 (`GET /api/events/{eventId}/billing` no longer 404s a soft-deleted
event) and, more usefully, writes down the full read/write contract for an event whose `deletedAt`
is set. That contract already existed piecemeal across `event-deletion-fe-integration.md`,
`billing-fe-guide.md` §9 and the coverage-window guide; this is the one place that says which calls
work, which don't, and how to tell the three kinds of soft-deleted event apart.

See `frontend-integration-guide.md` §0 for base setup (auth header, RFC 7807 error envelope).

## The bug this fixes

On a soft-deleted event, the host's event page loaded fine (`GET /api/events/{id}` returns it to
hosts), but the billing panel and upgrade picker both got `404 RESOURCE_NOT_FOUND` (2001):

```
GET /api/events/{id}/billing          → 404
GET /api/events/{id}/upgrade-options  → 404
```

`/billing` was wrong to 404 and now returns `200` with the normal `EventBillingResponse`.
`/upgrade-options` still 404s **on purpose** — see §3. The FE change is: keep rendering billing,
stop requesting upgrade options.

## 1. How an event becomes soft-deleted

`deletedAt` (and the derived `deletionScheduledFor`) become non-null on `EventResponse` /
`EventDetailResponse` in exactly three ways. `status` is **not** changed by any of them — a
soft-deleted event still reports `ACTIVE`.

| how | who triggered it | undoable? | how the FE recognises it |
|---|---|---|---|
| **Pending deletion** — `POST .../deletion-requests` with an OTP | primary host | yes, any host, `DELETE .../deletion-requests` | `deletedAt` set, and `GET .../billing` has **no** `ACTIVATION` order with `status: "REFUNDED"` |
| **Withdrawn** — `POST .../withdrawals` came back `REFUNDED` | primary host | **no** — undo → `409 EVENT_WITHDRAWN` (5071) | `deletedAt` set, and `GET .../billing` has an `ACTIVATION` order with `status: "REFUNDED"` |
| **Coverage expired** — the sweep auto-deleted it at `coverageEndsAt` | nobody | yes, same undo as pending deletion | `deletedAt` set, no refunded activation, and `deletedAt` ≈ `coverageEndsAt` |

Distinguishing pending-deletion from withdrawn is the reason `/billing` had to become readable:
nothing on the event itself says "the money went back". Read the orders:

```ts
const billing = await api.get<EventBillingResponse>(`/api/events/${id}/billing`);
const withdrawn = billing.orders.some(o => o.kind === "ACTIVATION" && o.status === "REFUNDED");
```

If you would rather not depend on that, `GET /api/events/{id}/withdrawal-preview` on a withdrawn
event returns `eligible: false` with a `refusals[].reason` of `ALREADY_REFUNDED` — equivalent
signal, one more call.

`deletionScheduledFor` is the hard-purge timestamp for all three cases (`deletedAt` + a server-side
retention setting, currently 30 days). Render that date; don't hard-code "30 days" — the retention
term is not on `GET /api/config`; the event's own `deletionScheduledFor` is the only place it is
exposed.

## 2. What still works for a host — everything read-only

While `deletedAt` is set and until the purge, **any host (primary or co-)** can read the event and
everything in it. Guests and plain attendees get `404 RESOURCE_NOT_FOUND` on the event and every
sub-resource, exactly as if it never existed.

| call | host gets |
|---|---|
| `GET /api/events` | the event is listed, with `deletionScheduledFor` set |
| `GET /api/events/{id}` | full detail, `deletionScheduledFor` set |
| `GET /api/events/{id}/billing` | **200 (new)** — status, plan, every order incl. the refund, add-ons, discount |
| `GET /api/events/{id}/media?page=…` | the gallery, paginated as usual |
| `GET /api/medias/{id}`, `GET /api/medias/{id}/original` | a single item / its original |
| `GET /api/events/{id}/media/archive/manifest`, `.../archive?part=n`, `.../archive/selected` | the ZIP download flow (`gallery-archive-download-fe-integration.md`), unchanged |
| `GET /api/events/{id}/wishbook`, `.../wishbook/count` | the wishes |
| `GET /api/events/{id}/wishbook/export` | the wishbook PDF |
| `GET /api/events/{id}/posts`, `.../stories`, `.../members`, sessions, RSVPs | all readable, member-gated as usual |
| `GET /api/events/{id}/withdrawal-preview`, `GET .../withdrawals` | still answer (primary host) |

So the "download-only" state that `billing-fe-guide.md` §9 asks for after a withdrawal is fully
served by existing endpoints: link the host to the gallery archive and the wishbook PDF, and show
`deletionScheduledFor` as the deadline. Media bytes are destroyed at the same purge as the event
row, not earlier.

## 3. What is refused — everything that writes or buys

| call | response | why |
|---|---|---|
| any module write — upload media, create post/comment/reaction/story, add a wish, playlist suggest/vote, RSVP changes | `409 MODULE_NOT_AVAILABLE` (5012) | one predicate in `ModuleAvailabilityService` closes every module the moment `deletedAt` is set |
| invite / join / QR-link writes | `409 EVENT_NOT_ACTIVE` (5014) | the event's guest-facing status gate |
| scanning any of the event's QR links | resolves to `TARGET_UNAVAILABLE` | same gate, read through the QR resolver |
| `POST .../checkout`, `POST .../upgrade-checkout`, `POST .../storage-checkout` | `404 RESOURCE_NOT_FOUND` (2001) | you cannot buy anything for an event that is on its way out |
| `GET .../upgrade-options` | `404 RESOURCE_NOT_FOUND` (2001) | **intentional** — there is nothing to offer, and listing options that `upgrade-checkout` would then reject is worse than not listing them |
| `POST .../deletion-requests/otp`, `POST .../deletion-requests` | `409 EVENT_DELETE_ALREADY_PENDING` (5064) | already deleted |
| `DELETE .../deletion-requests` on a **withdrawn** event | `409 EVENT_WITHDRAWN` (5071) | refunded events do not come back |
| `DELETE .../deletion-requests` on a pending-deletion or coverage-expired event | `200`, `deletedAt: null` | the undo |

Host-side edits to the event's own details (`PATCH /api/events/{id}`, sessions, hosts) are not
gated by `deletedAt` today. Don't rely on that — hide the settings form behind the pending-deletion
banner, as `event-deletion-fe-integration.md` §5 already says.

## 4. What the FE should do

On the event page, after `GET /api/events/{id}` returns with `deletedAt !== null`:

1. **Render the read-only banner** with `deletionScheduledFor`. Offer **Undo** unless the event is
   withdrawn (§1); on a withdrawn event say the refund was issued and there is no undo.
2. **Keep the billing panel.** Call `GET .../billing` as normal — it now works. On a withdrawn event
   this is where the host sees the `REFUNDED` activation order and amount.
3. **Do not call `GET .../upgrade-options`**, and hide the upgrade / storage-pack CTAs. A 404 from it
   on a soft-deleted event is expected, not an error to toast.
4. **Show gallery and wishbook in download-only mode**: list + archive ZIP + wishbook PDF work;
   upload, post, wish, react, comment do not (`409` 5012). Hide the composers rather than letting
   the user hit the 409.
5. **Hide invite / QR / share affordances**; they resolve to `TARGET_UNAVAILABLE` for guests anyway.

If a request you *do* still make on a soft-deleted event gets `409` 5012 / 5014, treat it as
"this event is read-only", not as a plan or module problem — the copy in the envelope says "not
available for this event", which is misleading here.

## 5. TypeScript

No new fields. For reference, the discriminator:

```ts
type SoftDeleteKind = "PENDING_DELETION" | "WITHDRAWN" | "COVERAGE_EXPIRED";

function softDeleteKind(event: EventResponse, billing: EventBillingResponse): SoftDeleteKind | null {
  if (!event.deletedAt) return null;
  if (billing.orders.some(o => o.kind === "ACTIVATION" && o.status === "REFUNDED")) return "WITHDRAWN";
  // Auto-deletion stamps deletedAt at the sweep that noticed coverageEndsAt had passed, so the two
  // are within an hour of each other; a host-requested deletion happens at an arbitrary time.
  if (event.coverageEndsAt && Math.abs(Date.parse(event.deletedAt) - Date.parse(event.coverageEndsAt)) < 3_600_000) {
    return "COVERAGE_EXPIRED";
  }
  return "PENDING_DELETION";
}
```

The `COVERAGE_EXPIRED` branch is a heuristic — the two undoable kinds behave identically, so only
the banner copy differs ("you asked to delete this" vs "this event's coverage window ended"). If
that distinction matters enough to be exact, ask for a `deletionReason` field on the event rather
than tightening the heuristic.

## Error codes touched

| code | HTTP | when |
|---|---|---|
| `2001` `RESOURCE_NOT_FOUND` | 404 | any read by a non-host on a soft-deleted event; `upgrade-options` and every checkout by anyone |
| `5012` `MODULE_NOT_AVAILABLE` | 409 | any module write on a soft-deleted event |
| `5014` `EVENT_NOT_ACTIVE` | 409 | invite / member / QR writes on a soft-deleted event |
| `5064` `EVENT_DELETE_ALREADY_PENDING` | 409 | requesting deletion of an already soft-deleted event |
| `5071` `EVENT_WITHDRAWN` | 409 | undoing the deletion of a withdrawn event |
