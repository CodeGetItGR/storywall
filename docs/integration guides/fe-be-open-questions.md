# Open questions for the FE team

Companion to [`frontend-integration-guide.md`](frontend-integration-guide.md) §3. Each item
below was a place where the backend's actual behavior might not have matched what the FE built
against. **Answered 2026-08-04** — findings from the FE codebase are recorded below each
question. Only one item turned out to be a real gap (#4); everything else was already handled
correctly on the FE side.

Status legend: **OK** (FE already handles it correctly), **BE GAP** (backend needs new work),
**N/A** (not currently exercised, no action needed).

---

## 1. Guest token refresh — OK

`lib/api/client.ts:38`, `reauthenticate()` branches correctly: registered sessions
`POST /api/auth/refresh` with the stored refresh token; guest sessions (no refresh token, has
`inviteToken`) re-`POST /api/auth/guest-login`. Deduped via a shared `refreshPromise`. Already
correct — no action needed.

---

## 2. Posts feed pagination shape — OK

`hooks/usePosts.ts:41` fetches the real `Page<PostResponseDto>` via `useInfiniteQuery`, and
consumers correctly do `pages.flatMap(page => page.content)`. `lib/api/pagination.ts` has a
comment noting this is the one paginated endpoint. Correctly handled — no action needed.

---

## 3. Unlike / unvote tracking — OK

Not a boolean-only design. `hooks/usePostLike.ts:16` keeps a `knownReactionIds` map (with a
GET-and-find fallback) and deletes by the real reaction id. Playlist votes do the same via
`votes.find(v => v.memberId === memberId)` → delete by `vote.id`. Correctly handled — no action
needed.

---

## 4. Notifications "mark as read" — ✅ RESOLVED, then superseded (2026-08-04)

The original gap (no way to persist `readAt`) was closed by `PATCH /api/notifications/{id}/read`
and `PATCH /api/notifications/read-all`.

**The wider feature has since changed direction and this item is obsolete.** Notifications were
repurposed from guest social activity ("X liked your post") to **host operational messages** —
usage limits, upgrade offers, tips — produced solely by a backend scheduled sweep.
`POST /api/notifications` was removed, the `type` vocabulary was replaced entirely, and
`recipientMemberId` is now nullable.

Anything below in this document describing the notifications page as "the highest-value FE task,
just needs wiring to the existing hook" is **out of date**: the existing `useNotifications` hook is
built against the old contract and needs revising, not merely calling.

**See [`frontend-integration-guide.md`](frontend-integration-guide.md) → "Notifications —
repurposed for hosts"** for the current contract and the breaking-change list.

---

## 5. Relinking a member to an account — N/A today

No host-driven relink UI exists anywhere; the self-claim hook (`useClaimEventMember`) exists
but has zero callers, so nothing is currently blocked. Not urgent unless host-driven relinking
is on the roadmap.

---

## 6. Editing event type — OK

`SettingsTab.tsx` has no `eventType` field at all — matches `EventPatchDto` having none. No
silent no-op risk.

---

## 7. Story expiry vs. event schedule — OK

`providers/ComposerProvider.tsx:270` omits `expiresAt` entirely on create, letting the
backend's 24h default apply. Correctly handled — no action needed.

---

## 8. Editing comments / playlist suggestions — OK / not needed

No edit affordance exists or is stubbed for either — create+delete only, matching the backend.
Nothing to reconcile.

---

## 9. Route casing spot-check — OK

Zero hits for `eventModules` / `event/invitations` wrong-casing in application code;
`endpoints.ts` maps everything to the correct kebab-case paths.

---

## 10. RSVP guest-count validation — Partial risk, low urgency

Guest submission form clamps via UI steppers (adults 1–5, children 0–4) so bad values can't be
typed in, but there's no explicit validator function — it's incidental to the widget, not a
real guard. No host-side edit UI for counts exists at all yet. `hooks/useRsvps.ts:36` already
has a comment flagging that neither side validates bounds.

Low risk today since there's no free-text path in, but worth a real validator if a host-edit
form for RSVP counts gets built later.

---

## Extra — module gating

`ModuleKeyConvention` is typed to exactly the 5 real keys
(`posts | rsvp | playlist | stories | gallery`), so TypeScript already prevents checking against
nonexistent keys like `schedule`/`gifts`/`quiz`. The `tools/schedule` page isn't gated by
modules at all — it just renders mock data unconditionally. Missing vs. explicit
`isEnabled: false` both resolve to "not rendered," no distinction made — fine given current
usage.

---

## Feature-wireability audit (§1 backend-ready endpoints vs. FE reality)

**Fully wired**: Auth, event selection (`/me/events`, `/events`, `/events/{id}`), event
creation, posts, multi-image upload, comments, reactions/likes, stories, RSVP host dashboard,
invitations management (full CRUD), event settings, playlist suggestions & votes, profile.

**Partially wired / gaps** — hooks exist against real endpoints, but nothing in the UI calls
them yet:

- **Co-host management** — `useEventHosts` etc. exist, zero UI callers.
- **Event modules** — read-only in practice; `useUpdateEventModule`/create/delete are all
  unused, so there's no settings UI to actually enable/disable modules.
- **Event sessions/agenda** — full CRUD hooks exist but are unused; the real "Schedule" tool
  page uses `lib/mock-data` instead.
- **RSVP per-session responses** (`rsvp-session-responses`) — hooks exist, no callers.

**Confirmed mock, not wired**:

- **Notifications** — the page still runs on `lib/mock-data`. ⚠️ **Superseded 2026-08-04**: the
  existing hooks are built against the old guest-social contract, which no longer exists. This is
  now a rewrite against the host-operational contract, not a swap. See #4 and the integration
  guide.

**Correctly left unwired** (no backend exists, confirmed placeholder-only): Gifts, Wishbook,
Quiz, Seating, Venue (rich content) — all static/mock, no attempted calls to nonexistent
routes, so nothing is silently broken there.

### Bottom line for prioritization

⚠️ **Revised 2026-08-04.** The previous recommendation — "swap the notifications page onto the
already-built hooks" — no longer holds: notifications were repurposed for hosts and the old
contract is gone, so that work is a rewrite against a new DTO shape, and its value now depends on
whether host-facing quota messaging is a near-term priority. Note the sweep that produces these
notifications is disabled by default, so the feed is empty until ops enables it.

Absent that, the biggest "hook exists, nobody calls it" gaps remain the event-modules management UI
and co-host management UI. Newly available and unwired: the plan/usage screens
(`GET /api/events/{id}/usage`, `GET /api/me/usage`).
