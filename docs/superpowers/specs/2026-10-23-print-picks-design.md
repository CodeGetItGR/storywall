# Print picks — design

Date: 2026-10-23
Status: approved
Scope: vendor services (shared infra), phase 1 host print picks, phase 2 guest print picks. Builds on [Vendors in the event](2026-10-19-vendors-in-the-event-design.md), whose "Pro album" row deferred picks and full-quality download to a later phase.

## Goal

Let the host, and later guests, mark gallery photos for print, so the event's photographer gets one clear list with sizes, copies and prices, and downloads the files in one go. Today the gallery's multi-select only downloads, and print orders happen over chat with no list and no price.

Every pick shows a price (or that the photographer sets one), so nobody assumes printing is free. Paying and printing stay between the photographer and the person who picked.

## Decisions

| Topic | Decision |
| --- | --- |
| Fulfilment and payment | Off-platform. StoryWall shares the list, the files and the prices. The photographer prints, bills and delivers. |
| Services | A generic services list on the vendor profile, shared by every vendor type: label, price, kind. Print picks use the photographer's `PRINT` services as print sizes. Other types can list services later for the partner card and partner page. |
| Who can price | Approved partners only: an active `Collaborator` whose contact email matches the vendor's account email (the same match `VendorService.showPartnerPrompt` uses). Other vendors have no services list. |
| Print sizes | A `PRINT` service is one size with a price per copy (EUR). Each pick has a size and a number of copies. Default: the first size, 1 copy. |
| Which vendors | `PHOTOGRAPHER` only, through a new capability `PRINT_PICKS`. |
| Which media | Photos only. The print action is hidden for videos. |
| Files | Best available: the original when the event has the "keep originals" add-on, the stored copy otherwise (longest side 2560px, JPEG quality 0.82, fine up to about 20x30 cm). |
| Deadline | The vendor access window. Lists can change until `accessEndsAt`, then freeze, and the photographer's access ends with it. |
| Two photographers | Every list is addressed to one photographer and uses their sizes. With one photographer, nothing extra shows. With two, the host and guests choose whose list they are building. |
| Host list | Live: the photographer sees changes as they happen. No send step. |
| Host package | Per event, each photographer sets "prints included" for the host. The host sees "12 of 40 included" and the price of the copies beyond it. |
| Guest picks | Phase 2. The guest pays. A guest builds a list, then sends it. A sent list is locked; the guest can start a new one until the deadline. No cap from the host. |
| Guest scope | Per plan: off, own uploads, or any photo. The host chooses within the plan's limit. |
| Guest contact | On send, the guest confirms that their email (and an optional phone) is shared with that photographer. |
| Who sees guest lists | Only the photographer. The host never sees them and cannot remove a guest's pick. |
| Without prices | Guest picks need a photographer with at least one `PRINT` service. Host picks still work without one: copies only, no size, "Your photographer sets the price". |
| Notifications | The photographer gets an in-app notice and an email for each guest list sent. One reminder 3 days before access ends if the host has picks. No notice per host change. |
| Limits | 100 photos per list, the same as `media.archive.max-selected-items`. Up to 8 `PRINT` services per profile. |

## Vendor services (shared infra)

Built with phase 1, because host picks use it.

- **Data:** `vendor_services`: `id`, `vendor_profile_id`, `kind` (`PRINT`, `OTHER`), `label` (max 40), `price_cents`, `currency` (`EUR` only for now), `sort_order`, `created_at`, `updated_at`. Account-level, like the profile.
- **Kinds by type:** `PRINT` is offered to `PHOTOGRAPHER` profiles only. `OTHER` is in the enum for later phases (planner packages, music sets) and is not shown in any UI yet.
- **Editing:** a "Services" section on the vendor page, shown only to approved partners. Compact read-only rows (label, price). "Add size" and a row tap open a focused sheet, with delete inside the sheet behind a confirmation modal.
- **Non-partners:** the section shows one line, "Approved partners can list prices.", with the existing "Become a partner" sheet.
- **Partner later:** if a vendor stops being an approved partner, their services stay stored but are hidden and unused. Lists already sent keep their copied prices.

## Phase 1: host picks

### Host

- **Gallery multi-select:** a "Print" action next to Download in `GallerySelectionBar` (mobile) and `GallerySelectionActions` (desktop). It adds the selected photos to the host's list, 1 copy at the default size. Videos in the selection are skipped, with a short line saying so.
- **Photo viewer:** a "Print" toggle on a photo (`GalleryViewer`). Picked photos get a small print badge in the grid.
- **Prints sheet:** opened from a "Prints · 12" pill in the gallery header when the list has items. A list of thumbnails with size and copies per row, a remove control per row, and a total line: "12 of 40 included · 3 more · €9.00". With two photographers, a switch at the top chooses the list.
- **Host and photographer gating:** the actions appear only while the event has a `PHOTOGRAPHER` vendor whose access window is open and the Vendors module is on.

