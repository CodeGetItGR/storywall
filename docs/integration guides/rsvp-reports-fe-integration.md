# Integration Guide: RSVP reports by session

Added 2026-09-25. Supersedes the layout parts of `rsvp-report-types-fe-integration.md`. The four
report types and the PDF endpoint stay; what they contain changed, and there is now a JSON twin.

## What changed

1. **New:** `GET /api/events/{eventId}/rsvps/report?reportType=…` returns the report as JSON.
2. The PDFs (`/rsvps/export`, same URL, parameters, file names and 10/60s limit) are drawn from
   that same object: header, four tiles, then categories (STATISTICS) or grouped guest lists.
3. **Session answers exist only when given.** Nothing pre-creates `isAttending: true` rows any
   more, a new session backfills nothing, and **declining deletes the RSVP's session answers**.
   `GET /api/rsvps/{rsvpId}/session-responses` returning no row for a session means "no answer".
4. **New error `409 / 5087 RSVP_NOT_ATTENDING`** on `POST /api/rsvp-session-responses` and
   `PATCH /api/rsvp-session-responses/{id}` when the RSVP is `DECLINED`.
5. Removed members (`deletedAt` set) are in no count: not `rsvpSummary`, not any report.

## The endpoint

| Case | Response |
|---|---|
| Host | `200`, `RsvpReportDto` |
| Not a host | `403`, `errorCode: 4001` |
| Unknown event | `404` |
| RSVP module not readable | `409`, `errorCode: 5012` |
| Missing or unknown `reportType` | `400` |

Rate limit `rsvp.report`: 60 per 60 seconds. Labels come back in the request's `Accept-Language`
(`el` or `en`), ready to print.

## The object

See `RsvpReportDto` in `docs/frontend-api-types.ts`. Sections that don't apply to the report type
are `null`, never `[]`; `[]` means "applies, nothing to show".

| `reportType` | `categories` | `sessions` | `groups` |
|---|---|---|---|
| `STATISTICS` | list | list | `null` |
| `FULL_LIST` | `null` | `null` | attending groups, then the declined group |
| `ATTENDING_ONLY` | `null` | `null` | attending groups |
| `WITH_CHILDREN` | `null` | `null` | attending groups, rows with `children > 0` only, empty groups dropped |

`totals` always covers the whole event: `responses` = attending + declined RSVPs; `people`,
`adults`, `children` sum attending RSVPs. Members who never answered appear nowhere; use
`rsvpSummary.noResponse` for that number.

## Categories

The **report sessions** are the event's live sessions with `rsvpEnabled: true`, in `displayOrder`.
There are none while the `schedule` module isn't readable for the event (not in the plan, switched
off, or disabled platform-wide): guests can't answer sessions then, so the report falls back to
Attending / Not attending. Saved answers are kept and count again once the module is back.
An attending RSVP's category is which of them it said yes to (`comingSessionIds`) and which it left
unanswered (`noAnswerSessionIds`). With sessions Ceremony and Reception:

| Answers | Label (en) | Label (el) |
|---|---|---|
| yes, yes | Ceremony + Reception | Ceremony + Reception |
| yes, no | Only Ceremony | Μόνο Ceremony |
| no, no | Not at: Ceremony, Reception | Όχι σε: Ceremony, Reception |
| yes, — | Ceremony · no answer: Reception | Ceremony · χωρίς απάντηση: Reception |
| no, — | Not at: Ceremony · no answer: Reception | Όχι σε: Ceremony · χωρίς απάντηση: Reception |
| —, — | no answer: Ceremony, Reception | χωρίς απάντηση: Ceremony, Reception |
| no report sessions | Attending | Θα έρθουν |
| declined | Not attending | Δεν θα έρθουν |

Order: complete answers first, then more yes-sessions, then earliest yes, then earliest
unanswered; declined last. STATISTICS always includes the declined category, even at 0.

`percentOfPeople`: each attending category's people over all attending people, whole numbers that
sum to exactly 100 (largest remainder). `null` for declined, which counts households.

`sessions[]`: per report session, `people` said yes and `noAnswerPeople` haven't answered.
Adults/children per session aren't tracked.

## What storywall must change

- Stats tab: read tiles, categories and per-session lines from `STATISTICS`; stop summing
  RSVPs client-side (that sum included hosts' RSVPs).
- Reports tab: each row opens a report page drawn from this object; the page's "Download PDF"
  keeps using `/rsvps/export`.
- RSVP form: every shown session question is required before "coming" can be submitted;
  don't send answers for a decline. Storywall treats an RSVP as final (no edit form), so it
  doesn't pre-fill; a client with an edit form would read `GET /api/rsvps/{rsvpId}/session-responses`.
  On `5087`, refetch the RSVP.
- Roster list: drop members with `deletedAt` set.
