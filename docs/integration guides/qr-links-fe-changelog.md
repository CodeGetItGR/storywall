# FE changelog: QR links, round two

For frontends that already integrated against the first QR-links drop. Everything here is
**additive** — nothing that worked before has stopped working, and no field changed meaning. If
you haven't integrated QR links at all yet, skip this and read
`qr-links-fe-integration.md`, which is the reference and already includes all of it.

Four changes, in the order they matter to you.

---

## 1. Hosts can now raise a full link's limit — `maxGuests`

**The gap:** we shipped enforcement of `maxGuests` without shipping a way to change it. When a
poster filled up, guests got `409 / 5035` and the host's only remedy was to `PATCH` an invitation
they never created and had no route to. The docs told them to do something the UI couldn't do.

`maxGuests` is now readable on `QrLinkResponseDto` and writable through `PATCH /api/qr-links/{id}`:

```jsonc
PATCH /api/qr-links/{id}
{ "maxGuests": 120 }        // 1..1000
```

- Valid for `EVENT_JOIN` and `MEDIA_UPLOAD` links, which own their backing invitation.
- **`400` for `INVITATION` links.** That invitation belongs to the host, not to the code — change
  it through `PATCH /api/event-invitations/{id}` where it's visible and named.
- Lowering below the number who already joined is allowed and **evicts nobody**: existing
  memberships stand, further joins are refused. `remainingSlots` reports `0`, not a negative.
- `maxGuests` is `null` when the backing invitation has gone missing — the same condition that
  makes `status` be `TARGET_UNAVAILABLE`.

**Do this:** make `maxGuests` an editable field on the link, and offer "raise the limit" as the
recovery action wherever you surface a `5035`.

## 2. `status` on the host response — stop deriving it yourself

`QrLinkResponseDto` now carries the same `QrLinkStatus` a scanner gets:
`ACTIVE | REVOKED | EXPIRED | TARGET_UNAVAILABLE`.

**Why it matters:** you could previously infer "revoked" and "expired" from `revokedAt` and
`expiresAt`, but you could *not* infer `TARGET_UNAVAILABLE` — it depends on the event's own state
and on whether the backing invitation still exists, neither of which is on the DTO. So a host's
badge could confidently read "active" over a code that had already stopped working for everyone
scanning it.

Backend now computes it in one function used by the resolve endpoint, the host response and the
stats rows, so the host's badge and the guest's screen cannot disagree.

**Do this:** render link state from `status`. Delete any local `isExpired`/`isRevoked` helper.

## 3. New endpoint: how each code actually performed

```
GET /api/events/{eventId}/qr-links/stats      ROLE_USER, host only
```

One row per link, revoked ones included:

```jsonc
[
  {
    "qrLinkId": "8f2c…",
    "label": "Entrance poster",
    "targetType": "EVENT_JOIN",
    "status": "ACTIVE",
    "joinCount": 42,
    "maxGuests": 50,
    "remainingSlots": 8,
    "lastJoinedAt": "2026-08-11T19:42:00Z",
    "uploadCount": 137
  }
]
```

Separate from `GET /api/events/{eventId}/qr-links` on purpose: creating or revoking a link
shouldn't pay for aggregate queries, and a dashboard can refresh these numbers during an event
without re-fetching every code's configuration. Poll it if you want live numbers.

### The three things to get right

**`remainingSlots` is the one to surface.** It's the only figure that lets a host act *before* a
guest standing at the door gets refused. Warn when it's low and link straight to the `maxGuests`
edit from §1. It floors at `0` and is `null` whenever `maxGuests` is.

**`uploadCount` is not "uploads from this QR code".** It counts everything the guests this code
brought in have *ever* uploaded, not just what they uploaded in the visit that began with the
scan. "Photos from guests who joined here" is the honest label. Deleted media is excluded.

**There is no scan count, so there is no conversion rate.** Resolving a code writes nothing — no
counter, no `lastScannedAt`. Don't compute a rate from `joinCount`; the denominator doesn't exist
and you'd be dividing by a number nobody measured. If a funnel becomes a real requirement, say so
and we'll add scan recording deliberately rather than have the UI imply it.