### Photographer

- **Vendor page:** a "Prints" section in `VendorMeScreen` (after Tools, before Pro album) when `PRINT_PICKS` is open. It contains:
  - "Prints included for the host", a number set in a small sheet (0 by default).
  - The host's list as compact rows: thumbnail, size, copies. Then one total line, and "Download all".
- **Download:** a zip of the list's files (best available variant), streamed by the existing selected-archive path in parts, named `prints-host.zip`. A text file `prints.txt` in the zip lists file name, size and copies per photo, so the print lab gets the order with the files.
- **After access ends:** the section is gone, like every vendor tool.

### Backend (phase 1)

- `VendorCapability.PRINT_PICKS(EnumSet.of(PHOTOGRAPHER))`, mirrored in `CAPABILITY_TYPES` in `lib/vendors.ts`.
- **Data:**
  - `print_lists`: `id`, `event_id`, `event_vendor_id` (the photographer), `owner_member_id`, `owner_kind` (`HOST`, `GUEST`), `status` (`OPEN`, `SENT`), `sent_at`, `contact_email`, `contact_phone`, `created_at`, `updated_at`. One `OPEN` host list per event and photographer (unique partial index).
  - `print_list_items`: `id`, `print_list_id`, `media_id`, `vendor_service_id` (nullable: no size), `copies` (1–99), `unit_price_cents` and `size_label` (copied on send, null while open; the host list is never sent, so it always shows the current prices), `removed_at` (set when the photo is deleted). Unique on `print_list_id` + `media_id`.
  - `event_vendors.host_prints_included` (int, default 0).
- **Rules:** items must be `READY` image media of the same event, not deleted. Every write checks the deadline (`VENDOR_ACCESS_ENDED` after it). Deleting a photo sets `removed_at` on its items (soft delete, so the photographer sees "1 photo removed").
- **Endpoints (proposed, final names in the backend plan):**
  - `GET`/`PUT`/`DELETE /api/me/vendor-profile/services[/{id}]`: approved partners only (`PARTNER_REQUIRED` otherwise).
  - `GET /api/events/{eventId}/print-lists/host?vendorId=`: host or the photographer (`requireHostOrVendor(…, PRINT_PICKS)`). The list, items, the photographer's sizes and `includedCount`.
  - `POST`/`PATCH`/`DELETE /api/events/{eventId}/print-lists/host/items`: host only. Add many (`{ vendorId, mediaIds }`), change size/copies, remove.
  - `PATCH /api/events/{eventId}/vendors/me/prints-included`: the photographer.
  - `GET /api/events/{eventId}/print-lists/{listId}/archive?part=`: the photographer. Reuses `MediaArchiveService`'s selected path with the `ORIGINAL` variant when the event keeps originals, else `DISPLAY`, plus `prints.txt`.
  - `GET /api/events/{eventId}/vendors` rows gain `printSizes` (label, price) for photographers, so the host's sheet can show prices.
- **Reminder:** a daily job finds host lists with items whose photographer's `accessEndsAt` is 3 days away and sends one notice (`PRINT_PICKS_ENDING`), recorded so it is sent once.
- **Audit:** host list created, photographer download started. No personal data.
- **Export and deletion:** `MeDataExportService` includes services and print lists. Deleting an account removes its services and its open lists; sent lists keep items but drop contact fields.

### Frontend (phase 1)

- `hooks/usePrintLists.ts`: `printListKeys`, `useHostPrintList(eventId, vendorId)`, add/update/remove mutations with optimistic updates.
- `hooks/useVendorServices.ts`: list and mutations for the profile's services.
- `lib/printPicks.ts`: totals (included, extra copies, price), default size, which selected items are printable.
- `components/gallery/print/`: `PrintSheet.tsx`, `PrintRow.tsx`, `PrintTotal.tsx`, `PrintBadge.tsx`, `PrintPill.tsx`.
- `components/vendors/me/`: `PrintsSection.tsx`, `PrintsIncludedSheet.tsx`, `ServicesSection.tsx`, `ServiceSheet.tsx`.
- `lib/vendors.ts`: `PRINT_PICKS` in `CAPABILITY_TYPES`.
- **Prefetch:** the vendor page's server `page.tsx` seeds `printListKeys.host(eventId, vendorId)` and the services list when the caller is the photographer. The gallery page seeds the host list for hosts. Both follow the CLAUDE.md pattern (per-request client, best-effort, same gating as the client).
- Copy in en and el (`Vendors.prints`, `Vendors.services`, `GalleryPage.print`).

## Phase 2: guest picks

### Plan and host settings

- **Plan key:** the `vendors` module config gains `guestPrintPicks`: `OFF`, `OWN`, `ANY` (missing reads as `OFF`, like the other keys). Proposed defaults: Basic `OFF`, Plus `OWN`, Pro `ANY`. Admin plan editing shows it as one segmented control with a one-line caption, per the admin design rules.
- **Host setting:** `events.guest_print_picks` (`OFF`, `OWN`, `ANY`, default `OFF`), capped by the plan. In Manage → Vendors, one segmented control: "Off", "Their own photos", "Any photo". It is shown only when a photographer has at least one `PRINT` service.

