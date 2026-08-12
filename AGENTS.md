# Agent Instructions

## Structure

- Keep route `page.tsx` and `PageClient.tsx` files thin. They should compose hooks and components, not own full feature trees.
- Put feature UI in small files under `components/<domain>/`. Split loading, empty, content, rows, sheets, and forms when they can be understood independently.
- Put reusable hooks in `hooks/`. Hooks should gather data and expose plain values/actions to components.
- Put utility functions, formatting helpers, route helpers, and domain logic in `lib/`, preferably under an existing domain file before creating a new one.
- Avoid local React context in a page unless multiple distant descendants truly need shared mutable state. Prefer props for local page composition.
- Do not keep stale guard variables that can hide valid UI. Empty, loading, and error states should be explicit and tied to the data they actually depend on.

## Reuse

- Reuse existing components and utilities before creating new abstractions.
- Create a reusable component only when it removes real duplication or names a clear UI concept.
- Keep components focused: data fetching belongs in hooks or route/client containers; presentational components receive props.

## Cleanup

- When removing a route or feature, remove route constants, redirects, links, translations, and files that only existed for it.
- After refactors, search for stale references and run TypeScript plus lint.
