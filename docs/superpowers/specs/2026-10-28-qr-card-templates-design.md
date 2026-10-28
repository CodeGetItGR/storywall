# QR card templates — design

2026-10-28.

## Goal

Hosts can print their QR codes as designed A6 cards. Admins curate a catalog of card templates per event type, the way they curate theme presets. A host picks a template, edits the card text and prints it or saves it as PNG or PDF. Events whose plan lacks the new module keep today's plain QR flow.

## Decisions

| Topic | Decision |
| --- | --- |
| What a template changes | Both the card around the code and the code itself. |
| Source | An admin catalog in the backend, like theme presets. |
| Event types | Each template lists the event types it is offered to. |
| Identifier | No slug. The template's UUID is its only id. |
| Layout | Full-card artwork: one A6 portrait image per template. Title, code and lines sit on top in fixed spots. |
| Card size | One size: A6 portrait, 105 × 148 mm. |
| Code style per template | Code colour, dot shape, corner shape, centre logo on or off. |
| Card text | Default title and line; the host can edit both before printing. |
| Picking | At print time. Nothing is saved: not the template, not the text. |
| Default selection | "Plain", always first and selected. |
| Which QRs | Gallery upload QR, share and invite links, gift card. Not the vendor invite QR. |
| Gift card text | The recipient line and the giver line are editable. PIN and email stay as they are. |
| Gating | A new plan module, `qr_cards`. Without it, today's flow is unchanged and templates are hidden. |
| Output | Print, PNG, PDF. Today's "Download SVG" (code only) stays. |
| Rendering | In the browser, from one SVG. The PDF holds a 300 dpi image. |
| Demo | Unchanged: the demo keeps today's flow. |
| Delivery | Backend PR in `event_social_media`, then frontend PR here. Both into `staging`. |

## Backend (`event_social_media`)

### Module

- `ModuleKey.QR_CARDS("qr_cards")`, labelled "QR cards" in `PlanCatalogBootstrap`. Admins turn it on per plan like any other module.
- The module counts as readable for DRAFT events, as `theme` does, so a gift giver printing a card on a draft event gets templates.

### Entity `QrCardTemplate` (table `qr_card_templates`)

Archived, never deleted.

| Field | Rule |
| --- | --- |
| `id` | UUID. |
| `name` | JSON map, exactly `en` and `el`, each non-blank, at most 60 characters. |
| `eventTypes` | Element collection `qr_card_template_event_types`. At least one known `EventTypeKey`. |
| `sortOrder` | Integer, default 0. |
| `archived` | Boolean, default false. |
| `artworkKey` | R2 key under `qr-card-templates/`. Null until uploaded. |
| `artworkVersion` | Integer, increments on every upload. Part of the artwork URL so the bytes behind a URL never change. |
| `textColor` | `#RRGGBB`, upper-case, required. No server contrast check: the artwork varies, so the admin judges it in the live preview. |
| `headingFontId` | Optional `ThemeFont`. Must exist, not be archived, and have a file. Null means the app's font. |
| `codeColor` | `#RRGGBB`, upper-case, required. At least 4.5:1 against white (reuse `ThemeContrast`). |
| `dotShape` | `SQUARE`, `ROUNDED` or `DOT`. |
| `cornerShape` | `SQUARE`, `ROUNDED` or `CIRCLE`. |
| `centerLogo` | Boolean. |

A template is offered to hosts only when it is not archived and has artwork.

### Artwork upload

- PNG or WebP, at most 5 MB, reusing the checks in `ThemeIllustrationPipeline`.
- At least 1240 px wide (300 dpi at A6).
- Aspect ratio within 2% of 105:148.
- Rejected uploads use the existing media rejection errors (too large, wrong type, wrong size), plus a ratio error.

### Endpoints

