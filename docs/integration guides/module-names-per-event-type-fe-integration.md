# FE integration guide: module names per event type

**2026-10-09.** Admins can give a module its own name, description and plan-card line for one
event type, in English and Greek. Example: `wishbook` stays "Wishbook" for weddings but becomes
"Memory capsule" for reunions. This is the backend half of storywall
`docs/module-names-per-event-type-plan.md`.

**Nothing is seeded.** Migration V163 adds the three columns empty on every row, so every event
type keeps the FE's default copy until an admin saves an override. Until then
`translations.eventTypes[key].modules` is `{}` everywhere.

Related docs:
- [`frontend-api-types.ts`](../frontend-api-types.ts): `AppEventTypeTranslationDto.modules`,
  `AppModuleCopyDto`, `LocalizedLabel`, `PlatformEventTypeModuleResponseDto`,
  `PlatformEventTypeModulePatchDto`
- [`app-config-fe-integration.md`](app-config-fe-integration.md): the `translations` namespace

## 1. Public read: `GET /api/config`

```ts
interface AppEventTypeTranslationDto {
  name: Record<string, string>;
  tagline: Record<string, string>;
  voice: Record<string, Record<string, string>>; // eight keys now, see §4
  modules: Record<string, AppModuleCopyDto>;     // keyed by moduleKey
}

interface AppModuleCopyDto {
  name: LocalizedLabel | null;
  description: LocalizedLabel | null;
  cardLabel: LocalizedLabel | null;
}

interface LocalizedLabel { en: string; el: string }
```

- `modules` is **always present**: `{}` when the type has no override.
- A module is listed only when it has **at least one** override. Inside a listed module, each field
  is independent: `null` means use the default for that field.
- `cardLabel: null` means use the resolved name (the override name if there is one, else the default).
- Only modules the type supports (`DEFAULT_ON`) are listed. See §3.
- Values are trimmed and both locales are always non-blank, so no per-locale fallback is needed
  inside an override.
- Saving an override publishes `PlatformConfigChangedEvent`: the cached config is rebuilt with a
  new ETag on the next request, the same as event-type edits. A conditional GET returns 200, not 304.
- Unlike the rest of the matrix row, overrides take effect immediately, for events that already
  exist too. The FE reads them per request, and nothing is copied onto the event.

The resolver order from the plan stays the same: override → `Modules.<key>.*` translation →
platform module name.

## 2. Admin write

`PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey}` (admin only):

```ts
interface PlatformEventTypeModulePatchDto {
  applicability?: ModuleApplicability;
  defaultConfig?: Record<string, unknown>;
  sortOrder?: number;
  name?: LocalizedLabel | null;
  description?: LocalizedLabel | null;
  cardLabel?: LocalizedLabel | null;
}
```

| Body | Effect |
|---|---|
| field omitted | unchanged |
| `"name": null` | cleared, back to the default |
| `"name": {"en": "...", "el": "..."}` | set (stored trimmed) |

The response (`PlatformEventTypeModuleResponseDto`) and `GET /api/admin/event-types/{key}/modules`
now carry `name`, `description` and `cardLabel` (each `LocalizedLabel | null`). Show the edit form
from these and the platform name from the module catalog.

After a save, invalidate `adminKeys` and call `invalidatePublicConfig`, as the plan's FE §5 says.

### Validation

Checked before anything is written. A rejected patch changes nothing, including the
`applicability`, `sortOrder` or `defaultConfig` sent with it.

| Rule | Limit |
|---|---|
| Keys | exactly `en` and `el`; any other key is rejected |
| Each locale | present and non-blank after trimming |
| `name`, `cardLabel` | ≤ 40 characters per locale, counted after trimming (UTF-16 length, the same as an input's `maxLength`) |
| `description` | ≤ 160 characters per locale, same counting |
| Row | must be `DEFAULT_ON` after the patch is applied |

### Errors

| Code | HTTP | When | `details` |
|---|---|---|---|
| `3056` MODULE_COPY_INCOMPLETE | 400 | A locale is missing or blank, or a key other than `en`/`el` is sent | `field` (`name`/`description`/`cardLabel`), `locale` (the missing, blank or unknown key) |
| `3057` MODULE_COPY_TOO_LONG | 400 | A locale exceeds the cap | `field`, `locale`, `maxLength` |
| `5156` MODULE_COPY_MODULE_UNSUPPORTED | 409 | Override set on an `UNSUPPORTED` row, or in the same patch that makes the row `UNSUPPORTED` | `field` |
| `404` RESOURCE_NOT_FOUND | 404 | Unknown type/module pair | |
| `4001` FORBIDDEN | 403 | Not an admin | |

Use `details.field` + `details.locale` to put the message under the right input. All three have
localized `detail` messages (en/el, `error.module_copy.*`).

## 3. Unsupported rows: reject on write, keep on read

Spec §2 left this to the BE. The BE does both:

- **Write: reject.** Setting an override on an `UNSUPPORTED` row returns 409 `5156`. Clearing one
  with `null` is always allowed. The admin UI should list only supported modules (spec FE §5 already does).
- **Applicability flip: keep but ignore.** If a row that has overrides is later switched to
  `UNSUPPORTED`, the stored overrides stay and the admin GET still returns them. `/api/config`
  stops serving them. Switching the row back to `DEFAULT_ON` serves them again.

## 4. Voice pack: two keys removed

`toolsScheduleDescription` and `toolsPlaylistDescription` are gone from `voice`. It now has eight
keys: `titlePlaceholder`, `locationPlaceholder`, `joinSubtitle`, `joinDisclaimer`, `inviteHeadline`,
`rsvpMessageLabel`, `rsvpAttendingConfirmation`, `toolsSubtitle`. The FE never rendered the two
removed keys, so nothing breaks. Remove them from any FE type that lists them.

## 5. Differences from the spec

| Spec | Shipped | Why |
|---|---|---|
| §1 seed: copy the voice pack's schedule/playlist descriptions into the overrides | **Not seeded**; every row starts `null` | Product decision on 2026-10-09: start from the defaults, so nothing changes until an admin edits. The old voice texts are dropped. They were never rendered. |
| Rollout step 4: remove the two voice keys later | Removed in this change | Unused by the FE, so removing them now is safe. |
| §2 limits "open to BE's limits" | 40 / 160 / 40 as proposed | |
| §2 UNSUPPORTED: reject or keep-but-ignore | Reject on write; keep-but-ignore when the row flips later | See §3 |
| Type name `LocalizedText` | Documented as `LocalizedLabel` in `frontend-api-types.ts` | The same `{en, el}` shape, but both keys are required, unlike the open locale map. The FE can keep its own `LocalizedText`. |
