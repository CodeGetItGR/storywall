# FE integration guide: account plans disabled + admin platform metrics

Covers two changes shipped together on 2026-08-11: **account-scope plans are no longer sellable
or assignable** (event plans are unaffected), and a new **`GET /api/admin/metrics`** endpoint for
dashboard-style counts. See `frontend-integration-guide.md` §0 for base setup (auth header, the
RFC 7807 error envelope) and `billing-fe-guide.md` for everything else plan/quota-related — this
doc only covers what changed. `billing-fe-guide.md` §2 ("The plan catalog"), §12 ("Error codes")
and §13 ("Admin endpoints") have been updated in place to match; this doc is the "what changed and
why" record.

## Why

Account plans (`PlanScope.ACCOUNT` — `maxActiveEvents`, governing how many events a user may run
at once) are being discontinued. Only the event-plan catalog (`PlanScope.EVENT` — storage/member
caps on a single event) is supported going forward. Nothing about event plans, checkout,
subscriptions, or refunds changed.

## What this does *not* do

This is a **soft disable**, not a removal:

- Nothing was deleted. The three seeded account plans (`FREE`, `PLUS`, `PRO` under
  `scope: 'ACCOUNT'`) still exist as rows and are still readable via the admin plan-tier
  endpoints.
- Registration is unaffected. Every new user still gets `FREE`/`ACCOUNT` assigned automatically —
  `users.plan_tier_id` is a `NOT NULL` column and always has been. There is no user-facing "skip
  account plan" step to build.
- `GET /api/me/usage` still returns a real `AccountUsageResponse` for every user, same shape as
  before (`planTier`, `activeEvents`, `activeEventLimit`, `activeEventPercent`).
- Existing users on `PLUS`/`PRO`/`ACCOUNT` are untouched — they keep whatever plan they were on.

## What actually changed

### 1. Account plans no longer count against `activeEventLimit` for most users

`FREE`/`ACCOUNT` — the default plan every user starts on — has had its `maxActiveEvents` set to
`null` in the database. Per the existing "null means no limit" convention (see `billing-fe-guide.md`
§2), this means **`GET /api/me/usage` now returns `activeEventLimit: null` and
`activeEventPercent: 0` for any user still on the default plan**, where it previously returned a
real cap (`1`, in the seeded catalog).

```jsonc
// Before, for a FREE/ACCOUNT user
{ "planTier": "FREE", "activeEvents": 1, "activeEventLimit": 1, "activeEventPercent": 100 }

// After
{ "planTier": "FREE", "activeEvents": 1, "activeEventLimit": null, "activeEventPercent": 0 }
```

If your account-usage widget renders a progress bar or an "X of Y events" string, make sure it
already handles `activeEventLimit: null` as "Unlimited" — the same rendering rule
`billing-fe-guide.md` already documents for storage/member limits. If it does, this needs no
change. If it doesn't, this is now reachable in production for every default-plan user, not just a
theoretical case.

Users already on `PLUS`/`PRO`/`ACCOUNT` are unaffected — those plans still carry their original
`maxActiveEvents` and still enforce it via `5010 ACTIVE_EVENT_LIMIT_EXCEEDED` exactly as before.
Only the default plan's cap was neutralized, since it can't be archived (see below).

### 2. Two admin write paths now always reject with a new error code

| endpoint | before | now |
|---|---|---|
| `PATCH /api/admin/users/{id}/plan-tier` | moved the user onto the named `ACCOUNT` plan | **always** `409`, `errorCode: 5034 ACCOUNT_PLANS_DISABLED` |
| `POST /api/admin/plan-tiers` with `"scope": "ACCOUNT"` | created a new account plan | **always** `409`, `errorCode: 5034 ACCOUNT_PLANS_DISABLED` |

```json
PATCH /api/admin/users/{userId}/plan-tier
{ "planTierCode": "PRO" }

→ 409
{
  "status": 409,
  "errorCode": 5034,
  "errorKey": "ACCOUNT_PLANS_DISABLED",
  "detail": "Account plans are disabled; users can no longer be moved between them."
}
```

```json
POST /api/admin/plan-tiers
{ "code": "ENTERPRISE", "scope": "ACCOUNT", "maxActiveEvents": 50, ... }

→ 409
{
  "status": 409,
  "errorCode": 5034,
  "errorKey": "ACCOUNT_PLANS_DISABLED",
  "detail": "Account plans are disabled; only event plans can be created."
}
```

**If an admin panel has a "change this user's account plan" control, remove it** (or disable it
with an explanatory tooltip) — the request will now always fail. Same for any "create plan" form
that lets an admin pick `scope: 'ACCOUNT'`; either remove `ACCOUNT` from the scope selector
entirely, or keep it visible but expect every submission to 409.

