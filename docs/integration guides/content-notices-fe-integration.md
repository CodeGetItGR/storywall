# FE integration: public content notices (DSA Art. 16)

Shipped 2026-10-01. A public form anyone can use to report content, and an admin Notices tab to
work through what comes in. Migration **V133**. New error code: **5109**. Types are in
`frontend-api-types.ts` ("Public content notices" block, plus `ModerationReportDto.noticeReference`
and four new `AdminAuditAction` values).

Nothing breaks for existing screens. The only change to an existing response is one new field,
`noticeReference`, on `ModerationReportDto` (§4).

Every `| null` field is sent as `null`, never left out. The error code is in the JSON field
`errorCode`.

## 1. The public form: `POST /api/content-notices`

No login, no token. It is exempt from the Community Guidelines acceptance gate (4013), so that a
signed-in user who has not accepted the current Guidelines can still send a notice. The form sends
no `Authorization` header.

### 1.1 Body

| Field | Rule |
|---|---|
| `category` | Required. One of `PERSONAL_DATA_OR_IMAGE`, `COPYRIGHT`, `HARASSMENT_OR_HATE`, `CHILD_SEXUAL_ABUSE`, `OTHER_ILLEGAL`, `GUIDELINES_BREACH`. |
| `locationText` | Required, 10 to 2000 characters **after trimming**. Where the content is: an event name, a link, a description. |
| `link` | Optional, an `http://` or `https://` URL, max 2000. |
| `explanation` | Required, 10 to 5000 characters after trimming. Why the sender thinks it is illegal or breaks the Guidelines. |
| `notifierName` | Max 200. Required unless `category` is `CHILD_SEXUAL_ABUSE`. |
| `notifierEmail` | Valid email, max 320. Required unless `category` is `CHILD_SEXUAL_ABUSE`. Stored lower-cased. |
| `goodFaith` | Required, must be `true` (the sender confirms the notice is accurate and made in good faith). |
| `website` | The honeypot (§1.3). Always send an empty string. |
| `locale` | Optional, max 10 characters. Anything starting with `el` selects Greek for the emails; everything else is English. |

**The CSAM identity exception.** Art. 16(2)(c) lets a sender of a child-sexual-abuse notice stay
anonymous. For `CHILD_SEXUAL_ABUSE` the form must leave name and email optional, say so, and send
them only when filled. For every other category both are required.

### 1.2 Responses

| Status | Meaning |
|---|---|
| 202 | `{ "reference": "AB12CD34" }`. Show it as `#AB12CD34` and tell the sender it is the number to quote if they write to us. A confirmation email is sent when an address was given. |
| 400 / `3001` | Validation failed. Bean-validation failures (length, email, URL, `goodFaith`) carry an `errors` map: map it onto the form fields. Failures thrown by the service (name or email missing for a non-CSAM category, text under 10 characters after trimming) are also `3001` but have **no** `errors` map: show a form-level message. |
| 400 / `3002` | Malformed JSON or an unknown `category`. A bug in the client, not something to show field by field. |
| 429 | Rate limited (§1.4). Show "try again later" and read `Retry-After`. Do not retry in a loop. |

Do not branch on the `reference` value. It is 8 upper-case hex characters.

### 1.3 The honeypot

A bot that fills in `website` gets a normal-looking 202 with a random reference, and **nothing is
stored**. The FE must make the field invisible to people and unusable by assistive tech and
autofill:

- the input is named `website`;
- visually hidden (off-screen CSS, not `display: none`, which some bots skip);
- `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden="true"`;
- always sent, as `""` for real people.

### 1.4 Rate limits and the per-email trade-off

- **10 per hour per IP.** The limit is per user id when a valid token is sent; the form sends none.
- **5 per day per notifier email.** The address is trimmed and lower-cased. Invalid requests (400)
  and honeypot hits do not spend it. Anonymous CSAM notices have no address, so only the IP limit
  applies to them.

The per-email budget has a known trade-off. It is keyed on a value the sender types, so someone can
spend another person's 5 by submitting with that person's email. That person then gets 429 for up
to 24 hours, counted from the first request, when they try to send a notice. It was accepted
because:

- it is costly at scale: five valid, stored notices per victim, all visible to admins, and the
  10 per hour IP limit means about 2 victims per hour per IP;
- it is noisy: the victim receives a receipt for each notice;
- without it, one IP could send about 240 receipt emails a day to an address it does not own, and
  the cap reduces that to 5.

The cap does **not** protect the admin queue; the IP limit does.

Both limits are in memory and per instance (see the `RateLimiter` javadoc). With several replicas
the effective budget multiplies, and a restart resets it.

The design spec records the limits but gives no reason for them; the reasons above are engineering
rationale. The FE copy for a 429 must not blame the sender. Once the reports email
(`LEGAL_REPORTS_EMAIL`) is configured and exposed to the FE, point to it there: today it defaults to
empty, Guidelines §28 is still a TODO, and it is not in `/api/config`.

## 2. Admin Notices tab

All endpoints are under `/api/admin/moderation/notices` and need a platform admin (403 `4001`
otherwise). Writes also go through the Guidelines gate (4013).

| Method | Path | Returns | Audit log |
|---|---|---|---|
| GET | `?status=NEW\|CLOSED&page&size` | `Page<ContentNoticeSummaryDto>` | no |
| GET | `/{id}` | `ContentNoticeDetailDto` | **every call**: `NOTICE_VIEWED` |
| GET | `/{id}/events?q=&hostEmail=&date=` | `Page<NoticeEventCandidateDto>` | no |
| GET | `/{id}/events/{eventId}/items?type=` | `Page<NoticeItemCandidateDto>` | `EVENT_BROWSED` on **page 0 only** |
| POST | `/{id}/attach` | `ContentNoticeDetailDto` | `NOTICE_ATTACHED` |
| POST | `/{id}/close` | `ContentNoticeDetailDto` | `NOTICE_CLOSED` |

