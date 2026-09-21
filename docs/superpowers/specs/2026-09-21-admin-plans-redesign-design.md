# Admin Plans redesign — design

Date: 2026-09-21

## Problem

The admin plans area is split across four sibling nav items (`Event plans`, `Modules`, `Event types`, `Assignments`) that are really one domain: event type → plans for that type → modules per plan → per-module config. Admins have to join them mentally. The plans table is a flat list across all event types, the editor drawer hides settings behind six tabs, and two capabilities the backend already exposes have no UI at all:

1. **Per-plan module config** — `GET/PATCH /api/admin/plan-tiers/{planTierId}/modules/{moduleKey}` (`defaultConfig`, e.g. `schedule.maxSections`, `gallery.qrUploadEnabled`). This is the runtime source of truth per `plan-tiers-by-event-type-fe-integration.md` §6 and `event-lifecycle-locks-and-event-types-fe-integration.md` §3. The FE only has `PUT …/modules` for `moduleKeys`.
2. **Event-type module matrix** — `GET/PATCH /api/admin/event-types/{eventTypeKey}/modules/{moduleKey}` (`applicability: UNSUPPORTED | DEFAULT_OFF | DEFAULT_ON`, seed `defaultConfig`, `sortOrder`). `EventTypeEditDrawer` edits only `isEnabled` + `sortOrder`.

Also: `sharedGroupKey` is shown only as a text label; the four status stat tiles restate the status filter.

## Decisions (agreed)

- One Catalog nav item **Plans**, grouped by event type. `Modules` and `Event types` nav items fold into it as a Settings group.
- Per-plan module config is edited in a **comparison grid** per event type (rows = modules, columns = plans), not in the plan drawer.
- Plan editor drawer becomes a **single scrollable form with section anchors**.
- **Assignments stays untouched** under Operations. Moving it onto a looked-up event is deferred until an admin event lookup endpoint exists.
- Module config uses **typed fields for known keys + raw JSON fallback** for unknown keys.
- **No write happens without a confirmation modal.** Every mutation in the grid, the pills, and the drawer goes through `ConfirmActionModal` with a before → after summary.
- Visuals follow the Paid Services Console reference (slate surfaces, mono for codes/prices/config tokens, coral only for the primary action and active rail item, semantic status set for pills).

## 1. Structure and navigation

`Plans` opens a two-column layout inside the existing admin shell (`AdminShellNav` stays as the outer sidebar).

**Inner left rail (~200px):**
- One entry per platform event type, ordered by `sortOrder`: name + count of live plans. Disabled types render muted but remain selectable.
- A search input at the top filters both event types and plans by name/code.
- Below a divider, a **Settings** group: `Modules`, `Event types`.

**Right pane for a selected event type:**
1. **Header** — type name, enabled/disabled pill, `Add plan` (primary), `Duplicate from…`.
2. **Plans table** for that type only. Columns: Plan (name, `code` in mono, Default pill), Price (mono), Storage, Members, Auto-delete, Status pill, Shared group chip, row actions (Edit, Duplicate). Status filter chips (`All / Live / Hidden / Archived`) above the table carry counts; the stat tile grid is removed. The shared-group chip lists the sibling event types; clicking a sibling switches the rail to that type and highlights the sibling plan.
3. **Module grid** (section 2).

**Right pane for Settings:** the existing `ModuleRegistryPanel`/`ModuleEditDrawer` and `EventTypeRegistryPanel`/`EventTypeEditDrawer`, restyled to the console table, functionally unchanged.

**Routing:** hash scheme extends the current one:
- `#plans` → first enabled event type
- `#plans/{EVENT_TYPE_KEY}`
- `#plans/settings/modules`, `#plans/settings/event-types`
- Redirects: `#event-plans` → `#plans`, `#modules` → `#plans/settings/modules`, `#event-types` → `#plans/settings/event-types`.

`AdminTab` loses `eventPlans`, `modules`, `eventTypes` and gains `plans`. `TAB_GROUP` puts `plans` under `catalog`.

