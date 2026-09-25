# FE integration guide: plans filtered by event type

Phase 1 of `docs/event-type-driven-creation-flow-plan.md`. Ships the backend piece needed to
reorder event creation to **type → plan → details → pay**.

Phase 2 (module composition per event type) and most of Phase 3 (post-creation toggling, the
type-gated buy-a-module flow) have since shipped too — see the "Not yet true" section at the
bottom for exactly what's still outstanding, and
`docs/fe-guides/event-lifecycle-locks-and-event-types-fe-integration.md` for the module-matrix
endpoints (`GET /api/event-types/{eventTypeKey}/modules`, the admin matrix editor) and
`docs/fe-guides/event-type-feature-toggles-quotas-fe-integration.md` for the per-event toggle and
quota behaviour of the four features built on top of that matrix (co-hosts, named invites,
schedule sections, gallery QR uploads).

## A plan belongs to exactly one event type (2026-09-13)

Every `EVENT`-scope plan is now tied to exactly one `eventTypeKey` — there is no more
many-to-many restriction set. Wedding Basic and Baptism Basic are different plan rows; they can
have different quotas, different module config, even different prices, not just different names.
`ACCOUNT`-scope plans have no event type (`eventTypeKey: null`) since they aren't tied to one.

This replaces the older `eventTypeKeys` (plural, restriction-set) model described in earlier
versions of this doc. `PUT /api/admin/plan-tiers/{id}/event-types` is gone.

## 1. `GET /api/plan-tiers?eventType=WEDDING`

Authenticated (any logged-in user, not `permitAll` — the full public catalog is already visible
pre-login via `GET /api/config`). Returns the EVENT-scope, assignable, public plans whose
`eventTypeKey` matches, same shape as `PlanTierResponseDto` in `GET /api/config`'s `planTiers` —
including `paidModules` (2026-08-21), populated the same way: each plan's `MODULE_UNLOCK` upsells
with full price/billing detail, so step 2 of the wizard can render add-on offers without a second
fetch of the full config catalog.

```
GET /api/plan-tiers?eventType=WEDDING
→ 200
[
  { "code": "BASIC", "scope": "EVENT", "eventTypeKey": "WEDDING", "sharedGroupKey": null, "moduleKeys": [...], ... },
  { "code": "PLUS",  "scope": "EVENT", "eventTypeKey": "WEDDING", "sharedGroupKey": null, "moduleKeys": [...], ... }
]
```

