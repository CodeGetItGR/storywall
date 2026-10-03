# Member roles A: contract, admin catalog, plan config UI, plan card line

Date: 2026-10-03
Source contract: `event_social_media/docs/fe-guides/member-roles-fe-integration.md` (backend repo, added 2026-10-02).

Member roles are split into three sub-projects, each with its own spec, plan and implementation:

- **A (this spec):** contract types, the breaking member payload change, the admin role catalog, the plan module config UI without JSON, the plan card line, and the home card role label.
- **B:** the member role picker, host set/clear/unlock, role labels on posts, comments and stories, local cache updates after `PUT`/`DELETE`.
- **C:** reporting custom roles, moderation center `MEMBER` cases (`expectedContentText`, 5115), the admin blocklist screen.

A must ship in the same release as the backend (guide §7). It is releasable on its own: after A, nothing in the FE sends the removed fields and nothing prints a raw role key.

## 1. Admin role catalog (Plans → Settings → Member roles)

### Navigation

A new "Member roles" item in the Plans rail's Settings group, after Modules and Event types. It adds a `settingsMemberRoles` view to the Plans section's view state, like the existing settings views.

### Layout

1. **Header:** title and a "New role" primary button.
2. **Controls:** event-type select (defaults to the first by `sortOrder`), search (matches either label or the key, case-insensitive) and an All / Active / Retired filter.
3. **Table**, sorted by `sortOrder`, one row per role:
   - Role: emoji and the label in the admin's locale (fallback `en`).
   - Key: `roleKey` in monospace.
   - Limit: pill "Max N" or "Unlimited".
   - Status: pill Active (success tone) or Retired (neutral tone).
   - Order: up and down arrow buttons.
   - Edit: pencil button opening the drawer.
4. **Empty state:** "No roles for this event type yet."

### Reordering

- An arrow swaps the role's `sortOrder` with its neighbour in the full sorted list: two `PATCH` calls with `{ sortOrder }`.
- Arrows are disabled while a search or a non-All filter is active, and at the list's ends. While a move is in flight, all arrows are disabled.
- If any two roles share a `sortOrder`, the first move renumbers the whole list to 0..n-1 in its current order (one `PATCH` per role whose value changes), then applies the swap.
- On failure, show the error and refetch the list.

### Drawer

One role at a time, in the admin `AdminDrawer`.

- **Create:** event type (read-only, the selected one), key, English label, Greek label, emoji (optional), limit, position.
  - The key is uppercased as typed and checked against `^[A-Z][A-Z0-9_]{1,49}$` before submit.
  - Labels: 1 to 40 characters after trimming, both required.
  - Emoji: at most 16 characters after trimming; omitted when blank.
  - Limit: a segmented control "Unlimited" / "Up to N". "Up to N" shows a number input, min 1. Unlimited omits `maxHolders`.
  - Position defaults to last (max `sortOrder` + 1, or 0 when empty).
- **Edit:** the key is read-only (monospace). Labels, emoji and limit can be changed. Only changed fields are sent.
  - A cleared emoji sends `emoji: ""`.
  - Switching to Unlimited sends `clearMaxHolders: true`. Changing N sends `maxHolders`.
  - Position isn't in the edit drawer; ordering is done with the table arrows.
- **Footer:** Save, and apart from it Retire (active role) or Restore (retired role).
  - Retire opens a confirmation modal: "Members who have this role keep it. No one new can pick it." Buttons: "Retire role" / "Cancel".
  - Restore runs at once.

### Errors

- 409 on create: inline on the key field, "A role with this key already exists."
- 400 `3001`: the server message at the top of the drawer.
- 404: "This role no longer exists." Close the drawer and refetch.
- Anything else: the existing admin error mapping (`adminErrorMessageKey`).

### Data

Hooks in `hooks/` (e.g. `useAdminMemberRoles.ts`):

- list: `GET /api/admin/member-roles?eventTypeKey=…` (includes retired)
- create: `POST /api/admin/member-roles`
- patch: `PATCH /api/admin/member-roles/{id}`
- retire / unretire: `POST /api/admin/member-roles/{id}/retire|unretire`
- reorder: wraps the swap and renumbering above

Every successful write invalidates the admin list for that event type and the `/api/config` query.

Pure helpers (reorder plan, create/patch payload builders, key validation) live in `lib/memberRoles.ts` and are unit tested. Components only render.

## 2. Plan module settings without JSON

This is the popover opened from a module × plan cell in the plan grid.

### Known settings

`KNOWN_CONFIG_FIELDS` in `lib/planModuleConfig.ts` gains a translation key per field and the new `member_roles` entry:

| Module | Key | Label | Control |
|---|---|---|---|
| schedule | `maxSections` | Schedule sections | Unlimited / Up to N (min 1) |
| co_hosts | `maxCoHosts` | Co-hosts | Unlimited / Up to N (min 0) |
| gallery | `qrUploadEnabled` | Guest QR upload | Switch |
| member_roles | `allowCustom` | Custom roles | Switch, caption "Members can type their own role." |

