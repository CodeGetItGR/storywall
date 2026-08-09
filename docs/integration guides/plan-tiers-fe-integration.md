# FE integration guide: Configurable plan tiers

> **Superseded — kept as change history.** Build against **`billing-fe-guide.md`**, which covers
> plans, quotas, modules, payments, subscriptions and refunds as one current reference. This file
> records what changed on 2026-08-05 and why, which the consolidated guide does not.

Covers the change shipped 2026-08-05: the plan catalog (`FREE`/`PLUS`/`PRO` and whatever an
admin adds after this) moved from a hardcoded three-tier enum into an admin-editable database
table. See `frontend-integration-guide.md` §0 for base setup (auth header, error shape) and
`app-config-fe-integration.md` for the rest of `GET /api/config` — this doc only covers plan
tiers specifically.

## The two breaking changes

### 1. `planTiers` on `GET /api/config` is now an array, not a map

**Before:**

```json
{
  "planTiers": {
    "FREE": { "storageBytes": 1073741824, "maxMembers": 20, "maxActiveEvents": 1 },
    "PLUS": { "storageBytes": 10737418240, "maxMembers": 100, "maxActiveEvents": 5 },
    "PRO":  { "storageBytes": 107374182400, "maxMembers": 500, "maxActiveEvents": 20 }
  }
}
```

**After:**

```json
{
  "planTiers": [
    {
      "id": "b1e2c3d4-...",
      "code": "FREE",
      "scope": "EVENT",
      "name": "Free",
      "description": null,
      "sortOrder": 0,
      "isDefault": true,
      "isAssignable": true,
      "isPublic": true,
      "storageBytes": 1073741824,
      "maxMembers": 20,
      "maxActiveEvents": null,
      "priceAmountMinor": null,
      "priceCurrency": null,
      "billingPeriod": null,
      "discountPercent": null,
      "discountLabel": null,
      "discountStartsAt": null,
      "discountEndsAt": null
    }
  ]
}
```

The type is `PlanTierResponseDto[]` — see `frontend-api-types.ts` for the full shape. Any FE
code that currently does `config.planTiers.FREE.storageBytes` needs to become
`config.planTiers.find(t => t.code === 'FREE' && t.scope === 'EVENT')?.storageBytes` (and should
handle "not found" — see below). Only `isAssignable && isPublic` plans appear in this array;
archived or internal-only plans are admin-only (see below).

### 2. `planTier` on the usage endpoints is now a plain string, not an enum-typed field

`GET /api/me/usage` and `GET /api/events/{id}/usage` already returned `planTier` as a JSON
string (`"FREE"`, `"PLUS"`, `"PRO"`) — the **wire value hasn't changed at all**. What changed is
the FE's declared TypeScript type: it used to be safe to type this field as a closed union
(`'FREE' | 'PLUS' | 'PRO'`), and it no longer is, because admins can create new plan codes at
runtime. `frontend-api-types.ts` now types `EventUsageResponseDto.planTier` and
`AccountUsageResponseDto.planTier` as plain `string`.

Practically: `planTier === 'FREE'` still works exactly as before on the usage endpoints — that's
comparing a string to a string literal, which TypeScript allows regardless of the declared type.
The only thing that breaks is a hardcoded `type PlanTier = 'FREE' | 'PLUS' | 'PRO'` union type
sitting in FE code — that needs to widen to `string`, or a runtime check against `planTiers` will
fail to compile against it once a fourth plan exists.

## Null means no limit — the most likely rendering bug

`storageBytes`, `maxMembers`, and `maxActiveEvents` on `PlanTierResponseDto` are all
`number | null`. A `null` value means **no limit is enforced** for that field on that plan — it
must render as "Unlimited", never as "0 bytes", "0 members", or an empty progress bar.

```ts
// Wrong — formatBytes(null) will either throw or print garbage like "NaN MB"
`${formatBytes(plan.storageBytes)} storage`

// Right
plan.storageBytes === null ? 'Unlimited storage' : `${formatBytes(plan.storageBytes)} storage`
```

