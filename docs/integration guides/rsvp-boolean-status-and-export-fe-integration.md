# Integration Guide: RSVP is now yes/no, plus PDF export

Added 2026-08-30.

## What changed

`AttendanceStatus` no longer has a `MAYBE` value. Only `ATTENDING` and `DECLINED` are valid on
`Rsvp.attendanceStatus`, `RsvpRequestDto`, and `RsvpPatchDto`. Any FE code that rendered a
three-way "Yes / No / Maybe" control should become a two-way "Yes / No" toggle.

`EventRsvpSummaryDto` (returned as `rsvpSummary` on `EventDetailResponseDto`) no longer has a
`maybe` field:

```ts
interface EventRsvpSummaryDto {
  totalMembers: number;
  attending: number;
  declined: number;
  // maybe: number;  // REMOVED
  noResponse: number;
}
```

## New endpoint: PDF export

`GET /api/events/{eventId}/rsvps/export` — host-only (same authorization as
`GET /api/events/{eventId}/rsvps`). Returns `application/pdf` bytes with
`Content-Disposition: attachment; filename="rsvps.pdf"` — a summary of RSVP counts plus a table
of every attendee who has responded (name, yes/no, adult/child counts, phone, notes).

Trigger it from the FE the same way any file download is triggered: point a link/button at the
URL with the auth header attached, or fetch the blob and hand it to the browser's save flow.

## Edge cases

- A caller who is not the host gets `403` with `errorCode: 4001`, same as the existing RSVP list
  endpoint.
- An unknown `eventId` gets `404`.
- Members who haven't submitted an RSVP at all are not listed by name in the PDF — only counted
  under "No response" in the summary.
