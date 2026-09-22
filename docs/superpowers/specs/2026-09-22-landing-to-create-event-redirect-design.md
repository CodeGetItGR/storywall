# Landing → create-event redirect through auth

Date: 2026-09-22

## Goal

A signed-out visitor who clicks a "create" call to action on the landing page should end up on the event creation form (`/events/new`) after signing in, without re-navigating. The mechanism that carries the destination through the auth wall must be generic: `/events/new` is only the value this feature puts in it, and future actions pass a different destination the same way.

## Current state

Most of the infrastructure already exists:

- `lib/auth/returnPath.ts` exports `AUTH_RETURN_PATH_PARAM = 'next'`, `getSafeReturnPath()` (same-origin, path-based, keeps query + hash) and `getPostAuthRedirectPath(role, next)`.
- `/login` and `/register` read `next`, forward it on their cross-links, and `/login` redirects to it after email/password and OAuth sign-in. OAuth is in-page (id token), so `next` survives.
- `proxy.ts` redirects signed-out requests for protected routes to `/login?next=<pathname+search>`.
- `routes.auth.login({ next, invite, email, passwordChanged })` and `routes.auth.register({ next, invite, email })` build auth URLs.

Gaps:

1. `/events/new` is explicitly excluded from the proxy's protected paths, and its client gate (`app/events/new/CreateEventBoundary.tsx`) redirects signed-out users to bare `/login`, dropping the destination.
2. Landing CTAs (`LandingHero`, `LandingFinalCta`) link to bare `/register`; the pricing section has no CTA at all.
3. A freshly registered email/password account has `emailVerified === false`, and `/events/new` bounces unverified accounts to `/home`, where `EmailVerificationBanner` explains it.

## Decisions

### Post-auth landing rules

| Flow | Lands on |
| --- | --- |
| Sign-in, `next` present and safe | `next` |
| Sign-in, no `next` | `/feed` (unchanged) |
| Register, no invite | `/home` (verification banner + Create Event action live there) |
| Register, with invite | `/feed` |
| Admin, any flow | `/admin` (unchanged) |

`next` is never consulted after registration. Register still forwards `next` to its "already have an account" link so a visitor who lands on `/register` can hop to `/login` and keep the destination.

### `next` contract

- `next` is a generic "return here after sign-in" path. Nothing in `returnPath.ts`, the auth pages, or the proxy knows about event creation.
- Destination-specific parameters ride inside `next` (e.g. `/events/new?step=plan`). `getSafeReturnPath` already preserves query and hash, so future preselection (`plan`, `type`) is added to `routes.events.new({...})` and read by `useCreateEventFormController` — no change to the auth layer.
- Parameters for the auth page itself (`invite`, `email`, future ones) are typed fields on `routes.auth.login` / `routes.auth.register`. Any new one must be forwarded on both pages' cross-links.

### Gate for `/events/new`

- The proxy protects `/events/new` like every other `/events/…` route. Signed-out visitors get a server-side redirect to `/login?next=/events/new[?step=…]` via the existing code path. The `/events/new` carve-out and its comment are removed.
- The client gate in `CreateEventBoundary` stays for what the proxy cannot judge: `ADMIN → /admin`, `emailVerified === false → /home`. Its signed-out branch (only reached when the proxy returned `unavailable` and client bootstrap also failed) redirects to `routes.auth.login({ next: <current pathname + search> })` instead of bare `/login`.

### Landing CTAs

All signed-out "create" CTAs link to `routes.events.new()`. They do not build auth URLs; the proxy adds `next`.

- **Hero** (`components/landing/LandingHero.tsx`): signed-out `href` → `routes.events.new()`. Signed-in stays `routes.home` with the existing "Your events" copy.
- **Final CTA** (`components/landing/LandingFinalCta.tsx`): `href` → `routes.events.new()`.
- **Pricing** (`components/landing/LandingPricing.tsx`): new `LandingPricingCta` component in `components/landing/`, a plain `<a href={routes.events.new()}>`, rendered in two places:
  - once under the plans grid, visible from 761px up (cards side by side → one shared button);
  - once per card below 761px (cards stacked → each card has its own button), via a new optional `footer?: ReactNode` slot on `MarketingPlanCard`, rendered inside the card's bottom block after the storage line. The slot is optional so the in-app plan selector, which shares the card, is untouched.
  - No plan or event type is carried over: types are grouped per category on the landing page, so a card cannot map to one type.
- **Verification notice**: one line of small muted text, no icon, no box: "Verify your email before creating an event." Rendered once directly under the pricing CTA area — under the shared button on desktop, once below the stacked cards on mobile (not repeated per card). Not shown under the hero.

### Copy

New keys in `messages/en.json` and `messages/el.json` under `LandingPage.pricing`:

- `cta` — the pricing button label, mirroring the final CTA's wording.
- `verifyNotice` — the verification line.

## Components and files

| File | Change |
| --- | --- |
| `proxy.ts` | Remove the `/events/new` exclusion; update the comment. |
| `proxy.test.ts` | Signed-out `GET /events/new?step=plan` → redirect to `/login` with `next=/events/new?step=plan`. |
| `lib/auth/returnPath.ts` | Add `buildReturnPath(pathname, search)` → `pathname + search` (no double `?`). Document the `next` contract in a comment. |
| `lib/auth/returnPath.test.ts` | Cover `buildReturnPath` with and without a query string. |
| `hooks/useCurrentReturnPath.ts` | New: wraps `usePathname()` + `useSearchParams()` and returns `buildReturnPath(...)`. |
| `app/events/new/CreateEventBoundary.tsx` | Signed-out branch uses `routes.auth.login({ next: useCurrentReturnPath() })`. |
| `app/register/page.tsx` | Post-register redirect: admin → `/admin`; invite → `/feed`; otherwise `/home`. `next` no longer consulted after registration; still forwarded to the login link. |
| `components/landing/LandingHero.tsx` | Signed-out CTA href → `routes.events.new()`. |
| `components/landing/LandingFinalCta.tsx` | href → `routes.events.new()`. |
| `components/landing/LandingPricingCta.tsx` | New: the pricing CTA link. |
| `components/landing/LandingPricing.tsx` | Render the shared CTA + notice under the grid (desktop) and pass a per-card CTA via `footer` (mobile). |
| `components/plan/MarketingPlanCard.tsx` | Optional `footer?: ReactNode` slot. |
| `messages/en.json`, `messages/el.json` | `LandingPage.pricing.cta`, `LandingPage.pricing.verifyNotice`. |

## Error handling

- An unsafe or missing `next` falls back to `/feed` through the existing `getSafeReturnPath` → `getPostAuthRedirectPath` chain. No new failure modes.
- If Spring is unavailable, the proxy lets the request through and the client gate handles the redirect with `next`, so the destination is still preserved.

## Testing

- Unit: `returnPath.test.ts` (`buildReturnPath`), `proxy.test.ts` (`/events/new` redirect with `next`).
- Manual, signed out: landing hero → `/login?next=/events/new` → sign in → form. Same via final CTA and via the pricing CTA at ≥761px and <761px.
- Manual, signed in: hero → `/home`; pricing/final CTA → form directly.
- Manual, register from that login page (no invite) → `/home` with the verification banner; with invite → `/feed`.
- Visual: pricing section at 375px and 1280px; confirm one CTA per card on mobile, one shared CTA on desktop, and the notice appears exactly once at each width.
- `tsc` and lint clean.

## Out of scope

- Preselecting plan or event type from the pricing cards.
- Any change to the email-verification policy or to `/events/new`'s unverified bounce.
- Carrying `next` through the registration → verification flow.
