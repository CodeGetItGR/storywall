# FE integration: the gallery QR link needs Gallery on and `qrUploadEnabled` true

Shipped 2026-09-24. Hosts can no longer switch Gallery themselves; it follows the plan (see
`plan-owned-modules-fe-integration.md`). No endpoint, request, response shape, or error code changed. Read this if your
FE lists an event's QR links (`GET /api/events/{eventId}/qr-links`), renders a scanned link
(`GET /api/qr/{token}`), or shows the Gallery module's state.

## What changed

The auto-generated `MEDIA_UPLOAD` ("Gallery Upload") link is now minted only when **both** hold:

1. **The Gallery module is enabled for the event.** That is the same check that allows an upload
   (`isAvailable: true` on the `gallery` row of `GET /api/events/{eventId}/modules`):
   - the plan includes `gallery`, **or** the event holds a `MODULE_UNLOCK` add-on for it
   - `gallery` is not switched off platform-wide
   - the event's own Gallery switch (`isEnabled`) is on
   - the event is `ACTIVE`
2. **`gallery.configuration.qrUploadEnabled` is `true`.** A missing key now counts as off.

Before this, only `qrUploadEnabled` was checked, and a missing key counted as on. An event whose plan
did not include Gallery still got an upload link. That link showed as `ACTIVE`, and every upload
through it failed with `409 / 5012`.

The same check decides the link's `status`. If either condition stops holding, an existing link
reports `TARGET_UNAVAILABLE` in the host's list and on scan. It works again as soon as both hold.

## When the link is minted

| Moment | Result |
|---|---|
| Event activates, both conditions hold | `EVENT_JOIN` + `MEDIA_UPLOAD` minted |
| Event activates, either condition fails | Only `EVENT_JOIN` minted |
| Upgrade to a plan that includes Gallery (with `qrUploadEnabled: true`) | `MEDIA_UPLOAD` minted shortly after (async) |
| Downgrade drops Gallery | Link **kept**, reports `TARGET_UNAVAILABLE` |

A `MODULE_UNLOCK` for Gallery can only be bought while the event is `DRAFT`, so it is already in
place when the event activates.

On a downgrade the link is kept, not deleted. Its token is printed on the cards. Deleting it would
mean a re-upgrade mints a new token and the printed cards stay dead.

## What the FE should do

- [ ] Don't assume every active event has an auto-generated `MEDIA_UPLOAD` link. Without Gallery,
      or with `qrUploadEnabled: false`, there is only the `EVENT_JOIN` one.
- [ ] After an upgrade that adds Gallery, the upload link appears asynchronously. Refetch
      `GET /api/events/{eventId}/qr-links`. Don't expect it in the upgrade's own response.
- [ ] Where you would show the gallery link and there isn't one, show why: the Gallery upsell when
      the module is `isAvailable: false`, or nothing when `qrUploadEnabled` is `false`.

## Data fix shipped with this (V108)

The `GENDER_REVEAL` and `BABY_SHOWER` types were added (V88) without `qrUploadEnabled` on their
Gallery config. Under the new rule they would have had no upload link. V108 sets the flag to `true`
wherever it was missing (type defaults, plan configs, events). An explicit `false` is left as it is.

Related: `default-qr-links-fe-integration.md`, `qr-link-host-lockdown-fe-integration.md`,
`event-type-feature-toggles-quotas-fe-integration.md` (the `qrUploadEnabled` flag).
