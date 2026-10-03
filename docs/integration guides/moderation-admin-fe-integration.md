# FE integration: the admin moderation center and audit log

Shipped 2026-10-01. New admin endpoints for reviewing reports and acting on them, a read-only log
of what admins did, and one new notification type for reporters. Migrations **V130** and **V131**.
New error codes: 3039, 4014, 5106, 5107, 5108.

Nothing breaks for members and guests. Four admin write endpoints were removed (§2.7); the FE
never called them. Types are in `frontend-api-types.ts` (`ModerationCaseSummaryDto`,
`ModerationCaseDetailDto`, `ModerationDecisionRequestDto`, `AdminAuditLogResponseDto` and the rest
of the "Moderation center & admin audit log" block).

Every `| null` field in these responses is sent as `null`, never left out.

## 1. Overview

A **case** is every report on one item, keyed by `(targetType, targetId)`. Cases are not stored:
the backend groups them from `reports` on each request. Ten people reporting the same photo make
one case with ten reports, and one decision closes all ten.

A case moves like this:

1. Reports arrive as `OPEN`.
2. An admin starts the review (§2.3). The case's `OPEN` reports become `UNDER_REVIEW`.
3. An admin decides (§2.4). Every active report becomes `RESOLVED` (outcome `ACTION_TAKEN`) or
   `DISMISSED` (outcome `DISMISSED`). The decision is stored in `moderation_decisions`.

If the item is reported again after a decision, the new report opens the case again. The case view
then shows the old reports, the old decision and the new report together.

Opening a case is the only way an admin can see event content. Every opening is written to the
admin audit log, which can't be edited or deleted (V130 and V131 refuse `UPDATE`, `DELETE` and
`TRUNCATE` at the database).

Every endpoint here needs a platform admin (`hasRole('ADMIN')`). Anyone else gets 403 `4001`. The
writes (`POST` review, `POST` decision, `DELETE` ban) also go through the Community Guidelines
gate, so an admin who hasn't accepted the current version gets 403 `4013`, like any other write.

## 2. Endpoints

| Method | Path | Returns | Writes to the audit log |
|---|---|---|---|
| GET | `/api/admin/moderation/cases?status=` | `Page<ModerationCaseSummaryDto>` | no |
| GET | `/api/admin/moderation/cases/{targetType}/{targetId}` | `ModerationCaseDetailDto` | **every call**: `CONTENT_VIEWED` |
| POST | `/api/admin/moderation/cases/{targetType}/{targetId}/review` | 204 | `CASE_REVIEW_STARTED`, if any report moved |
| POST | `/api/admin/moderation/cases/{targetType}/{targetId}/decision` | `ModerationDecisionDto` | one row per action taken, `CASE_DISMISSED`, or `CASE_RESOLVED` when no action ran |
| DELETE | `/api/admin/moderation/bans/{banId}` | 204 | `BAN_LIFTED` |
| GET | `/api/admin/audit-log?targetId=&adminUserId=` | `Page<AdminAuditLogResponseDto>` | no |

`targetType` is a `ReportTargetType` value: `POST`, `COMMENT`, `MEMBER`, `STORY`, `MEDIA`,
`WISHBOOK_ENTRY` or `PLAYLIST_SUGGESTION`. An unknown value, or a `targetId` that isn't a UUID, is
400 `3001`.

### 2.1 List cases

`GET /api/admin/moderation/cases?status=OPEN&page=0&size=50`

- `status`: `OPEN` (the default), `UNDER_REVIEW` or `CLOSED`. Anything else is 400 `3001`.
- `page` / `size`: default size 50, max 100.
- `sort` is ignored. Each tab has a fixed order (§3).

### 2.2 Open a case

`GET /api/admin/moderation/cases/{targetType}/{targetId}`

- 200 with `ModerationCaseDetailDto`, in any status, closed cases included.
- 404 `2001` when nobody ever reported that item.
- `reports`: every report on the item, in any status, oldest first.
- `content`: the item as it is now, with presigned media URLs. `null` when the item is already gone
  (deleted by its author, a host or an earlier decision). For a `MEMBER` case, `text` is the member's custom role text (null when they have none),
  `media` is `[]`, and the author fields describe the reported member.