### Guest

- **Gallery:** the same "Print" action and viewer toggle as the host, limited to the photos the setting allows. Each pick shows the size and price.
- **Prints sheet:** like the host's, with the price on every row and a total. No included count. With two photographers, a switch chooses whose list (and prices).
- **Send:** "Send to photographer" opens a confirm step: the total, the email (prefilled from the account, read-only), an optional phone, and one line, "Your email and phone go to {photographer}, who will bill you and deliver the prints." Sending locks the list and copies sizes and prices into it.
- **After sending:** sent lists show in the sheet as read-only rows (date, prints, total). "New list" starts another until the deadline.
- **Deadline:** the photographer's access end. After it, the action and the sheet are gone; sent lists stay visible read-only to the guest for 30 days.

### Photographer

- **Vendor page:** the Prints section gets two tabs, "Host" and "Guests". "Guests" lists sent lists grouped by guest: name, email, phone, date, prints, total, and "Download". A list with removed photos shows "1 photo removed".
- **Notice:** `PRINT_LIST_SENT`, in-app and email, with the guest's name, number of prints and total.

### Backend (phase 2)

- Reuses `print_lists` with `owner_kind = GUEST`. Several `SENT` lists per guest, one `OPEN` list per guest and photographer.
- **Rules:** `OWN` allows only media the guest uploaded. `ANY` allows any `GUEST`- or `PRO`-collection photo the guest can see. The photographer needs at least one `PRINT` service and approved-partner status at send time (`PRINT_PRICES_MISSING` otherwise). A `SENT` list is immutable except `removed_at` from photo deletion.
- **Endpoints (proposed):**
  - `GET /api/events/{eventId}/print-lists/mine?vendorId=`: the guest's open and sent lists.
  - `POST`/`PATCH`/`DELETE /api/events/{eventId}/print-lists/mine/items`.
  - `POST /api/events/{eventId}/print-lists/mine/send` `{ vendorId, phone? }`.
  - `GET /api/events/{eventId}/print-lists/guests`: the photographer. Sent lists with contact fields.
  - `PATCH /api/events/{eventId}/settings/guest-print-picks`: host.
- **Rate limits:** send is limited per guest (e.g. 10 per day) so a guest can't flood the photographer's email.
- **Audit:** guest list sent (no contact data in the audit row).

### Frontend (phase 2)

- `usePrintLists.ts` gains `useMyPrintLists`, `useSendPrintList`, `useGuestPrintLists`.
- `components/gallery/print/`: `PrintSendSheet.tsx`, `SentListRow.tsx`.
- `components/vendors/me/`: `GuestPrintLists.tsx`, `GuestPrintListRow.tsx`.
- `components/manage/vendors/GuestPrintPicksControl.tsx`.
- Prefetch the guest's lists on the gallery page and the photographer's guest lists on the vendor page.

## Legal

The privacy notice gains a line that a guest who sends a print list shares their email (and phone, if given) with the event's photographer. Terms say printing and payment are between the guest or host and the photographer, and StoryWall is not a party to them. Copy is reviewed before phase 2 ships.

## SEO

No new routes. The gallery and vendor pages are event pages, already private and noindex. No blockers.

## Testing

### Backend

- Services: approved partner can create/edit/delete; non-partner gets `PARTNER_REQUIRED`; non-photographer can't add `PRINT`; 8-size limit.
- Host list: add many skips videos and other events' media; unique per photo; copies 1–99; writes fail after `accessEndsAt`; photo delete sets `removed_at`; two photographers keep separate lists.
- Archive: `ORIGINAL` variant with keep-originals, `DISPLAY` without; `prints.txt` content; only the list's photographer can download.
- Reminder: sent once, only for lists with items, 3 days before.
- Guest: `OWN` refuses others' photos; plan cap limits the host setting; send copies prices and locks the list; send without prices fails; contact only visible to the photographer; host gets 403 on guest lists; rate limit.
- Export and account deletion include the new data.

### Frontend (Vitest)

- `lib/printPicks.ts` totals: included, beyond included, no sizes.
- Selection bar shows "Print" only with the gate open; skips videos with the hint.
- Prints sheet: rows, size/copies change, remove, two-photographer switch.
- Vendor page: Prints section shown only with `PRINT_PICKS`; Services section partner-only.
- Guest send flow: confirm step, locked list after send, new list.

### Manual

- Mobile (host and guest) and desktop (photographer) screenshots of each new sheet and section.
- Download a 100-photo list on an event with and without keep-originals.

## Out of scope

- Payment, invoices and print fulfilment in the app.
- Services for other vendor types, the partner card's services view and partner pages (they reuse `vendor_services` later).
- Video picks.
- Prices in currencies other than EUR.
