# Admin plan coverage UI — Phase 2 plan

Design for the platform-admin screen that answers *"what does this plan actually give a host,
for this event type?"* — deferred until backend **Phase 2** lands.

This doc exists because the UI we want is blocked on backend work that is already on the roadmap.
Phase 1 shipped a deliberately simpler screen that upgrades into this one in place. Pick this up
when Phase 2 is available; don't rebuild the plan editor from scratch.

## 1. Background: three relationships, not one

These are routinely confused. They are genuinely different data with different owners.

| Relationship | Storage | Endpoint | Question it answers |
|---|---|---|---|
| Plan → modules | `PlanTierResponseDto.moduleKeys` (flat list) | `PUT /api/admin/plan-tiers/{id}/modules` | "What does BASIC *sell*?" |
| Plan → event types | `PlanTierResponseDto.eventTypeKeys` (flat list) | `PUT /api/admin/plan-tiers/{id}/event-types` | "Where is BASIC *sold*?" |
| Event type → modules | `EventTypeModuleResponseDto` (`applicability` + `defaultConfig`) | `GET /api/event-types/{key}/modules` | "Does a Wedding even *have* a schedule, and how many sections?" |

`eventTypeKeys: []` means **all** event types, not none. It is an empty array, never `null`.

At runtime the server ANDs these together. From
`docs/integration guides/event-type-feature-toggles-quotas-fe-integration.md` §1:

> A module can be `isEnabled: true` on the event and still `isAvailable: false` because the plan
> doesn't include it or the platform kill switch is off.

So today's effective resolution is three layers:

```
isAvailable = platform module enabled
            AND plan includes moduleKey
            AND event type applicability != UNSUPPORTED
```

Caps (e.g. `schedule`'s `maxSections`) come from the event type's `defaultConfig`, read live — §3 of
that same doc is explicit that the value is *not* frozen onto the event at creation.

## 2. What the backend cannot express today

Two hard limits, both of which block the UI we actually want:

1. **Caps cannot vary by plan.** `defaultConfig.maxSections` lives on the event type, globally.
   BASIC and PRO give a wedding the *same* 10 schedule sections. There is no way to upsell a bigger
   schedule by tier. The only plan-differentiated quotas today are `maxMembers` and `storageBytes`,
   and both ignore event type entirely.
2. **Module inclusion cannot vary by event type within a plan.** `moduleKeys` is one flat list.
   BASIC cannot include `schedule` for Weddings but not Birthdays.

## 3. This is already scoped as Phase 2

Not speculative. `docs/integration guides/plan-tiers-by-event-type-fe-integration.md` describes
itself as Phase 1 of the backend's `event-type-driven-creation-flow-plan.md` (a backend-repo doc,
not present in this checkout) and states what remains:

> module composition, per-type defaults, and the buy-extra-modules flow are still ahead

> Modules are **not** filtered or composed by event type yet — every event still gets the same seed
> regardless of type (Phase 2 of the plan doc).

## 4. What Phase 1 shipped (the current state)

Relevant to know so this isn't rebuilt:

- The old plan×module and plan×event-type **checkbox matrices were deleted** — `PlanModulesPanel`,
  `PlanAvailabilityPanel`, `PlanMatrixParts`, `usePlanModules`, `usePlanAvailability`, plus their
  sidebar nav entries and translations. They were rejected on UX grounds and are not coming back.
- Plan module/event-type editing moved **into the plan editor** as a single `Coverage` tab:
  - *Modules in this plan* — one `AdminSwitch` toggle row per module, every module always visible.
  - *Event types* — `All event types` / `Selected event types` segmented control, plus a toggle row
    per event type when restricted.
- Both drafts save through the **plan editor's single footer Save**, folded into the existing
  confirm summary. There is no separate per-section save button.
