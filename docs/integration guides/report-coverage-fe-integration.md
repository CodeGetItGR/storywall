# FE integration: reporting every kind of content

Shipped 2026-09-30. Members can now report stories, Gallery photos and videos, Wishbook entries and
Playlist suggestions, not just posts and comments. There are two new reasons, and the backend checks
every report before storing it. Migration: **V129**. Not breaking: the backend only adds values, and
there is one new error code (3038). Some requests that used to get a 200 are now refused:

- a missing, deleted or other-event target: 404 `2001`;
- a non-host reporting a member: 403 `4001`;
- a caller whose membership was removed: 403 `4001`;
- your own content or membership: 400 `3038`.

Types are in `frontend-api-types.ts` (`ReportTargetType`, `ReportReason`, `ReportRequestDto`,
`ReportResponseDto`, `REPORT_OWN_CONTENT`).

## 1. What changed

- `targetType` adds `STORY`, `MEDIA`, `WISHBOOK_ENTRY`, `PLAYLIST_SUGGESTION`. The full set is
  `POST`, `COMMENT`, `MEMBER`, `STORY`, `MEDIA`, `WISHBOOK_ENTRY`, `PLAYLIST_SUGGESTION`.
- `reason` adds `ILLEGAL_CONTENT` and `COPYRIGHT`. The full set is `SPAM`, `HARASSMENT`,
  `INAPPROPRIATE_CONTENT`, `IMPERSONATION`, `ILLEGAL_CONTENT`, `COPYRIGHT`, `OTHER`.
- **Impersonation works now.** The app offered it but the database refused it, so every
  Impersonation report failed at insert. Nothing to change on your side.
- `POST /api/reports` first goes through the checks every endpoint has: the rate limit (429
  `3010`), the Community Guidelines gate (403 `4013`), and body validation (400 `3001` for a missing
  required field, 400 `3002` for an unknown `targetType`/`reason` value or unparseable JSON). Then
  it applies these rules, in this order:
  1. The caller must be an active member of `eventId`, else 403 `4001`. A member who was removed
     from the event is refused too.
  2. The target must exist in `eventId` and not be deleted, else 404 `2001`. Another event's item
     gets the same 404 as a missing one, and so does a `MEMBER` target who was removed.
  3. Only the Host and Co-hosts can report a `MEMBER`, else 403 `4001`, except that any member may report one who currently has custom role text (see `member-roles-fe-integration.md`).
  4. You can't report your own content or your own membership: 400 `3038 REPORT_OWN_CONTENT`.
  5. If you already have an `OPEN` or `UNDER_REVIEW` report on the same item, the call returns that
     report (200, same `ReportResponseDto` shape) and stores nothing. Treat it as a success.
  6. Anything else is stored as `OPEN` and returned (200).
- Content with no author (anonymous QR uploads) is reportable. So is content whose author is no
  longer in the event: that item still has an author, the author just isn't a member any more.
- Rate limit `reports.create`: 30 per hour per caller. It appears in `/api/config` `rateLimits`
  like every other limit.
- The Community Guidelines gate still applies: an account that hasn't accepted the version in force
  gets 403 `4013` (see [`community-guidelines-fe-integration.md`](community-guidelines-fe-integration.md)).

## 2. Where to offer Report

Every new place opens the existing `ReportTargetModal`.

| Surface | `targetType` | `targetId` |
|---|---|---|
| Story viewer, current story | `STORY` | the story id |
| Gallery viewer, current item | `MEDIA` | the media id |
| Wishbook entry menu | `WISHBOOK_ENTRY` | the entry id |
| Playlist suggestion menu | `PLAYLIST_SUGGESTION` | the suggestion id |

- **Hide** Report on the viewer's own item. The backend refuses it with 3038 anyway.
- **Show** Report on items with no author (anonymous QR uploads) and on items whose author is no
  longer in the event. Don't require an author name; give the modal a neutral label such as "this
  photo".
- Members list: no Report action on the viewer's own row. Only the Host and Co-hosts see Report on
  other members' rows.
- Only show a surface's Report action when its type is in `/api/config` `reportTargetTypes`.

## 3. Errors

| Status / code | Meaning | What to show |
|---|---|---|
| 404 `2001` | The item was deleted, or never existed in this event | "This was already removed." The modal stays open. |
| 400 `3038` | The caller's own content or membership | "You can't report your own content." The modal stays open. |
| 429 `3010` | Over 30 reports in an hour | The existing rate-limit text. The `Retry-After` header and `retryAfterSeconds` in the body say how long to wait. |
| 403 `4001` | Not an active member, or a non-host reporting a member | The generic error. |
| 403 `4013` | Guidelines not accepted | The existing guidelines gate. |
| 400 `3001` / `3002` | A missing field, or a value the backend doesn't know | The generic error. It means the client is out of step with `/api/config`. |

A repeat report is not an error: it's a 200 with the existing report.

## 4. Reasons come from `/api/config`

Build the reason picker from `/api/config` `reportReasons`, and the target types from
`reportTargetTypes`. Never hardcode either list. Translate each value in the FE messages (en and el);
the two new keys are `ILLEGAL_CONTENT` and `COPYRIGHT`. An unknown value is a 400, so a hardcoded list
that drifts from the backend breaks reporting.

## 5. Update 2026-10-01: Report wherever the content is visible

With the moderation center, the FE offers Report wherever the content can be seen, including on
ended events and, for hosts, on soft-deleted events. `canReportContent` no longer requires the
event to be writable. The backend always accepted these reports: `POST /api/reports` checks the
caller's membership and the target (§1), never the event's state. The Guidelines gate (403
`4013`) still applies, since filing a report is a write. What happens to a report after it is
filed is in [`moderation-admin-fe-integration.md`](moderation-admin-fe-integration.md).
