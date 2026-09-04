# Integration Guide: RSVP report types (breaking change to export)

Added 2026-09-04, PDF layout polished same day. Supersedes the "New endpoint: PDF export"
section of `rsvp-boolean-status-and-export-fe-integration.md` — the endpoint now requires a
`reportType` parameter.

## What changed

`GET /api/events/{eventId}/rsvps/export` now **requires** a `reportType` query parameter.
Calling it without one now returns `400` instead of the old combined stats+table PDF.

```
GET /api/events/{eventId}/rsvps/export?reportType=STATISTICS
GET /api/events/{eventId}/rsvps/export?reportType=FULL_LIST
GET /api/events/{eventId}/rsvps/export?reportType=ATTENDING_ONLY
GET /api/events/{eventId}/rsvps/export?reportType=WITH_CHILDREN
```

Same auth as before (host-only, `403`/`errorCode: 4001` for non-hosts, `404` for an unknown
event), same rate limit (10 requests/60s, shared across all four report types), still returns
`application/pdf` — only the `Content-Disposition` filename differs per type:

| `reportType` | Content | Columns | Filename |
|---|---|---|---|
| `STATISTICS` | Counts (total/attending/declined/no-response/headcount) + a bar chart with a labeled legend. No attendee table. | — | `rsvp-statistics.pdf` |
| `FULL_LIST` | Every RSVP'd guest. | Name, Status, Adults, Children, Phone, Notes | `rsvp-full-list.pdf` |
| `ATTENDING_ONLY` | Filtered to `attendanceStatus: ATTENDING`. **No Status column** — every row is attending by definition, so it was dropped as dead weight rather than printing "Yes" on every line. | Name, Adults, Children, Phone, Notes | `rsvp-attending.pdf` |
| `WITH_CHILDREN` | Filtered to `childCount > 0`. Can include both attending and declined guests, so it keeps Status. | Name, Status, Adults, Children, Phone, Notes | `rsvp-with-children.pdf` |

An invalid `reportType` value (e.g. a typo) gets `400` the same way a malformed UUID path
variable does — no special-cased error body, just the generic validation-failure shape.

The `Generated ...` line at the top of every PDF is a human-readable timestamp (e.g.
"Generated September 4, 2026 at 1:36 PM"), not a raw ISO instant — nothing for FE to parse or
reformat, it's baked into the PDF as plain text.

## Suggested FE mapping to a Reports tab

If you're building a Reports tab with one tile per type: `STATISTICS` → "Statistics report",
`FULL_LIST` → "Full list", `ATTENDING_ONLY` → "Only those attending", `WITH_CHILDREN` →
"Guests with children". There is no catering/menu report — that domain isn't modeled anywhere
in the API.

## Suggested preview flow

There's no separate JSON preview endpoint. Fetch the PDF blob and render it in an inline PDF
viewer (`<iframe>`/`<embed>` with an object URL, or a PDF.js viewer) before offering
download/print — the same bytes serve both the preview and the "download PDF" action, and the
browser's native print dialog on that view covers "print" for free.

## Edge cases (unchanged from the previous export)

- A caller who is not the host gets `403` with `errorCode: 4001`.
- An unknown `eventId` gets `404`.
- Members who haven't submitted an RSVP are never listed by name in any of the four reports —
  in `STATISTICS` they're only counted under "No response"; the three list reports simply
  don't include them (nothing to filter for/against).