- `components/admin/AdminSwitch.tsx` is the controlled toggle-row atom (button with `role="switch"`,
  deliberately *not* a checkbox, so it contributes nothing to the surrounding form's `FormData`).

Phase 1 is honest about the data: it never implies a plan can vary modules per event type.

## 5. The Phase 2 design

### 5.1 Nested navigation instead of the drawer

The plan editor moves out of the right-side slide-over and becomes a **full-content detail view**
that replaces the plan list, with a back link and the tabs retained. The drawer is too narrow for
the per-event-type layout below.

> Note: this contradicts the "editing happens in a right-side drawer" rule in `CLAUDE.md`. That was
> an explicit product-owner decision. Update `CLAUDE.md` when this ships so it isn't re-litigated.

### 5.2 The Coverage tab becomes event-type-first

One tab, no separate modules tab:

- Each event type is a row with an on/off switch — on means the plan is sold for that type.
- An enabled row **expands** into the roomy per-event-type layout: every module listed with its
  state for *this plan × this event type*, including caps.
- Plan-wide defaults still exist as a section, but per-event-type rows may override them.

Each expanded card carries genuinely distinct content, which is what justifies the space. Under
Phase 1 data every card would render the identical flat module list, which is why this is deferred
rather than built now.

### 5.3 Sparse overrides with an explicit "Inherits" state

`plans × event types × modules` is a large combinatorial space. It only stays manageable if the
admin sees **deviations, not cells**:

- Every module row in an expanded event type defaults to `Inherits` (from the plan-wide set and the
  event type's applicability), rendered muted.
- Only an explicit override becomes `Included` / `Excluded` with a cap value, rendered prominently
  with a `Reset to inherited` affordance.
- The plan list can then show a small "N overrides" marker instead of a wall of state.

This is how Stripe entitlements and LaunchDarkly segment overrides handle the same shape. Storing
overrides sparsely also keeps the migration trivial — existing plans start with zero overrides and
behave exactly as they do today.

## 6. Backend changes required

Raise with whoever owns the Spring service — **this is a frontend-only checkout, there is no
backend repo alongside it.**

1. **Per-(plan, event type, module) overrides.** Sparse. Something like
   `{ planTierId, eventTypeKey, moduleKey, included: boolean | null, config: object | null }`,
   where `null` means inherit. Needs admin read + replace endpoints scoped to one plan.
2. **Per-(plan, event type) config overrides for caps**, so `maxSections` can differ by tier. This
   is the business unlock; item 1 alone doesn't deliver it.
3. **Resolution order must be specified and documented**, because it grows to four layers:
   platform kill switch → plan (+ overrides) → event type default → per-event `EventModule`. Every
   write-time gate has to apply the same order; the toggles doc is emphatic that the server
   re-checks everything and the client is never trusted.
4. **An admin endpoint for event-type↔module rows.** `lib/api/endpoints.ts` today has only the
   public `GET /api/event-types/{key}/modules` and the event-type *registry* at
   `/api/admin/platform-event-types`. There is no admin endpoint for editing `applicability` /
   `defaultConfig`. Confirm whether one exists before building against an assumed path.

## 7. Upgrade path — what actually changes

Phase 1 was built so this is additive, not a rewrite:

| File | Phase 2 change |
|---|---|
| `components/admin/PlanCatalogPanel.tsx` | Swap `AdminDrawer` for nested full-content routing |
| `components/admin/PlanEditorCoverageTab.tsx` | Event-type rows gain expansion; plan-wide module list becomes the defaults section |
| `components/admin/AdminSwitch.tsx` | Unchanged — still the row atom |
| `hooks/usePlanEditorState.ts` | Add override draft state beside `moduleKeysDraft` / `eventTypeKeysDraft` |
| `hooks/usePlanEditorCard.ts` | Add the override mutation to the existing footer save sequence |
| `components/admin/PlanSaveSummary.tsx` | Render override additions/removals alongside field changes |

The footer-save plumbing, the confirm summary, and the toggle-row atom all survive as-is.

## 8. Rejected alternatives

- **Checkbox matrix (plan × module, plan × event type).** The original implementation. Rejected:
  unreadable, doesn't scale, no room for per-pair config. Deleted in Phase 1.
- **Chip multi-select combobox** (Base UI `Combobox` with removable chips). Built and rejected:
  removing a chip hid the item behind a popup with no visible way back, the unselected pool was
  undiscoverable, and it left dirty state stranded outside the form's footer. Toggle rows fixed all
  three by keeping every option permanently visible.
- **Event-type cards inside the plan editor, before Phase 2.** Rejected on data-integrity grounds:
  with a flat `moduleKeys`, every card renders the same module set and editing one silently edits
  all of them. It is also structurally the rejected matrix again — plan × event type × module is a
  three-axis grid, merely paginated one card at a time.

## 9. Open questions

- Should a module override be able to *add* a module the plan doesn't otherwise sell, or only
  subtract? Additive overrides blur "what the plan sells" and complicate billing/upsell copy.
- Do per-event-type overrides interact with `MODULE_UNLOCK` paid add-ons? An add-on that unlocks a
  module the event type marks `UNSUPPORTED` must not be sellable.
- Does the host-facing plan comparison UI need to become event-type aware at the same time? If
  BASIC gives different features per type, a single static feature list on the pricing page is
  wrong.