Smaller notes: `joinCount` excludes guests the host removed (they hand their slot back, matching
how the limit is enforced); a returning guest with the same `guestKey` isn't counted twice;
`lastJoinedAt` is `null` until somebody joins; and for `INVITATION`-targeted links all counts
belong to the invitation, so anyone who used its ordinary invite link is counted too.

## 4. The host's invitation list is cleaner

`GET /api/events/{eventId}/invitations` **no longer returns the invitations minted to back a
shared QR code.**

Those rows were an implementation detail leaking into a host-facing list: the host never named a
recipient, so they showed up as anonymous `QR-XXXXXXXX` entries with no name or email, sitting
among real invited guests. The handle for managing them is `/api/qr-links`.

**This is the one change that removes data from an existing response.** It's still additive in
spirit — those rows only started appearing when QR links shipped — but if you built anything that
counted rows from this endpoint, re-check it. Personal invitations targeted by an `INVITATION`
QR link are **not** filtered: those are real invitations the host created.

## 5. `requiresGuestKey` is now true for a QR link set to one guest

**The bug:** `requiresGuestKey` was derived from `maxGuests > 1`. That predicate was standing in
for "is this code shared", and it's wrong at exactly one value. A host who printed an `EVENT_JOIN`
code and set it to admit a single guest got `requiresGuestKey: false`, so the FE sent no
`guestKey` — and the backend, falling back to "the one member created from this invitation",
**handed the second scanner the first scanner's account**: their name, their membership, their JWT.
Silently, with no `5035`, because the seat check never ran.

**Now:** shared-ness is stored explicitly. `requiresGuestKey` is `true` for every `EVENT_JOIN` and
`MEDIA_UPLOAD` link no matter what `maxGuests` says. The second scanner of a one-seat code gets a
`409` / `5035` — full, which is the truth — instead of somebody else's session.

**Do this:** nothing, if you were already reading `requiresGuestKey` from the resolve response and
sending `guestKey` on every guest-login, as the guide asks. If you hardcoded the `maxGuests > 1`
rule on the client, delete it and read the field.

---

## 6. `guestKey` is now server-generated — breaking (2026-08-22)

**Unlike items 1-5, this one is not additive.** `guestKey` used to be a value the frontend minted
once per device (`crypto.randomUUID()`) and sent on every guest-login. The backend now generates
it and returns it in the guest-login response; the frontend's job is only to store and echo it.

**Why:** a client-generated key was never actually tied to *this device's specific membership* —
it was just an opaque string the client made up and the server trusted verbatim on lookup. Nothing
stopped a client from sending an arbitrary or guessed value. Moving generation server-side removes
that trust and makes the key what it was always meant to be: a handle the server hands out and
recognises, not a credential a client asserts.

**Do this:**
- Stop calling `crypto.randomUUID()` (or equivalent) for `guestKey`. Delete that code.
- On a first guest-login from a device, omit `guestKey` entirely rather than inventing one.
- After every guest-login response, if it carries a `guestKey`, persist it (e.g. `localStorage`)
  and send that stored value as `guestKey` on the next guest-login from the same device.
- A `guestKey` you send that the server doesn't recognise is treated the same as omitting it — a
  fresh membership and a new key are issued, not a `400`. There is no longer a "missing guestKey"
  error to handle.

See `qr-links-fe-integration.md` → [What changed in guest login](qr-links-fe-integration.md#what-changed-in-guest-login)
for the full write-up, and `invite-onboarding-fe-integration.md` for the non-QR invite flow, which
this equally affects.

## TypeScript

All shapes are in `frontend-api-types.ts`. New/changed:

- `QrLinkStatsDto` — new.
- `QrLinkResponseDto` — gained `status: QrLinkStatus` and `maxGuests: number | null`.
- `QrLinkPatchDto` — gained `maxGuests?: number`.

## Checklist

- [ ] Render link state from `status` instead of `revokedAt`/`expiresAt`.
- [ ] Make `maxGuests` editable, and hide that control for `INVITATION`-targeted links.
- [ ] Offer "raise the limit" as the recovery action on a `5035`.
- [ ] Build the stats view; warn on low `remainingSlots`.
- [ ] Label `uploadCount` as uploads by the guests the code brought in.
- [ ] Don't display or compute a scan count or conversion rate.
- [ ] Re-check anything that counted rows from `GET /api/events/{eventId}/invitations`.
