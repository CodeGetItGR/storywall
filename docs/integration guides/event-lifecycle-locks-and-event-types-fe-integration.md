# FE integration guide: event lifecycle locks + configurable event types

Covers four related changes, all about what stops being freely editable once an event exists or
has started: **which modules an event has is locked server-side, but the host can now switch an
existing one on or off**, **event visibility only supports `PRIVATE`**, **`eventType` is now a
closed, admin-toggleable set that drives which modules an event gets**, and **session
`startAt`/`endAt` get the same schedule lock the event itself already had**. See
`frontend-integration-guide.md` §0 for base setup (auth header, error shape) — this doc only
covers what's new.

Three of these four close a gap the FE was relying on — in every case the UI already didn't offer
the now-blocked action (no public-event flow, no event-type picker on edit, no way to move a
session's date on a live event). This closes the same gap
`account-plans-disabled-and-platform-metrics-fe-integration.md` describes for account plans: the
server now enforces what the UI already assumed, so a request that shouldn't have been possible
gets a real `409` instead of silently succeeding. §1 is the exception — it's a genuinely new
capability, not a lock — read it even if you skip the rest.

## 1. Event module _composition_ is locked, but `isEnabled` can now be toggled

**Which modules exist on an event** is still fixed the moment the event is created:
`POST /api/event-modules` and `DELETE /api/event-modules/{id}` always reject with **`409`**,
`errorCode: 5049` / `errorKey: "EVENT_MODULE_COMPOSITION_LOCKED"`.

```json
POST /api/event-modules
{ "eventId": "...", "moduleKey": "playlist", "isEnabled": true }

→ 409
{
  "status": 409,
  "errorCode": 5049,
  "errorKey": "EVENT_MODULE_COMPOSITION_LOCKED",
  "detail": "Event ... already has its modules; none can be added after creation."
}
```

`EventService#create` seeds one row per module the event's **type** supports (see §3) — not
every `ModuleKey` any more — and there is still no way to add or remove a row afterward. `POST`
with an unknown `moduleKey` still returns the pre-existing `400` /
`errorCode: 3006 INVALID_MODULE_KEY` first — key validity is checked before the lock.

**`PATCH /api/event-modules/{id}` on `isEnabled` now works, asymmetrically:**

- **Turning a module off always succeeds (`200`).** No commercial check — a host can switch off
  any module their event currently has.
- **Turning a module on is gated the same way availability always has been** — the event's plan
  must include the module, or the event must hold a `MODULE_UNLOCK` entitlement for it (§ below,
  and `one-time-module-unlocks-fe-integration.md`). If neither is true: **`409`**,
  `errorCode: 5012` / `errorKey: "MODULE_NOT_AVAILABLE"`.

```json
PATCH /api/event-modules/{id}
{ "isEnabled": true }

→ 409  (event's plan doesn't include this module, and no unlock either)
{
  "status": 409,
  "errorCode": 5012,
  "errorKey": "MODULE_NOT_AVAILABLE",
  "detail": "The gallery module is not available for this event."
}
```

A module a host switched off can always be switched back on later, as long as the commercial gate
still passes — the toggle itself never revokes what was paid for. `configuration` still patches
independently of `isEnabled`, exactly as before.

**Action:** if there's a hidden/disabled module-toggle affordance, it's real again — wire it up
(or leave it hidden, your call), rendering it as **on/off**, not add/remove: the set of modules
shown per event doesn't change, only whether each one is live. For a module the plan doesn't
include, offer the `MODULE_UNLOCK` purchase flow instead of a bare toggle — flipping it straight
to `true` will 409.

Reading modules is unaffected: `GET /api/events/{eventId}/modules` and the gating pattern
(`modules.find(m => m.moduleKey === 'posts')?.isEnabled`) work exactly as before.

## 2. Event visibility is now `PRIVATE`-only

`POST /api/events` and `PATCH /api/events/{id}` reject `visibility: "PUBLIC"` with **`409`**,
`errorCode: 5050` / `errorKey: "EVENT_VISIBILITY_NOT_SUPPORTED"`.

```json
PATCH /api/events/{id}
{ "visibility": "PUBLIC" }

→ 409
{
  "status": 409,
  "errorCode": 5050,
  "errorKey": "EVENT_VISIBILITY_NOT_SUPPORTED",
  "detail": "Public events are not supported yet; visibility must be PRIVATE."
}
```

Reason: there's no event-discovery surface built, so a `PUBLIC` event would just be a `PRIVATE`
event with a misleading label. `EventVisibility` still has both `PUBLIC` and `PRIVATE` as values
— this is a "not supported yet" guard, not a schema narrowing — so existing rows and any code
reading `visibility` are unaffected.

**Resending the current value is not a conflict.** An edit form that patches other fields while
echoing back `visibility: "PRIVATE"` (the only value an event can have) still succeeds — only an
actual attempt to set `PUBLIC` is rejected. Since every event you can create today is already
`PRIVATE`, this should require **no FE change** unless a visibility toggle exists somewhere in a
settings form; if it does, remove it or grey it out.

## 3. `eventType` is now a closed, admin-toggleable set

Previously `eventType` was validated only by `@Size(max = 50)` — any string up to 50 characters
was accepted and stored as-is. It's now checked against two layers on `POST /api/events`.
`eventType` was never patchable and still isn't (unchanged) — this only affects creation.

1. **Is it a real key at all?** Checked against the fixed `EventTypeKey` enum:
   `WEDDING | BAPTISM | SOCIAL_EVENT | BIRTHDAY | CORPORATE | FESTIVAL | PRIVATE_PARTY | CONFERENCE`.
   An unknown value → **`400`**, `errorCode: 3018` / `errorKey: "INVALID_EVENT_TYPE"`.

    ```json
    POST /api/events
    { "eventType": "SCHEDULE", ... }

    → 400
    {
      "status": 400,
      "errorCode": 3018,
      "errorKey": "INVALID_EVENT_TYPE",
      "detail": "eventType must be one of: WEDDING, BAPTISM, SOCIAL_EVENT, BIRTHDAY, CORPORATE, FESTIVAL, PRIVATE_PARTY, CONFERENCE"
    }
    ```

2. **Is it currently offered?** Real keys can still be switched off by an admin (data change, no
   deploy needed) via the new `platform_event_types` registry — mirrors how `ModuleKey` /
   `platform_modules` already works for modules. A real-but-disabled key → **`409`**,
   `errorCode: 5051` / `errorKey: "EVENT_TYPE_NOT_AVAILABLE"`.

    ```json
    POST /api/events
    { "eventType": "CONFERENCE", ... }

    → 409
    {
      "status": 409,
      "errorCode": 5051,
      "errorKey": "EVENT_TYPE_NOT_AVAILABLE",
      "detail": "The CONFERENCE event type is not available yet."
    }
    ```

**`SOCIAL_EVENT` is a brand-new key** — it did not exist before this change in any form (not a
rename or alias of `PRIVATE_PARTY`). At launch only `WEDDING`, `BAPTISM`, and `SOCIAL_EVENT` are
enabled; `BIRTHDAY`, `CORPORATE`, `FESTIVAL`, `PRIVATE_PARTY`, and `CONFERENCE` exist as valid
keys (so they never 400) but are switched off (so they currently 409) until an admin enables them.

### Where to get the currently-offered list: `GET /api/config`

Two new fields on `AppConfigResponseDto`, same pattern as the existing `modules` /
`eventModuleKeys` pair (see `app-config-fe-integration.md`):

```ts
interface AppConfigResponseDto {
    // ...existing fields unchanged...
    eventTypes: PlatformEventTypeResponseDto[]; // enabled rows, ordered by sortOrder
    eventTypeKeys: string[]; // eventTypes[].eventTypeKey, same order
}

interface PlatformEventTypeResponseDto {
    id: string;
    eventTypeKey: string; // e.g. "WEDDING"
    name: string; // display name, e.g. "Wedding"
    description: string | null;
    isEnabled: boolean; // always true within eventTypes — this array is pre-filtered
    sortOrder: number;
}
```

**Action:** build the event-creation type picker from `config.eventTypes` (label = `name`, value
= `eventTypeKey`), not a hardcoded list — same reasoning as `eventModuleKeys`. This is the only
way the FE will pick up `CONFERENCE` etc. the moment an admin enables it, with no FE deploy.
`GET /api/config` is public and safe to fetch at boot; see `app-config-fe-integration.md` for the
"fetch once, cache it" guidance, which applies here too.

### Admin: toggling event types

New, `ROLE_ADMIN`-only, mirrors `/api/admin/platform-modules` exactly:

| Method | Path                                             | Notes                                                                                               |
| ------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/platform-event-types`                | every key, including disabled ones — use this to build the admin toggle list, not `GET /api/config` |
| PATCH  | `/api/admin/platform-event-types/{eventTypeKey}` | body: any of `name`, `description`, `isEnabled`, `sortOrder`                                        |

```json
PATCH /api/admin/platform-event-types/CONFERENCE
{ "isEnabled": true }

→ 200
{ "id": "...", "eventTypeKey": "CONFERENCE", "name": "Conference", "description": null, "isEnabled": true, "sortOrder": 7 }
```

There is no create or delete — the key set itself (`EventTypeKey`) is fixed in code; only
`isEnabled` (plus display metadata) is admin-editable. Adding a genuinely new type is a backend
deploy, same as adding a new module.

### Which modules a type gets: `GET /api/event-types/{eventTypeKey}/modules`

Authenticated, not admin-only — this is the wizard's "step two and a half" read: after the host
picks an event type and before they pay, show what they'd actually get. Optional
`?planTierCode=` resolves it against a specific plan.

```json
GET /api/event-types/WEDDING/modules?planTierCode=EVENT_STANDARD

→ 200
[
  { "eventTypeKey": "WEDDING", "moduleKey": "posts", "applicability": "DEFAULT_ON",
    "defaultConfig": {}, "sortOrder": 0, "includedInPlan": true },
  { "eventTypeKey": "WEDDING", "moduleKey": "wishlist", "applicability": "DEFAULT_OFF",
    "defaultConfig": {}, "sortOrder": 4, "includedInPlan": false }
]
```

- **`UNSUPPORTED` rows are omitted entirely** — they're not an offer, the module doesn't exist for
  that type. Don't show them crossed out; just don't render them.
- **`applicability`** is `DEFAULT_ON` or `DEFAULT_OFF` for every row you get back — it's what the
  module's toggle starts at when the event is created, before the host touches anything.
- **`includedInPlan`** is only present (non-null) when `planTierCode` was passed: `true` means the
  named plan covers it going in; `false` means the row is real for this type but would need a
  `MODULE_UNLOCK` purchase (or a plan upgrade) to switch on. Omit `planTierCode` for a
  type-only preview (e.g. before a plan is chosen) and this field comes back `null` — treat that as
  "unknown yet", not "not included".
- Unknown `eventTypeKey` → `400` / `3018` `INVALID_EVENT_TYPE`, same code as event creation.
  Unknown `planTierCode` → `404` / `2001` `RESOURCE_NOT_FOUND`.

**Action:** this is the source of truth for the module-selection step of the creation wizard —
build it from this call rather than from a hardcoded per-type module list, for the same
"drifts silently otherwise" reason as `eventTypes`/`eventTypeKeys` above. Pair it with
`GET /api/config` → `paidServices[]` (filtered to `kind: 'MODULE_UNLOCK'`) to price the rows where
`includedInPlan === false`.

### Admin: editing the matrix

New, `ROLE_ADMIN`-only:

| Method | Path                                                        | Notes                                                                                                                     |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/event-types/{eventTypeKey}/modules`             | every row, **including `UNSUPPORTED`** — the admin view needs to see and re-enable those, unlike the public preview above |
| PATCH  | `/api/admin/event-types/{eventTypeKey}/modules/{moduleKey}` | body: any of `applicability` (`UNSUPPORTED`\|`DEFAULT_OFF`\|`DEFAULT_ON`), `defaultConfig` (object), `sortOrder`          |

```json
PATCH /api/admin/event-types/WEDDING/modules/gallery
{ "applicability": "DEFAULT_ON", "defaultConfig": { "layout": "grid" } }

→ 200
{ "eventTypeKey": "WEDDING", "moduleKey": "gallery", "applicability": "DEFAULT_ON",
  "defaultConfig": { "layout": "grid" }, "sortOrder": 3 }
```

Editing a cell only changes what **new** events of that type get from the moment it's saved —
`eventType` is immutable and the matrix is read once, at creation, so nothing about an
already-created event moves. Flipping a module to `UNSUPPORTED` after events of that type already
exist does not retroactively remove their row.

## 4. Session schedule lock (mirrors the event-level one)

`PATCH /api/event-sessions/{id}` now applies the same lock to a session's own `startAt`/`endAt`
that `PATCH /api/events/{id}` already applies to the event's — this part isn't new behavior, it's
closing a gap where a session's date was still freely editable after the event's own date was
already locked. New error code: **`409`**, `errorCode: 5052` /
`errorKey: "EVENT_SESSION_SCHEDULE_LOCKED"`.

```json
PATCH /api/event-sessions/{id}
{ "startAt": "2026-09-01T18:00:00Z" }

→ 409  (session already started)
{
  "status": 409,
  "errorCode": 5052,
  "errorKey": "EVENT_SESSION_SCHEDULE_LOCKED",
  "detail": "Session ... already started; its start time can no longer be changed."
}
```

Exact rules, identical shape to the event-level lock:

- **`startAt`** can't be changed once it's in the past — _unless_ the new value equals the
  session's current `startAt` (a resubmit from an edit form that didn't touch this field is not a
  conflict), or the parent event is still `DRAFT` (nothing has gone out yet).
