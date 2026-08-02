# StoryWall — API Migration & Multi-Event Design

## Context

`storywall` (this repo) is a v0.app-generated Next.js app: every screen renders from static
mock data in `lib/mock-data.ts` / `lib/types.ts`, hardcoded to a single wedding
("Emma & James"). There is no API client, no auth, and no data-fetching library.

`storywall-fe` (sibling repo, same machine) is mid-way through its own backend integration
(`plan.md`) against a real, multi-event, multi-tenant social-platform backend. It has already
built and partially wired:

- `lib/api/{client,endpoints,errors,pagination,types}.ts` — fetch-based API client, kebab-case
  endpoint registry, `ProblemDetail` error mapping, list-pagination adapter, full DTO types.
- `lib/auth/tokenStore.ts` + `providers/AuthProvider.tsx` — register/login/silent-refresh +
  guest-via-invite-token auth.
- `providers/EventProvider.tsx` — active-event context sourced from `GET /me/events`.
- `@tanstack/react-query` for all data hooks (`hooks/use*.ts`).

**Decision:** storywall keeps its own screens and visual design as-is (storywall-fe's UI is
considered outdated). This migration ports storywall-fe's _data layer_ — API client, types,
auth, multi-event context — into storywall, and rewires storywall's existing components to
consume real data instead of `lib/mock-data.ts`, wherever a backend endpoint exists.

## Decisions locked with the user

- **UI/screens:** unchanged. No adoption of storywall-fe's routes, layout, or design.
- **Auth:** full parity with storywall-fe — registered accounts (register/login/silent-refresh)
  _and_ guest-via-invite-token.
- **Multi-event:** the data model and providers become fully multi-event capable, but storywall
  auto-selects the active event (most recent from `GET /me/events`) with **no event-switcher UI**
  in this pass.
- **Manage/Host dashboard:** existing tabs (Overview/Posts/RSVP/Registry) get wired to real data
  as-is; **add** a new Invitations section (`GET/POST /event-invitations`, shareable
  `/invite/{token}` links) since guest-invite auth depends on invitations existing. No other new
  host-admin screens (event edit, modules, co-hosts) in this pass.
- **Backend:** same backend/account system as storywall-fe — same base URL
  (`NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`), same accounts, same events.
- **Orphan screens** (Wishbook, Future Messages, Quiz, Seat Finder, Gift Registry): no backend
  endpoint exists for any of these (confirmed against storywall-fe's own gap list). They stay on
  mock/local state, explicitly marked as client-only/not-persisted.

## Architecture

Port storywall-fe's data layer into storywall as a parallel structure, adapted for the absence
of i18n/`[locale]` routing in storywall:

- `lib/api/{client,endpoints,errors,pagination,types}.ts` — carried over from storywall-fe,
  reconciled against Swagger (`/v3/api-docs`) as source of truth for exact paths, not the
  original integration guide (which is stale on route casing).
- `lib/auth/tokenStore.ts`, `providers/AuthProvider.tsx`, `providers/EventProvider.tsx` — carried
  over with the same responsibilities: token storage/refresh, guest-login, active-event
  resolution.
- `providers/Providers.tsx` (new) — `QueryClientProvider > AuthProvider > EventProvider`, mounted
  in `app/layout.tsx` (which currently renders `children` directly with no providers at all).
- New dependency: `@tanstack/react-query` (storywall has none today).
- `lib/mock-data.ts` / `lib/types.ts` are **not** deleted — they remain the source for the
  orphan screens (Registry, Wishbook, Quiz, Seating, Future Messages) and as design-time
  fallback/theming defaults, same role `WEDDING_INFO` plays in storywall-fe.

## Screen-by-screen wiring

| storywall screen                                                          | Real endpoint(s)                                                                                                                                                   | Notes                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `app/(app)/feed/page.tsx`                                                 | `GET/POST /events/{id}/posts`, media upload, `POST /reactions`, `GET/POST /events/{id}/stories`                                                                    | Replace `posts`/`stories` mock imports                                                                |
| `app/(app)/post/[id]/page.tsx`, comments                                  | `GET/POST /comments` (threaded via `parentCommentId`)                                                                                                              |                                                                                                       |
| `app/(app)/profile/page.tsx`                                              | `EventMember` self-read + `PATCH /event-members/{id}`                                                                                                              | Hide `isFeatured` for non-hosts                                                                       |
| `app/(app)/notifications/page.tsx`                                        | `GET /notifications`                                                                                                                                               | No "mark read" endpoint upstream (same gap storywall-fe has) — read-only for now, list as backend ask |
| `app/(app)/manage/page.tsx`                                               | Overview/Posts/RSVP: real data. Registry: stays mock. **New:** Invitations section — `GET/POST/PATCH/DELETE /event-invitations`, generates `/invite/{token}` links |                                                                                                       |
| `app/(app)/tools/rsvp/page.tsx`                                           | `POST/PATCH /rsvps`, `/rsvps/{id}/session-responses`                                                                                                               | Multi-session support ported from storywall-fe's `useRsvpSessionResponses`                            |
| `app/(app)/tools/schedule/page.tsx`                                       | `GET /events/{id}/sessions`                                                                                                                                        |                                                                                                       |
| `app/(app)/tools/venue/page.tsx`                                          | `Event.locationName/locationAddress/mapsUrl`                                                                                                                       |                                                                                                       |
| `app/(app)/tools/wishbook`, `future-messages`, `quiz`, `seating`, `gifts` | **None** — no backend endpoint                                                                                                                                     | Stay on mock, marked client-only in code comment                                                      |
| new: `/login`, `/register`, `/invite/[inviteToken]`                       | Full auth + guest-login                                                                                                                                            | Styled with storywall's existing UI primitives, not storywall-fe's                                    |

## Error handling & loading states

storywall's mocks are synchronous today; every wired screen needs empty/loading/error states
added, using storywall's existing component/styling patterns. `ProblemDetail` errors are mapped
via `lib/api/errors.ts` (ported as-is) to user-facing messages.

## Phasing

1. **Phase 0 — Foundation:** `lib/api/*`, `lib/auth/*`, `AuthProvider`, `EventProvider`,
   `Providers.tsx` wired into `app/layout.tsx`, `.env.local`. Confirm storywall's dev port is on
   the backend's `CORS_ALLOWED_ORIGINS`. No screen changes.
2. **Phase 1 — Auth & entry:** `/login`, `/register`, `/invite/[inviteToken]`, route protection,
   auto-active-event resolution.
3. **Phase 2 — Core attendee vertical:** feed, comments, reactions, stories, media upload,
   profile, RSVP (+ session responses), schedule, venue, notifications.
4. **Phase 3 — Manage/host wiring:** wire Overview/Posts/RSVP tabs to real data; add the new
   Invitations tab/section.
5. **Phase 4 — Orphan screens quarantine:** mark Registry/Wishbook/Quiz/Seating/Future-Messages
   as client-only/mock (code comment + doc note); compile a backend-asks list (mark-notification-
   read, reaction-type convention, any endpoints needed to un-orphan these screens).

Each phase: typecheck/lint/build, then a real dev-server pass against the running backend
(login/guest-invite → feed → post → comment → react → RSVP).

## Open questions

- Refresh-token storage strategy (sessionStorage vs. in-memory + silent re-login) — same
  open question storywall-fe has; resolve once, reuse the same answer here.
- Reaction-type set has no backend convention — confirm before building the picker (Phase 2).
- Confirm storywall's dev-server port is added to the backend's CORS allowlist alongside
  storywall-fe's.