**Create / duplicate:** `PlanCreateForm` keeps its stepper. Opened from a type's header, the event type is preselected and locked. Duplicate preselects target types that have no plan in the source's shared group yet.

**Removed:** stat tiles, the shared page eyebrow/title/subtitle for this section (it supplies its own header, like Paid Services), `PlanCatalogPanel.tsx`, `PlanEditorCoverageTab.tsx`.

## 2. Module grid

Rendered under the plans table with heading **Modules** and a one-line count ("8 supported · 2 unsupported").

**Layout:** a table. Rows = every registry module by `sortOrder`. Columns = the type's plans by `sortOrder`, excluding hidden/archived; a `Show hidden plans` toggle includes them. First column is sticky and holds the module name and a segmented **applicability pill** (`Unsupported / Off / On`).

**Cell content:**
- Module `UNSUPPORTED` for the type → row muted, cells empty.
- Supported and included in the plan → check mark + config tokens in mono (`maxSections 3`, `qrUpload on`).
- Supported, not included, and a `MODULE_UNLOCK` paid service covers this plan (`planTierIds` empty or containing the plan id) → unlock price in mono (`+€19 once`).
- Supported, not included, no unlock → dash.

**Applicability pill:** selecting a value does not write. It opens `ConfirmActionModal` stating `Module: before → after for {type}`; for `Unsupported` the body adds one line on the consequence (the module is removed from every event of that type). Cancel reverts the pill. Confirm sends `PATCH /api/admin/event-types/{type}/modules/{module}` with `{ applicability }`.

**Cell popover** (anchored to the cell, not a drawer):
- `Included in plan` switch (single unambiguous flag).
- Config fields: known keys from `lib/planModuleConfig.ts` render typed inputs; all other keys render in one JSON textarea, validated as an object on Save.
- `Reset to type default` fills the fields from the type's seed `defaultConfig`; it does not save.
- `Cancel` discards. `Save` opens `ConfirmActionModal` listing each change (`Included: yes → no`, `maxSections: 3 → 5`). Confirm sends `PATCH /api/admin/plan-tiers/{planId}/modules/{moduleKey}` with `{ defaultConfig }` when config changed, and `PUT /api/admin/plan-tiers/{planId}/modules` with the updated `moduleKeys` when inclusion changed. Both are awaited; on failure the popover stays open with the error and nothing is retried automatically.

**Known-key registry (initial):**

| moduleKey | key | type | constraint |
|---|---|---|---|
| `schedule` | `maxSections` | number | integer ≥ 1 |
| `gallery` | `qrUploadEnabled` | boolean | — |

**Data:**
- `GET /api/admin/event-types/{type}/modules` → applicability + seed config per module (includes `UNSUPPORTED` rows).
- `GET /api/admin/plan-tiers/{planId}/modules` per plan column via `useQueries`.
- Paid services (`MODULE_UNLOCK`) from the existing `useAdminPaidServices`.
- After a successful write: invalidate the affected query, the plan-tiers list, and `appConfigKeys.all`.

**States:** skeleton rows while loading; a per-column error cell if one plan's config fetch fails (rest of the grid stays usable); empty state "No plans yet" with `Add plan` when the type has no plans.

## 3. Plan editor drawer

Same `AdminDrawer`. Tabs replaced by one scrollable form with a sticky anchor row under the title: `Details · Availability · Limits · Pricing · Add-ons · Danger`. Active anchor follows scroll (`useScrollSpy`). Sections are separated by whitespace and headings, not bordered blocks.

- **Header:** name, `code` (mono), status pills (Default, Archived). `Make default` moves out of the header.
- **Details:** name, description, sort order; read-only tokens for code, event type, shared group with links to sibling plans (each link switches the rail and opens that plan).
- **Availability:** `VisibilitySegmentedControl` (Live / Hidden / Archived) and the `Make default` action (with its existing confirmation).
- **Limits:** storage + unit, max members, auto-delete months.
- **Pricing:** price, currency, billing period; **Promotion** fields grouped beneath (percent, label, starts/ends).
- **Modules:** one line — "6 of 8 modules included" — with a link that closes the drawer and scrolls the grid to that plan's column. No module editing in the drawer.
- **Add-ons:** current unlock list/composer, unchanged behavior.
- **Danger:** delete, with one line noting that archiving lives under Availability.

