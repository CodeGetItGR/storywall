# QR card layout editor and A5 — design

2026-10-29. Builds on [2026-10-28-qr-card-templates-design.md](2026-10-28-qr-card-templates-design.md).

## Goal

Admins arrange each QR card template in a full-screen editor: they move and resize the title, the code and the lines, set text alignment and the code panel's look. Hosts can print or save any card at A6 or A5. The artwork is uploaded once and serves both sizes.

## Decisions

| Topic | Decision |
| --- | --- |
| Who edits the layout | Admins only, per template. Hosts still pick a template and edit only the text. |
| Artwork | Stays a full-card background. It cannot be moved, zoomed or cropped. |
| Movable elements | Title, code, lines. |
| Per-element controls | Position, size, text alignment (title and lines), code panel on or off, panel corner rounding. |
| Editing | Drag on a large preview, resize with handles, snap guides, arrow-key nudge. |
| Where | A full-screen editor opened from the template drawer by an "Edit layout" button. |
| Paper sizes | A6 and A5. No A4. |
| Who picks the size | The host, when printing or saving. |
| How sizes scale | The layout is stored in A6 millimetres. A5 is the same shape at √2 the size, so the card is drawn once and only the output size changes. |
| Artwork minimum | 1748 px wide (300 dpi at A5), up from 1240. |
| Artwork file size | Up to 10 MB, up from 5 MB. The upload hint recommends WebP. |
| Older artwork | Templates uploaded before this change have no recorded width and offer A6 only until new artwork is uploaded. |
| No panel | Allowed, with a note in the editor to test-scan a print. The code keeps its minimum size. |
| Templates without a layout | Use today's fixed positions, so they look exactly as they do now. |
| "Plain" | Keeps today's layout. Offers A6 and A5. |
| Delivery | Backend PR in `event_social_media`, then frontend PR here. Both into `staging`. |

## Layout

The layout lives on the template as one JSON object. All lengths are A6 millimetres, measured from the card's top-left corner.

```json
{
  "title": { "x": 8, "y": 10, "width": 89, "height": 26, "maxSize": 9, "align": "center" },
  "code": { "x": 20.5, "y": 40, "size": 64, "panel": true, "radius": 4 },
  "lines": { "x": 8, "y": 107, "width": 89, "height": 33, "textSize": 5, "align": "center" }
}
```

These values are the default layout: today's fixed positions, unchanged.

| Element | Field | Meaning | Range |
| --- | --- | --- | --- |
| title | `x`, `y`, `width`, `height` | The box the title fits into. | Inside the safe area. `width` ≥ 20, `height` ≥ 6. |
| title | `maxSize` | Largest font size. The title shrinks from here to fit, down to today's 5 mm floor. | 5 to 16 |
| title | `align` | `left`, `center` or `right`. | |
| code | `x`, `y`, `size` | The square the code and its quiet zone fill. | Inside the safe area. `size` 30 to 89. |
| code | `panel` | The white panel behind the code. | |
| code | `radius` | Panel corner rounding. Ignored when `panel` is false. | 0 to 8 |
| lines | `x`, `y`, `width`, `height` | The box the lines stack into. | Inside the safe area. `width` ≥ 20, `height` ≥ 8. |
| lines | `textSize` | The body line's largest font size. The other tones keep today's proportions to it (strong 1×, code 1.1×, small 0.64×). | 3 to 10 |
| lines | `align` | `left`, `center` or `right`. | |

Rules:

- The safe area is today's 8 mm margin: x from 8 to 97, y from 8 to 140.
- No two elements may overlap.
- Text stays vertically centred in its box, as today. Alignment only moves it sideways.
- Numbers are rounded to 0.1 mm.
- The backend checks every rule and rejects a layout that breaks one. The editor stops the admin from breaking them in the first place.

## Backend (`event_social_media`)

### Entity

`QrCardTemplate` gains, in the next Flyway migration (V188: vendor reach took V186 and error 3112, campaign visit pages took V187):

| Field | Rule |
| --- | --- |
| `layout` | JSON, nullable. Null means the default layout. |
| `artworkWidth` | Integer, nullable. The uploaded artwork's width in pixels, set on every upload. Null for artwork uploaded before this change. |

### Artwork upload

- At least 1748 px wide, still 105:148 within 2%, still at most 4096 px a side.
- At most 10 MB. `ThemeIllustrationPipeline` keeps 5 MB for theme illustrations, so the QR card pipeline takes its own byte limit.
- The size error's message says 1748 px.

### Endpoints

- `PATCH /api/admin/qr-card-templates/{id}` accepts `layout`. A full layout object replaces the stored one. Omitted, it stays.
- Admin DTO adds `layout` (nullable) and `artworkWidth` (nullable).
- Host DTO `QrCardTemplateDto` adds:
  - `layout`, nullable: null means the default layout.
  - `sizes`: `["A6"]`, or `["A6", "A5"]` when `artworkWidth` is at least 1748.

### Validation

A new error code for an invalid layout, with a message naming the broken rule (outside the safe area, too small, out of range, overlapping, unknown alignment).

### Backend tests

- A valid layout saves and comes back unchanged.
- Each rule rejects: outside the safe area, code below 30 mm, out-of-range text sizes and radius, overlap, unknown alignment.
- Upload: 1747 px rejected, 1748 px accepted, over 10 MB rejected, under 10 MB but over 5 MB accepted.
- `artworkWidth` is set on upload.
- `sizes`: A6 only with a null or small width, A6 and A5 at 1748 px or more.

