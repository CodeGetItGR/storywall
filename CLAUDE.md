# Agent Instructions

## Workflow

- Never dispatch parallel subagents (the Agent tool) unless the user has explicitly given permission for that specific task. Parallel agents burn through the 5-hour session limit fast. Do research and multi-file audits directly (Read/Grep/Glob/Bash) instead, even if it takes more turns. A single subagent for a narrow, well-scoped sub-task is fine; spawning several at once is not, absent explicit permission.

## Structure

- Keep route `page.tsx` and `PageClient.tsx` files thin. They should compose hooks and components, not own full feature trees.
- Put feature UI in small files under `components/<domain>/`. Split loading, empty, content, rows, sheets, and forms when they can be understood independently.
- Put reusable hooks in `hooks/`. Hooks should gather data and expose plain values/actions to components.
- Put utility functions, formatting helpers, route helpers, and domain logic in `lib/`, preferably under an existing domain file before creating a new one.
- Avoid local React context in a page unless multiple distant descendants truly need shared mutable state. Prefer props for local page composition.
- When a UI component is becoming large because it owns too much complex state or orchestration, consider extracting a focused hook and, only if multiple distant descendants truly need the same mutable state, a small context provider around that feature area.
- Prefer hooks aggressively and early. Treat any non-trivial state, derived values, handlers, data fetching, mutation orchestration, or conditional business logic inside a component as a smell that should usually move into a hook or `lib/` helper. Keep components as declarative render shells with only trivial wiring and JSX.
- Never leave substantial plain logic inside a component when it can be expressed in a hook. Smaller, more modular hooks are always preferred over one large component body.
- Do not keep stale guard variables that can hide valid UI. Empty, loading, and error states should be explicit and tied to the data they actually depend on.
- Prefer `React.SubmitEvent` for form submit handlers instead of `FormEvent`.

## Reuse

- Reuse existing components and utilities before creating new abstractions.
- Create a reusable component only when it removes real duplication or names a clear UI concept.
- Keep components focused: data fetching belongs in hooks or route/client containers; presentational components receive props.

## Visual Hierarchy

- For UI work, use the appropriate UI/UX skill before implementation. Choose the skill that matches the task, such as design-system for existing product surfaces, design-critique for review, UX copy for visible wording, accessibility-review for a11y checks, or user-research/research-synthesis when product behavior needs evidence.
- For UI work, add a short JSX comment immediately above every meaningful visual section boundary in the component tree, such as `Header`, `Tabs`, `Details`, `Limits`, `Pricing`, `Modules`, `Danger`, or `Footer`. Treat this as a mandatory step when creating or refactoring UI.
- Give every meaningful page section a clear boundary and purpose. Use spacing, headings, grouping, background tone, layout changes, or concise section intros deliberately so users can tell where one task area ends and the next begins.
- Do not create separation by sprinkling borders everywhere. Use borders sparingly for true tables, dividers inside a compact group, or controls that need containment; avoid stacking multiple bordered blocks when whitespace, hierarchy, or a single grouped surface would be clearer.
- Event host and member-facing UI should be mobile-first: design the small-screen flow first, then scale up to desktop without adding clutter. Prioritize thumb-friendly actions, compact summaries, and clear progressive disclosure.
- Platform admin UI should be desktop-first because it is dense operational software. Optimize for scanning, comparison, bulk work, and stable table/form layouts on desktop, while keeping mobile decent enough for review and simple actions.
- **The platform admin console is migrating to a dedicated admin design system, deliberately distinct from the host/guest-facing product skin.** Reference implementation: the "Paid Services Console" concept (`https://claude.ai/code/artifact/f945b582-4866-4f1b-b2fc-301fec161782` — reachable by the account that owns it; export/screenshot it into the repo if the team needs a durable copy). Every new or rebuilt admin panel must follow this direction, not the old top-tabs-plus-modal pattern:
    - **Shell:** a persistent left sidebar grouped by domain (e.g. Overview / Catalog / Operations), not top-level pill tabs. The operator should always see where they are and be able to jump directly to any section.
    - **Lists:** real data tables — status, kind, and cadence encoded as compact badges/pills for scanning, not prose inside stacked cards or always-open forms.
    - **Editing:** a right-side slide-over drawer scoped to one record, not a full-screen modal. Browsing and editing stay visually distinct modes (this is already required above; the drawer is the concrete admin implementation of it).
    - **No bare switches for multi-meaning or multi-boolean entity state.** If a field combines more than one underlying boolean (e.g. `isPublic` + `isAssignable`), collapse it into one labeled segmented control with a one-line caption explaining what each option does, instead of exposing the raw booleans as separate toggles. A plain switch is only acceptable for a single, unambiguous, reversible flag with an obvious label.
    - **Palette:** cool neutral (slate) surfaces and ink — not the host-facing warm coral/cream palette. Brand coral is reserved for primary actions and the active-nav indicator only, as a small accent. Status uses its own semantic set (success/warn/neutral/danger) that never doubles as the accent color.
    - **Type:** reserve a monospace face for codes, ids, prices, and other technical tokens (table cells, badges, read-only fields); keep it out of headings and prose — it is the console's one deliberate typographic distinction from the consumer app.
    - Pull exact token values and component patterns (drawer, segmented control, table, status pill) from the reference artifact's CSS rather than inventing new ones per panel.