- `allowedActions`: see §4.
- `decisions`: every decision on this item, newest first.
- `priorDecisionsAgainstAuthor`: up to 20 `ACTION_TAKEN` decisions on *other* items whose author
  had the same account, newest first. Empty when the author has no account.
- `bans`: the bans this item's decisions placed, lifted ones included (`liftedAt` set).

**Every call writes a `CONTENT_VIEWED` row that can never be deleted.** Fetch the detail only when
an admin opens the case:

- never prefetch it (on row hover, or for the next row in the table);
- set `refetchOnWindowFocus: false` and `refetchOnReconnect: false`;
- use a long `staleTime` for the open drawer;
- use `retry: false`, at least on 404;
- refetch on purpose only after a decision or a refused one (§5).

In development, React StrictMode mounts twice, so opening a case logs two views. That is expected
there and doesn't happen in a production build.

### 2.3 Start the review

`POST /api/admin/moderation/cases/{targetType}/{targetId}/review`, no body.

- 204. Every `OPEN` report on the item becomes `UNDER_REVIEW`, recording the admin as reviewer.
- If the case is already `UNDER_REVIEW`, nothing changes, nothing is logged, and it's still 204.
- 409 `5106` when the item has no `OPEN` or `UNDER_REVIEW` report: it was decided already, or never
  reported.

Call it when an admin opens an `OPEN` case, so the case moves to the Under review tab and other
admins can see someone has it.

### 2.4 Decide

`POST /api/admin/moderation/cases/{targetType}/{targetId}/decision`

```json
{
  "outcome": "ACTION_TAKEN",
  "removeContent": true,
  "removeMember": true,
  "banFromEvent": true,
  "suspendAccount": false,
  "note": "Repeated harassment in comments."
}
```

- `outcome` is required: `DISMISSED` or `ACTION_TAKEN`. Missing is 400 `3001`; an unknown value is
  400 `3002`.
- The four booleans default to `false` when left out.
- `note` is optional, up to 2000 characters (400 `3001` over that). Only admins see it. It is
  stored on the decision and copied into `resolutionNotes` of every report the decision closes, so
  `ReportResponseDto.resolutionNotes` can now be longer than `/api/config`
  `reportResolutionNotesMaxLength` (1000). Don't use that value to cut what you display.
  Reporters never see the note.
- 200 with the new `ModerationDecisionDto`.
- Errors: 400 `3039`, 409 `5106`, `5107`, `5108` (§5).

One transaction does all of this. It locks the case's active reports, closes them, records the
decision with a snapshot of the item, runs each chosen action, and writes the audit rows. If any
step fails, nothing is kept. When two admins decide the same case at once, one wins and the other
gets 409 `5106`.

The actions use the same removal code as the app's own deletes:

- `removeContent` deletes the item as its author or a host deleting it would. For a `MEMBER` case it also needs `expectedContentText`: send the case content `text` the admin UI displayed (missing is `3039`; a mismatch with the stored text is `5115`). Other target types ignore it.
- `removeMember` removes the author from the event, as a host removing a guest would.
- `banFromEvent` stops that account from joining the event again (§2.5).
- `suspendAccount` suspends the author's account and signs out all of its sessions (see §8 for
  the 15-minute window).

Reporters are notified after the transaction commits (§6).

### 2.5 Lift a ban

`DELETE /api/admin/moderation/bans/{banId}`

- 204. The account can join the event again. Lifting doesn't restore the membership: the user
  needs a new invitation, like any new guest.
- 404 `2001` when the ban doesn't exist **or was already lifted**. Treat 404 as done: refetch the
  case and show the ban as lifted, with no error.

While a ban is in force, every path that joins an *account* to the event refuses it with 403
`4014 EVENT_BANNED`:

- `POST /api/event-invitations/{inviteToken}/accept`
- `POST /api/event-members`
- `POST /api/event-members/{id}/claim`
- `POST /api/events/{eventId}/hosts` (co-host invitation)
- `POST /api/gift-claims/{token}/claim`, refused before a PIN attempt is used

Sign-in and sign-up calls that carry an `inviteToken` redeem it on a best-effort basis. A banned
account still signs in but isn't joined to the event, and those calls never return 4014.

### 2.6 The admin audit log

`GET /api/admin/audit-log?targetId=&adminUserId=&page=0&size=50`

