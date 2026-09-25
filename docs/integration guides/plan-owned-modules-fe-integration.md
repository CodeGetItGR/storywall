# FE integration: modules are plan-owned, and every module endpoint is gated

Shipped 2026-09-24. **Breaking.** Read this if your FE shows or edits anything that belongs to a
module (posts, stories, playlist, RSVP, wishbook, wishlist, schedule, gallery, co-hosts) or has a
module on/off switch.

## In short

- **Hosts can no longer switch modules on or off, or edit their config.** `PATCH /api/event-modules/{id}`
  is gone (`405`). What an event has is decided by its plan plus any `MODULE_UNLOCK` it bought, and
  it follows every plan change on its own.
- **Reads are gated too, for everyone, hosts included.** Reading a module the event doesn't have
  returns `409 / 5012 MODULE_NOT_AVAILABLE`. Before, only creates were refused.
- **Edits are gated like creates.** Deletes are not gated.
- **Uploads are gated by what they are for.** A new `context=POST` value exists.
- **Event detail leaves out parts whose module is off.** `sessions` and `rsvpSummary` can be `null`,
  and `hosts` may list only the primary host.
- **Per-session RSVP is a host opt-in.** New `rsvpEnabled` on sessions, a new error `5086`, and a new
  `PATCH` on session responses.

"Has the module" means `isAvailable` on the module's row of `GET /api/events/{eventId}/modules`,
with one difference for reads (below).

## 1. Modules follow the plan

`isEnabled` and `configuration` on every `EventModule` row are now derived. They are set:

- when the event is created,
- on every plan change (upgrade, upgrade withdrawal, admin plan assignment), in the same request,
- when a `MODULE_UNLOCK` add-on is bought.

A module is on when the plan includes it or an unlock covers it. Its `configuration` is the plan's
configuration for that module. Any value a host set earlier is overwritten on the next change.

`PATCH /api/event-modules/{id}` has been removed and now returns `405`. The `EventModulePatchDto`
type is gone.

The `DEFAULT_OFF` applicability is gone. `ModuleApplicability` is now `'UNSUPPORTED' | 'DEFAULT_ON'`.
`DEFAULT_ON` just means "this event type supports the module". `V109` converted any stored
`DEFAULT_OFF` row, and the admin matrix endpoint now rejects the value.

**Action:**
- [ ] Remove any module toggle or module config editor from the host UI.
- [ ] Where a module is off, offer the plan upgrade (or the unlock, on a `DRAFT` event) instead.
- [ ] Refetch `GET /api/events/{eventId}/modules` after an upgrade. The rows change in the upgrade's own
      transaction.

## 2. Reads return `5012` when the module is off

These now return `409 / 5012 MODULE_NOT_AVAILABLE` when the event doesn't have the module:

| Module | Endpoints |
|---|---|
| `posts` | `GET /api/events/{eventId}/posts`, `GET /api/posts/{id}`, `GET /api/posts/{postId}/comments`, `GET /api/posts/{postId}/reactions`, `GET /api/posts/{postId}/media`, `GET /api/comments/{id}`, `GET /api/reactions/{id}`, `GET /api/post-medias/{id}`, `POST /api/events/{eventId}/stream-token`, `GET /api/events/{eventId}/stream` |
| `stories` | `GET /api/events/{eventId}/stories`, `GET /api/stories/{id}`, `GET /api/stories/{id}/views` |
| `playlist` | `GET /api/events/{eventId}/playlist-suggestions`, `…/leaderboard`, `GET /api/playlist-suggestions/{id}`, `GET /api/playlist-suggestions/{suggestionId}/votes`, `GET /api/playlist-votes/{id}` |
| `rsvp` | `GET /api/events/{eventId}/rsvps`, `…/rsvps/export`, `GET /api/rsvps/{id}`, `GET /api/rsvps/{rsvpId}/session-responses`, `GET /api/rsvp-session-responses/{id}` |
| `wishbook` | `GET /api/events/{eventId}/wishbook`, `…/wishbook/count`, `…/wishbook/export` |
| `wishlist` | `GET /api/events/{eventId}/gift-account` (the `5012` comes before any `404` for a missing account) |
| `schedule` | `GET /api/events/{eventId}/sessions`, `GET /api/event-sessions/{id}` |
| `gallery` | `GET /api/events/{eventId}/media`, `GET /api/events/{eventId}/media/archive/manifest`, `…/media/archive`, `…/media/archive/selected` |
| file's own module (§4) | `GET /api/medias/{id}`, `GET /api/medias/{id}/original` |

**The read check ignores the event's status.** A `DRAFT` event's setup screens and a soft-deleted
event's hosts still read module content, as long as the plan (or an unlock) includes the module and
its row is on. Creates and edits still need an `ACTIVE` event (`isAvailable`).

