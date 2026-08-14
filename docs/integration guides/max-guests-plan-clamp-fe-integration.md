# FE integration: `maxGuests` is now capped to the plan, not just validated

Shipped 2026-08-12. Small, additive change — no request/response shape changed, no new
endpoints, no new error codes. Read this if your FE ever sets or displays `maxGuests` on a
QR link or an event invitation. It complements (doesn't replace) `qr-links-fe-integration.md`
and `invite-onboarding-fe-integration.md`, which already document the `5035`/`5009` error
codes this doc references but doesn't repeat.

## Why

`maxGuests` on a QR link or invitation used to be validated (positive integer, within DTO
bounds) but never checked against what the event's plan can actually seat. A host on a
50-member BASIC plan could set `maxGuests: 500` on a link and it would save cleanly — the
mismatch only ever surfaced later, one guest at a time, as `409 EVENT_MEMBER_LIMIT_EXCEEDED`
failures during join. Nothing told the host up front that the number they typed was fiction.

Along the way we also found — and fixed — a boundary bug: shared QR links default to 50
guests, and BASIC's plan limit is also 50 members, but the host already occupies one of
those seats from event creation. So _every_ default QR link on a fresh BASIC event was
already one seat over what the plan could seat, before anyone had scanned anything.

## What changed

`maxGuests` is now **silently capped** to the event's remaining plan headroom (plan member
limit minus current member count) at the moment it's set — never rejected. This applies at
all four places `maxGuests` is written:

- `POST /api/event-invitations` (explicit `maxGuests`)
- `PATCH /api/event-invitations/{id}` (when the patch includes `maxGuests`)
- `POST /api/qr-links` (explicit `maxGuests`, or the default of 50 when omitted)
- `PATCH /api/qr-links/{id}` (when the patch includes `maxGuests`)

We chose clamp-over-reject deliberately: a host asking for more guests than the plan could
ever seat isn't a mistake worth blocking on — the link should still work, just for the
number of people the plan actually supports. Every join is still checked against the plan
again independently (unchanged, see the `5009`/`5035` docs), so this clamp is a courtesy,
not the enforcement point.

**Do this:** after creating or patching a QR link or invitation, compare the `maxGuests` you
sent against the `maxGuests` in the response. If the response is lower, the host asked for
more than the plan supports — show something like _"Capped to 12 guests — that's all your
current plan has room for"_ instead of silently displaying a number the host didn't ask for.

```jsonc
// Request
POST /api/qr-links
{ "eventId": "...", "targetType": "EVENT_JOIN", "maxGuests": 500 }

// Response — plan only had 12 seats left
{
  "id": "...",
  "maxGuests": 12,
  // ...
}
```

If you don't already diff requested vs. returned values, this is silent by design — nothing
breaks if you skip it, the link just admits fewer guests than the number on screen would
imply.

## What did not change

- No new field was added to the QR resolve response (`GET /api/qr/{token}`) or the invite
  preview endpoint to expose "seats remaining" ahead of the join attempt. We considered it
  and decided against it: it's an extra moving part for a case the join-time check already
  handles correctly, and it would go stale the moment a host edits the link after a guest
  has the page open. Seat availability is still only surfaced when a guest actually tries to
  join, via the existing `5035 INVITATION_EXHAUSTED` / `5009 EVENT_MEMBER_LIMIT_EXCEEDED`
  responses.
- The two error codes, their meaning, and which endpoint throws which are unchanged — see
  `qr-links-fe-integration.md` and `invite-onboarding-fe-integration.md` for the full
  reference.
- Unlimited plans (no `maxMembers` cap) are never clamped — `maxGuests` is returned exactly
  as sent.

## Checklist

- [ ] After create/patch of a QR link or invitation, compare requested vs. returned
      `maxGuests`; show a "capped to your plan" notice when they differ.
- [ ] Don't assume the `maxGuests` you submitted is the `maxGuests` that was saved — always
      read it back from the response.
- [ ] No changes needed to guest-login or accept-invite error handling — `5035`/`5009`
      handling from the existing integration stays as-is.
