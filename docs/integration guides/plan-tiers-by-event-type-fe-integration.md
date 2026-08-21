# FE integration guide: plans filtered by event type

Phase 1 of `docs/event-type-driven-creation-flow-plan.md`. Ships the backend piece needed to
reorder event creation to **type → plan → details → pay**. Nothing else in that plan is live yet —
module composition, per-type defaults, and the buy-extra-modules flow are still ahead.

## 1. New: `GET /api/plan-tiers?eventType=WEDDING`

Authenticated (any logged-in user, not `permitAll` — the full public catalog is already visible
pre-login via `GET /api/config`). Returns the EVENT-scope, assignable, public plans available for
`eventType`, same shape as `PlanTierResponseDto` in `GET /api/config`'s `planTiers` — including
`paidModules` (2026-08-21), populated the same way: each plan's `MODULE_UNLOCK` upsells with full
price/billing detail, so step 2 of the wizard can render add-on offers without a second fetch of
the full config catalog.

```
GET /api/plan-tiers?eventType=WEDDING
→ 200
[
  { "code": "BASIC", "scope": "EVENT", "eventTypeKeys": [], "moduleKeys": [...], ... },
  { "code": "PLUS",  "scope": "EVENT", "eventTypeKeys": [], "moduleKeys": [...], ... }
]
```

An unknown `eventType` returns `400` / `errorCode: 3018 INVALID_EVENT_TYPE`, same error as event
creation uses for the same problem.

Use this for step 2 of the wizard, after the host has picked a type in step 1. It is a strict
subset of the full catalog: every plan returned here also appears in `GET /api/config`, just
possibly filtered out if it's restricted to other types.

## 2. New field: `PlanTierResponseDto.eventTypeKeys`

Present on every `PlanTierResponseDto`, including inside `GET /api/config`'s `planTiers`.

- **Empty array** (the default, and what every plan seeds with) means the plan is available for
  every event type — this is `eventTypeKeys: []`, not `null`.
- **Non-empty** means the plan only appears for those types, both in the new endpoint above and as
  an enforced restriction at creation (next section).

Existing behaviour is unaffected until an admin sets one — nothing changes today for any plan you
already show.

## 3. Enforced at creation: `errorCode: 5053 PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`

`POST /api/events` now rejects a `planTierCode` that has restricted itself away from the submitted
`eventType`, even if the FE never called the new endpoint and just resubmitted a stale code:

```json
POST /api/events
{ "eventType": "WEDDING", "planTierCode": "CORPORATE_ONLY", ... }

→ 409
{
  "status": 409,
  "errorCode": 5053,
  "errorKey": "PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE",
  "detail": "Plan CORPORATE_ONLY is not available for the WEDDING event type."
}
```

This is a server-side backstop, not the primary UX — the wizard should always source its plan list
from §1 above so a restricted plan is never offered for the wrong type in the first place.

## 4. Admin: `PUT /api/admin/plan-tiers/{id}/event-types`

Platform-admin only. Replace semantics, same as the existing
`PUT /api/admin/plan-tiers/{id}/modules`: the body is the plan's complete restriction, not a diff.

```json
PUT /api/admin/plan-tiers/{id}/event-types
{ "eventTypeKeys": ["CORPORATE", "CONFERENCE"] }

→ 200 (full PlanTierResponseDto, eventTypeKeys now set)
```

`{ "eventTypeKeys": [] }` clears the restriction — the plan goes back to being available for every
type. An unknown key returns `400` / `errorCode: 3018 INVALID_EVENT_TYPE`; sending this on an
ACCOUNT-scope plan returns `400` / `errorCode: 3007 INVALID_PLAN_TIER_SCOPE`.

## Not yet true — do not build against these

- Modules are **not** filtered or composed by event type yet — every event still gets the same
  seed regardless of type (Phase 2 of the plan doc).
- Buying an extra module post-creation is not exposed yet (Phase 3).
- `eventType` is (and stays) immutable after creation — there is no patch endpoint for it and none
  is planned.
