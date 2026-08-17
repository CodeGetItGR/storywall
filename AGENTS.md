# Agent Instructions

## Structure

- Keep route `page.tsx` and `PageClient.tsx` files thin. They should compose hooks and components, not own full feature trees.
- Put feature UI in small files under `components/<domain>/`. Split loading, empty, content, rows, sheets, and forms when they can be understood independently.
- Put reusable hooks in `hooks/`. Hooks should gather data and expose plain values/actions to components.
- Put utility functions, formatting helpers, route helpers, and domain logic in `lib/`, preferably under an existing domain file before creating a new one.
- Avoid local React context in a page unless multiple distant descendants truly need shared mutable state. Prefer props for local page composition.
- Do not keep stale guard variables that can hide valid UI. Empty, loading, and error states should be explicit and tied to the data they actually depend on.
- Prefer `React.SubmitEvent` for form submit handlers instead of `FormEvent`.

## Reuse

- Reuse existing components and utilities before creating new abstractions.
- Create a reusable component only when it removes real duplication or names a clear UI concept.
- Keep components focused: data fetching belongs in hooks or route/client containers; presentational components receive props.

## Visual Hierarchy

- For UI work, use the appropriate UI/UX skill before implementation. Choose the skill that matches the task, such as design-system for existing product surfaces, design-critique for review, UX copy for visible wording, accessibility-review for a11y checks, or user-research/research-synthesis when product behavior needs evidence.
- Give every meaningful page section a clear boundary and purpose. Use spacing, headings, grouping, background tone, layout changes, or concise section intros deliberately so users can tell where one task area ends and the next begins.
- Do not create separation by sprinkling borders everywhere. Use borders sparingly for true tables, dividers inside a compact group, or controls that need containment; avoid stacking multiple bordered blocks when whitespace, hierarchy, or a single grouped surface would be clearer.
- Event host and member-facing UI should be mobile-first: design the small-screen flow first, then scale up to desktop without adding clutter. Prioritize thumb-friendly actions, compact summaries, and clear progressive disclosure.
- Platform admin UI should be desktop-first because it is dense operational software. Optimize for scanning, comparison, bulk work, and stable table/form layouts on desktop, while keeping mobile decent enough for review and simple actions.
- After UI changes, visually confirm the result whenever possible. Run the relevant screen locally and inspect it with a screenshot or browser view at the primary breakpoint for that audience; also check the opposite breakpoint for obvious overlap, cramped text, or broken section separation.
- Use one consistent back-navigation pattern within a product area. Prefer the same icon-plus-label link near the top of pages instead of mixing text-only, icon-only, and combined variants.
- Prefer compact, direct layouts for quick overviews and navigation.
- Do not default to card surfaces for simple summaries, lists, or actions; use cards only when they clearly improve grouping, emphasis, or separation.
- Keep overview blocks lightweight and scannable, with minimal text and no decorative chrome unless it serves a real purpose.
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