Footer unchanged: change count, `Save` → `ConfirmActionModal` with `PlanSaveSummary`, Cancel. Delete keeps its confirmation.

## 4. Code structure

**Components** — `components/admin/plans/`:
`PlansSection.tsx` (rail + pane shell), `PlansRail.tsx`, `PlansRailSearch.tsx`, `EventTypePlansHeader.tsx`, `EventTypePlansTable.tsx`, `PlanRow.tsx`, `PlanSharedGroupChip.tsx`, `PlanStatusFilter.tsx`, `PlanModuleGrid.tsx`, `PlanModuleGridRow.tsx`, `PlanModuleGridCell.tsx`, `ModuleApplicabilityPill.tsx`, `PlanModuleConfigPopover.tsx`, `PlanModuleConfigFields.tsx`, `PlanModuleConfigJsonField.tsx`, `PlansSettingsModules.tsx`, `PlansSettingsEventTypes.tsx`, plus loading/empty/error pieces split out where they can stand alone.

**Editor** — `PlanEditorCard` keeps its hook. `PlanEditor*Tab.tsx` become `PlanEditor*Section.tsx`; add `PlanEditorAnchors.tsx` and `PlanEditorModulesSummary.tsx`. Delete `PlanEditorCoverageTab.tsx`. `AdminTabs.tsx` remains only if another consumer exists; otherwise delete.

**Hooks** — `hooks/usePlansSection.ts` (selected type, search, status filter, hash sync), `hooks/useEventTypeModuleMatrix.ts` (GET/PATCH admin matrix, exported query keys), `hooks/usePlanModuleConfigs.ts` (`useQueries` per plan + PATCH, exported keys), `hooks/usePlanModuleGrid.ts` (joins matrix + configs + unlocks into rows/cells), `hooks/usePlanModuleCellDraft.ts` (popover draft, validation, change summary, pending confirmation), `hooks/useScrollSpy.ts`. `usePlanEditorState` drops `tab`/`tabs`.

**Lib** — `lib/planModuleConfig.ts` (known-key registry, JSON parse/validate, `configChangeSummary`), `lib/adminPlansRouting.ts` (hash ⇄ `{ view: 'eventType' | 'settings', key }` + legacy redirects), `lib/api/endpoints.ts` (`admin.eventTypes.modules(type)`, `admin.eventTypes.module(type, moduleKey)`, `admin.planTiers.moduleConfig(planId, moduleKey)`), `lib/api/types.ts` (`EventTypeModuleAdminDto`, `EventTypeModulePatchDto`, `PlanTierModuleConfigDto`, `PlanTierModuleConfigPatchDto`).

**Navigation** — `AdminNavigationContext`: rename `eventPlans` → `plans`; remove `modules`, `eventTypes`; hash map + redirects as in §1; `AdminShellNav.TAB_GROUP` updated. `AdminConsole` renders `<PlansSection />` for `plans` without the shared page head.

**Translations** — new keys under `AdminPage.plans.*` in `messages/en.json` and `messages/el.json`; remove keys only used by deleted components and nav items.

**Tests** — `lib/planModuleConfig.test.ts` (registry, JSON validation, change summary), `lib/adminPlansRouting.test.ts` (parse/format/redirects), `hooks/usePlanModuleGrid.test.tsx` (join logic incl. unsupported rows and unlock pricing).

## Out of scope

- Assignments page (deferred; needs admin event lookup).
- New backend endpoints. Everything here uses endpoints documented in the integration guides.
- Account-scope plans (already disabled in the console).

## Verification

TypeScript + lint clean; unit tests above pass; visual check of `#plans/WEDDING` at desktop (primary) and a narrow width for overlap or broken section separation; confirm every write path shows a confirmation modal before the network request.