- After UI changes, visually confirm the result whenever possible. Run the relevant screen locally and inspect it with a screenshot or browser view at the primary breakpoint for that audience; also check the opposite breakpoint for obvious overlap, cramped text, or broken section separation.
- Use one consistent back-navigation pattern within a product area. Prefer the same icon-plus-label link near the top of pages instead of mixing text-only, icon-only, and combined variants.
- Prefer compact, direct layouts for quick overviews and navigation.
- Do not default to card surfaces for simple summaries, lists, or actions; use cards only when they clearly improve grouping, emphasis, or separation.
- Keep overview blocks lightweight and scannable, with minimal text and no decorative chrome unless it serves a real purpose.
- Never show the same fact twice on one page. Every count, status, or value gets exactly one home. Before adding a stat tile, summary sentence, badge/pill, or section recap, check whether that value already appears elsewhere on the page and remove the duplicate instead of stacking another restatement of it.
- Do not follow a stat-tile grid with a prose sentence that just restates the same tiles in words (e.g. "3 invited · 1 attending" above tiles for invited/attending/pending/closed). Pick one format for a given set of numbers — tiles for scanning, or a single compact summary line — never both.
- Do not bolt a badge/pill row onto the bottom of a stat grid to cover the "remaining" breakdown values (e.g. "Maybe: 0", "Declined: 0" pills under tiles that already show attending/pending). Fold every breakdown value into the tile grid itself so the full picture lives in one place.
- A list/detail section further down the page must not reopen counts already shown in the page's header stats (e.g. an "RSVP" section repeating "0 attending" right under stat tiles that already say so). That section should show only its own content — the rows/list — not a re-summary of numbers visible above.
- Use a dedicated confirmation modal for destructive or difficult-to-undo actions instead of inline confirmation blocks. Keep the warning short, state the consequence plainly, and label the buttons with the actual action and the safe exit.
- Creation forms for catalog items and other repeatable records belong in a modal, popover, or focused sheet opened by a clear action. Do not place a full creation form inline above the list it creates.
- Editable collections must render as compact, read-only rows by default, using labels and formatted text instead of always-visible inputs. Open a modal, popover, or focused sheet to edit one selected item at a time.
- Never render one full edit form per item in a collection. Keep browsing and editing as distinct modes so long lists remain scannable.
- Destructive actions for an editable item should live in its focused edit flow and require confirmation when the action is difficult to undo.

## Cleanup

- When removing a route or feature, remove route constants, redirects, links, translations, and files that only existed for it.
- After refactors, search for stale references and run TypeScript plus lint.
- Always fix lint errors before handing work back. Do not leave a known lint error unresolved unless it is genuinely blocked, and call out that blocker clearly.

## Localization

- Always localize user-facing copy. Do not leave magic strings in JSX when the text is visible to users.
- Prefer translation keys, shared copy helpers, or localized message maps for any visible label, error, helper text, tooltip, empty state, or CTA.
- Write user-facing copy for a non-technical reader, not a developer. State the fact or the action plainly in one short sentence; do not explain the underlying mechanism, justify why the system behaves that way, or spell out implications the user did not ask about. If a sentence can be cut without losing the actionable meaning, cut it.
