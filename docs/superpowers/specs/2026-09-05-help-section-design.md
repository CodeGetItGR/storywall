# Host setup guide → Help section — design

Replaces the floating "?" host onboarding wizard (`HostOnboardingWizard`) with a dedicated,
always-reachable "Help" section on the host management page, presented as a vertical scrolling
narrative rather than a modal stepper. Adds a shortcut to it from the MobileTabBar gear menu.

## Goals

- Remove the floating "?" launcher entirely — it's buggy and intrusive.
- Keep the guide's actual content (welcome, dashboard tour, venue, invite, tools, wrap-up)
  unchanged, just restructured into a full-page narrative instead of a modal, one-step-at-a-time
  stepper.
- Make the guide fully passive: no auto-open, no "missing setup" detection, no post-checkout
  spotlight bubble. It's a page the host visits when they want it, nothing more.
- Reachable two ways: the manage page's section nav, and a shortcut in the MobileTabBar gear menu.

## Non-goals

- No changes to the guide's copy/content or which links it surfaces.
- No progress tracking, completion state, or dismissal — none of that carries over.
- No changes to the checkout flow itself beyond removing the now-dead prompt it used to set.

## What gets removed

- `components/onboarding/HostOnboardingWizard.tsx` and its render in
  [components/layout/AppShell.tsx](../../../components/layout/AppShell.tsx) — the floating
  button, the modal-sheet stepper, and the post-checkout spotlight bubble all go together.
- `hooks/useOnboardingProgress.ts` — per-event localStorage progress/dismiss/complete tracking.
  Nothing replaces it; a static page has no progress to track.
- `lib/onboardingSteps.ts` — its step-index bookkeeping is no longer needed. The one piece of
  logic worth keeping (whether the event type has a venue/secondary-session convention, so the
  venue block should show) moves inline into the new Help tab.
- The `rememberCheckoutSetupPrompt(...)` call in
  `app/(app)/(event)/events/[eventId]/checkout/success/page.tsx`, and the now-unused
  `rememberCheckoutSetupPrompt` / `consumeCheckoutSetupPrompt` pair in
  [lib/billing.ts](../../../lib/billing.ts).
- The stepper-specific props/semantics on the reused step components (`onNavigate` that closes
  the modal, `onDone` that advances the stepper, back/skip/continue footer buttons) — see below.

## What gets added

### `help` as a manage section

[lib/manageSections.ts](../../../lib/manageSections.ts) gets a new `ManageSection` value, `help`,
placed in the `event` group after `settings`:

```ts
{ group: 'event', sections: ['overview', 'settings', 'help', 'danger'] }
```

`sectionIcons.help` (in
[components/manage/ManageSectionNav.tsx](../../../components/manage/ManageSectionNav.tsx)) →
`HelpCircle`, matching the icon the old launcher used.

This automatically gets it: a nav row in the desktop sidebar and mobile section sheet, a
`?tab=help` deep link via the existing `parseManageSection`, and — because the draft-event path in
`ManageScreen` renders only `overview` and never mounts `ManageSectionNav` at all — it's
automatically hidden for `DRAFT` events, no extra gating needed on the manage-page side.

### `HelpTab.tsx`

New file, `app/(app)/(event)/events/[eventId]/manage/HelpTab.tsx`, wired into
[components/manage/ManageScreen.tsx](../../../components/manage/ManageScreen.tsx) next to the
other tabs (`{section === 'help' && <HelpTab ... />}`). Props: `eventId`, `eventType`,
`eventModules`, `sessions` — the same data the old wizard read off `activeEvent` — so it can
compute the venue block's visibility/state and the tools block's enabled-module filter itself.

Renders one vertical stack of narrative blocks, reusing the existing `HostOnboarding` translation
keys as-is:

1. **Welcome** — `welcome.title` / `welcome.body` (uses the event title).
2. **Dashboard** — `dashboard.title` / `dashboard.body` + a small link grid to Settings and
   Schedule (same two destinations as today).
3. **Venue** — only rendered when the event type has a secondary/venue session convention (the
   condition `getOnboardingStepIds` used to gate on). Shows `venue.readyTitle`/`venue.readyBody`
   or `venue.askTitle`/`venue.askBody` depending on whether a venue session already exists, with
   an "Add venue" / "Edit venue" link. No "Continue" skip button — there's nothing to skip past.
4. **Invite** — `invite.title` / `invite.body` + a link to the invitations/QR section.
5. **Tools** — `tools.title` / `tools.body` + a link grid of the event's enabled tool modules
   (same filtering `OnboardingToolsStep` does today).
6. **Done** — `done.title` / `done.body` as a plain closing block, no button.

All links are normal `<Link>` navigation — no `onNavigate`/`onLinkClick` side effects, since
there's no modal to dismiss. `OnboardingStepIcon` and the link-grid visual pattern from
`OnboardingLinksStep` are reused for each block's header/links, adapted to drop the
modal-closing callback prop.

The existing step components under `components/onboarding/steps/` get inlined/adapted into this
one file (or kept as small presentational pieces under `components/onboarding/` if that's
cleaner once written) rather than staying split across files built around stepper semantics that
no longer apply.

### Gear menu shortcut

[hooks/useToolsMenuItems.ts](../../../hooks/useToolsMenuItems.ts)'s `useHostMenuItems` gets a
second entry alongside `manage`:

```ts
{ key: 'help', href: routes.events.manage(activeEvent.id, { tab: 'help' }), icon: HelpCircle }
```

New translation keys `MobileTabBar.hostMenu.help.label` / `.description` (English: "Help" /
something short like "Setup guide and tips").

`useHostMenuItems` currently returns `manage` unconditionally regardless of draft status; `help`
must be excluded while the event is `DRAFT` (matching the manage-page section's own hiding). Since
the hook doesn't currently know about draft state, the simplest approach consistent with how
[components/layout/MobileTabBar.tsx](../../../components/layout/MobileTabBar.tsx) already filters
`toolItems` by `isDraft` is to filter `help` out of `hostItems` the same way, at the call site in
`MobileTabBar`, rather than threading draft-awareness into the hook itself.

Net effect in the gear menu for a non-draft event: **Dashboard, Help**, then the tool items
(Schedule, Gallery, Wishbook, Gifts, …) — one flat list, as today.

## Data flow / state

None. The Help tab is a pure render of data already available on `activeEvent` (via
`useEventRouteContext`, same as every other manage tab) — no new hooks, no client state beyond
what `ManageScreen` already threads through, no persistence.