| Method and path | Who | Notes |
| --- | --- | --- |
| `GET /api/admin/qr-card-templates` | Admin | The whole catalog, archived and without artwork included. |
| `POST /api/admin/qr-card-templates` | Admin | Create. No artwork yet. |
| `PATCH /api/admin/qr-card-templates/{id}` | Admin | Omitted fields stay. `clearHeadingFont` to remove the font. |
| `POST /api/admin/qr-card-templates/{id}/artwork` | Admin | Multipart `file`. Returns the admin DTO. |
| `GET /api/events/{eventId}/qr-card-templates` | Anyone who can read the event's QR links, and the gift giver | Offered templates for the event's type, sorted. `[]` when the module isn't readable. |
| `GET /api/qr-card-templates/{id}/artwork/{version}` | Public | The artwork bytes, `image/png` or `image/webp`. 404 for an unknown id or a stale version. |

Host DTO `QrCardTemplateDto`: `id`, `name`, `artworkUrl`, `textColor`, `headingFont` (the existing `EventThemeFontDto` shape), `codeColor`, `dotShape`, `cornerShape`, `centerLogo`.

Admin DTO adds `eventTypes`, `sortOrder`, `archived`, and a nullable `artworkUrl`. It uses `AdminThemeFontSummaryDto` for the font.

`artworkUrl` is a frontend-origin path, `/api/qr-card-artwork/<id>/<version>`, as theme font URLs are.

### Backend tests

- Code colour contrast is accepted at 4.5:1 and rejected below it.
- Artwork: type, size, minimum width and ratio, each rejected with the right error.
- The host list filters by event type, hides archived templates and templates without artwork, and returns `[]` without the module.
- The host list works on a DRAFT event.
- A stale artwork version returns 404.

## Frontend (this repo)

### Rendering

- **`lib/qrCard.ts`** (pure functions):
  - QR grid to SVG paths for each dot shape and corner shape.
  - Text fitting: shrink the font size until the text fits its box, with a floor.
  - The default line key for each QR target type and for the gift card.
  - A file name built from the title, falling back to `storywall-qr`.
- **`components/qrCard/QrCardSvg.tsx`**: the card as one SVG with a 105 × 148 viewBox in millimetres:
  - Artwork full-bleed underneath. "Plain" draws white instead.
  - Title in the template's heading font and text colour.
  - A white rounded panel about 64 mm square, centred, holding the code with a 4-module quiet zone. The logo sits in the middle when `centerLogo` is on.
  - Lines below the panel. The gift card stacks scan line, PIN, email and giver here.
  - An 8 mm safe margin on every side.
  - A `<title>` for screen readers.
- **QR grid**: from `uqr`. Error correction is H when the logo is on, otherwise Q.
- **"Plain"** is built in, not from the backend: white card, ink text, app font, ink code, square dots and corners, logo on. It is today's look at A6.

### Export (`hooks/useQrCardExport.ts`)

- **Print**: a print-only copy of the SVG at `105mm × 148mm` with `@page { size: 105mm 148mm; margin: 0 }`, then `window.print()`.
- **PNG**:
  1. Serialize the SVG, with the heading font inlined as a base64 `@font-face` and the artwork inlined as a data URI.
  2. Draw it on a 1240 × 1748 canvas.
  3. Save it with `toBlob('image/png')`.
- **PDF**: `pdf-lib`, loaded with a dynamic import on click. One A6 page (297.64 × 419.53 pt) holding that PNG full-page.
- **Proxy route**: `app/api/qr-card-artwork/[templateId]/[file]/route.ts` mirrors the theme-font route:
  - It validates the id and version.
  - It forwards the client IP and uses `redirect: 'error'`.
  - A 200 is cached for a year, at the CDN too. Everything else is `no-store`.
  - Content type is allowlisted to `image/png` and `image/webp`.
  - Same-origin artwork keeps the canvas untainted.

### Host screens

- **Gating**:
  - `isQrCardsEnabled(modules)` in `lib/qrLinks.ts` is true when the `qr_cards` module row is enabled. That is `isEnabled`, not `isAvailable`, for the draft reason `canPickTheme` documents.
  - Off: everything stays as today.
  - On: the "Print" button in `QrCodeCard` links to the card page.
  - Copy link, Download SVG and Share stay either way.
- **Card page**:
  - Route `/events/[eventId]/manage/qr/[qrLinkId]/card`, used for share links and the gallery QR.
  - The back link goes to the gallery QR page for a `MEDIA_UPLOAD` link, and to the share links page otherwise.
  - Server prefetch per the data-fetching rules: QR links and templates, seeded with the client hooks' own query keys.