- Both filters are optional; when you pass both, a row must match both.
- Newest first (`createdAt`, then `id`). `sort` is ignored. Default size 50, max 100.
- Reading the log is not itself logged.

What each action records:

| `action` | `targetType` / `targetId` | `eventId` | `details` |
|---|---|---|---|
| `CONTENT_VIEWED` | the case's type / item id | the case's event | `{}` |
| `CASE_REVIEW_STARTED` | the case's type / item id | the case's event | `{}` |
| `CASE_DISMISSED` | the case's type / item id | the case's event | `{decisionId}` |
| `CASE_RESOLVED` | the case's type / item id | the case's event | `{decisionId}` |
| `CONTENT_REMOVED` | the case's type / item id | the case's event | `{decisionId}` |
| `MEMBER_REMOVED` | `MEMBER` / member id | the case's event | `{decisionId}` |
| `MEMBER_BANNED` | `MEMBER` / member id | the case's event | `{decisionId, userId}` |
| `ACCOUNT_SUSPENDED` | `USER` / user id | the case's event | `{decisionId}` |
| `BAN_LIFTED` | `USER` / user id | the ban's event | `{banId}` |
| `ACCOUNT_CREATED` | `USER` / user id | null | `{}` |
| `ACCOUNT_STATUS_CHANGED` | `USER` / user id | null | `{from, to}` (`AccountStatus` values) |
| `ACCOUNT_ROLE_CHANGED` | `USER` / user id | null | `{from, to}` (`PlatformRole` values) |
| `ACCOUNT_EMAIL_CHANGED` | `USER` / user id | null | `{}`: the addresses are never stored |
| `ACCOUNT_DELETED` | `USER` / user id | null | `{}` |

`details` is `{}` when there is nothing to add. It holds ids and enum values only. `ipAddress` is
the admin's address as the backend resolved it.

The last five rows come from the Accounts panel, whose endpoints are unchanged:

- `POST /api/users/provisioned` writes `ACCOUNT_CREATED`.
- `PATCH /api/users/{id}` writes one row for each of status, role and email that actually changed.
- `DELETE /api/users/{id}` writes `ACCOUNT_DELETED`.

An `ACTION_TAKEN` decision with no actions (only possible once the item is gone, §4) writes one
`CASE_RESOLVED` row, so every decision is in the log even if its `moderation_decisions` row is
later deleted.

The older `GET /api/audit-logs` (event history: date changes, Gift List, demo events) is still
there, read-only.

### 2.7 Removed endpoints

| Endpoint | Now |
|---|---|
| `POST /api/audit-logs` | 405 `3020` |
| `DELETE /api/audit-logs/{id}` | 405 `3020` |
| `DELETE /api/reports/{id}` | 405 `3020`: reports are closed only by a decision |
| `/api/moderation-actions/**` (all four) | 404 `2001` |

`GET /api/reports` and `GET /api/reports/{id}` stay. `/api/config` still publishes
`moderationReasonMaxLength`, but nothing reads it any more (see
[`app-config-fe-integration.md`](app-config-fe-integration.md)).

## 3. Case statuses and tabs

| Tab | Holds | Order | Row key |
|---|---|---|---|
| `OPEN` | items with at least one `OPEN` report | oldest first report first | `targetType` + `targetId` |
| `UNDER_REVIEW` | items with no `OPEN` report and at least one `UNDER_REVIEW` | oldest first report first | `targetType` + `targetId` |
| `CLOSED` | one row per decision | newest decision first | `decisionId` |

- `OPEN` and `UNDER_REVIEW` are grouped from the active reports and paged in memory, so
  `page.totalElements` is exact. `reportCount` counts active reports only. `topReason` is the
  most frequent reason among them, with ties going to the earlier value in `ReportReason`.
  `decisionId`, `outcome` and `decidedAt` are null.
- `CLOSED` reads `moderation_decisions`. `reportCount` is how many reports that decision closed.
  `topReason`, `firstReportedAt` and `lastReportedAt` are null. `eventTitle` is null once the event
  has been purged; decisions outlive the event.
- An item decided twice has two `CLOSED` rows. An item reported again after a decision is in
  `OPEN` and in `CLOSED` at once, so don't key `CLOSED` rows by target.