**`eventType` accepts multiple values** — `GET /api/plan-tiers?eventType=WEDDING&eventType=BAPTISM`
— and returns the union across every requested type in one call. This is for a landing page that
wants to show several types' offers together, grouped by `sharedGroupKey` (see §3): fetch once for
all the types on the page instead of one request per type. A type in the list with no plans (e.g.
a freshly-enabled type an admin hasn't seeded yet) contributes nothing and does not error.

An unknown `eventType` anywhere in the list returns `400` / `errorCode: 3018 INVALID_EVENT_TYPE`,
same error as event creation uses for the same problem.

Use this for step 2 of the wizard, after the host has picked a type in step 1. It is a strict
subset of the full catalog: every plan returned here also appears in `GET /api/config`.

Since 2026-09-23 step 2 also picks a **duration**: each EVENT plan carries its durations and their
prices in `initialOptions`, and `POST /api/events` needs the chosen one's `id` as `coverageOptionId`.
See [`coverage-options-and-extensions-fe-integration.md`](coverage-options-and-extensions-fe-integration.md).

## 2. Field: `PlanTierResponseDto.eventTypeKey`

Present on every `PlanTierResponseDto`, including inside `GET /api/config`'s `planTiers`. The one
event type this plan may be bought for; always `null` for ACCOUNT-scope plans. Replaces the old
`eventTypeKeys` array field — this is required (never null) for every EVENT-scope plan.

## 3. Field: `PlanTierResponseDto.sharedGroupKey`

Set only by the admin "duplicate" action (§5) — `null` for a plan that has never been duplicated or
duplicated from. Plans sharing a key were created together from the same source plan and represent
"the same offer" across event types (e.g. Wedding Basic and Corporate Basic, duplicated from one
Wedding Basic plan): a landing page can group by `sharedGroupKey` to render one card ("Basic — from
$X") that expands per type, instead of a flat list of unrelated-looking plans.

## 4. Enforced at creation: `errorCode: 5053 PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`

`POST /api/events` still rejects a `planTierCode` that doesn't match the submitted `eventType`,
even if the FE never called the new endpoint and just resubmitted a stale code:

```json
POST /api/events
{ "eventType": "WEDDING", "planTierCode": "CORPORATE_BASIC", ... }

→ 409
{
  "status": 409,
  "errorCode": 5053,
  "errorKey": "PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE",
  "detail": "Plan CORPORATE_BASIC is not available for the WEDDING event type."
}
```

This is a server-side backstop, not the primary UX — the wizard should always source its plan list
from §1 above so a mismatched plan is never offered for the wrong type in the first place.

## 5. Admin: `POST /api/admin/plan-tiers/{id}/duplicate`

Platform-admin only. Replaces the old `PUT .../event-types`. Clones the source plan (fields like
storage, member cap, module keys, and — since 2026-09-23 — every coverage option, retired ones
included) into one or more new plans for other event types in a
single call:

```json
POST /api/admin/plan-tiers/{sourceId}/duplicate
{
  "clones": [
    { "eventTypeKey": "CORPORATE", "code": "CORPORATE_BASIC" },
    { "eventTypeKey": "CONFERENCE", "code": "CONFERENCE_BASIC", "name": "Conference Basic" }
  ]
}

→ 200
[ { "code": "CORPORATE_BASIC", "eventTypeKey": "CORPORATE", "sharedGroupKey": "<uuid>", ... },
  { "code": "CONFERENCE_BASIC", "eventTypeKey": "CONFERENCE", "sharedGroupKey": "<uuid>", ... } ]
```

`name`/`description` default to the source plan's own when omitted. `isDefault` is never copied —
a clone is never auto-made the default for its type. Both the source plan and every clone are
stamped with the same `sharedGroupKey` (reusing the source's existing key if it already has one, so
duplicating a plan a second time still groups with the first round of clones). Each clone's
per-module quota rows (§6) are seeded by preferring the source plan's own config for a module,
falling back to the target type's matrix template for a module the source's type didn't support.

An unknown `eventTypeKey` or a duplicate/invalid `code` returns `400` / `errorCode: 3018
INVALID_EVENT_TYPE` or the usual code-validation error.

## 6. Admin: `GET`/`PATCH /api/admin/plan-tiers/{planTierId}/modules[/{moduleKey}]`

Platform-admin only. Per-plan module quota/config — e.g. Wedding Basic's `schedule.maxSections`
can now differ from Wedding Plus's, where previously both read the same type-level default.

```
GET /api/admin/plan-tiers/{planTierId}/modules
→ 200
[ { "moduleKey": "schedule", "defaultConfig": { "maxSections": 3 } },
  { "moduleKey": "gallery",  "defaultConfig": { "qrUploadEnabled": true } } ]

PATCH /api/admin/plan-tiers/{planTierId}/modules/schedule
{ "defaultConfig": { "maxSections": 5 } }
→ 200 { "moduleKey": "schedule", "defaultConfig": { "maxSections": 5 } }
```

One row exists per module the plan's event type supports (i.e. every module not `UNSUPPORTED` in
the type's matrix) — rows are seeded automatically when a plan is created or duplicated, and when
an admin flips a matrix cell from `UNSUPPORTED` to something else. Module *applicability*
(on/off/`UNSUPPORTED`) is still edited only via the type-level matrix endpoints in
`docs/fe-guides/event-lifecycle-locks-and-event-types-fe-integration.md` — this endpoint only
edits the config values for modules the type already supports.

This table is now the runtime source of truth for module config: `GET
/api/event-types/{key}/modules?planTierCode=` resolves `defaultConfig` from here (see the note in
`docs/fe-guides/event-lifecycle-locks-and-event-types-fe-integration.md`), and both the
gallery-QR (frozen at event creation) and schedule-section-cap (read live on every session create)
features read from here per-plan, not from the type-level matrix.

## Now true — module composition is live (Phase 2 + most of Phase 3)

Both axes named in the older version of this doc are implemented:

- **Per event type:** `PlatformEventTypeModule` gives every `(eventTypeKey, moduleKey)` pair an
  `applicability` (`UNSUPPORTED` / `DEFAULT_ON`; `DEFAULT_OFF` was removed 2026-09-24). A module `UNSUPPORTED` for a type
  gets no `EventModule` row at all, ever, for events of that type. `PlatformEventTypeModule` also
  carries a `defaultConfig`, but as of 2026-09-13 that's only a seed template — the runtime source
  of truth for config is the per-plan table in §6 above.
  Read it via `GET /api/event-types/{eventTypeKey}/modules?planTierCode=` (public, wizard-facing)
  or `GET/PATCH /api/admin/event-types/{eventTypeKey}/modules` (admin, sees `UNSUPPORTED` rows
  too) — both documented in
  `docs/fe-guides/event-lifecycle-locks-and-event-types-fe-integration.md`.
- **Per plan:** `PlanTier.moduleKeys` (plus any `MODULE_UNLOCK`) decides whether each module the
  type supports is on (`isEnabled`). Since 2026-09-24 this is re-derived at creation, on every plan
  change and on an unlock purchase, and hosts can't switch modules themselves (`PATCH
  /api/event-modules/{id}` is gone). See `plan-owned-modules-fe-integration.md`.
- Buying a `MODULE_UNLOCK` add-on (`POST /api/events/{eventId}/addons`) is gated by the same
  matrix: a module `UNSUPPORTED` for the event's type 409s `MODULE_NOT_AVAILABLE` even if the
  plan's catalog lists it. This purchase path only exists **before** activation (event still
  `DRAFT`) — see below.

## Not yet true — do not build against these

- The `paidModules` upsell list returned by `GET /api/plan-tiers?eventType=` (and by
  `GET /api/config`) is **not** filtered by the event-type module matrix yet — it can list a
  `MODULE_UNLOCK` for a module that is actually `UNSUPPORTED` for the type you asked about. The
  purchase itself is safely rejected (see above); only the *display* list can currently offer
  something that would then 409. Don't build an "always purchasable" assumption on
  `paidModules` for a type-scoped call until this is tightened.
- Buying a module add-on only works pre-activation (`EventStatus.DRAFT`, i.e. during host setup
  before payment) — there is no flow yet for a host to unlock a new module on an already-live
  event.
- `eventType` is (and stays) immutable after creation — there is no patch endpoint for it and none
  is planned.