This is the single most likely bug when wiring up a pricing table against this data — a plan
with no member cap is a real, intended shape (e.g. an uncapped enterprise plan), not missing
data.

## Scope: which limits apply to which target

`PlanScope` is `'ACCOUNT' | 'EVENT'`. A plan is only assignable to a target whose kind matches
its scope:

- **`EVENT`**-scope plans are what a host buys/is assigned for a single event. Only
  `storageBytes` and `maxMembers` are meaningful here — `maxActiveEvents` is always `null` on an
  `EVENT`-scope plan and should be ignored/hidden in the UI, not rendered as "0" or "Unlimited".
- **`ACCOUNT`**-scope plans govern how many events a user may run *simultaneously*. Only
  `maxActiveEvents` is meaningful — `storageBytes`/`maxMembers` are always `null` here for the
  same reason.

An `EVENT`-scope plan can never be assigned to a user, and an `ACCOUNT`-scope plan can never be
assigned to an event — the admin assignment endpoints below reject a scope mismatch. When
building a pricing page, filter `planTiers` by `scope` up front (e.g. one tab/table for "event
plans", one for "account plans") rather than trying to render both limit types generically.

## Codes are no longer a fixed union

Because admins can create new plans through the endpoints below, `code` is **not** limited to
`'FREE' | 'PLUS' | 'PRO'` — any FE type declaring that union (a `type PlanTier = ...` alias, a
switch statement with an exhaustiveness check, a hardcoded array of tier names for a pricing
table) needs to widen to `string` and read the actual set from `planTiers` at runtime instead of
assuming it. `code` is unique per `scope`, not globally — an `EVENT`-scope plan and an
`ACCOUNT`-scope plan can legitimately share a `code` like `FREE`.

## The admin endpoints

All of the following require `ROLE_ADMIN` — send the usual `Authorization: Bearer <token>` for
an admin user. Non-admin callers get `403`.

### `GET /api/admin/plan-tiers?scope=EVENT&includeArchived=true` — list

Both query params are optional. `scope` filters to `ACCOUNT` or `EVENT`; omit it to get both.
`includeArchived` (default `false`) includes plans with `isAssignable: false`. Unlike the public
`planTiers` array on `/api/config`, this also returns non-public and archived plans — it's the
admin's full view of the catalog, not the marketing-facing one.

```
GET /api/admin/plan-tiers?scope=EVENT&includeArchived=true
→ 200 PlanTierResponseDto[]
```

### `GET /api/admin/plan-tiers/{id}` — single

```
GET /api/admin/plan-tiers/b1e2c3d4-...
→ 200 PlanTierResponseDto
→ 404 if not found
```

### `POST /api/admin/plan-tiers` — create

```json
POST /api/admin/plan-tiers
{
  "code": "ENTERPRISE",
  "scope": "EVENT",
  "name": "Enterprise",
  "description": "For large weddings and conferences",
  "sortOrder": 3,
  "isDefault": false,
  "isAssignable": true,
  "isPublic": true,
  "storageBytes": 1099511627776,
  "maxMembers": null,
  "maxActiveEvents": null,
  "priceAmountMinor": 49900,
  "priceCurrency": "USD",
  "billingPeriod": "MONTHLY",
  "discountPercent": null,
  "discountLabel": null,
  "discountStartsAt": null,
  "discountEndsAt": null
}
→ 201/200 PlanTierResponseDto
```

Validation (server-enforced, `400` with `errorCode: 3001` on violation):
- `code` — required, non-blank, max 30 chars, must match `^[A-Z0-9_]+$` (upper-case letters,
  digits, underscores only).
- `scope`, `name`, `sortOrder`, `isDefault`, `isAssignable`, `isPublic` — all required.
- `name` — max 100 chars.
- `sortOrder` — `>= 0`.
- `storageBytes`, `maxMembers`, `maxActiveEvents`, `priceAmountMinor` — if present, `>= 0`.
- `priceCurrency` — if present, exactly 3 chars (ISO 4217, e.g. `"USD"`).
- `discountPercent` — if present, `0`–`100`.
- `discountLabel` — max 100 chars.
- `description`, `billingPeriod`, `discountStartsAt`, `discountEndsAt` — no length/range
  constraint beyond their type.

`billingPeriod` is `'MONTHLY' | 'YEARLY' | 'ONE_TIME'` or `null`.

### `PATCH /api/admin/plan-tiers/{id}` — partial update

Every field optional — omitted fields are left unchanged. Same per-field constraints as create
where present (no `code`/`scope` field on the patch DTO — a plan's code and scope are immutable
after creation).

```json
PATCH /api/admin/plan-tiers/b1e2c3d4-...
{ "isAssignable": false }
→ 200 PlanTierResponseDto
```

Use this to archive a plan (`isAssignable: false`) rather than deleting it if it might still be
referenced by existing users/events — archiving keeps it visible to admins and to anyone already
on it, just hides it from new assignment and the public catalog (`isPublic` independently
controls catalog visibility).

### `DELETE /api/admin/plan-tiers/{id}` — delete

```
DELETE /api/admin/plan-tiers/b1e2c3d4-...
→ 204
→ 409 if the plan is currently assigned to any user or event
```

Prefer archiving (`PATCH { "isAssignable": false }`) over deleting for any plan that might have
history — delete is for cleaning up a plan that was created by mistake and never assigned.

### `PATCH /api/admin/users/{id}/plan-tier` — assign a plan to a user

```json
PATCH /api/admin/users/{userId}/plan-tier
{ "planTierCode": "PRO" }
→ 200 AccountUsageResponseDto
```

`planTierCode` must reference an `ACCOUNT`-scope plan (a user can't be put on an `EVENT`-scope
plan). The response is the user's fresh usage snapshot against the new plan's limits — check
`activeEventPercent` in the response to see immediately whether the new plan is already
exceeded, since there's no separate commerce/proration flow.

### `PATCH /api/admin/events/{id}/plan-tier` — assign a plan to an event

```json
PATCH /api/admin/events/{eventId}/plan-tier
{ "planTierCode": "PLUS" }
→ 200 EventUsageResponseDto
```

Same shape, but `planTierCode` must reference an `EVENT`-scope plan, and the response is
`EventUsageResponseDto` (storage/member usage against the new plan).

Both assignment endpoints validate `planTierCode` as required, non-blank, max 30 chars — an
unknown code, or a code whose scope doesn't match the target, returns an error rather than
silently no-op'ing.

### `PATCH /api/platform-feature-flags/{id}` — update a flag in place

Not plan-tier specific, but shipped alongside this work: feature flags can now be patched
instead of only created/deleted. Every field optional, `null`/omitted means "leave unchanged":

```json
PATCH /api/platform-feature-flags/{flagId}
{ "isEnabled": false }
→ 200 PlatformFeatureFlagResponseDto
```

Accepts any of `description` (max 100 chars), `isEnabled`, `configuration` (arbitrary JSON
object) — `featureKey` is not patchable, since application code checks flags by that key.

## Modules

A module (`posts`, `rsvp`, `playlist`, `stories`, `gallery`) is gated by three independent
switches, ANDed together:

1. **The registry's `isEnabled`** — a platform-wide kill switch, off by default for nothing,
   on by default for everything. Toggled via the admin endpoints below.
2. **The plan's `moduleKeys`** — which modules the event's current plan grants. Set via
   `PUT /api/admin/plan-tiers/{id}/modules` (see above).
3. **The event module's own `isEnabled`** — the per-event toggle a host flips in event settings.

`EventModuleResponseDto.isAvailable` is the AND of all three. **Gate UI on `isAvailable`, not on
`isEnabled`** — a module can be enabled for the event and still unavailable because the plan
excludes it or the registry has it off platform-wide. `isEnabled` alone tells you nothing about
whether the feature will actually work if the user tries to use it.

`eventModuleKeys` on `GET /api/config` now reflects the registry rather than the fixed
`ModuleKey` enum: a module with the registry's `isEnabled` set to `false` disappears from
`eventModuleKeys` entirely, platform-wide, regardless of any event's plan or per-event setting.
The full registry (`modules` on the same response) still lists every enabled row with its
metadata, in `sortOrder`.

`moduleKeys` on a `PlanTierResponseDto` (see above) is what upgrading a user/event onto that plan
would grant — useful for rendering "upgrade to unlock X" messaging on a disabled module. It is
always empty for `ACCOUNT`-scope plans; only `EVENT`-scope plans carry a module list.

### `GET /api/admin/platform-modules` — list the registry

Admin only. Returns every row, including disabled ones, ordered by `sortOrder`.

```
GET /api/admin/platform-modules
→ 200 PlatformModuleResponseDto[]
```

```json
[
  {
    "id": "b1e2c3d4-...",
    "moduleKey": "stories",
    "name": "Stories",
    "description": "24-hour disappearing photo/video updates",
    "isEnabled": true,
    "sortOrder": 3
  }
]
```

### `PATCH /api/admin/platform-modules/{moduleKey}` — update a row

Every field optional, `null`/omitted means "leave unchanged". There is no create or delete: a
module key with no code behind it does nothing, so the set of modules is fixed by the backend's
`ModuleKey` enum, not by this endpoint.

```json
PATCH /api/admin/platform-modules/stories
{ "isEnabled": false }
→ 200 PlatformModuleResponseDto
```

Setting `isEnabled: false` here is the fastest way to withdraw a broken module for every event on
every plan without a deploy — it takes effect immediately on the next `GET /api/config` and the
next `isAvailable` computation.

## Quota enforcement

**What changed:** the limits described above used to be advisory — read by `GET /api/config` and
the notification sweep, but never checked at write time. They are now enforced. Flows that
previously always succeeded (uploading media, adding a member, creating an event) can now return
`409 Conflict`.

**The three codes:**

| Code | Name | Returned from |
|---|---|---|
| `5008` | `EVENT_STORAGE_LIMIT_EXCEEDED` | `POST /api/events/{eventId}/media`, `POST /api/events/{eventId}/media/batch` (per-file, see below) |
| `5009` | `EVENT_MEMBER_LIMIT_EXCEEDED` | `POST /api/events/{eventId}/members`, invite acceptance |
| `5010` | `ACTIVE_EVENT_LIMIT_EXCEEDED` | `POST /api/events` |

**The `details` payload.** Every rejection carries a `details` object alongside the usual
`errorCode`/`errorKey` fields, so the frontend can render an upgrade prompt without a second
round-trip to a usage endpoint:

```json
{
  "status": 409,
  "errorCode": 5008,
  "errorKey": "EVENT_STORAGE_LIMIT_EXCEEDED",
  "detail": "This event has no room left for new media on its current plan.",
  "details": {
    "planCode": "FREE",
    "used": 2147480000,
    "limit": 2147483648,
    "incomingBytes": 10485760
  }
}
```

`incomingBytes` is present only on storage rejections. `used` and `limit` are member counts for
`5009`, active-event counts for `5010`.

**Batch uploads are partial.** `POST /api/events/{eventId}/media/batch` still returns `200`, with
per-file entries in `failed` carrying `errorCode: "EVENT_STORAGE_LIMIT_EXCEEDED"` for any file
that would have overflowed the quota. Files that fit are stored and appear in `created`; a
quota-full event does not fail the whole batch.

**Null limits.** A plan with a null limit never rejects — there is no cap to check against. Don't
render a progress bar against a null limit; there is no denominator (see "Null means no limit"
above, which applies equally here).

**The archive escape hatch.** `ACTIVE_EVENT_LIMIT_EXCEEDED` tells the user to archive an event or
upgrade. Archiving genuinely frees the seat — `PATCH` the event with `isArchived: true` — so the
UI should offer that action alongside the upgrade prompt, not just the upgrade prompt alone.