- V129 dismissed duplicate reports automatically when it collapsed them. Those have no decision, so
  they never appear in `CLOSED`. They do appear in a case's `reports` list, as `DISMISSED`.
- `ModerationCaseDetailDto.status` uses the same rules for one item: `OPEN` if any report is
  `OPEN`, else `UNDER_REVIEW` if any is, else `CLOSED`.
- After a review or a decision, invalidate the list queries: the case changes tabs.

## 4. Allowed actions

`allowedActions` is computed by the server from the item's current state. The decision endpoint
refuses anything that is `false` there, so show **only** the actions that are `true`.

| Action | `true` when |
|---|---|
| `removeContent` | the item still exists and, for a `MEMBER`, has custom role text (removing it locks the member out of custom text; a text that changed since the case was loaded is a 409 `5115`, see `member-roles-fe-integration.md`) |
| `removeMember` | the item has an author who is still a member, and isn't the Host or a Co-host |
| `banFromEvent` | `removeMember` is true and the author has an account (not a name-only guest) |
| `suspendAccount` | the author has an account that is `ACTIVE`, isn't an admin, and isn't you |

When `content` is null, all four are `false`.

Two contract points the form must follow:

- **`banFromEvent` needs `removeMember` in the request.** `allowedActions` reports ban on its own,
  but a decision with `banFromEvent: true` and `removeMember: false` is 400 `3039`. Ticking Ban
  should tick Remove member as well and lock it, or keep Ban disabled until Remove member is
  ticked.
- **`ACTION_TAKEN` needs at least one action while the item exists.** With `content` not null,
  `ACTION_TAKEN` and every action `false` is 400 `3039`. With `content` null, it is accepted. The
  reports close as `RESOLVED` and reporters are told action was taken. Use it when the item was
  already removed before the review. `DISMISSED` with any action `true` is always 400 `3039`.

Other cases:

- `suspendAccount` doesn't need `removeMember`. For a Host's content it is the only member-level
  action, since hosts can't be removed (`5107`).
- Anonymous QR uploads have no author, so only `removeContent` can be offered.
- Name-only guests can be removed, but not banned or suspended: they have no account.
- If the account is already banned from the event by an earlier decision, that ban is kept. The
  new decision still records `banned: true`, but its `bans` list won't show the earlier ban.

**Confirm step.** Before sending, show exactly what will happen, built from the ticked boxes:
"Remove this comment", "Remove Maria from the event and stop her account from joining again",
"Suspend the account. Maria is signed out within 15 minutes", "Close 4 reports. The reporters
will be told action was taken" or "...that no breach was found". The actions can't be undone; only a
ban can be lifted.

## 5. Errors

| Status / code | When | Suggested copy (en / el) |
|---|---|---|
| 400 `3039 MODERATION_DECISION_INVALID` | The decision asks for something that doesn't apply: an action with a dismissal, `ACTION_TAKEN` with no action while the item exists, removing content that is gone or a member report's "content" when the member has no custom role text, removing a member with no author, a ban without removal or without an account, suspending an account that isn't active. Usually the item changed since the case was opened. | "This action no longer applies to this item. Reload the case and try again." / «Αυτή η ενέργεια δεν ισχύει πλέον για αυτό το στοιχείο. Φορτώστε ξανά την υπόθεση και δοκιμάστε πάλι.» |
| 409 `5106 MODERATION_CASE_CLOSED` | Review or decision on a case with no active reports: another admin decided it, or it was never reported. | "This case has already been decided." / «Η υπόθεση αυτή έχει ήδη κριθεί.» Then refetch the case. |
| 409 `5107 MODERATION_MEMBER_IS_HOST` | Removing a Host or Co-host. `allowedActions` already hides this, so it means the author became a host after the case was loaded. | "Hosts and Co-hosts can't be removed from their event. You can suspend the account instead." / «Ο Host και οι Συνδιοργανωτές δεν μπορούν να αφαιρεθούν από την εκδήλωσή τους. Μπορείτε να αναστείλετε τον λογαριασμό.» |
| 409 `5108 MODERATION_TARGET_PROTECTED` | Suspending an admin account, or your own. | "Admin accounts can't be suspended here." / «Οι λογαριασμοί διαχειριστών δεν μπορούν να ανασταλούν από εδώ.» |
| 404 `2001` on `GET` case | Nobody ever reported that item. | "This case doesn't exist." / «Η υπόθεση δεν υπάρχει.» |
| 404 `2001` on `DELETE` ban | The ban is already lifted, or doesn't exist. | None: treat as done (§2.5). |
| 403 `4014 EVENT_BANNED` | Member-facing: a banned account tries to join (§2.5). | "You can't join this event." / «Δεν μπορείτε να συμμετάσχετε σε αυτή την εκδήλωση.» |
| 400 `3001` | A bad `status`/`targetType`/UUID, `outcome` missing, or `note` over 2000. | The generic error. |
| 403 `4001` / `4013` | Not an admin / Guidelines not accepted. | The existing handling. |