Everything else about account-scope plans still works normally through the admin endpoints:
`GET /api/admin/plan-tiers?scope=ACCOUNT`, `GET /api/admin/plan-tiers/{id}`,
`PATCH /api/admin/plan-tiers/{id}` (e.g. renaming one), and `DELETE /api/admin/plan-tiers/{id}`
(blocked by the pre-existing `5011 PLAN_TIER_IN_USE` if still referenced, same as any plan). Only
*creating* a new one and *assigning* one to a user are blocked. `PATCH .../plan-tier` for an
**event** plan (`PATCH /api/admin/events/{id}/plan-tier`) is completely unaffected.

### 3. Account plans no longer appear in the public catalog

`GET /api/config` → `planTiers` was already filtered to `isAssignable && isPublic`. All three
account plans now have `isPublic: false`, so **`planTiers` will stop containing any
`scope: 'ACCOUNT'` entries** the next time an environment picks up this change. If a pricing page
was rendering an "account plans" tab/table by filtering `config.planTiers` for `scope === 'ACCOUNT'`
(per `billing-fe-guide.md` §1's guidance to filter by scope), that tab now renders empty and
should be removed rather than left showing nothing. Event plans (`scope: 'EVENT'`) are unaffected
and still populate normally.

The full catalog including archived/non-public rows is still visible to admins via
`GET /api/admin/plan-tiers?scope=ACCOUNT&includeArchived=true`, for reference or historical
display (e.g. showing what plan a legacy user is grandfathered on).

## New: `GET /api/admin/metrics`

Admin-only (`ROLE_ADMIN`, `403` otherwise), no query params, no pagination — it's a small fixed
set of counts, not a list endpoint.

```
GET /api/admin/metrics
→ 200 PlatformMetricsResponse
```

```jsonc
{
  "totalUsers": 4213,
  "activeUsers": 4108,
  "usersByAccountPlan": { "FREE": 3960, "PLUS": 180, "PRO": 73 },

  "totalEvents": 1522,
  "activeEvents": 812,
  "eventsByStatus": { "DRAFT": 340, "ACTIVE": 812, "FROZEN": 12, "PURGED": 358 },
  "eventsByPlanTier": { "BASIC": 1100, "PLUS": 340, "PRO": 82 }
}
```

### Field notes

- **`totalUsers`** — every user row, regardless of `status`.
- **`activeUsers`** — only `status: 'ACTIVE'` (excludes `SUSPENDED` and `DELETED`).
- **`usersByAccountPlan`** — every user (not just active ones) grouped by their current
  `ACCOUNT`-scope plan code. Keys are whatever account-plan codes exist in the catalog — currently
  `FREE` / `PLUS` / `PRO`, but see "codes are not a fixed union" in `billing-fe-guide.md` §2; treat
  this as `Record<string, number>`, not a fixed key set.
- **`totalEvents`** — every non-soft-deleted event (`deletedAt IS NULL`), across every
  `EventStatus`.
- **`activeEvents`** — equal to `eventsByStatus['ACTIVE']`; broken out as its own field since
  "how many events are live right now" is the single most likely dashboard tile.
- **`eventsByStatus`** — keyed by `EventStatus`: `DRAFT`, `ACTIVE`, `FROZEN`, `PURGED`. A status
  with zero events is simply absent from the map — treat a missing key as `0`, don't assume all
  four keys are always present.
- **`eventsByPlanTier`** — every non-soft-deleted event grouped by its `EVENT`-scope plan code.
  Same "not a fixed key set" caveat as `usersByAccountPlan`.

All of it is computed live from the underlying rows on every call (no caching, no denormalized
counters) — cheap enough for an admin dashboard refresh, not something to poll on a tight interval
or use as a per-request check elsewhere.

### TypeScript

```ts
export interface PlatformMetricsResponse {
  totalUsers: number;
  activeUsers: number;
  usersByAccountPlan: Record<string, number>;

  totalEvents: number;
  activeEvents: number;
  eventsByStatus: Record<string, number>;   // keys: DRAFT | ACTIVE | FROZEN | PURGED, missing = 0
  eventsByPlanTier: Record<string, number>;
}
```

## Checklist

- [ ] Remove or disable any "assign account plan to user" admin control — it now always 409s.
- [ ] Remove `scope: 'ACCOUNT'` from any "create plan" admin form's scope options.
- [ ] Remove/hide any "account plans" pricing tab that filtered `GET /api/config`'s `planTiers` by
      `scope === 'ACCOUNT'` — it will render empty from now on.
- [ ] Confirm the account-usage widget already renders `activeEventLimit: null` as "Unlimited"
      rather than "0 of null" or a broken progress bar — this is now the common case, not an edge
      case, for anyone on the default plan.
- [ ] Wire up the new admin dashboard tile(s) against `GET /api/admin/metrics` if desired.
