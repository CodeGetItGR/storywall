# Demo event — design

A fully backend-detached demo of a host's event, reachable from the (future) landing page, so a
prospective customer can try the real product before signing up or paying. No login, no real
account, no calls to Spring at all — everything a visitor does (posting, uploading photos,
editing RSVP settings, etc.) happens locally in their browser and is thrown away only when they
explicitly reset it.

## Goals

- Feels like using the real app as an event host, not a stripped-down preview.
- Zero risk to the real product: the real app's routes, providers, and data-fetching are
  untouched by default; the demo is additive.
- Reuses the real feature components and hooks (feed, gallery, wishbook, RSVP, story, manage
  tools) rather than duplicating UI that will drift out of sync over time.

## Scope

**In:** feed/posts (incl. comments/reactions), gallery, wishbook, RSVP/guest management, story,
modules, and the host-side manage/settings tools — all for one pre-seeded sample event, always
viewed as its host.

**Out:**

- Platform-admin console.
- Checkout/billing/plans/upgrade flows, storage packs, gift accounts, refunds. A "purchase" or
  plan-tier action in the demo would be misleading. Where the real UI would surface these (e.g.
  a manage-tools entry, a usage/storage panel), the demo either hides that entry or links out to
  the real signup/pricing page.
- Guest-perspective views (RSVP submit page, QR scan flow, partner portal) — the demo is host-only
  per the product's actual audience (everyone visiting is a prospective host, not a guest).
- Anything requiring a second real user (e.g. seeing another host's live edits) — the demo is
  single-visitor, local-only.

## Why not reuse the real `/events/[eventId]` route tree

Two things make the real route tree unsafe to reuse directly:

- `/events/**` is a protected prefix in [proxy.ts](../../../proxy.ts) — an anonymous visitor
  gets redirected to `/login` before any page code runs.
- The real `AuthProvider`/`EventProvider` bootstrap a session via `/api/auth/session`, a
  **Next.js server route** that itself calls Spring server-side. That call happens outside the
  browser, so no client-side mocking technique can fake it — the visitor would never end up
  "logged in."

So the demo needs its own route namespace and its own way of feeding the real feature components
a fake "logged in as host" state.

## Architecture

### Route tree

A new top-level, unprotected route: `app/demo/...`, mirroring the real feature layout for
clarity (`/demo`, `/demo/feed`, `/demo/tools/gallery`, `/demo/tools/wishbook`,
`/demo/tools/rsvp`, `/demo/manage`, `/demo/story`, `/demo/modules`, etc.). Not under `/events/`,
so `proxy.ts`'s allowlist needs no changes at all — the demo is invisible to the real auth gate.

Each `page.tsx` under `/demo` is a **plain client component**: no server-side prefetch, no
`resolveServerEventContext()`, no `HydrationBoundary`. There's no real backend to prefetch from,
so this is a deliberate, scoped exception to the project's default server-prefetch pattern, not a
violation of it — the pattern's own contract only applies to data Spring owns.

### Demo providers (fake session, no shared files touched)

Per your call: fully separate providers, not a branch inside the real `AuthProvider`/
`EventProvider`.

`AuthContext`/`EventContext` are plain `React.createContext` objects declared inside
[providers/AuthProvider.tsx](../../../providers/AuthProvider.tsx) and
[providers/EventProvider.tsx](../../../providers/EventProvider.tsx); the hooks every feature
component already imports (`useAuth`, `useIsHost`, `useActiveEvent`, `useMyMemberships`, etc.)
are just `useContext(...)` reads against those objects. Exporting the two context objects
themselves (not touching their fetching/bootstrap logic at all) lets a new
`providers/demo/DemoAuthProvider.tsx` / `providers/demo/DemoEventProvider.tsx` render
`<AuthContext.Provider value={fakeSession}>` / `<EventContext.Provider value={fakeEventState}>`
directly, synchronously, with no network call and no bootstrapping flicker. Every existing hook
and every feature component that calls them keeps working completely unmodified — they can't
tell the difference.

This is the one touch point on real files, and it's additive-only (two new named exports, zero
behavior change for the real app). If even that's unwanted, the alternative is duplicating
`useAuth`/`useIsHost`/etc. as demo-only hooks that feature components would need to import
instead — meaning those components would need their imports swapped per-route, which is far more
invasive. Flagging this trade-off explicitly since it's the one place "fully separate" isn't
100% absolute — happy to go the other way if this still isn't acceptable.

