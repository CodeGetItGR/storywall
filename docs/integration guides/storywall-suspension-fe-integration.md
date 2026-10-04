# FE integration: StoryWall suspension and statements of reasons

Shipped 2026-10-02. An admin can suspend a StoryWall as part of a moderation decision, and later
either lift the suspension or close the StoryWall for good. Every moderation action now needs a
statement of reasons, which is emailed to each person the action hits (Guidelines §22, DSA Art. 17).
Migration **V135**. New error codes: **4015**, **5110**, **5111**, **5112**. Types are in
`frontend-api-types.ts` (`EventSuspensionDto`, `StatementGround`, `GuidelinesRule`,
`ModerationEventSuspensionDto` and the fields below).

Every `| null` field is sent as `null`, never left out. The error code is in the JSON field
`errorCode`.

## 1. What breaks

**The decision form.** `POST …/decision` with `outcome: ACTION_TAKEN` and any action now requires
`ground`, `rule` and `explanation`; without them it is `400 3039`. A dismissal must send all three
as `null` (a statement field on a dismissal, even an empty string, is also `400 3039`). The BE and
FE must deploy together: the old form sends no statement and every action would be refused.

## 2. Hosts: the suspended StoryWall

### 2.1 Who sees what

| Caller | `GET /api/events/{id}` | Anything else on the event | Lists |
|---|---|---|---|
| Host or co-host | 200, `suspended: true`, `suspension` set | 403 `4015` (withdrawals excepted, §2.6) | listed |
| Guest member | 404 `2001` | 404 `2001` | not listed |
| Non-member | 404 `2001` | 403 `4001`, as for any event | not listed |

The lists: `GET /api/me/events` (`EventMemberResponseDto`) has no `suspended` field. It only leaves
a suspended StoryWall out for non-hosts. `suspended` is on `EventResponseDto` (`GET /api/events`)
and on the event detail (`GET /api/events/{id}`). The home grid fetches each event's detail, so
its badge reads `event.suspended` from there.

Public entry points answer as if the StoryWall did not exist: invite preview 404, invite accept 404
`2002` (a host accepting gets 4015), QR link `TARGET_UNAVAILABLE`, demo snapshot 404, gift preview
404, gift claim 409 `5092`.

### 2.2 `EventDetailResponseDto` for a host

`suspended` is true and `suspension` is:

| Field | Meaning |
|---|---|
| `suspendedAt` | When. Show it in the event's timezone. |
| `ground` | `ILLEGAL_CONTENT` or `GUIDELINES_BREACH`. Null only if the decision row is gone. |
| `rule` | A `GuidelinesRule`. Link it to `/legal/community-guidelines#section-N` (§5). |
| `explanation` | The admin's words, verbatim. Render as plain text, keep line breaks. |
| `reference` | The `#REF` the statement email quoted. Never null. |
| `closedAt` | Null while only suspended. Set once an admin closed the StoryWall (§2.5). |
| `deletesOn` | Null unless closed: the date it is deleted for good. |
| `primaryHost` | Whether the caller is the primary host. Only then show the "Billing and withdrawal" link (§2.6). `hosts` is degraded, so do not work it out from there. |
| `contactEmail` | Where the host writes to disagree. Show "write to us at {contactEmail} quoting #{reference}". When null, leave the contact sentence out entirely, as the email does. |

The rest of the DTO is degraded: every `modules[].isAvailable` is false, `sessions` and
`rsvpSummary` are null, and co-hosts may be missing from `hosts`. Do not read them. Show the
suspended view instead of the event shell: no tabs, no settings.

### 2.3 `4015` anywhere

A host can be inside the event when it is suspended. The next request on the event answers
`403 4015`. Refetch `GET /api/events/{id}` (it now says `suspended: true`) and let the suspended
view take over. Do not show a toast for 4015.

A non-host in the same situation just gets 404s, like a deleted event.

### 2.4 Frozen

Nothing in a suspended StoryWall is deleted: no coverage auto-delete, no retention purge, no media
purge, no storage trim. Its hosts cannot request deletion or cancel one (4015). No quota, coverage
or tip notifications are sent about it. Authors and uploaders cannot delete their own posts,
comments, stories, media, playlist suggestions, wishbook entries, reactions or votes either (a guest gets 404, a host
4015), nobody can file a report on it, and a member claim on it answers 404.

### 2.5 Closed

An admin can close a suspended StoryWall. It stays suspended and hidden, `closedAt` and
`deletesOn` are set, and the hosts get an email with the date. Show "closed; deleted on
{deletesOn}" instead of the suspended text. There is no way back: lifting is refused (5112), and so
is cancelling the deletion. Once the retention window has passed, the StoryWall is purged.

### 2.6 Withdrawal stays open

The EU right of withdrawal does not pause for a moderation measure. While suspended, the primary
host can still call, under `/api/events/{eventId}`:

| Endpoint | Used for |
|---|---|
| `GET …/billing` | the plan and the orders |
| `GET …/usage` | the storage limit the withdrawal preview compares against |
| `GET …/withdrawal-preview`, `POST …/withdrawals` | withdrawing the activation |
| `GET …/orders/{orderId}/withdrawal-preview`, `POST …/orders/{orderId}/withdrawals` | withdrawing an upgrade or a storage pack |
| `GET …/withdrawals` | the withdrawal history |