- **Gift card**: the existing `/events/[eventId]/manage/gift/card` page gets the same designer when the module is on. The PIN checkbox stays.
- **Layout (mobile first)**:
  1. Back link.
  2. Heading.
  3. Card preview.
  4. Template strip: "Plain" first, then the event's templates. Each thumbnail has localized alt text.
  5. Title and line fields, plus the giver field on the gift card.
  6. Print, PNG and PDF actions.
- **Default text**, in the host's current language:

  | Case | Title | Line |
  | --- | --- | --- |
  | Join link | Event title | "Scan to join" |
  | Invitation | Event title | "Scan to open your invitation" |
  | Gallery upload | Event title | "Scan to add your photos" |
  | Gift card | Recipient label | "Scan to claim your gift" |

  - Gift card giver line: the giver's name.
  - Limits: about 40 characters for the title and 60 for the line, enforced with `maxLength`. Text shrinks to fit.
- **States**:
  - Loading: the card page skeleton.
  - Template fetch failed: "Plain" only, plus a short retry line.
  - Module on but no templates for this event type: "Plain" only.
  - QR link not found or revoked: the existing not-found treatment with the back link.
  - Export failed (font, artwork or canvas): an error toast. The page stays usable.
- **Who**: anyone who sees that QR's Print button today.
- **Structure**:
  - Components: `components/qrCard/` (`QrCardScreen`, `QrCardSvg`, `QrCardTemplateStrip`, `QrCardTextFields`, `QrCardActions`).
  - Hooks:
    - `useQrCardTemplates(eventId)`, which exports `qrCardTemplateKeys`.
    - `useQrCardDesigner`: the selected template, the text and the defaults.
    - `useQrCardExport`.

### Admin console

- **Panel**: "QR cards" in the admin sidebar's Catalog group, next to Theme presets and Theme fonts. It follows their table-plus-drawer pattern and the admin design system.
- **Files**: `components/admin/qrCards/` with `QrCardTemplatesPanel`, `QrCardTemplatesTable`, `QrCardTemplateRow` and `QrCardTemplateDrawer`. Hooks: `useAdminQrCardTemplates` and `useQrCardTemplateDrawer`.
- **Table columns**: artwork thumbnail (with alt text), name, event type pills, status pill (Live, No artwork, Archived), sort order.
- **Drawer**:
  - Name (Greek and English) and event types.
  - Artwork upload, text colour and heading font from the theme font catalog.
  - Code colour, with an inline error below 4.5:1.
  - Dot shape and corner shape as segmented controls. Centre logo as a switch.
  - Archive in the danger row, behind a confirmation modal.
- **Live preview**: `QrCardSvg` with sample text in the admin's language.

### Copy

- New keys in `messages/en.json` and `messages/el.json` under `QrCardPage`, `AdminPage.qrCards` and `ManagePage.qr`.
- Greek uses διοργανωτής for host.
- Claude drafts both languages; the owner reviews before merge.

### Dependencies

- `uqr`: the QR grid.
- `pdf-lib`: PDF, lazy-loaded.
- Dev only: `@resvg/resvg-js` and `jsqr` for the scan test.

### Frontend tests

- **Path builder**: module coverage for each dot and corner shape.
- **Scan test**: for every dot shape, corner shape, logo setting and a long URL, rasterize `QrCardSvg` with resvg, decode with jsQR, and expect the original URL.
- **Text fitting and default lines** for each target type.
- **Gating**: module off shows today's print popup; module on links to the card page; "Plain" is selected by default.
- **Proxy route**: the same cases as the theme-font route test.
- **Admin drawer**: contrast error, segmented controls, archive confirmation.
- **Manual check**: phone and desktop in the browser, plus a real phone scan of a printed or exported card.

### SEO

All new routes are private:
- `/events/…` and `/admin` are already in `PRIVATE_PATHS`.
- `/api/qr-card-artwork/…` sits under `/api/`.

No blockers expected. The check is repeated before the PR.

## Out of scope

- Saving a template or text per QR link or per event.
- Other card sizes and several cards per sheet.
- The vendor invite QR.
- The demo.
- A vector PDF.
- Host-uploaded artwork.