`app/demo/layout.tsx` wraps its children in `DemoAuthProvider` → `DemoEventProvider` →
(the real `ComposerProvider`/`ModalProvider`/etc. as needed) instead of the real app's
`AuthProvider`/`EventProvider`.

### Mock network layer (MSW)

[Mock Service Worker](https://mswjs.io/) intercepts `fetch()` in the browser, so every hook's
call through `lib/api/client.ts`'s `api.get/post/put/patch/del/postForm` is answered locally
instead of reaching Spring — no changes to any of the 84 hooks or any feature component. MSW is
only started when the app is under `/demo` (registered in `app/demo/layout.tsx`); everywhere
else `fetch` behaves exactly as today.

Handlers are written per endpoint actually used by the in-scope features (see
[lib/api/endpoints.ts](../../../lib/api/endpoints.ts) — the `events.*`, `posts`, `comments`,
`reactions`, `stories`, `wishbook`, `rsvps`, `rsvpSessionResponses`, `eventMembers`,
`eventModules`, `eventSessions`, `medias`, `playlistSuggestions`, `playlistVotes`, and
`me.profile`/`me.events` groups), reading from and writing to a local mock store.

### Mock store & persistence

A small in-memory store (plain objects/maps, seeded from a static sample-data module: sample
posts, gallery photos, guest list/RSVPs, wishbook items, story content, modules config) backing
the MSW handlers. Serialized to `localStorage` under demo-namespaced keys after every mutation,
and hydrated from `localStorage` on load if present (falling back to the seed data on first
visit). A visible **"Reset demo"** action (in the demo's manage/settings area) clears those keys
and reseeds from scratch.

### Media uploads

Upload handlers (`postMedias.create`, `events.media`, `events.mediaBatch`, profile picture, etc.)
read the actual uploaded `File` from the intercepted `FormData`, convert it to a data URL, and
store that string as the mock media record's URL — so an uploaded photo really appears in the
feed/gallery, not a placeholder. Data URLs live in the same localStorage-persisted store, so
they survive reloads like everything else (this does mean demo storage can get large if someone
uploads many/large images — acceptable for a demo; the reset action is the escape hatch).

## Data flow (example: adding a feed post with a photo)

1. Visitor opens the composer (real `ComposerCard`/composer hook, unmodified) and picks a photo.
2. On submit, the existing `usePosts`/composer mutation calls `api.postForm(endpoints.posts.create, ...)` exactly as in production.
3. MSW's handler for that route reads the `FormData`, converts the file to a data URL, appends a
   new post record (with a synthetic id) to the mock store, persists the store to `localStorage`,
   and returns a response shaped like the real `PostResponseDto`.
4. React Query's normal cache update/invalidation (unchanged) reflects the new post in the feed
   immediately — same as it would against the real API.

## Error handling

- MSW handlers return the same `ProblemDetail`/status-code shapes the real API would for
  invalid input, so existing client-side error handling (`ApiError`, `toErrorMessage`, per-form
  error states) works unmodified in the demo too.
- localStorage read/write is wrapped defensively (corrupt/missing data falls back to reseeding)
  so a manually-cleared or malformed store never hard-crashes the demo — it just resets.
- If MSW itself fails to install (e.g. service worker unsupported), the demo route shows a
  simple "demo unavailable in this browser" state rather than silently falling through to real
  network calls.

## Testing

- Manual/browser verification of the golden path per in-scope feature (post with photo, gallery
  browse, wishbook add/edit, RSVP change, story post, a manage-tools setting), plus reload
  (confirms persistence) and the reset action.
- Given the repo's Vitest setup (added for story filters), unit-test the mock store's
  reducer/persistence logic (seed → mutate → serialize → rehydrate) in isolation, independent of
  MSW itself.
- No changes to any existing test.
