# FE integration: event-type feature toggles and their quotas

Covers four things that are now toggle-able per event type — Gallery QR upload link, co-host
invitations, named guest invitations, and a schedule-section cap — and, just as important, exactly
which numeric quotas the server actively enforces around them. Read this alongside
`app-config-fe-integration.md` (module keys / `GET /api/config`), `qr-links-fe-integration.md`,
`invite-onboarding-fe-integration.md`, `max-guests-plan-clamp-fe-integration.md`, and
`backend-localization-fe-integration.md` (this doc doesn't repeat what those already cover).

**The one rule that matters most:** the server is always the final word. Every check described
below is duplicated, unconditionally, at write time — nothing here can be bypassed by skipping a
client-side check, and nothing the client precomputes is ever trusted. The pre-emptive UI patterns
in this doc exist to make the product feel considerate (don't let a host fill out a form for
something that's about to be rejected), not to replace server-side rejection. If your pre-check and
the server disagree, believe the server's response every time — your pre-check read slightly stale
data, not the other way around.

---

## 1. The three new modules

Same shape as every existing module (`GALLERY`, `RSVP`, etc.) — see `app-config-fe-integration.md`
for the general module contract. `GET /api/config` now lists three more keys:

| `moduleKey` | What being unavailable means |
|---|---|
| `co_hosts` | This event type cannot invite co-hosts at all — neither by email nor by promoting an existing member. |
| `named_invites` | Guest invitations for this event can't carry an email/name — only anonymous shared links. |
| `schedule` | This event type has no schedule-sections feature; existing sessions (including the automatic "main" one) are unaffected, but no more can be added. |

`GET /api/events/{eventId}/modules` returns one row per module, same fields as today:

```jsonc
{ "id": "...", "moduleKey": "co_hosts", "isEnabled": true, "isAvailable": true, "configuration": {} }
```

**Gate UI on `isAvailable`, never `isEnabled`.** A module can be `isEnabled: true` on the event and
still `isAvailable: false` because the plan doesn't include it or the platform kill switch is off —
this was already true for every existing module and stays true for the three new ones.

## 2. Gallery QR upload link — a config flag, not a new module

There's no fourth module for this. `GALLERY`'s own `EventModule.configuration` gets a new key:

```jsonc
GET /api/events/{eventId}/modules
[
  {
    "moduleKey": "gallery",
    "isEnabled": true,
    "isAvailable": true,
    "configuration": { "qrUploadEnabled": true }
  }
]
```

- `qrUploadEnabled: false` means: don't offer "create an upload link" in the host UI, and any
  previously-created `MEDIA_UPLOAD` QR link now resolves as unavailable (same `TARGET_UNAVAILABLE`
  status your QR list UI already renders for expired/revoked links — see
  `qr-links-fe-integration.md`). Existing links are not deleted; they just stop working while the
  flag is off, and start working again the moment it's flipped back on.
- The `EVENT_JOIN` QR link (event invite) is entirely unaffected — this flag only touches
  `MEDIA_UPLOAD`.
- **To pre-empt:** hide/disable "Create upload link" and "Share upload link" actions in the host
  gallery UI whenever `configuration.qrUploadEnabled === false`. If a link somehow still gets
  created (a stale cache, a race), the server rejects it — see §4.

## 3. Schedule sections — a cap that lives on the event type, not the event

Unlike every other per-event setting, the schedule-section cap is **not** copied onto the event at
creation and does not appear in `EventModule.configuration` for `schedule`. It's read live from the
event type, every time. Fetch it from the endpoint that already exists for this:

```
GET /api/event-types/{eventTypeKey}/modules
```

```jsonc
[
  {
    "eventTypeKey": "WEDDING",
    "moduleKey": "schedule",
    "applicability": "DEFAULT_ON",
    "defaultConfig": { "maxSections": 10 },
    "sortOrder": 3
  }
]
```

`defaultConfig.maxSections` for the `schedule` row is the event's real cap **right now** — not a
value frozen at the event's creation time. If an admin changes it later, this endpoint reflects the
new number immediately, for events that already exist too. Don't cache this value across the
session for a long-lived "add section" screen; re-fetch it (or at least don't assume it's still
correct) if the host has had the page open a while.

**To pre-empt:** before rendering "Add schedule section," compare
`GET /api/events/{eventId}/sessions`'s array length against `maxSections` from the call above
(they're two separate requests — there's no combined endpoint). When the count has reached the
cap, disable the action with something like *"This event type allows up to {maxSections} schedule
sections."* The event's own automatically-created "main" session counts toward this total.

**Enforced, always:** `POST /api/event-sessions` rejects with `409 EVENT_SESSION_LIMIT_REACHED`
(error code **5067**) the moment the event is already at its type's cap — checked fresh on every
request, not against whatever the client last fetched.

```jsonc
// 409
{
  "status": 409,
  "detail": "This event type allows up to 10 schedule sections.",
  "errorCode": 5067
}
```

Same endpoint also rejects with `409 MODULE_NOT_AVAILABLE` (**5012**, see §4) if `schedule` itself
is unavailable for the event — the module gate is checked before the cap, so an event whose type
doesn't include `schedule` never even gets to a cap error. Unlike every other module-gated action in
this doc, this check applies during `DRAFT` too, not only once the event is live — building out the
schedule is part of a host's setup, same as the event's automatically-created first session.

## 4. Co-host invitations, named guest invitations, and Gallery QR upload — one shared rejection

All three route through the same module-availability gate the rest of the platform already uses,
so they share one error code: `409 MODULE_NOT_AVAILABLE` (error code **5012**) for `co_hosts`/
`named_invites`, and the new `409 QR_MEDIA_UPLOAD_DISABLED` (error code **5066**) for the Gallery
upload-link case specifically (kept distinct because it's a config flag, not a module toggle, and
your handling of it — re-render the QR list — differs from a generic module-unavailable message).

| Action | Endpoint | Rejected by |
|---|---|---|
| Invite co-host by email | `POST /api/events/{eventId}/host-invitations` | `co_hosts` unavailable → `5012` |
| Promote existing member to co-host | `POST /api/events/{eventId}/hosts` | `co_hosts` unavailable → `5012` |
| Create a named guest invitation | `POST /api/event-invitations` with `email` set | `named_invites` unavailable → `5012` |
| Add an email to a previously-anonymous invitation | `PATCH /api/event-invitations/{id}` with `email` set | `named_invites` unavailable → `5012` |
| Create/use a Gallery upload link | `POST /api/qr-links` (`targetType: MEDIA_UPLOAD`) or scanning an existing one | `qrUploadEnabled: false` → `5066` |
| Create a schedule section | `POST /api/event-sessions` | `schedule` unavailable → `5012` (checked before the §3 cap, and during `DRAFT` too) |

Invitations with **no** email (anonymous shared links) are never touched by `named_invites` — that
endpoint stays exactly as documented in `invite-onboarding-fe-integration.md`.

**To pre-empt:** read `isAvailable` for `co_hosts`/`named_invites` off `GET /api/events/{eventId}/
modules` (§1) before rendering the relevant forms — hide "Invite a co-host" entirely, or hide only
the "email" field on the invitation form (leaving the anonymous-link option) when `named_invites`
is unavailable but the invitation feature generally isn't gone.

## 5. Member quota — now enforced everywhere it wasn't

This ships alongside the toggles above but is not itself toggle-related: a real gap was found and
closed. Promoting an existing account to co-host (`POST /api/events/{eventId}/hosts`) used to
succeed unconditionally, even past the event's plan-tier member limit — it now rejects the same way
joining an event already does.

```jsonc
// 409 — event already at its member cap
{
  "status": 409,
  "detail": "This event has reached the number of guests its current plan allows.",
  "errorCode": 5009,
  "planCode": "BASIC",
  "used": 50,
  "limit": 50
}
```

This is **not new behavior for the endpoint's neighbors** — email-based co-host invitations and
regular named invitations already only *clamp* their guest count at issue time and reject for real
at accept time (documented in `max-guests-plan-clamp-fe-integration.md`); that stays unchanged. It
is new specifically for the instant-promotion path, which had no check at all before.

**To pre-empt:** before offering "Add as co-host" for someone who isn't already a member of the
event, check `GET /api/events/{eventId}/usage` (`memberCount`/`memberLimit`) and disable the action
when the event is already full — same meter you should already be showing on the plan/billing
screen. This one **can't** be perfectly pre-empted from the client alone if the target user turns
out to already be a member (promoting an existing member consumes no new seat, so the check doesn't
apply to them) — the server always makes the final call per-target, so treat the usage check as a
UI nicety, not a substitute for handling the `409`.

## 6. Every error above is localized

Per `backend-localization-fe-integration.md`: all four error codes this project introduces or
newly routes through (`5012`, `5009`, `5066`, `5067`) render their `detail` in `Accept-Language`
(`en`/`el` today), same rule as everything else that's been migrated — send the header, branch on
`errorCode`, never on `detail` text. This includes the two shared codes (`5012`, `5009`) even
though they were only *sometimes* localized before this change — after this ships, every caller of
those two codes gets a localized message, not just the new call sites.

## Checklist

- [ ] Gate every action in this doc on `isAvailable` (module list) or the relevant `configuration`/
      `defaultConfig` flag — never assume a feature is on just because the UI shows it by default.
- [ ] Fetch the schedule cap from `GET /api/event-types/{eventTypeKey}/modules`, not from anything
      cached on the event itself — it can change after the event was created.
- [ ] Handle `409` responses for error codes 5009, 5012, 5066, 5067 with the localized `detail`
      text; branch UI logic on `errorCode`.
- [ ] Pre-emptive UI (disabled buttons, hidden fields, "you've reached the limit" copy) is a
      convenience layer only — every code path must still handle the server rejecting a request
      your pre-check let through, since the two can disagree by the time the request lands.
- [ ] Don't special-case the Gallery QR toggle as a module — it's `configuration.qrUploadEnabled`
      on the existing `gallery` module row, not a new entry in the module list.