- **Counts:** Unlimited removes the key from the config (the server reads a missing count as no cap). The number input is monospace.
- **Switches:** a missing key shows as off. If the key was missing and the admin never touches the switch, it stays missing on save. A touched switch writes `true` or `false`.

### Advanced

A collapsed "Advanced" disclosure at the bottom of the popover. Opened, it shows the existing JSON editor with only the unknown keys, with its current validation. It's there for every module, even with no unknown keys, so an admin can add a key before the FE has a control for it.

### Confirm step

`PlanModuleChangeList` shows labels and readable values for known keys ("Co-hosts: Up to 3 → Unlimited", "Custom roles: Off → On"). Unknown keys keep the raw key and JSON value.

### Code

The popover's state hook keeps its job. `mergeConfigDraft` / `splitConfig` / `knownDraftFromConfig` keep their behaviour, extended for the "touched" rule on switches. New field components: a count field, a switch field and the Advanced disclosure.

## 3. Contract, breaking change, labels and plan card line

### Types (`lib/api/types.ts`)

- `member_roles` joins `EVENT_MODULE_KEYS`. Add its icon and metadata in `lib/planModules.tsx`.
- `/api/config`: `memberRolesByEventType: Record<string, MemberRoleCatalogDto[]>`; `memberCustomRelationshipRoleMaxLength` is now 40 (value comes from the server, no FE constant).
- Admin DTOs: `MemberRoleCatalogDto`, `MemberRoleCatalogRequestDto`, `MemberRoleCatalogPatchDto` as in guide §9.
- The picker, `AuthorDto` and moderation types are added in B and C.

### Breaking change (guide §7)

- Remove `relationshipRole` and `customRelationshipRole` from `EventMemberRequestDto` and `EventMemberPatchDto`.
- Remove them from the demo mock handlers that read them from request bodies (`lib/demo/mockHandlers.ts`). Demo fixtures keep them on member responses, using catalog keys.
- `EventMemberResponseDto` keeps both: `relationshipRole` is a catalog `roleKey`, `customRelationshipRole` is free text. Both are null when the module is off.

### Role label helper (`lib/memberRoles.ts`)

`memberRoleLabel(roleKey, customRole, eventTypeKey, catalog, locale)`:

- custom text → the text, as plain text
- catalog key → `label[locale]`, fallback `label.en`, with the emoji if present
- unknown key, or both null → null (render nothing)

Retired roles still resolve (they're in the config list).

### Home cards

`components/home/EventsQuickRow.tsx` and `components/home/HomeNextEventCard.tsx` use the helper instead of printing `relationshipRole` as is.

### Module name

`Modules.member_roles` in `messages/en.json` and `messages/el.json`:

- en: name "Member roles", description "Guests pick a role, like best man, shown next to their name."
- el: name "Ρόλοι καλεσμένων", description "Οι καλεσμένοι διαλέγουν ρόλο, όπως κουμπάρος, που φαίνεται δίπλα στο όνομά τους."

### Plan card line

A `member_roles` case in `moduleFeatureLabel` (`lib/landingPricing.ts`):

- count = non-retired roles in `memberRolesByEventType[plan.eventTypeKey]`
- custom = `plan.moduleConfigs.member_roles.allowCustom === true`

| Count | Custom | English | Greek |
|---|---|---|---|
| 1 | off | 1 member role | 1 ρόλος καλεσμένων |
| N | off | N member roles | N ρόλοι καλεσμένων |
| N | on | N member roles + your own | N ρόλοι καλεσμένων + δικός σας |
| 0 | on | Custom member roles | Δικοί σας ρόλοι καλεσμένων |
| 0 | off | line hidden | line hidden |

- Copy uses ICU plurals in `LandingPage.pricing`, exposed through `LandingPlanCopy` (`memberRoles(count, custom)`).
- The catalog reaches `buildLandingPlan` through its callers, `hooks/useLandingPricingPlans.ts` and `hooks/useMarketingPlanOptions.ts`, from `useAppConfig`.
- A plan without `moduleConfigs` falls back to the module name, as other modules already do.
- The tier rollup compares labels, so a higher tier that turns on custom roles lists the line instead of folding it into "Everything in …".

## 4. Testing

- `lib/landingPricing.test.ts`: the five card rows, the missing `moduleConfigs` fallback, and the rollup case.
- `lib/planModuleConfig.test.ts`: the `allowCustom` field, Unlimited dropping a count key, untouched switches not writing a key.
- `lib/memberRoles.test.ts`: label resolution (locale, fallback, emoji, custom, unknown, retired), the reorder plan with and without duplicate `sortOrder`, create and patch payloads (`clearMaxHolders`, `emoji: ""`), key validation.
- Component tests for the drawer's retire confirmation and the error mapping (409, 404).
- TypeScript and lint pass. Visual check of the admin screen on desktop (primary) and mobile.
