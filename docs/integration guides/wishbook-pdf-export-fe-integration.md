# FE integration guide: wishbook PDF export

Covers a new endpoint shipped 2026-09-05: a host can now download the event's wishbook as a
single PDF. See [`wishlist-wishbook-cohost-fe-integration.md`](wishlist-wishbook-cohost-fe-integration.md)
§4 for the wishbook module itself (reading/writing/deleting wishes); this doc only covers the new
export endpoint.

## What's new

```
GET /api/events/{eventId}/wishbook/export
```

- **Host only.** Any other member gets `403` / `errorCode: 4001` (`FORBIDDEN`) — same as every
  other host-only export in this app.
- **No query params, no report variants.** Unlike the RSVP export (`GET
  /api/events/{eventId}/rsvps/export?reportType=...`), there is only one wishbook report shape.
  Don't build a picker for this one.
- Returns `Content-Type: application/pdf` with `Content-Disposition: attachment;
  filename="wishbook.pdf"`.
- Rate-limited to 10 requests per 60 seconds per caller (bucket name `wishbook.export`) — same
  budget shape as the RSVP export. A caller hammering the button will get a `429` past that.
- Respects the caller's locale (`Accept-Language`) the same way every other localized export in
  this app does — no separate locale parameter to pass.

## What the PDF contains

One PDF, generated fresh on every request (nothing is cached or stored server-side):

- Event title, then a wish count line ("N wishes") and a "Generated on {date}" line.
- One bordered card per non-deleted wish, oldest first: the guest's name (bold), their message,
  then a small muted timestamp. There's no pagination in the API response for this — the export
  always includes every wish on the event in one document.
- If the event has no wishes yet, the PDF says so in a single line instead of showing empty cards.

## How to wire it up

This is a binary download, not a JSON endpoint — fetch it as a blob and let the browser save it,
the same way you'd already handle the RSVP export if that's built:

```ts
async function downloadWishbookPdf(eventId: string) {
  const res = await fetch(`/api/events/${eventId}/wishbook/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // 403 -> not a host; 404 -> event doesn't exist; 429 -> rate limited
    throw await parseApiError(res);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wishbook.pdf'; // or read the filename out of Content-Disposition
  a.click();
  URL.revokeObjectURL(url);
}
```

Show the download control only where the caller is already known to be a host (e.g. next to the
existing wishbook module settings on the host's event dashboard) — the API will still enforce it,
but there's no reason to render a button that will always 403 for a guest.

## Errors worth handling

| Status | `errorCode` | Meaning |
|---|---|---|
| 403 | 4001 (`FORBIDDEN`) | caller is a member but not a host |
| 401 | — | no/invalid auth |
| 404 | 2001 (`RESOURCE_NOT_FOUND`) | event doesn't exist |
| 429 | — | more than 10 requests in 60 seconds |

## What did not change

- The existing wishbook read/write/delete endpoints (`GET/POST /api/events/{eventId}/wishbook`,
  `GET .../wishbook/count`, `DELETE /api/wishbook/{entryId}`) — unaffected.
- Who can *read* wishes in-app is still every member (`isAuthenticated()`); the export is the one
  wishbook surface that's host-only, since a downloadable archive was a deliberate product choice
  to keep with the people running the event rather than a privacy requirement.
