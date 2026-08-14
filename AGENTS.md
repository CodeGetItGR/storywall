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

- Prefer compact, direct layouts for quick overviews and navigation.
- Do not default to card surfaces for simple summaries, lists, or actions; use cards only when they clearly improve grouping, emphasis, or separation.
- Keep overview blocks lightweight and scannable, with minimal text and no decorative chrome unless it serves a real purpose.

## Cleanup

- When removing a route or feature, remove route constants, redirects, links, translations, and files that only existed for it.
- After refactors, search for stale references and run TypeScript plus lint.
- Always fix lint errors before handing work back. Do not leave a known lint error unresolved unless it is genuinely blocked, and call out that blocker clearly.

## Localization

- Always localize user-facing copy. Do not leave magic strings in JSX when the text is visible to users.
- Prefer translation keys, shared copy helpers, or localized message maps for any visible label, error, helper text, tooltip, empty state, or CTA.