`sort` is ignored everywhere. Pages use the usual paged shape (see
`admin-list-endpoints-pagination-fe-integration.md`).

### 2.1 List

`GET /api/admin/moderation/notices?status=NEW&page=0&size=50`

- `status`: `NEW` (default) or `CLOSED`. `CLOSED` covers both `ATTACHED` and `CLOSED` notices. Anything
  else is 400 `3001`.
- `NEW` is **oldest first** (the queue to work through). `CLOSED` is **newest first**.
- Rows carry `locationExcerpt` (first 120 characters, plus `…` when longer), never the notifier's name or email.
- `outcome` is `null` until the attached case is decided, then `DISMISSED` or `ACTION_TAKEN`.

### 2.2 Detail (the drawer)

`GET /api/admin/moderation/notices/{id}` returns the full notice, including `notifierName` and
`notifierEmail`, and `attachment` (`{reportId, eventId, targetType, targetId}`). `attachment` is
`null` unless `status` is `ATTACHED`, and also `null` for an `ATTACHED` notice whose event was
purged (the report is deleted with the event).

**Every call writes a `NOTICE_VIEWED` row that can never be deleted.** So the drawer must fetch
**once per opening**, with the same query options as the case drawer in
`moderation-admin-fe-integration.md` §2.2: no prefetch on hover, `refetchOnWindowFocus: false`,
`refetchOnReconnect: false`, a long `staleTime`, `retry: false`, and a refetch only on purpose.
Opening it again is a new fetch. The
attach and close responses are the updated detail, so write them into the cache instead of
refetching.

### 2.3 Find the event

`GET /{id}/events?q=&hostEmail=&date=YYYY-MM-DD&page&size` (default size 20)

- `q` matches the event title, case-insensitively, and Greek final sigma (`ς`) and `σ` match each
  other. It is **not** accent-insensitive: `ελενη` does not find `Ελένη`, so the admin must type
  the accents the title has.
- `hostEmail` matches a host's account email exactly (case-insensitive).
- `date` matches events that start on that day in Athens time (`Europe/Athens`), whatever the
  event's own time zone.
- Give at least one of the three. With none, the page is empty.
- `q` over 200 characters or `hostEmail` over 320 is 400 `3001`.
- Rows are event metadata only (title, start, primary host name, status, `deleted`). The search
  writes no audit row because it exposes no content.

### 2.4 Pick the item (logged)

`GET /{id}/events/{eventId}/items?type=POST&page&size` (default size 30)

- `type` is a `ReportTargetType`: `POST`, `COMMENT`, `STORY`, `MEDIA`, `WISHBOOK_ENTRY`,
  `PLAYLIST_SUGGESTION` or `MEMBER`.
- This is where an admin sees event content, so **page 0 of each call writes an `EVENT_BROWSED`
  row** (notice id, event id and type). Later pages do not.
- Therefore: **never prefetch the types**, never load all seven tabs at once, never refetch on
  window focus, and fetch a type only when the admin opens that type. Fetch page 0 once per type
  per opening of the picker, then paginate with `page >= 1`.
- Deleted items and comments under deleted posts are not listed. (Attach (§2.5) refuses them too.)
- 404 `2001` when `eventId` does not exist.

### 2.5 Attach

`POST /{id}/attach` with `{ "eventId": "...", "targetType": "POST", "targetId": "..." }`

All three fields are required. It creates an ordinary report on the item (reason mapped from the
notice category, no reporter) and sets the notice to `ATTACHED`. The item then shows up in the
Reports cases queue, and is decided there like any other case. Returns the updated detail.

- **404 / `2001`** when the item is missing, deleted, belongs to a different event than `eventId`,
  or is a comment under a deleted post. One code for all four, on purpose.
- **409 / `5109`** when the notice is no longer `NEW`.

### 2.6 Close

`POST /{id}/close` with `{ "reason": "NO_BREACH", "note": "optional, max 2000" }`

`reason` is `NOT_FOUND`, `NO_BREACH`, `ALREADY_HANDLED` or `SPAM`. The notifier is emailed the
reason, **except for `SPAM`, which is closed silently**. The note is for admins only. Returns the
updated detail. 409 / `5109` when the notice is no longer `NEW`.

### 2.7 Error 5109 `NOTICE_ALREADY_HANDLED`

Two admins can open the same notice. The loser of the race gets 409 `5109` from **attach, close and
both browse endpoints** (the browse endpoints refuse a notice that is no longer `NEW`). On `5109`:
show "This notice was already handled", refetch the notice **once** (that is a new `NOTICE_VIEWED`,
which is correct, the admin is looking at it again) and invalidate both lists.

## 3. When the case is decided

Deciding the attached case (Reports tab) records the outcome on the notice (`outcome` on the
summary and detail) and emails the notifier the result. Nothing for the FE to call.

## 4. The case drawer: `noticeReference`

`ModerationReportDto.noticeReference` is the notice's reference when the report came from a public
notice, and `null` for reports filed by members. In the case drawer's report list, when it is set,
show `Public notice · #AB12CD34` in place of the reporter name (these reports have no reporter,
so `reporterMemberId` and `reporterDisplayName` are `null` too).

## 5. Greek copy

App and FE Greek uses the formal plural («Στείλτε», «Επιβεβαιώστε», «σας»), for the form, the
errors and the admin tab. The Community Guidelines document is the exception: it uses the informal
singular and is called «Κανόνες Κοινότητας».
