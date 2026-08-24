# FE integration guide: account-level event quota removed outright

Covers a change shipped 2026-08-24: the active-event cap that `ACCOUNT`-scope plans used to grant
is gone from the API, not merely neutralized. See `frontend-integration-guide.md` §0 for base setup
(auth header, the RFC 7807 error envelope) and `billing-fe-guide.md` for everything else
plan/quota-related — that doc has been updated in place to match; this doc is the "what changed and
why" record, same role as
`account-plans-disabled-and-platform-metrics-fe-integration.md` played for the previous step.

## Why

`account-plans-disabled-and-platform-metrics-fe-integration.md` (2026-08-11) neutralized the
default `FREE`/`ACCOUNT` plan's `maxActiveEvents` cap by setting it `null`, but the mechanism —
the field, its enforcement, its usage endpoint, its notification — stayed in code, and users still
on `PLUS`/`PRO`/`ACCOUNT` still had a real cap enforced. That mechanism has now been deleted
entirely. No `ACCOUNT`-scope plan grants any quota any more, for any user.

## What actually changed (all breaking)

### 1. `GET /api/me/usage` no longer exists

It is not deprecated or newly restricted — the route is gone. A client still calling it now gets a
`404`, not the old `AccountUsageResponse` shape. Delete the call, the type, and anything that
renders it. `GET /api/events/{eventId}/usage` (event storage/member usage) is unaffected and is now
the only usage endpoint.

```jsonc
// Before
GET /api/me/usage
→ 200 { "userId": "…", "planTier": "PLUS", "activeEvents": 3, "activeEventLimit": 5, "activeEventPercent": 60 }

// Now
GET /api/me/usage
→ 404
```

### 2. `maxActiveEvents` is gone from the plan-tier wire shape

Removed from `PlanTierResponseDto`, and from the admin create/patch request DTOs. Not nulled —
absent. Any admin "create/edit plan" form field for it should be removed; the backend no longer
reads or validates it if sent.

```jsonc
// Before, an ACCOUNT-scope plan
{ "code": "PLUS", "scope": "ACCOUNT", "storageBytes": null, "maxMembers": null, "maxActiveEvents": 5, "priceAmountMinor": 1900, … }

// Now
{ "code": "PLUS", "scope": "ACCOUNT", "storageBytes": null, "maxMembers": null, "priceAmountMinor": 1900, … }
```

`ACCOUNT`-scope plans still exist (every user still holds one; see below) and still carry a price —
only the quota field is gone. `EVENT`-scope plans (`storageBytes`, `maxMembers`) are unaffected.

### 3. Error code `5010 ACTIVE_EVENT_LIMIT_EXCEEDED` is retired

`POST /api/events` can no longer fail with it — event creation is no longer gated by how many
active events the host already has. Remove any handling keyed on `errorCode === 5010`, and remove
any upgrade prompt or copy that was wired to it. The code number itself will not be reused.

### 4. The "archive an event to free a seat" remedy is gone too

It was the FE-facing remedy for `5010` specifically (`PATCH` an event with `isArchived: true`).
With `5010` gone, that flow has no reason to exist for this purpose — remove any "archive to make
room" CTA that pointed at it. (Separately, and for an unrelated reason — it duplicated ground
`EventStatus` already covers — the backend removed the `isArchived` field from the `Event` model
entirely in the same deploy. That touches `EventRequestDto`/`EventPatchDto`/`EventResponseDto`/
`EventDetailResponseDto` beyond just this quota flow. It has not been written up as its own FE
guide yet — flag it if your event-settings UI reads or writes `isArchived` for any other reason.)

### 5. Notification type `EVENT_CAP_WARNING` is gone

Removed from the `NotificationType` union. It was the only account-level (no `eventId`) billing
notification; every remaining `LIMIT`-category type is per-event. Drop it from any
`type` → copy/icon mapping; an unmapped type should already render as a generic row per
`frontend-integration-guide.md`'s "unknown types render generically" convention — if it doesn't,
fix that regardless of this change.

### 6. Admin user-plan assignment: unaffected in practice

`PATCH /api/admin/users/{id}/plan-tier` already unconditionally rejected with
`5034 ACCOUNT_PLANS_DISABLED` as of the 2026-08-11 change — that has not changed, and still does.
Its response body on the (unreachable) success path changed from `AccountUsageResponseDto` to no
body, which is a no-op for any client that already treats this endpoint as always-failing per the
existing guidance.

## What did not change

- `EVENT`-scope plans and their quotas (`storageBytes`, `maxMembers`, errors `5008`/`5009`,
  `GET /api/events/{id}/usage`) — completely unaffected.
- `ACCOUNT`-scope plans still exist as rows, are still assigned to every user at registration
  (`users.plan_tier_id` stays `NOT NULL`), and are still readable via the admin plan-tier endpoints.
  They simply grant nothing any more.
- Checkout, subscriptions, refunds, storage packs, module unlocks — untouched.

## Checklist

- [ ] Delete any code calling `GET /api/me/usage` — it now 404s.
- [ ] Remove the `AccountUsageResponse` type (or equivalent) and any `activeEventLimit` /
      `activeEventPercent` rendering.
- [ ] Remove `maxActiveEvents` from any admin plan-tier create/edit form.
- [ ] Remove error handling and upgrade-prompt copy wired to `5010 ACTIVE_EVENT_LIMIT_EXCEEDED`.
- [ ] Remove any "archive this event to free a seat" CTA that existed only for the above.
- [ ] Remove `EVENT_CAP_WARNING` from any notification `type` → copy/icon mapping.
- [ ] If your event-settings UI reads or writes `Event.isArchived` for a reason unrelated to the
      active-event cap, flag it — that field was removed from the API in this same deploy and isn't
      covered by this doc.
