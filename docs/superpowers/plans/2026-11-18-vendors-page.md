# KAN-231: Vendors list and "What vendors can do" (V1)

Epic KAN-222, mockup V1 (desktop + mobile boards on the host pages canvas).

## Layout

- Page uses `ManagePageFrame wide`. Desktop: two columns (`1fr 320px`), Joined on the left, "What vendors can do" on the right. Phones: one column, the section under the list.
- **Joined header:** "Joined" heading, then the seats as a thin 56px bar plus today's "4 / 5" beside it (no box), "Invite a vendor" button on the right of the same row. The bar carries a spoken label `seatsSpoken`.
  - When the event is full or has no invite links yet, the button is replaced by today's notice (`full` / `fullWithUpgrade` / `linksEmpty`) under the header, as today.
- **Rows:** soft rows, no dividers, 48px round logo (VendorLogo, alt = business name as today), name + type, a plain grey "Hidden" label (hidden by host or opted out; logo dimmed, name grey), and a ⋯ menu (`RowActionsMenu`, label reuses `ManagePage.members.moreFor`) with Show in list / Hide from list (left out for an opted-out vendor, who can't be shown) and Remove (danger).
- Tapping the row still opens today's VendorSheet (joined date, opted-out note) — owner's choice 2026-11-18.
- Invite sheet, reset and remove confirmations unchanged.
- **What vendors can do:** one row per type the plan allows (`vendors.allowedTypes` in the event's vendors module config), icon + type name + one line. Planner, Photographer, Videographer, Music each get their own row; Venue/Decoration/Catering/Other share one row whose title joins the allowed type names (Intl.ListFormat; OTHER reads "other vendors") and whose line is "Shown in the vendor list." No allowed types → no section.

## Copy (approved 2026-11-16 EN, 2026-11-18 EL and the rest)

- `Vendors.manage.can.title`: What vendors can do / Τι μπορούν να κάνουν οι επαγγελματίες
- `can.PLANNER`, `can.PHOTOGRAPHER`, `can.VIDEOGRAPHER`, `can.MUSIC`, `can.listed` (lines from the mockup + approved Greek)
- `can.others`: other vendors / άλλοι επαγγελματίες
- `seatsSpoken`: {used} of {max} vendor seats used / {used} από {max} θέσεις επαγγελματιών σε χρήση

## Code

- `lib/vendors.ts`: `allowedVendorTypes(modules)`, `vendorCapabilityRows(types)` (pure, tested).
- `hooks/useVendorCapabilities.ts`: rows with their title and line strings.
- `hooks/useVendorSeats.ts`: adds `percent` and `seatsSpoken`.
- `components/vendors/manage/`: `VendorSeatsBar`, `VendorRow` (rewritten), `VendorsJoined`, `VendorCapabilities`; `ManageVendorsScreen` composes them.
- Stories + tests for the new/changed components; server prefetch unchanged.