The membership and host checks run first, so a stranger still gets `403`/`404`, not `5012`.

**Action:**
- [ ] Don't call a module's endpoints when its row is not available. Treat a `5012` on a read as
      "hide this section", not as an error toast.

## 3. Edits, co-hosts, deletes

| Request | Needs |
|---|---|
| `PATCH /api/posts/{id}` | `posts` |
| `PATCH /api/rsvps/{id}` | `rsvp` |
| `PATCH /api/event-sessions/{id}` | `schedule` (setup check: works on a `DRAFT` too) |
| `POST /api/event-hosts` | `co_hosts`. The `memberId` must also be a member of `eventId`, else `400` |
| Accepting a `HOST` invitation | `co_hosts`. Else `5012`, and the invitee is not added as a member |

Every `DELETE` stays allowed without the module. A host can still clean up.

Without `co_hosts`, `GET /api/events/{eventId}/hosts` returns only the primary host
(`displayOrder == 0`), and `GET /api/event-hosts/{id}` for any other host returns `404`. This is a
trim, not a `5012`: the primary host belongs to the event, not to the module.

## 4. Uploads belong to a module

`POST /api/events/{eventId}/media` and `…/media/batch` take `context`:

| `context` | Needs | Note |
|---|---|---|
| `GALLERY` (default) | `gallery` | |
| `STORY` | `stories` | Smaller video cap, as before |
| `POST` | `posts` | **New.** Use it for media you attach to a post |
| `COVER` | none | **New (2026-09-25).** The event's cover photo. Host only (else `403`), works on a `DRAFT` too |

Every new media row stores its context as `metadata.uploadContext`. Before, only videos did.
`GET /api/medias/{id}` and `…/original` check the file's own module; a `COVER` file is never
module-checked. A row with no stored context (uploaded before this change) counts as `GALLERY`, so
treat `uploadContext` as optional. Anonymous QR uploads are always `GALLERY`.

The invite preview (`GET /api/event-invitations/{inviteToken}/preview`) and QR resolution
(`GET /api/qr/{token}`) now carry `coverMedia`, the cover with its presigned `url`, next to
`coverMediaId`. Their visitor isn't a member yet, so `GET /api/medias/{id}` would refuse them; read
the cover from these responses instead.

**Action:**
- [ ] Send `context=POST` when uploading media for a post, and `context=STORY` for a story. An event
      with posts but no gallery will reject a post upload sent as `GALLERY`.
- [ ] Send `context=COVER` for the cover photo in the event settings.
- [ ] On the invite and QR landing pages, render `coverMedia` from the response and drop the
      `GET /api/medias/{id}` fetch.

## 5. Event detail

`GET /api/events/{id}`:

- `sessions` is `null` when `schedule` is off.
- `rsvpSummary` is `null` when `rsvp` is off.
- `hosts` lists only the primary host when `co_hosts` is off.

These keys are sent as `null`, not omitted.

## 6. Playlist digest

The hourly "songs were added" feed post now needs both `posts` and `playlist`. No FE change.

## 7. Per-session RSVP

A host opts each session in:

- `rsvpEnabled` (boolean) on `EventSessionRequestDto` (optional, default `false`),
  `EventSessionPatchDto` (optional) and `EventSessionResponseDto`. Every existing session is `false`
  (`V110`).

A guest's answer (`POST /api/rsvp-session-responses`) now needs:

- `rsvp` and `schedule` both available, else `5012`;
- a session of the RSVP's own event, else `400`;
- a session that isn't deleted, else `404`;
- `rsvpEnabled: true` on the session, else **`409 / 5086 SESSION_RSVP_NOT_ENABLED`**.

Answering again for the same session updates the existing answer (same `id`), instead of failing on
the duplicate.

New: **`PATCH /api/rsvp-session-responses/{id}`** with body `{ "isAttending": boolean }` (required).
It is allowed for the RSVP's own member or a host, and has the same checks as create. When the host
closes a session (`rsvpEnabled: false`), existing answers stay readable but can't be changed.

**Action:**
- [ ] Add an "RSVP for this session" switch to the host's session form.
- [ ] Show the per-session question to guests only for sessions with `rsvpEnabled: true`.

## Error codes

| Code | Key | When |
|---|---|---|
| 5012 | `MODULE_NOT_AVAILABLE` | Any read, edit, create or upload of a module the event doesn't have (§2–§4) |
| 5086 | `SESSION_RSVP_NOT_ENABLED` | **New.** Answering for a session the host hasn't opened (§7) |
| 400 | — | Co-host row for a member of another event; session answer for another event's session |

Related: `event-lifecycle-locks-and-event-types-fe-integration.md` (module composition),
`plan-tiers-by-event-type-fe-integration.md`, `gallery-qr-link-plan-gating-fe-integration.md`.