Who else gets what:
- `GET …/billing` and `GET …/usage`: a co-host gets `403 4015`, a guest member gets 404 `2001`.
- The five withdrawal endpoints: anyone but the primary host is refused exactly as before
  suspension (403 `4001`; `4005` for a member who is not the primary host), whether or not the
  StoryWall is suspended.

Everything else in billing (checkout, quote, upgrades, storage packs, extensions, add-ons) stays
4015 for a host.

On the suspended view, show the primary host (`suspension.primaryHost`) a "Billing and withdrawal"
link. It opens the existing Billing tab content on its own: no other tabs, no event content, and
no purchase sections (plan, payments, withdrawal history and the withdrawal dialog only).

### 2.7 Events list

`suspended` is true on `EventResponseDto` and on the event detail for a host's suspended StoryWall.
Show a "Suspended" badge (see §2.1 for which lists carry it).

### 2.8 After a lift

Everything comes back as it was. Other servers may answer 4015 for up to 5 seconds after the lift.
A storage trim that fell due during the suspension runs on the next hourly sweep, with no fresh
warning to the hosts.

## 3. Admins: the decision form

### 3.1 New request fields

| Field | Rule |
|---|---|
| `suspendEvent` | Offer it only when `allowedActions.suspendEvent` is true. It is true even when the item is gone, because the case still names its event. |
| `ground` | Required with any action, null otherwise. |
| `rule` | Required with any action, null otherwise. |
| `explanation` | Required with any action, null otherwise. 20–2000 characters **after trimming**. It is sent to the people affected, so the form should say so. |

Send `null` for all three on a dismissal, and on an ACTION_TAKEN closing with no action (the item is gone).

### 3.2 Responses

| Status | Meaning |
|---|---|
| 200 | `ModerationDecisionDto`, now with `eventSuspended`, `ground`, `rule`, `explanation`. |
| 400 `3039` | The statement is missing or partial with an action, given on a dismissal (an empty string counts) or without an action, or the explanation is outside 20–2000 characters after trimming. |
| 400 `3002` | An unknown `ground` or `rule` value (`MALFORMED_REQUEST_BODY`): a client bug. |
| 400 `3039` | Also `suspendEvent` when the case's event no longer exists. |
| 409 `5110` | The StoryWall is already suspended, by another case or another admin. Reload the case. |

### 3.3 Who gets an email

One email per account, listing every action that hit it:
- the item's author for content removed, member removed, banned, account suspended;
- every host and co-host for a StoryWall suspension, and again when it is lifted or closed.

Admins and people without an account (QR uploads) get nothing. The confirm summary should say who
will be emailed.

## 4. Admins: the case drawer

- Decisions now carry `eventSuspended`, `ground`, `rule` and `explanation`. Show them in the history.
- `ModerationCaseDetailDto.eventSuspension` is set while the case's event is suspended (by this
  case or another), closed or not.
- Not closed (`closedAt` null): show "Lift StoryWall suspension" and "Close StoryWall", each with
  a confirm. The close confirm says it is permanent and names `deletesOn` (the date a close now
  would set).
- Closed: show that it is closed and when it is deleted. No buttons.

`DELETE /api/admin/moderation/event-suspensions/{eventId}` lifts:

| Status | Meaning |
|---|---|
| 204 | Lifted. Every host is emailed that the StoryWall is available again. Refetch the case. |
| 404 `2001` | The event no longer exists. |
| 409 `5111` | Already lifted by someone else. Treat as done and refetch the case. |
| 409 `5112` | Closed by someone else. Refetch the case. |

`POST /api/admin/moderation/event-suspensions/{eventId}/close`, no body, closes:

| Status | Meaning |
|---|---|
| 204 | Closed. Every host is emailed a statement with the deletion date. Refetch the case. |
| 404 `2001` | The event no longer exists. |
| 409 `5111` | Not suspended (lifted by someone else). Refetch the case. |
| 409 `5112` | Already closed by someone else. Treat as done and refetch the case. |

Closing sends no statement email if the suspending decision row is missing or has no ground or rule
(the server logs a warning). Through the API that cannot happen, but the 204 does not promise an
email.

`AdminAuditAction` gains `EVENT_SUSPENDED`, `EVENT_SUSPENSION_LIFTED`, `EVENT_CLOSED` and
`STATEMENT_OF_REASONS_SENT` (target `USER`, details `{decisionId, actions}`).

## 5. Rules and Guidelines sections

| `GuidelinesRule` | Section |
|---|---|
| `ILLEGAL_CONTENT` | 3 |
| `SEXUAL_CONTENT` | 4 |
| `MINORS` | 5 |
| `HARASSMENT` | 6 |
| `HATE_AND_VIOLENCE` | 7 |
| `IMPERSONATION` | 8 |
| `PRIVACY` | 9 |
| `INTELLECTUAL_PROPERTY` | 10 |
| `SPAM` | 11 |
| `COMMERCIAL_USE` | 12 |
| `GIFT_LIST_MISUSE` | 13 |
| `QR_UPLOAD_MISUSE` | 14 |
| `MALICIOUS_TECHNICAL_USE` | 15 |

The statement emails link to `/legal/community-guidelines#section-N`, so the Guidelines page must
give every numbered level-2 heading the id `section-N`.
