# Printed QR card: picture tiles of what's inside

Date: 2026-11-15
Status: approved 2026-11-15 (KAN-215)

## Problem

The printed QR card (A6/A5, from the event's QR page and the admin templates) shows the event's title, the code and "Scan to join". A guest at the table can't tell what scanning gets them. One code now serves everyone, and the scan page offers a menu, so the card has room to show what is inside.

## Outcome

Under the code, the card shows up to 5 picture tiles taken from the app, set out like stickers: tilted a little, with a white border and a soft shadow. There are 3 in the top row and 2 in the second, each with a one-word label. The tiles carry almost no text. The event's plan picks them automatically and the host has no controls for them.

## Tiles, order and cap

The main five show when the plan has their module. When fewer than 5 qualify, backups fill the free places in the order listed. RSVP is never shown.

| # | Tile | Shows when the plan has | Label EN / EL | What it shows |
|---|------|-------------------------|---------------|---------------|
| 1 | Posts | `posts` or `gallery` | Posts / Αναρτήσεις | A guest photo in a polaroid frame (`QR_JOIN_PREVIEW_IMAGES.post`), with a heart and "24" |
| 2 | Stories | `stories` | Stories / Ιστορίες | A tall story frame with a sunset photo (`QR_JOIN_PREVIEW_IMAGES.photos[0]`), progress bars and a profile ring (`stories[0]`) |
| 3 | Wishes | `wishbook` | Wishes / Ευχές | A note card in italic serif: `QrCodePage.preview.wishText` |
| 4 | Reactions | `posts` | Reactions / Αντιδράσεις | A cluster of reaction bubbles: ❤️ 😍 🎉 😂 |
| 5 | Music | `playlist` | Music / Μουσική | A short playlist: three songs with small cover thumbnails (`QR_JOIN_PREVIEW_IMAGES.photos[1]`) and vote pills, with the top one highlighted |
| backup 1 | Games | `quiz_polls` or `he_or_she` | Games / Παιχνίδια | A poll result |
| backup 2 | Gifts | `wishlist` | Gifts / Δώρα | The money-gift card |
| backup 3 | Schedule | `schedule` | Schedule / Πρόγραμμα | Two schedule rows |

If none of these apply, the card has no tiles and the layout leaves that space empty.

The backup tiles are drawn in the same picture style as the main five. I'll show them to the owner as a mockup before building them.

Sample text, all approved by the owner on 2026-11-15:

- Labels: all eight above.
- Music:
  - Songs and votes: "September" with 12 votes (`preview.songTitle`), "Dancing Queen" with 9 and "Perfect" with 7.
  - The titles are the same in Greek.
- Games:
  - Question: "Who said 'I love you' first?" / "Ποιος είπε πρώτος «σ' αγαπώ»;"
  - Answers: "Him 68%" / "Her 32%", in Greek "Εκείνος 68%" / "Εκείνη 32%".
- Gifts:
  - "For our honeymoon" / "Για τον μήνα του μέλιτος"
  - The IBAN "GR16 0110 •••• 7095"
  - The button "Copy" / "Αντιγραφή".
- Schedule: Ceremony 18:00 and Welcome drinks 20:00, from the existing keys `SchedulePage.host.sessionManagement.ceremony.title` and `SchedulePage.host.placeholders.title`.

The card prints in the host's language, like the rest of its text. No other text changes; in particular, "Scan to join" stays as it is.

## Layout

The printed card is one SVG in A6 millimetres (`components/qrCard/QrCardSvg.tsx`), placed by `QrCardLayout` (`lib/qrCardLayout.ts`). It gains one element:

- `features`: a box `{ x, y, width, height }` inside the 8 mm safe area. If it is `null` or missing, the card has no tiles.
- The tiles always sit in rows of 3 and then 2. With fewer tiles, the rows fill in order (1–3 make one row, 4–5 make two) and each row is centred. The tiles scale together to fit the box. Each tile keeps its own fixed tilt (Posts −5°, Stories +3°, Wishes −3°, Reactions +4°, the fifth −4°). Labels use the font and `textColor` of the card's lines.

A new layout with tiles (`FEATURES_QR_CARD_LAYOUT`) is used by the event's QR card, for Plain and for every template without a saved layout:

| Element | Today | New |
|---------|-------|-----|
| Title | y 10, h 26, max 9 | y 10, h 11, max 7.5 |
| Code | x 20.5, y 40, size 64 | x 29.5, y 22, size 46 |
| Lines ("Scan to join") | y 107, h 33 | y 70, h 8 (8 is the lines box's minimum height) |
| Features | — | x 8, y 79, w 89, h 61 |

The gift card and the vendor page's QR preview keep today's layout (`DEFAULT_QR_CARD_LAYOUT`, with no `features` box), so they print exactly as they do now. A layout without a `features` box draws exactly what it draws today.

The admin layout editor and the admin preview start a template without a saved layout from the new layout, since that's how the event's card prints it.

## Rendering

- `lib/qrCardFeatures.ts`:
  - `qrCardFeatures(modules)` returns the ordered tiles: the main five that qualify, then backups, up to 5.
  - `layoutFeatureTiles(count, box)` returns each tile's position, scale and tilt.
  - Both are pure functions with unit tests.
- `components/qrCard/features/`: one SVG component per tile (`QrCardPostsTile`, `QrCardStoriesTile`, …).
  - Each tile draws at a fixed size using SVG attributes only: no classes and no `foreignObject`. That way print and the PNG/PDF export can reuse the same node, as they do today.
  - Photos are `<image>` elements, which `inlineImages` (`lib/qrCardExport.ts`) already inlines for export.
  - The soft shadow is an SVG `feDropShadow`, which needs checking in the PNG export and in print.
  - The Reactions bubbles use emoji characters, as the app's reactions do. They follow the device's emoji font, the same way the app does. The `public/landing/*-reaction.webp` images are blurred background art and don't print well, so the tile doesn't use them.
- `QrCardSvg` takes `features: QrCardFeatureTile[]` and draws them after the lines and fields, below the code.
- The caller passes the sample text in already translated (`QrCardFeatureTexts`), as it does for the title and lines. This keeps `QrCardSvg` free of translation hooks.
- Callers:
  - The host's QR page passes the event's modules; it already has them for `qrCardLineKey`. Hosts print one QR, so every card from this page gets the tiles of the plan's available modules.
  - The admin template preview passes a full plan, so it shows the main five.

## Admin layout editor

- New element `features` in `QrCardElement`. It can be selected, moved and resized like the lines box. Its minimum size is 40 × 25.
- "Remove pictures" and "Add pictures back" work like the title's remove and restore. "Add pictures back" puts the box at the new layout's spot (x 8, y 79, w 89, h 61), and the admin moves it from there.
- Admin labels, approved by the owner on 2026-11-15: the element is "Pictures" / "Εικόνες", with "Remove pictures" / "Αφαίρεση εικόνων" and "Add pictures back" / "Επαναφορά εικόνων" (`AdminPage.qrCards.layout`: `elements.features`, `removeFeatures`, `restoreFeatures`).
- `isValidQrCardLayout` checks that the box stays inside the safe area and meets the minimum size.

## Backend (guestwall-be, released first)

- `QrCardLayout` gains an optional `features` box. `QrCardLayoutValidator` follows the frontend rule: inside the safe area, at least 40 × 25.
- No migration. Templates without a saved layout get the new layout from the frontend. A template with a saved layout prints without tiles until an admin opens it, taps "Add pictures back" and places the box (owner's choice, 2026-11-15: a box added at a fixed spot would sit under the code on every saved design).
- The template DTOs carry the `QrCardLayout` record as it is, so they pass the field through. Nothing else changes.
- Deploy order: backend first. An older backend drops the field, so the editor can't save it until the backend is out. Printing still works without it, because a missing box means no tiles.

## Risk

- Saved templates show no tiles until an admin adds them. After the release I'll list the templates with a saved layout so the owner knows which ones to open.
- A template saved from the editor after this change has the new layout, and the gift card prints that saved layout too, with the tile space left empty. The gift card's own default (Plain and unsaved templates) is unchanged.

## Testing

- Unit tests:
  - `qrCardFeatures`: order, backups filling free places, the cap at 5, `gallery` alone giving Posts but not Reactions, and an empty plan.
  - `layoutFeatureTiles`: 1–5 tiles, rows centred.
  - `qrCardLayoutOf`: keeps or drops `features`.
  - `isValidQrCardLayout` with the new box.
- Component test: `QrCardSvg` draws one tile and one label per feature, and nothing for an empty list.
- Scan test: `QrCardSvg.scan.test.tsx` decodes the 46 mm code on the new default layout.
- Export test: a card with tiles exports to PNG/PDF, with every `<image>` inlined.
- Storybook stories for the visual check:
  - Plain with 0, 2, 3 and 5 tiles, in English and Greek.
  - A plan that needs backups.
  - A template with the default box.
  - The layout editor with `features` selected.
- Backend: validator tests for the new box.
- Manual, on staging:
  - Print an A6 card from a full plan and from a gallery-only plan, at mobile and desktop widths.
  - Scan both with a phone.
  - Check the shadows and photos on paper.

## Out of scope

- The scan page itself (`/q/[token]`).
- Host controls for which tiles print.
- The event's real content (photos or wishes) on the card.