After any 3039, 5106, 5107 or 5108, refetch the case before letting the admin try again. That
refetch is a deliberate view and is logged.

## 6. The `REPORT_OUTCOME` notification

When a decision commits, each reporter of the case gets one in-app notification. No email is sent.

| Field | Value |
|---|---|
| `type` | `REPORT_OUTCOME` |
| `category` / `severity` | `SYSTEM` / `INFO` |
| `recipientMemberId`, `eventId`, `eventTitle` | the reporter's membership and its event |
| `ctaLabel`, `ctaTarget` | null: there is no action |
| `ctaParams` | `{}` |
| `expiresAt`, `referenceType`, `referenceId` | null |
| `payload` | `{ "eventTitle": "…" }` |

`title` and `body` come rendered in the recipient's language. Show them verbatim:

| Outcome | en | el |
|---|---|---|
| `ACTION_TAKEN` | "About your report" / "We reviewed your report in {eventTitle} and took action under the Community Guidelines." | «Σχετικά με την αναφορά σας» / «Εξετάσαμε την αναφορά σας στο {eventTitle} και λάβαμε μέτρα σύμφωνα με τους Κανόνες Κοινότητας.» |
| `DISMISSED` | "About your report" / "We reviewed your report in {eventTitle} and found no breach of the Community Guidelines." | «Σχετικά με την αναφορά σας» / «Εξετάσαμε την αναφορά σας στο {eventTitle} και δεν διαπιστώσαμε παράβαση των Κανόνων Κοινότητας.» |

It says only whether action was taken. It never includes the admin's note, which action, or a
link. Give it `SYSTEM` styling and no button.

Notification types keep growing. An unknown `type` should render generically (title, body, no
CTA) rather than be dropped or crash the feed. `NotificationType` in `frontend-api-types.ts` has
been reconciled with the backend enum.

## 7. Report wherever content is visible

The backend never checked the event's state when a report is filed. `POST /api/reports` needs an
active membership and an item that exists in the event, nothing more. So members can report on an
ended event, and hosts can report on a soft-deleted event they can still see. `canReportContent`
no longer requires the event to be writable; it follows visibility. Filing is still a write, so the
Guidelines gate (403 `4013`) applies. See
[`report-coverage-fe-integration.md`](report-coverage-fe-integration.md).

## 8. Known limits

- **Suspension takes up to 15 minutes to reach an open app.** Suspending an account revokes its
  sessions at once, so no refresh succeeds. An access token already issued stays valid until it
  expires (`jwt.access-token-expiry-ms`, 15 minutes by default), because the JWT filter doesn't
  check the database. The same is true of a suspension from the Accounts panel.
- **Guests without an account** aren't notified of outcomes and can't be banned or suspended.
  They can be removed from the event, and could then join again through an invitation as a new
  guest.
- **Reporters who left the event before the decision aren't notified.** Deleting a membership sets
  `reports.reporter_member_id` to null. Their reports stay in the case with `reporterMemberId` and
  `reporterDisplayName` null.
- **Notifications are sent after commit, on the admin's request.** Each reporter's notification
  is its own transaction, emitted synchronously before the decision response returns, so a case
  with many reporters answers more slowly. A notification that fails is logged and not retried;
  the decision stands.
- **Media evidence is metadata only.** The decision stores a snapshot of the item (text, author,
  and each media file's id, storage key, type and size), but no copy of the files, and no endpoint
  returns the snapshot. Once content is removed, the case shows `content: null`, and removed
  files are purged on the usual schedule.
- **The open tabs are paged in memory.** That is fine for a queue of tens of cases. It would need
  SQL paging if the queue ever grew to thousands.