## Frontend (this repo)

### Card drawing

- `lib/qrCardLayout.ts` (new): the layout types, `DEFAULT_QR_CARD_LAYOUT`, the safe area, the ranges, and the pure helpers the editor needs: clamping to the safe area and ranges, snapping, overlap checks and rounding.
- `QrCardStyle` gains `layout` and `sizes`. `qrCardStyleOf` fills a null layout with the default. Plain uses the default layout and both sizes.
- `lib/qrCard.ts`: `layoutTitle` and `layoutLines` take the layout's boxes instead of the fixed `QR_CARD_LAYOUT`. Text fitting is unchanged.
- `QrCardSvg` draws from `style.layout`:
  - Title and lines use the box's `x`, `width` and `align` (`text-anchor` start, middle or end).
  - The code uses `x`, `y` and `size`. The white panel and its radius are drawn only when `panel` is on.
- The viewBox stays 105 × 148 for both sizes.

### Sizes and export

- A size table in `lib/qrCard.ts` replaces the single export constants:

  | Size | Print page | PNG | PDF page |
  | --- | --- | --- | --- |
  | A6 | 105 × 148 mm | 1240 × 1748 | 297.64 × 419.53 pt |
  | A5 | 148 × 210 mm | 1748 × 2480 | 419.53 × 595.28 pt |

- `useQrCardDesigner` holds the chosen size. It starts at A6 and falls back to A6 when the host picks a template without A5.
- `QrCardActions` shows an A6 / A5 segmented control above Print, PNG and PDF, only when the selected template offers both.
- `QrCardPrintStyle` sets `@page` and the card's printed size from the chosen size.
- `lib/qrCardExport.ts` takes the size for the PNG canvas and the PDF page.
- File names are unchanged.

### Admin drawer

- An "Edit layout" button opens the editor. It is disabled until the template has been created, since the editor saves to an existing template.
- The live preview draws the saved layout.
- The artwork hint changes to 1748 px and 10 MB, with a short note recommending WebP. The too-large message says 10 MB.

### Layout editor

A full-screen overlay above the admin console, desktop-first, following the admin design system.

- **Canvas (left, large):** the card at A6 with the template's artwork, colours and font.
  - Click an element to select it. Drag to move it.
  - Handles resize the selected element: four corners on the code (it stays square), edges and corners on the text boxes.
  - Moves and resizes are clamped to the safe area and the ranges. A move that would overlap another element stops at its edge.
  - Snapping within 1.5 mm to: the card's centre lines, the safe area's edges, and the other elements' edges and centres. Guides show while snapping. Holding Alt turns snapping off.
  - The safe area is drawn as a faint dashed outline.
- **Side panel (right), for the selected element:**
  - Title: alignment, largest text size.
  - Lines: alignment, text size.
  - Code: panel switch and corner rounding. With the panel off, a one-line note: "Test-scan a printed card before offering this template."
  - Position and size are read-only in millimetres here, in the monospace face, for reference.
  - With nothing selected: a short line saying to select an element.
- **Toolbar:** a sample text switch (short card / gift card, the tallest stack), Reset layout, Cancel, Save.
- **Keyboard:** each element is a focusable button named by its element. Tab moves between them, arrow keys nudge by 0.5 mm, Shift + arrow by 5 mm, Escape deselects.
- **Save:** PATCHes `layout`, then closes and refreshes the catalog. A failed save shows an inline error and keeps the editor open.
- **Reset layout:** sets the draft to the default layout. It is only saved on Save.
- **Unsaved changes:** Cancel, Escape with nothing selected, or closing asks in a confirmation modal ("Discard changes" / "Keep editing").

Files:

- `components/admin/qrCards/layoutEditor/`: `QrCardLayoutEditor` (shell), `QrCardLayoutCanvas`, `QrCardLayoutHandles`, `QrCardLayoutGuides`, `QrCardLayoutInspector`, `QrCardLayoutToolbar`, `QrCardLayoutDiscardModal`.
- Hooks: `useQrCardLayoutEditor` (draft, selection, dirty state, save) and `useQrCardLayoutPointer` (drag and resize in millimetres, snapping).
- Helpers: `lib/qrCardLayout.ts`.

### Copy

New keys under `AdminPage.qrCards.layout` and `QrCardPage.size`, in English and Greek. Admin Greek uses the formal plural, host Greek the informal "εσύ", as today. Claude drafts both; the owner reviews before merge.

### Frontend tests

- `lib/qrCardLayout.ts`: the default layout matches today's fixed spots; clamping, snapping, overlap and rounding.
- Text layout: alignment and box position move the text, and fitting still works in a resized box.
- Scan test (resvg + jsQR): a moved and resized code, the smallest code (30 mm), the panel off on white artwork, and A5 output.
- Export: the PNG and PDF dimensions for each size.
- Designer: the size control shows only when a template offers A5, and falls back to A6 on switching template.
- Editor: dragging moves and clamps, arrow keys nudge, Reset restores the default, Save sends the layout, and unsaved changes ask before closing.
- Manual check: the editor on desktop, the host card page on a phone, and a real phone scan of a printed A6 and A5 card.

### SEO

No new routes. The editor is an overlay in `/admin`, which is already private. No blockers expected; checked again before the PR.

## Out of scope

- A4 and other sizes.
- Hosts moving things on their own cards.
- Moving, zooming or cropping the artwork.
- Extra elements (more text boxes, images, shapes).
- Undo and redo in the editor.
- Several cards per sheet.