- **`endAt`** can't be moved _into_ the past while the parent event is non-`DRAFT` — pushing it
  further into the future is always fine (a session running long is ordinary).
- Everything else on the session (`title`, `description`, `locationName`, `mapsUrl`,
  `displayOrder`) is unaffected and stays freely editable regardless of schedule state.

**Action:** if a session-editing form currently lets a host drag/retype a past session's start
time, that request will now 409 — surface the `detail` message or a friendlier "this session has
already started" message instead of a generic save-failed toast. If the form already disables
date editing for past sessions client-side (matching what the event-level form presumably already
does), no change needed — this only makes the server agree.

## Error code summary

| Code | Key                               | Meaning                                                                                                                                                                         |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3018 | `INVALID_EVENT_TYPE`              | `eventType` isn't one of the known keys at all                                                                                                                                  |
| 5012 | `MODULE_NOT_AVAILABLE`            | `PATCH /api/event-modules/{id}` tried to turn a module **on** and the event's plan doesn't include it and no unlock covers it either (§1) — turning one **off** never hits this |
| 5049 | `EVENT_MODULE_COMPOSITION_LOCKED` | module add or remove attempted after event creation (`POST`/`DELETE` only — `PATCH`'s `isEnabled` is no longer locked, see §1)                                                  |
| 5050 | `EVENT_VISIBILITY_NOT_SUPPORTED`  | `visibility: PUBLIC` attempted on create or patch                                                                                                                               |
| 5051 | `EVENT_TYPE_NOT_AVAILABLE`        | `eventType` is real but currently disabled in the registry                                                                                                                      |
| 5052 | `EVENT_SESSION_SCHEDULE_LOCKED`   | session `startAt`/`endAt` change attempted after it started/went live                                                                                                           |

(5052 is new; 5048 `EVENT_SCHEDULE_LOCKED` — the event-level equivalent of 5052 — already existed
before this change and is unaffected.)

## Checklist

- [ ] Source the event-creation type picker's options from `GET /api/config` →
      `eventTypes`/`eventTypeKeys` instead of any hardcoded list — this is now enforced
      server-side, so drift means creation starts failing with `3018`/`5051` instead of silently
      storing a junk value.
- [ ] If a "social event" option is wanted in the type picker now, its key is `SOCIAL_EVENT` (new
      key, not `PRIVATE_PARTY`) and it's enabled by default.
- [ ] Wire up (or re-enable) a module on/off toggle per event — it now works, asymmetrically: off
      always succeeds, on 409s with `MODULE_NOT_AVAILABLE` (5012) unless the plan or an unlock
      covers it. Route that 409 into the `MODULE_UNLOCK` purchase flow rather than a generic error.
- [ ] Remove or disable any "make this event public" control — it now always 409s with
      `EVENT_VISIBILITY_NOT_SUPPORTED`.
- [ ] Build (or rebuild) the event-creation wizard's module-selection step from
      `GET /api/event-types/{eventTypeKey}/modules?planTierCode=` instead of a fixed per-type list.
- [ ] If a session-editing form allows changing a past session's `startAt` (or moving `endAt` into
      the past on a live event), expect `EVENT_SESSION_SCHEDULE_LOCKED` and handle it the way the
      event-level schedule lock is (or should already be) handled.
- [ ] If there's an admin panel for platform config, consider wiring a new tab against
      `GET/PATCH /api/admin/platform-event-types` alongside the existing module-registry admin UI
      — same shape, same interaction pattern.
- [ ] Same for the type/module matrix: `GET/PATCH /api/admin/event-types/{eventTypeKey}/modules`
      (`/{moduleKey}` for the patch) — a per-type grid of modules with an applicability picker is
      the natural admin UI.
