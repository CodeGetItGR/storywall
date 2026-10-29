# QR card layout editor and A5 — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repo's CLAUDE.md forbids parallel subagents unless the user allows them for the task: run one task at a time.

**Goal:** Admins arrange each QR card template's title, code and lines in a full-screen editor, and hosts print or save any card at A6 or A5.

**Architecture:** The card stays one SVG drawn in A6 millimetres (`QrCardSvg`), now placed by a `QrCardLayout` (from the template, or the default that matches today's fixed spots). A5 is the same SVG output larger: only the print page, PNG canvas and PDF page change, through a `QR_CARD_SIZES` table. The editor is a `size="modal"` `AdminDrawer` opened from the template drawer: the real card underneath, a transparent SVG overlay on top for selection, dragging, handles and guides, and a side panel. All geometry (clamping, collision, snapping, resizing) is pure code in `lib/qrCardLayout.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, next-intl, Tailwind, Base UI dialogs (through `AdminDrawer` and `ConfirmActionModal`), vitest + Testing Library, resvg + jsQR for the scan test.

**Spec:** [docs/superpowers/specs/2026-10-29-qr-card-layout-editor-design.md](../specs/2026-10-29-qr-card-layout-editor-design.md). **Backend:** [2026-10-29-qr-card-layout-editor-backend.md](2026-10-29-qr-card-layout-editor-backend.md). The backend PR lands first; until it is on staging, run it locally for the signed-in check (Task 15).

---

## File map

**Create**

| File | Responsibility |
| --- | --- |
| `lib/qrCardLayout.ts` (+ test) | Layout types, default layout, safe area, limits, rects, overlap, validity, move with collision, resize, snapping, option setters, equality. |
| `components/qrCard/QrCardSizeControl.tsx` (+ test) | The host's A6 / A5 picker. |
| `hooks/useQrCardLayoutEditor.ts` (+ test) | The editor's draft layout, selection, sample, keyboard, save and discard. |
| `hooks/useQrCardLayoutPointer.ts` | Drag and resize in millimetres, snapping, guides. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutEditor.tsx` (+ test) | The editor shell. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutCanvas.tsx` | The card plus the overlay. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutHandles.tsx` | Resize handles for the selected element. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutGuides.tsx` | Snap guide lines. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutInspector.tsx` | The side panel. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutSegmented.tsx` | A small radio segmented control (alignment, sample). |
| `components/admin/qrCards/layoutEditor/QrCardLayoutRange.tsx` | A labelled range slider with its value in millimetres. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutToolbar.tsx` | Sample, Reset, error, Cancel, Save. |
| `components/admin/qrCards/layoutEditor/QrCardLayoutDiscardModal.tsx` | "Discard changes" confirmation. |

**Modify**

`lib/api/types.ts`, `lib/api/errors.ts`, `lib/qrCard.ts` (+ test), `lib/qrCardExport.ts` (+ test), `lib/adminQrCards.ts` (+ test), `components/qrCard/QrCardSvg.tsx` (+ scan test), `components/qrCard/QrCardPrintStyle.tsx`, `components/qrCard/QrCardDesigner.tsx`, `hooks/useQrCardDesigner.ts` (+ test), `hooks/useQrCardExport.ts` (+ test), `hooks/useQrCardScreen.ts`, `hooks/useGiftCardPrint.ts`, `hooks/useQrCardTemplateDrawer.ts` (+ test), `components/admin/qrCards/QrCardTemplateDrawer.tsx` (+ test), `components/admin/qrCards/QrCardTemplatePreview.tsx`, `messages/en.json`, `messages/el.json`, plus every test fixture of `QrCardTemplateDto` / `AdminQrCardTemplateDto` the type check reports.

**Conventions used below**

- Run single test files with `npx vitest run <path>`. Type check: `npx tsc --noEmit`. Lint: `npm run lint`.
- Every visible string is a translation key. Admin copy uses the formal plural (as `AdminPage.qrCards` does); host copy uses the informal "εσύ" (as `QrCardPage` does).
- UI tasks: load the `design:design-system` skill before writing the components (CLAUDE.md, "Visual Hierarchy"), and put a short JSX comment above every visual section.
- Commit after each task; push only in Task 16.

---

### Task 0: Branch and dependencies

This worktree's branch (`claude/editor-multi-format-artwork-4a59d6`) starts from `origin/staging` and holds the spec and the plans.

- [ ] **Step 1: Bring the branch up to date**

```bash
git fetch origin
git status --short
git rebase origin/staging
```

Expected: a clean tree, then a clean rebase. If `git status` shows changes you did not make, stop and ask.

- [ ] **Step 2: Install**

No dependency changes in this plan. Link `node_modules` to the main checkout's with a junction if the lockfiles match (see the "Worktree node_modules junction" memory); otherwise `npm ci`.

- [ ] **Step 3: Baseline**

```bash
npx vitest run lib/qrCard.test.ts lib/qrCardExport.test.ts components/qrCard hooks/useQrCardDesigner.test.tsx hooks/useQrCardExport.test.tsx components/admin/qrCards hooks/useQrCardTemplateDrawer.test.tsx
npx tsc --noEmit
```

Expected: all pass, no type errors.

---

### Task 1: API types and error code

**Files:**
- Modify: `lib/api/types.ts` (near `QrCardTemplateDto`, line ~996, and `AdminQrCardTemplateDto`, line ~4375)
- Modify: `lib/api/errors.ts` (line ~298)
- Modify: `lib/adminQrCards.ts`
- Modify: the test fixtures `npx tsc --noEmit` reports

- [ ] **Step 1: Add the layout and size types**

In `lib/api/types.ts`, just above `export interface QrCardTemplateDto`:

```ts
// QR card layout (qr-card-layout-editor spec): boxes in A6 millimetres from the card's top-left corner.
export type QrCardTextAlign = 'left' | 'center' | 'right';
export interface QrCardLayoutDto {
    title: { x: number; y: number; width: number; height: number; maxSize: number; align: QrCardTextAlign };
    code: { x: number; y: number; size: number; panel: boolean; radius: number };
    lines: { x: number; y: number; width: number; height: number; textSize: number; align: QrCardTextAlign };
}

// The paper sizes a card prints at. One SVG serves both: A5 is A6 drawn larger.
export type QrCardSize = 'A6' | 'A5';
```

Add to `QrCardTemplateDto`, after `centerLogo`:

```ts
    layout: QrCardLayoutDto | null; // null = the default layout
    sizes: QrCardSize[]; // ['A6'], or ['A6', 'A5'] when the artwork is wide enough
```

Add to `AdminQrCardTemplateDto`, after `centerLogo`:

```ts
    layout: QrCardLayoutDto | null; // null = the default layout
    artworkWidth: number | null; // px; null without artwork, or for artwork uploaded before A5 support
```

Add to `AdminQrCardTemplatePatchDto`, after `centerLogo?`:

```ts
    layout?: QrCardLayoutDto; // a full layout replaces the stored one
```

- [ ] **Step 2: Add the error code**

In `lib/api/errors.ts`, after `QR_CARD_ARTWORK_SIZE_INVALID: 3111,`:

```ts
    QR_CARD_LAYOUT_INVALID: 3112,
```

Use the number the backend plan's Task 0 confirmed.

In `lib/adminQrCards.ts`, add it to `DETAIL_CODES` (its localized detail names the broken rule):

```ts
const DETAIL_CODES: ReadonlySet<number> = new Set([
    ERROR_CODES.QR_CARD_CODE_COLOR_LOW_CONTRAST,
    ERROR_CODES.QR_CARD_ARTWORK_SIZE_INVALID,
    ERROR_CODES.QR_CARD_LAYOUT_INVALID,
    ERROR_CODES.LOCALIZED_TEXT_INVALID,
]);
```

and extend the comment above it: "(the ratio, the artwork's size, the layout rule, the language at fault)".

- [ ] **Step 3: Fix the fixtures**

Run: `npx tsc --noEmit`
Expected: errors only in test files building `QrCardTemplateDto` or `AdminQrCardTemplateDto` objects (for example `hooks/useQrCardDesigner.test.tsx`, `lib/qrCard.test.ts`, `components/qrCard/QrCardTemplateStrip.test.tsx`, `components/admin/qrCards/QrCardTemplateDrawer.test.tsx`, `hooks/useQrCardTemplateDrawer.test.tsx`, `hooks/useAdminQrCardTemplates.test.tsx`, `lib/adminQrCards.test.ts`, `hooks/useQrCardTemplates.test.tsx`, `hooks/useQrCardScreen.test.tsx`).

Add `layout: null, sizes: ['A6'],` to each host fixture and `layout: null, artworkWidth: null,` to each admin fixture. Also check `lib/demo/mockHandlers.ts`: it answers `available: false` with no templates, so it needs no change; fix it only if the type check names it.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api lib/adminQrCards.ts lib components hooks
git commit -m "feat(qr-cards): layout and paper size types"
```

---

### Task 2: Layout geometry (`lib/qrCardLayout.ts`)

**Files:**
- Create: `lib/qrCardLayout.ts`
- Test: `lib/qrCardLayout.test.ts`

This file must not import `lib/qrCard.ts` (which will import it): the card's centre lines are written out here.

- [ ] **Step 1: Write the failing tests**

`lib/qrCardLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
    DEFAULT_QR_CARD_LAYOUT,
    elementRect,
    handlePoint,
    isValidQrCardLayout,
    moveElementTo,
    type QrCardLayout,
    rectsOverlap,
    resizeElement,
    roundMm,
    sameQrCardLayout,
    setCodeOptions,
    setLinesOptions,
    setTitleOptions,
    snapPosition,
} from '@/lib/qrCardLayout';

const L = DEFAULT_QR_CARD_LAYOUT;

describe('the default layout', () => {
    it("is today's fixed spots, and valid", () => {
        expect(L).toEqual({
            title: { x: 8, y: 10, width: 89, height: 26, maxSize: 9, align: 'center' },
            code: { x: 20.5, y: 40, size: 64, panel: true, radius: 4 },
            lines: { x: 8, y: 107, width: 89, height: 33, textSize: 5, align: 'center' },
        });
        expect(isValidQrCardLayout(L)).toBe(true);
    });
});

describe('rects', () => {
    it('gives the code a square', () => {
        expect(elementRect(L, 'code')).toEqual({ x: 20.5, y: 40, width: 64, height: 64 });
    });

    it('does not count touching edges as overlap', () => {
        expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
        expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 9.9, y: 9.9, width: 10, height: 10 })).toBe(true);
    });

    it('rounds to a tenth of a millimetre', () => {
        expect(roundMm(8.04)).toBe(8);
        expect(roundMm(8.06)).toBe(8.1);
    });

    it('places handles on the edges and corners', () => {
        const rect = { x: 10, y: 20, width: 30, height: 40 };
        expect(handlePoint(rect, 'nw')).toEqual({ x: 10, y: 20 });
        expect(handlePoint(rect, 'e')).toEqual({ x: 40, y: 40 });
        expect(handlePoint(rect, 's')).toEqual({ x: 25, y: 60 });
    });
});

describe('isValidQrCardLayout', () => {
    it.each<[string, QrCardLayout]>([
        ['outside the margin', { ...L, title: { ...L.title, x: 7.9 } }],
        ['a small code', { ...L, code: { ...L.code, size: 29.9 } }],
        ['a large title size', { ...L, title: { ...L.title, maxSize: 16.1 } }],
        ['overlap', { ...L, title: { ...L.title, height: 31 } }],
    ])('rejects %s', (_, layout) => {
        expect(isValidQrCardLayout(layout)).toBe(false);
    });
});

describe('moveElementTo', () => {
    it('moves and rounds', () => {
        expect(moveElementTo(L, 'code', { x: 25.04, y: 40 }).code).toMatchObject({ x: 25, y: 40 });
    });

    it('stays inside the safe area', () => {
        const moved = moveElementTo(L, 'code', { x: 90, y: 40 });
        expect(moved.code.x).toBe(33); // 97 - 64
    });

    it('stops at the edge of a box in the way', () => {
        // The code moving down meets the lines' top edge at 107.
        expect(moveElementTo(L, 'code', { x: 20.5, y: 60 }).code.y).toBe(43); // 107 - 64
        // The title moving down meets the code's top edge at 40.
        expect(moveElementTo(L, 'title', { x: 8, y: 30 }).title.y).toBe(14); // 40 - 26
    });

    it('ignores boxes outside its band', () => {
        // A 40 mm lines box shares its rows with nothing, so it slides sideways freely.
        const narrow = { ...L, lines: { ...L.lines, width: 40 } };
        expect(moveElementTo(narrow, 'lines', { x: 57, y: 107 }).lines.x).toBe(57);
    });
});

describe('resizeElement', () => {
    const start = elementRect(L, 'code');

    it('keeps the code square from its corner', () => {
        const smaller = resizeElement(L, 'code', 'se', start, -20, -5);
        expect(smaller.code).toMatchObject({ x: 20.5, y: 40, size: 44 });
        const fromNw = resizeElement(L, 'code', 'nw', start, 10, 0);
        expect(fromNw.code).toMatchObject({ x: 30.5, y: 50, size: 54 });
    });

    it('never goes below the smallest code', () => {
        expect(resizeElement(L, 'code', 'se', start, -60, 0).code.size).toBe(30);
    });

    it('refuses a resize that would overlap', () => {
        // Growing the code's bottom edge into the lines leaves the layout as it was.
        const result = resizeElement(L, 'code', 'se', start, 5, 5);
        expect(result).toBe(L);
    });

    it('resizes a text box from an edge, within its minimum', () => {
        const titleStart = elementRect(L, 'title');
        expect(resizeElement(L, 'title', 'e', titleStart, -30, 0).title.width).toBe(59);
        expect(resizeElement(L, 'title', 'e', titleStart, -80, 0).title.width).toBe(20);
        expect(resizeElement(L, 'title', 'n', titleStart, 0, 30).title).toMatchObject({ y: 30, height: 6 });
    });
});

describe('snapPosition', () => {
    it('snaps a centre to the card centre within 1.5 mm', () => {
        // The code is 64 wide: centred at x 20.5.
        expect(snapPosition(L, 'code', { x: 21.6, y: 40 })).toMatchObject({ x: 20.5, guides: [{ axis: 'x', at: 52.5 }] });
    });

    it('leaves a position alone beyond 1.5 mm', () => {
        expect(snapPosition(L, 'code', { x: 23, y: 45 })).toEqual({ x: 23, y: 45, guides: [] });
    });

    it('snaps to another box edge', () => {
        // The title's bottom (36) lands on the code's top (40).
        expect(snapPosition(L, 'title', { x: 8, y: 13 }).y).toBe(14);
    });
});

describe('option setters', () => {
    it('clamps sizes and keeps alignment', () => {
        expect(setTitleOptions(L, { maxSize: 30 }).title.maxSize).toBe(16);
        expect(setTitleOptions(L, { align: 'left' }).title.align).toBe('left');
        expect(setLinesOptions(L, { textSize: 1 }).lines.textSize).toBe(3);
        expect(setCodeOptions(L, { radius: 12 }).code.radius).toBe(8);
        expect(setCodeOptions(L, { panel: false }).code.panel).toBe(false);
    });
});

describe('sameQrCardLayout', () => {
    it('compares values, not identity', () => {
        expect(sameQrCardLayout(L, structuredClone(L))).toBe(true);
        expect(sameQrCardLayout(L, setTitleOptions(L, { align: 'left' }))).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/qrCardLayout.test.ts`
Expected: FAIL, cannot resolve `@/lib/qrCardLayout`.

- [ ] **Step 3: Write the module**

`lib/qrCardLayout.ts`:

```ts
import type { QrCardLayoutDto, QrCardTextAlign } from '@/lib/api/types';

// Where a card's title, code and lines sit, in A6 millimetres. Mirrors the backend's
// QrCardLayoutValidator; the server stays the authority.
export type QrCardLayout = QrCardLayoutDto;
export type QrCardElement = keyof QrCardLayout;
export const QR_CARD_ELEMENTS: QrCardElement[] = ['title', 'code', 'lines'];

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };
export type QrCardHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
export type QrCardGuide = { axis: 'x' | 'y'; at: number };

// The 8 mm safe margin on the 105 × 148 card.
export const QR_CARD_SAFE_AREA = { left: 8, top: 8, right: 97, bottom: 140 } as const;
// The card's centre lines, for snapping. Written out: lib/qrCard imports this file.
const CENTER_X = 52.5;
const CENTER_Y = 74;
export const SNAP_DISTANCE = 1.5;
const EPSILON = 0.001;

export const QR_CARD_LAYOUT_LIMITS = {
    textMinWidth: 20,
    titleMinHeight: 6,
    linesMinHeight: 8,
    titleMaxSize: { min: 5, max: 16 },
    linesTextSize: { min: 3, max: 10 },
    codeSize: { min: 30, max: 89 },
    radius: { min: 0, max: 8 },
} as const;

// Today's fixed spots. Plain and every template without a saved layout use it.
export const DEFAULT_QR_CARD_LAYOUT: QrCardLayout = {
    title: { x: 8, y: 10, width: 89, height: 26, maxSize: 9, align: 'center' },
    code: { x: 20.5, y: 40, size: 64, panel: true, radius: 4 },
    lines: { x: 8, y: 107, width: 89, height: 33, textSize: 5, align: 'center' },
};

const SAFE = QR_CARD_SAFE_AREA;
const LIMITS = QR_CARD_LAYOUT_LIMITS;

export function roundMm(value: number): number {
    return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function elementRect(layout: QrCardLayout, element: QrCardElement): Rect {
    if (element === 'code') {
        const { x, y, size } = layout.code;
        return { x, y, width: size, height: size };
    }
    const { x, y, width, height } = layout[element];
    return { x, y, width, height };
}

// Strict: boxes that only touch don't overlap.
export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width - EPSILON && b.x < a.x + a.width - EPSILON && a.y < b.y + b.height - EPSILON && b.y < a.y + a.height - EPSILON;
}

function insideSafeArea(rect: Rect): boolean {
    return (
        rect.x >= SAFE.left - EPSILON &&
        rect.y >= SAFE.top - EPSILON &&
        rect.x + rect.width <= SAFE.right + EPSILON &&
        rect.y + rect.height <= SAFE.bottom + EPSILON
    );
}

function within(value: number, range: { min: number; max: number }): boolean {
    return value >= range.min - EPSILON && value <= range.max + EPSILON;
}

function otherRects(layout: QrCardLayout, element: QrCardElement): Rect[] {
    return QR_CARD_ELEMENTS.filter((other) => other !== element).map((other) => elementRect(layout, other));
}

export function isValidQrCardLayout(layout: QrCardLayout): boolean {
    const rects = QR_CARD_ELEMENTS.map((element) => elementRect(layout, element));
    if (!rects.every(insideSafeArea)) return false;
    const { title, code, lines } = layout;
    if (title.width < LIMITS.textMinWidth - EPSILON || title.height < LIMITS.titleMinHeight - EPSILON) return false;
    if (lines.width < LIMITS.textMinWidth - EPSILON || lines.height < LIMITS.linesMinHeight - EPSILON) return false;
    if (!within(title.maxSize, LIMITS.titleMaxSize) || !within(lines.textSize, LIMITS.linesTextSize)) return false;
    if (!within(code.size, LIMITS.codeSize) || !within(code.radius, LIMITS.radius)) return false;
    return !rects.some((rect, index) => rects.slice(index + 1).some((other) => rectsOverlap(rect, other)));
}

function withRect(layout: QrCardLayout, element: QrCardElement, rect: Rect): QrCardLayout {
    if (element === 'code') return { ...layout, code: { ...layout.code, x: rect.x, y: rect.y, size: rect.width } };
    return { ...layout, [element]: { ...layout[element], x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
}

// One axis from the rect's position toward `to`: clamped to the safe area, stopped at the first box
// in its way. Only boxes sharing its band on the other axis can block it.
function slide(rect: Rect, axis: 'x' | 'y', to: number, obstacles: Rect[]): number {
    const size = axis === 'x' ? rect.width : rect.height;
    const from = rect[axis];
    let target = clamp(to, axis === 'x' ? SAFE.left : SAFE.top, (axis === 'x' ? SAFE.right : SAFE.bottom) - size);
    for (const other of obstacles) {
        const sharesBand =
            axis === 'x'
                ? rect.y < other.y + other.height - EPSILON && other.y < rect.y + rect.height - EPSILON
                : rect.x < other.x + other.width - EPSILON && other.x < rect.x + rect.width - EPSILON;
        if (!sharesBand) continue;
        const otherStart = other[axis];
        const otherEnd = otherStart + (axis === 'x' ? other.width : other.height);
        if (target > from && otherStart >= from + size - EPSILON) target = Math.min(target, otherStart - size);
        if (target < from && otherEnd <= from + EPSILON) target = Math.max(target, otherEnd);
    }
    return target;
}

// Moves an element toward a top-left point, x then y, never onto another box.
export function moveElementTo(layout: QrCardLayout, element: QrCardElement, to: Point): QrCardLayout {
    const obstacles = otherRects(layout, element);
    const start = elementRect(layout, element);
    const x = roundMm(slide(start, 'x', to.x, obstacles));
    const y = roundMm(slide({ ...start, x }, 'y', to.y, obstacles));
    return withRect(layout, element, { ...start, x, y });
}

// The handles each element offers: the code stays square, so only its corners.
export function handlesFor(element: QrCardElement): QrCardHandle[] {
    return element === 'code' ? ['nw', 'ne', 'sw', 'se'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
}

export function handlePoint(rect: Rect, handle: QrCardHandle): Point {
    const x = handle.includes('w') ? rect.x : handle.includes('e') ? rect.x + rect.width : rect.x + rect.width / 2;
    const y = handle.includes('n') ? rect.y : handle.includes('s') ? rect.y + rect.height : rect.y + rect.height / 2;
    return { x, y };
}

// Resizes from a handle by (dx, dy) measured from `start`, the rect when the drag began. Clamped to
// the minimum and maximum sizes and the safe area. A resize onto another box is refused: the layout
// comes back unchanged, so a drag holds its last good size.
export function resizeElement(layout: QrCardLayout, element: QrCardElement, handle: QrCardHandle, start: Rect, dx: number, dy: number): QrCardLayout {
    let { x, y, width, height } = start;
    const right = x + width;
    const bottom = y + height;
    if (element === 'code') {
        const sx = handle.includes('e') ? 1 : -1;
        const sy = handle.includes('s') ? 1 : -1;
        // One change for both sides: the larger drag, signed for the handle's direction.
        const grow = Math.abs(dx) >= Math.abs(dy) ? dx * sx : dy * sy;
        const roomX = sx > 0 ? SAFE.right - x : right - SAFE.left;
        const roomY = sy > 0 ? SAFE.bottom - y : bottom - SAFE.top;
        const size = roundMm(clamp(width + grow, LIMITS.codeSize.min, Math.min(LIMITS.codeSize.max, roomX, roomY)));
        x = sx > 0 ? x : right - size;
        y = sy > 0 ? y : bottom - size;
        width = size;
        height = size;
    } else {
        const minHeight = element === 'title' ? LIMITS.titleMinHeight : LIMITS.linesMinHeight;
        if (handle.includes('e')) width = clamp(width + dx, LIMITS.textMinWidth, SAFE.right - x);
        if (handle.includes('w')) {
            x = clamp(x + dx, SAFE.left, right - LIMITS.textMinWidth);
            width = right - x;
        }
        if (handle.includes('s')) height = clamp(height + dy, minHeight, SAFE.bottom - y);
        if (handle.includes('n')) {
            y = clamp(y + dy, SAFE.top, bottom - minHeight);
            height = bottom - y;
        }
    }
    const rect = { x: roundMm(x), y: roundMm(y), width: roundMm(width), height: roundMm(height) };
    if (otherRects(layout, element).some((other) => rectsOverlap(rect, other))) return layout;
    return withRect(layout, element, rect);
}

// The nearest target within SNAP_DISTANCE for any of the start, middle or end of a span.
function snapAxis(start: number, size: number, targets: number[]): { value: number; at: number | null } {
    let best = { distance: SNAP_DISTANCE, value: start, at: null as number | null };
    for (const target of targets) {
        for (const offset of [0, size / 2, size]) {
            const distance = Math.abs(start + offset - target);
            if (distance < best.distance) best = { distance, value: target - offset, at: target };
        }
    }
    return { value: best.value, at: best.at };
}

// Snaps a dragged element's top-left to the safe area's edges, the card's centre lines and the
// other boxes' edges and centres. Returns the guides to draw.
export function snapPosition(layout: QrCardLayout, element: QrCardElement, to: Point): Point & { guides: QrCardGuide[] } {
    const rect = elementRect(layout, element);
    const others = otherRects(layout, element);
    const x = snapAxis(to.x, rect.width, [SAFE.left, CENTER_X, SAFE.right, ...others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width])]);
    const y = snapAxis(to.y, rect.height, [SAFE.top, CENTER_Y, SAFE.bottom, ...others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height])]);
    const guides: QrCardGuide[] = [];
    if (x.at !== null) guides.push({ axis: 'x', at: x.at });
    if (y.at !== null) guides.push({ axis: 'y', at: y.at });
    return { x: x.value, y: y.value, guides };
}

export function setTitleOptions(layout: QrCardLayout, options: { maxSize?: number; align?: QrCardTextAlign }): QrCardLayout {
    const { min, max } = LIMITS.titleMaxSize;
    const maxSize = roundMm(clamp(options.maxSize ?? layout.title.maxSize, min, max));
    return { ...layout, title: { ...layout.title, maxSize, align: options.align ?? layout.title.align } };
}

export function setLinesOptions(layout: QrCardLayout, options: { textSize?: number; align?: QrCardTextAlign }): QrCardLayout {
    const { min, max } = LIMITS.linesTextSize;
    const textSize = roundMm(clamp(options.textSize ?? layout.lines.textSize, min, max));
    return { ...layout, lines: { ...layout.lines, textSize, align: options.align ?? layout.lines.align } };
}

export function setCodeOptions(layout: QrCardLayout, options: { panel?: boolean; radius?: number }): QrCardLayout {
    const { min, max } = LIMITS.radius;
    const radius = roundMm(clamp(options.radius ?? layout.code.radius, min, max));
    return { ...layout, code: { ...layout.code, radius, panel: options.panel ?? layout.code.panel } };
}

export function sameQrCardLayout(a: QrCardLayout, b: QrCardLayout): boolean {
    return QR_CARD_ELEMENTS.every((element) => {
        const left = a[element] as Record<string, unknown>;
        const right = b[element] as Record<string, unknown>;
        return Object.keys(left).every((key) => left[key] === right[key]);
    });
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/qrCardLayout.test.ts`
Expected: PASS. If a case fails, work its arithmetic by hand before changing either side: the test values above were checked against this code.

- [ ] **Step 5: Commit**

```bash
git add lib/qrCardLayout.ts lib/qrCardLayout.test.ts
git commit -m "feat(qr-cards): layout geometry"
```

---

### Task 3: Text layout from the layout, styles, paper sizes (`lib/qrCard.ts`)

**Files:**
- Modify: `lib/qrCard.ts`
- Test: `lib/qrCard.test.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/qrCard.test.ts`:

- Replace the import of `QR_CARD_LAYOUT` with `DEFAULT_QR_CARD_LAYOUT` from `@/lib/qrCardLayout`, and add `QR_CARD_SIZES` to the `@/lib/qrCard` import.
- In `layoutTitle`'s test, the expected value gains the anchor: `{ lines: ['Anna & Nikos'], fontSize: 9, baselines: [25.34], x: 52.5, anchor: 'middle' }`.
- In `layoutLines`' first test, `const { top, bottom } = QR_CARD_LAYOUT.lines;` becomes `const top = DEFAULT_QR_CARD_LAYOUT.lines.y; const bottom = top + DEFAULT_QR_CARD_LAYOUT.lines.height;`.
- In `qrCardStyleOf`, the template fixture gains `layout: null, sizes: ['A6', 'A5']` (Task 1 added `layout: null, sizes: ['A6']`; change the sizes), and the expected style gains `layout: DEFAULT_QR_CARD_LAYOUT, sizes: ['A6', 'A5']`.

Add:

```ts
describe('layout boxes', () => {
    const title = DEFAULT_QR_CARD_LAYOUT.title;

    it('anchors the title to the left or right edge of its box', () => {
        expect(layoutTitle('Anna', { ...title, x: 10, width: 50, align: 'left' })).toMatchObject({ x: 10, anchor: 'start' });
        expect(layoutTitle('Anna', { ...title, x: 10, width: 50, align: 'right' })).toMatchObject({ x: 60, anchor: 'end' });
    });

    it('centres the title in a moved box', () => {
        const placed = layoutTitle('Anna', { ...title, y: 50, height: 20 });
        // One 9 mm line: 10.8 tall, centred in 50..70.
        expect(placed.baselines[0]).toBeCloseTo(50 + (20 - 10.8) / 2 + 0.86 * 9, 2);
    });

    it('shrinks a title to fit a short box', () => {
        const placed = layoutTitle('Anna & Nikos', { ...title, height: 6, maxSize: 16 });
        expect(placed.lines).toHaveLength(1);
        expect(placed.fontSize * 1.2).toBeLessThanOrEqual(6.001);
    });

    it('lets a large maximum grow the title', () => {
        expect(layoutTitle('Anna', { ...title, maxSize: 14 }).fontSize).toBe(14);
    });

    it('scales the lines with the text size, inside a moved box', () => {
        const box = { ...DEFAULT_QR_CARD_LAYOUT.lines, y: 40, height: 30, textSize: 7, align: 'right' as const };
        const [line] = layoutLines([{ text: 'Scan', tone: 'body' }], box);
        expect(line).toMatchObject({ fontSize: 7, x: 97, anchor: 'end' });
        expect(line.baselines[0] - 0.86 * 7).toBeGreaterThanOrEqual(40);
    });
});

describe('QR_CARD_SIZES', () => {
    it('prints A6 and A5 at 300 dpi', () => {
        expect(QR_CARD_SIZES.A6).toEqual({ widthMm: 105, heightMm: 148, widthPx: 1240, heightPx: 1748, widthPt: 297.64, heightPt: 419.53 });
        expect(QR_CARD_SIZES.A5).toEqual({ widthMm: 148, heightMm: 210, widthPx: 1748, heightPx: 2480, widthPt: 419.53, heightPt: 595.28 });
    });
});
```

Change the Plain test to also check `expect(PLAIN_QR_CARD_STYLE).toMatchObject({ layout: DEFAULT_QR_CARD_LAYOUT, sizes: ['A6', 'A5'] })`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/qrCard.test.ts`
Expected: FAIL (no `x`/`anchor`, no `QR_CARD_SIZES`).

- [ ] **Step 3: Change `lib/qrCard.ts`**

Imports:

```ts
import type { EventThemeFontDto, QrCardSize, QrCardTemplateDto, QrCardTextAlign, QrTargetType } from '@/lib/api/types';
import { DEFAULT_QR_CARD_LAYOUT, type QrCardLayout } from '@/lib/qrCardLayout';
```

Replace the four export-size constants (`QR_CARD_EXPORT_WIDTH`, `QR_CARD_EXPORT_HEIGHT`, `QR_CARD_PDF_WIDTH`, `QR_CARD_PDF_HEIGHT`) and their comments with:

```ts
// Each paper size a card prints at, 300 dpi for the PNG. The SVG is drawn once, in A6 millimetres;
// these only set the output.
export const QR_CARD_SIZES: Record<
    QrCardSize,
    { widthMm: number; heightMm: number; widthPx: number; heightPx: number; widthPt: number; heightPt: number }
> = {
    A6: { widthMm: 105, heightMm: 148, widthPx: 1240, heightPx: 1748, widthPt: 297.64, heightPt: 419.53 },
    A5: { widthMm: 148, heightMm: 210, widthPx: 1748, heightPx: 2480, widthPt: 419.53, heightPt: 595.28 },
};
```

`QrCardStyle`, Plain and `qrCardStyleOf`:

```ts
// How a card looks: a backend template, or the built-in Plain.
export type QrCardStyle = {
    id: string;
    artworkUrl: string | null;
    textColor: string;
    headingFont: EventThemeFontDto | null;
    codeColor: string;
    centerLogo: boolean;
    layout: QrCardLayout;
    sizes: QrCardSize[];
};

// Built in, never from the backend: today's printed look. It has no artwork, so it prints sharp at any size.
export const PLAIN_QR_CARD_STYLE: QrCardStyle = {
    id: PLAIN_QR_CARD_ID,
    artworkUrl: null,
    textColor: QR_CARD_INK,
    headingFont: null,
    codeColor: QR_CARD_INK,
    centerLogo: true,
    layout: DEFAULT_QR_CARD_LAYOUT,
    sizes: ['A6', 'A5'],
};

export function qrCardStyleOf(template: QrCardTemplateDto): QrCardStyle {
    return {
        id: template.id,
        artworkUrl: template.artworkUrl,
        textColor: template.textColor,
        headingFont: template.headingFont,
        codeColor: template.codeColor,
        centerLogo: template.centerLogo,
        layout: template.layout ?? DEFAULT_QR_CARD_LAYOUT,
        sizes: template.sizes,
    };
}
```

Replace `QR_CARD_LAYOUT`, `TextBox`, `TEXT_WIDTH`, `QR_CARD_TITLE_BOX` and `QR_CARD_LINE_BOXES` (from `// Fixed spots on the card…` down to the line boxes) with:

```ts
// maxHeight: the box's height, when the text must also fit it.
export type TextBox = { width: number; maxLines: number; maxSize: number; minSize: number; mono?: boolean; maxHeight?: number };

const TITLE_MIN_SIZE = 5;

// The title's text box: up to two lines, shrinking from the layout's maximum to 5 mm to fit.
export function titleTextBox(title: QrCardLayout['title']): TextBox {
    return { width: title.width, maxLines: 2, maxSize: title.maxSize, minSize: Math.min(TITLE_MIN_SIZE, title.maxSize), maxHeight: title.height };
}

// Each tone at the default text size (5 mm, the body line's). A layout's textSize scales them all.
const BASE_TEXT_SIZE = 5;
const LINE_TONES: Record<QrCardLineTone, Omit<TextBox, 'width'>> = {
    body: { maxLines: 2, maxSize: 5, minSize: 3.5 },
    strong: { maxLines: 2, maxSize: 5, minSize: 3.5 },
    code: { maxLines: 1, maxSize: 5.5, minSize: 4, mono: true },
    small: { maxLines: 2, maxSize: 3.2, minSize: 2.6 },
};

export function lineTextBoxes(width: number, textSize: number): Record<QrCardLineTone, TextBox> {
    const scale = textSize / BASE_TEXT_SIZE;
    const boxes = {} as Record<QrCardLineTone, TextBox>;
    for (const [tone, box] of Object.entries(LINE_TONES) as Array<[QrCardLineTone, Omit<TextBox, 'width'>]>) {
        boxes[tone] = { ...box, width, maxSize: round(box.maxSize * scale), minSize: round(box.minSize * scale) };
    }
    return boxes;
}

// The default layout's boxes: today's.
export const QR_CARD_TITLE_BOX = titleTextBox(DEFAULT_QR_CARD_LAYOUT.title);
export const QR_CARD_LINE_BOXES = lineTextBoxes(DEFAULT_QR_CARD_LAYOUT.lines.width, DEFAULT_QR_CARD_LAYOUT.lines.textSize);
```

`round` is declared below these lines today; move the `round` function up above `titleTextBox` so it is defined before use (function declarations hoist, but keep the order readable).

`fitText` — add the height check and cap the fallback's line count to what the height holds:

```ts
function fitsHeight(lineCount: number, size: number, box: TextBox): boolean {
    return box.maxHeight === undefined || lineCount * size * LINE_HEIGHT <= box.maxHeight + 0.001;
}

// The largest size, in SIZE_STEP steps, at which the text wraps into the box's lines (and height)
// with every word whole. Only at the smallest size are long words broken, and whatever still runs
// over ends on an ellipsis.
export function fitText(text: string, box: TextBox): FittedText {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return { lines: [], fontSize: box.maxSize };
    for (let size = box.maxSize; size > box.minSize; size = round(size - SIZE_STEP)) {
        const lines = wrap(clean, size, box, false);
        if (lines.length <= box.maxLines && fitsHeight(lines.length, size, box) && lines.every((line) => fits(line, size, box))) {
            return { lines, fontSize: size };
        }
    }
    const heldLines = box.maxHeight === undefined ? box.maxLines : Math.floor(box.maxHeight / (box.minSize * LINE_HEIGHT) + 0.001);
    const maxLines = Math.max(1, Math.min(box.maxLines, heldLines));
    return { lines: clamp(wrap(clean, box.minSize, box, true), box.minSize, { ...box, maxLines }), fontSize: box.minSize };
}
```

Placement with anchors (replace `PlacedText`, `place`, `layoutTitle`, `fitLines`, `layoutLines`):

```ts
export type TextAnchor = 'start' | 'middle' | 'end';
export type PlacedText = FittedText & { baselines: number[]; x: number; anchor: TextAnchor };
export type PlacedLine = PlacedText & { tone: QrCardLineTone };

const ANCHORS: Record<QrCardTextAlign, TextAnchor> = { left: 'start', center: 'middle', right: 'end' };

// The x the text hangs from, and how: the box's left edge, centre or right edge.
function anchorOf(box: { x: number; width: number; align: QrCardTextAlign }): { x: number; anchor: TextAnchor } {
    const x = box.align === 'left' ? box.x : box.align === 'right' ? box.x + box.width : box.x + box.width / 2;
    return { x: round(x), anchor: ANCHORS[box.align] };
}

function blockHeight(fitted: FittedText): number {
    return fitted.lines.length * fitted.fontSize * LINE_HEIGHT;
}

function place<T extends FittedText>(fitted: T, top: number, anchor: { x: number; anchor: TextAnchor }): T & { baselines: number[]; x: number; anchor: TextAnchor } {
    return {
        ...fitted,
        baselines: fitted.lines.map((_, index) => round(top + (index * LINE_HEIGHT + BASELINE) * fitted.fontSize)),
        ...anchor,
    };
}

// The title, centred vertically in its box and aligned across it.
export function layoutTitle(title: string, box: QrCardLayout['title'] = DEFAULT_QR_CARD_LAYOUT.title): PlacedText {
    const fitted = fitText(title, titleTextBox(box));
    return place(fitted, box.y + (box.height - blockHeight(fitted)) / 2, anchorOf(box));
}

function fitLines(lines: QrCardLine[], boxes: Record<QrCardLineTone, TextBox>, scale: number): Array<FittedText & { tone: QrCardLineTone }> {
    return lines.map((line) => {
        const box = boxes[line.tone];
        const scaled = { ...box, maxSize: round(box.maxSize * scale), minSize: round(box.minSize * scale) };
        return { ...fitText(line.text, scaled), tone: line.tone };
    });
}

function stackHeight(items: FittedText[], gap: number): number {
    return items.reduce((sum, item) => sum + blockHeight(item), 0) + Math.max(0, items.length - 1) * gap;
}

// The 2 mm gap between lines at the default text size; it scales with the text.
const LINES_GAP = 2;

// Each line fitted to its tone, the stack centred vertically in its box and aligned across it.
export function layoutLines(lines: QrCardLine[], box: QrCardLayout['lines'] = DEFAULT_QR_CARD_LAYOUT.lines): PlacedLine[] {
    const boxes = lineTextBoxes(box.width, box.textSize);
    const gap = round((LINES_GAP * box.textSize) / BASE_TEXT_SIZE);
    const shown = lines.filter((line) => line.text.trim());
    let scale = 1;
    let fitted = fitLines(shown, boxes, scale);
    while (stackHeight(fitted, gap) > box.height && scale > MIN_LINES_SCALE) {
        scale = round(scale - LINES_SCALE_STEP);
        fitted = fitLines(shown, boxes, scale);
    }
    const anchor = anchorOf(box);
    let cursor = box.y + Math.max(0, box.height - stackHeight(fitted, gap)) / 2;
    return fitted.map((item) => {
        const placed = place(item, cursor, anchor);
        cursor += blockHeight(item) + gap;
        return placed;
    });
}
```

Delete the now-unused `QR_CARD_LAYOUT` constant. `QR_CARD_WIDTH` and `QR_CARD_HEIGHT` stay (the viewBox).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/qrCard.test.ts`
Expected: PASS. The type check still fails in `QrCardSvg.tsx` and `lib/qrCardExport.ts`; Tasks 4 and 5 fix them.

- [ ] **Step 5: Commit**

```bash
git add lib/qrCard.ts lib/qrCard.test.ts
git commit -m "feat(qr-cards): text placed from the layout, paper sizes"
```

---

### Task 4: The card draws from its layout (`QrCardSvg`)

**Files:**
- Modify: `components/qrCard/QrCardSvg.tsx`
- Test: `components/qrCard/QrCardSvg.scan.test.tsx`

- [ ] **Step 1: Write the failing scan cases**

In `QrCardSvg.scan.test.tsx`, give `scan` a raster width and add the new cases:

```tsx
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

function scan(url: string, style: Partial<QrCardStyle>, width = 840): string | null {
    // …markup as today…
    const image = new Resvg(markup, { fitTo: { mode: 'width', value: width }, background: '#FFFFFF', font: { loadSystemFonts: false } }).render();
    return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

const L = DEFAULT_QR_CARD_LAYOUT;
// The code moved to the bottom right, the text above it.
const MOVED = {
    title: { ...L.title, height: 20 },
    code: { x: 47, y: 90, size: 50, panel: true, radius: 2 },
    lines: { ...L.lines, y: 40, height: 40 },
};
// The smallest code the backend allows.
const SMALLEST = { ...L, code: { ...L.code, x: 37.5, y: 55, size: 30 } };

describe('QrCardSvg scans with a layout', () => {
    it.each([
        { name: 'a moved, resized code', layout: MOVED, width: 840 },
        { name: 'the smallest code, at A6 export size', layout: SMALLEST, width: 1240 },
        { name: 'the panel off on a white card', layout: { ...L, code: { ...L.code, panel: false } }, width: 840 },
        { name: 'the default layout at A5 export size', layout: L, width: 1748 },
    ])('$name', ({ layout, width }) => {
        for (const url of [SHORT_URL, LONG_URL]) {
            for (const centerLogo of [true, false]) {
                expect(scan(url, { layout, centerLogo }, width)).toBe(url);
            }
        }
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/qrCard/QrCardSvg.scan.test.tsx`
Expected: FAIL to import or run: `QR_CARD_LAYOUT` no longer exists in `lib/qrCard`.

- [ ] **Step 3: Draw from the layout**

In `QrCardSvg.tsx`:

- Drop `QR_CARD_LAYOUT` from the import.
- `CardText` takes the anchor from the placed text:

```tsx
function CardText({ text, fill, look }: { text: PlacedText; fill: string; look: TextLook }) {
    if (text.lines.length === 0) return null;
    return (
        <text x={text.x} textAnchor={text.anchor} fill={fill} fontSize={text.fontSize} {...look}>
            {text.lines.map((line, index) => (
                <tspan key={index} x={text.x} y={text.baselines[index]}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}
```

- In `QrCardSvg`, replace the panel maths and the drawing:

```tsx
    const { centerLogo, layout } = style;
    const code = useMemo(() => qrCodePath(url, { centerLogo }), [url, centerLogo]);
    const box = layout.code;
    const cell = box.size / (code.size + 2 * QR_QUIET_ZONE);
    const codeX = box.x + QR_QUIET_ZONE * cell;
    const codeY = box.y + QR_QUIET_ZONE * cell;
```

```tsx
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}`}
            // A5 is a touch narrower than A6 for its height: slice trims under 1 mm from the sides
            // (inside the safe margin) instead of leaving white bands. On screen the box has the
            // card's own shape, so nothing is trimmed there.
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-labelledby={titleId}
            className={className}
        >
```

```tsx
            {/* Title */}
            <CardText text={layoutTitle(title, layout.title)} fill={style.textColor} look={titleLook} />
            {/* Code */}
            {box.panel && <rect x={box.x} y={box.y} width={box.size} height={box.size} rx={box.radius} fill="#FFFFFF" />}
            <path d={code.d} transform={`translate(${codeX} ${codeY}) scale(${cell})`} fill={style.codeColor} />
            {/* …logo image unchanged… */}
            {/* Lines */}
            {layoutLines(lines, layout.lines).map((line, index) => (
                <CardText key={index} text={line} fill={style.textColor} look={LINE_LOOKS[line.tone]} />
            ))}
```

Update the component comment: "One card in A6 millimetres: artwork (or white) full-bleed, then the title, the code (on a white panel unless the layout turns it off) and the lines where the layout puts them. Print and the PNG/PDF export reuse this exact node at A6 or A5, so it draws with attributes only (no classes inside). The whole card is one image to assistive tech, named by its <title>."

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/qrCard/QrCardSvg.scan.test.tsx`
Expected: PASS. If the smallest code fails only for the long URL with the logo on, raise that case's width to 1748 (still a real export size) and note it in the PR; do not raise the 30 mm minimum without asking the user.

- [ ] **Step 5: Commit**

```bash
git add components/qrCard/QrCardSvg.tsx components/qrCard/QrCardSvg.scan.test.tsx
git commit -m "feat(qr-cards): draw the card from its layout"
```

---

### Task 5: Export and print at a paper size

**Files:**
- Modify: `lib/qrCardExport.ts` (+ `lib/qrCardExport.test.ts`)
- Modify: `hooks/useQrCardExport.ts` (+ `hooks/useQrCardExport.test.tsx`)
- Modify: `components/qrCard/QrCardPrintStyle.tsx`

- [ ] **Step 1: Write the failing tests**

`lib/qrCardExport.test.ts`:

- Every `standaloneQrCardSvg(x, font)` call gains `'A6'` as a third argument.
- Add to `standaloneQrCardSvg`:

```ts
    it('sizes the card for A5', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9]))));
        const markup = await standaloneQrCardSvg(cardSvg(), null, 'A5');
        expect(markup).toContain('width="1748"');
        expect(markup).toContain('height="2480"');
    });
```

- `qrCardPdfBytes`'s test calls `qrCardPdfBytes(bytes(PNG_BASE64), 'A6')`, and add:

```ts
    it('puts the PNG on one A5 page', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64), 'A5'));
        const { width, height } = pdf.getPage(0).getSize();
        expect(width).toBeCloseTo(419.53, 1);
        expect(height).toBeCloseTo(595.28, 1);
    });
```

`hooks/useQrCardExport.test.tsx`:

- `renderExport` takes a size: `function renderExport(size: QrCardSize = 'A6')` and calls `useQrCardExport({ font: FONT, title: 'Maria & Nikos', size })`. Import `QrCardSize` from `@/lib/api/types`.
- The PNG test expects `standaloneQrCardSvg` called with `(svg, FONT, 'A6')` and `qrCardPng` with `('<svg/>', 'A6')`.
- Add:

```ts
    it('exports at the chosen size', async () => {
        const { result } = renderExport('A5');

        act(() => result.current.savePdf());

        await waitFor(() => expect(downloadBlob).toHaveBeenCalled());
        expect(exportMocks.standaloneQrCardSvg).toHaveBeenCalledWith(result.current.svgRef.current, FONT, 'A5');
        expect(exportMocks.qrCardPng).toHaveBeenCalledWith('<svg/>', 'A5');
        expect(exportMocks.qrCardPdfBytes).toHaveBeenCalledWith(expect.anything(), 'A5');
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/qrCardExport.test.ts hooks/useQrCardExport.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Size the export**

`lib/qrCardExport.ts`:

```ts
import type { EventThemeFontDto, QrCardSize } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';
import { QR_CARD_SIZES } from '@/lib/qrCard';
```

```ts
// A copy of the card as a self-contained SVG file at the size's export pixels: images and the title
// font inline, no page classes. The card on the page stays as it is.
export async function standaloneQrCardSvg(svg: SVGSVGElement, font: EventThemeFontDto | null, size: QrCardSize): Promise<string> {
    const { widthPx, heightPx } = QR_CARD_SIZES[size];
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(widthPx));
    copy.setAttribute('height', String(heightPx));
    // …rest unchanged…
}

// The standalone SVG drawn on a 300 dpi canvas at the paper size.
export async function qrCardPng(markup: string, size: QrCardSize): Promise<Blob> {
    const { widthPx, heightPx } = QR_CARD_SIZES[size];
    // …as today, with canvas.width = widthPx, canvas.height = heightPx and drawImage(image, 0, 0, widthPx, heightPx)…
}

// One page of the paper size with the PNG edge to edge. pdf-lib loads only when a host saves a PDF.
export async function qrCardPdfBytes(png: ArrayBuffer, size: QrCardSize): Promise<Uint8Array> {
    const { widthPt, heightPt } = QR_CARD_SIZES[size];
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([widthPt, heightPt]);
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
    return pdf.save();
}
```

`hooks/useQrCardExport.ts`: take `size: QrCardSize` in the options, pass it to all three calls, and add `size` to `save`'s dependency list:

```ts
export function useQrCardExport({ font, title, size }: { font: EventThemeFontDto | null; title: string; size: QrCardSize }) {
```

```ts
                const png = await qrCardPng(await standaloneQrCardSvg(svg, font, size), size);
                const file =
                    format === 'png'
                        ? png
                        : new Blob([new Uint8Array(await qrCardPdfBytes(await png.arrayBuffer(), size))], { type: 'application/pdf' });
```

Update its comment: "Print, Save PNG and Save PDF for the card SVG behind svgRef, at the chosen paper size."

`components/qrCard/QrCardPrintStyle.tsx`:

```tsx
import type { QrCardSize } from '@/lib/api/types';
import { QR_CARD_SIZES } from '@/lib/qrCard';

// While the card is on screen, a print is one page of the chosen size holding just the card, edge to
// edge. The global print rules (app/globals.css) already hide everything outside [data-print-root]
// and make its ancestors plain blocks; these also zero the page margins and those ancestors'
// padding, which would otherwise push the card onto a second page.
function printCss({ widthMm, heightMm }: { widthMm: number; heightMm: number }): string {
    return (
        `@page{size:${widthMm}mm ${heightMm}mm;margin:0}` +
        '@media print{' +
        'html,body{margin:0!important;padding:0!important}' +
        'body :has([data-qr-card-print]){margin:0!important;padding:0!important;border:0!important;gap:0!important;min-height:0!important;max-width:none!important}' +
        `[data-qr-card-print]{width:${widthMm}mm!important;height:${heightMm}mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}` +
        `[data-qr-card-print] svg{display:block;width:${widthMm}mm;height:${heightMm}mm}` +
        '}'
    );
}

export function QrCardPrintStyle({ size }: { size: QrCardSize }) {
    return <style>{printCss(QR_CARD_SIZES[size])}</style>;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/qrCardExport.test.ts hooks/useQrCardExport.test.tsx`
Expected: PASS. `npx tsc --noEmit` now reports only the callers of `useQrCardExport` and `QrCardPrintStyle` (Task 6).

- [ ] **Step 5: Commit**

```bash
git add lib/qrCardExport.ts lib/qrCardExport.test.ts hooks/useQrCardExport.ts hooks/useQrCardExport.test.tsx components/qrCard/QrCardPrintStyle.tsx
git commit -m "feat(qr-cards): print and save at A6 or A5"
```

---

### Task 6: The host picks A6 or A5

**Files:**
- Modify: `hooks/useQrCardDesigner.ts` (+ test)
- Create: `components/qrCard/QrCardSizeControl.tsx` (+ test)
- Modify: `components/qrCard/QrCardDesigner.tsx`, `hooks/useQrCardScreen.ts`, `hooks/useGiftCardPrint.ts`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing designer tests**

In `hooks/useQrCardDesigner.test.tsx`, give `LINEN` `sizes: ['A6', 'A5']` and add:

```ts
    const NARROW: QrCardTemplateDto = { ...LINEN, id: 't2', sizes: ['A6'] };

    it('starts at A6 and offers the picked design’s sizes', () => {
        const { result } = renderDesigner([LINEN, NARROW]);
        expect(result.current.size).toBe('A6');
        expect(result.current.sizes).toEqual(['A6', 'A5']); // Plain
    });

    it('prints at A6 on a design without A5, and back at A5 on one with it', () => {
        const { result } = renderDesigner([LINEN, NARROW]);
        act(() => result.current.handleSizeChange(typed('size', 'A5')));
        expect(result.current.size).toBe('A5');
        act(() => result.current.selectTemplate('t2'));
        expect(result.current.size).toBe('A6');
        expect(result.current.sizes).toEqual(['A6']);
        act(() => result.current.selectTemplate('t1'));
        expect(result.current.size).toBe('A5');
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useQrCardDesigner.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the size to the designer**

In `hooks/useQrCardDesigner.ts`:

```ts
import type { QrCardSize, QrCardTemplateDto } from '@/lib/api/types';
```

```ts
    const [pickedSize, setPickedSize] = useState<QrCardSize>('A6');
```

after `style`:

```ts
    // A design without A5 prints at A6; going back to one with A5 restores the host's pick.
    const size: QrCardSize = style.sizes.includes(pickedSize) ? pickedSize : 'A6';
```

```ts
    const handleSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPickedSize(event.currentTarget.value as QrCardSize);
    }, []);
```

and return `sizes: style.sizes, size, handleSizeChange`. Update the hook's comment: "The picked design, paper size and the card's text."

- [ ] **Step 4: Run the designer tests**

Run: `npx vitest run hooks/useQrCardDesigner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing control test**

`components/qrCard/QrCardSizeControl.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardSizeControl } from '@/components/qrCard/QrCardSizeControl';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('QrCardSizeControl', () => {
    it('hides with one size', () => {
        const { container } = render(<QrCardSizeControl sizes={['A6']} size="A6" onChangeAction={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('offers both sizes and reports a pick', () => {
        const onChange = vi.fn();
        render(<QrCardSizeControl sizes={['A6', 'A5']} size="A6" onChangeAction={onChange} />);
        expect(screen.getByRole('radio', { name: 'A6' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'A5' }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].currentTarget ?? onChange.mock.calls[0][0].target).toBeTruthy();
    });
});
```

- [ ] **Step 6: Write the control**

`components/qrCard/QrCardSizeControl.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { QrCardSize } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// A6 or A5, shown only when the picked design offers both.
export function QrCardSizeControl({
    sizes,
    size,
    onChangeAction,
}: {
    sizes: QrCardSize[];
    size: QrCardSize;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.size');
    if (sizes.length < 2) return null;

    return (
        <fieldset>
            {/* Label */}
            <legend className="mb-2 text-sm font-semibold text-ink">{t('label')}</legend>
            {/* Options */}
            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
                {sizes.map((option) => (
                    <label
                        key={option}
                        className={cn(
                            'flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary/30',
                            option === size ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        <input type="radio" name="qr-card-size" value={option} checked={option === size} onChange={onChangeAction} className="sr-only" />
                        {t(option)}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
```

The radio's accessible name is the label text, `t('A6')` / `t('A5')`; the test's mock returns the key, so the names are `A6` and `A5`.

- [ ] **Step 7: Wire it in**

`components/qrCard/QrCardDesigner.tsx`:

```tsx
            <QrCardPrintStyle size={designer.size} />
```

and between `{children}` and the actions:

```tsx
            {/* Size */}
            <QrCardSizeControl sizes={designer.sizes} size={designer.size} onChangeAction={designer.handleSizeChange} />
```

`hooks/useQrCardScreen.ts` and `hooks/useGiftCardPrint.ts`:

```ts
    const exporter = useQrCardExport({ font: designer.style.headingFont, title: designer.text.title, size: designer.size });
```

- [ ] **Step 8: Add the copy**

`messages/en.json`, inside `QrCardPage`:

```json
        "size": {
            "label": "Paper size",
            "A6": "A6 · 10.5 × 14.8 cm",
            "A5": "A5 · 14.8 × 21 cm"
        },
```

`messages/el.json`, inside `QrCardPage`:

```json
        "size": {
            "label": "Μέγεθος χαρτιού",
            "A6": "A6 · 10,5 × 14,8 εκ.",
            "A5": "A5 · 14,8 × 21 εκ."
        },
```

- [ ] **Step 9: Run the tests and the type check**

```bash
npx vitest run hooks/useQrCardDesigner.test.tsx components/qrCard hooks/useQrCardScreen.test.tsx hooks/useGiftCardPrint.test.tsx
npx tsc --noEmit
```

Expected: PASS; type errors only in the admin files (Task 7).

- [ ] **Step 10: Commit**

```bash
git add hooks components/qrCard messages
git commit -m "feat(qr-cards): hosts pick A6 or A5"
```

---

### Task 7: Admin artwork limits and the drawer preview's layout

**Files:**
- Modify: `lib/adminQrCards.ts` (+ `lib/adminQrCards.test.ts`)
- Modify: `hooks/useQrCardTemplateDrawer.ts` (+ test)
- Modify: `components/admin/qrCards/QrCardTemplatePreview.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing tests**

`lib/adminQrCards.test.ts`:

```ts
import { qrCardArtworkFileError, QR_CARD_ARTWORK_MAX_BYTES } from '@/lib/adminQrCards';

describe('qrCardArtworkFileError', () => {
    const file = (type: string, size: number) => ({ type, size }) as File;

    it('takes PNG and WebP up to 10 MB', () => {
        expect(QR_CARD_ARTWORK_MAX_BYTES).toBe(10 * 1024 * 1024);
        expect(qrCardArtworkFileError(file('image/webp', 6 * 1024 * 1024))).toBeNull();
        expect(qrCardArtworkFileError(file('image/png', 10 * 1024 * 1024))).toBeNull();
    });

    it('refuses other types and larger files', () => {
        expect(qrCardArtworkFileError(file('image/jpeg', 100))).toBe('type');
        expect(qrCardArtworkFileError(file('image/png', 10 * 1024 * 1024 + 1))).toBe('size');
    });
});
```

`hooks/useQrCardTemplateDrawer.test.tsx`: add a test that the preview draws the saved layout:

```ts
    it('previews the saved layout, or the default without one', () => {
        const layout = { ...DEFAULT_QR_CARD_LAYOUT, title: { ...DEFAULT_QR_CARD_LAYOUT.title, align: 'left' as const } };
        expect(renderDrawer({ ...LINEN, layout }).result.current.previewStyle.layout).toEqual(layout);
        expect(renderDrawer(LINEN).result.current.previewStyle.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
    });
```

`renderDrawer` and `LINEN` are the file's existing helper and fixture. Import `DEFAULT_QR_CARD_LAYOUT` from `@/lib/qrCardLayout`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/adminQrCards.test.ts hooks/useQrCardTemplateDrawer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the artwork check**

`lib/adminQrCards.ts`:

```ts
import { THEME_ILLUSTRATION_TYPES } from '@/lib/adminThemePresets';
```

```ts
// The backend's cap for QR card artwork; theme illustrations keep 5 MB.
export const QR_CARD_ARTWORK_MAX_BYTES = 10 * 1024 * 1024;

// Type and size only; the server checks the A6 shape and the 1748 px width (3111).
export function qrCardArtworkFileError(file: File): 'type' | 'size' | null {
    if (!THEME_ILLUSTRATION_TYPES.includes(file.type)) return 'type';
    if (file.size > QR_CARD_ARTWORK_MAX_BYTES) return 'size';
    return null;
}
```

Also move the editor's sample link here so the preview and the editor share it:

```ts
// Never resolves to an event: the code only has to scan the way a real one would.
export const QR_CARD_SAMPLE_URL = 'https://storywall.gr/q/preview';
```

In `QrCardTemplatePreview.tsx`, delete its own `SAMPLE_URL` and use `QR_CARD_SAMPLE_URL` from `@/lib/adminQrCards`.

- [ ] **Step 4: Use them in the drawer hook**

In `hooks/useQrCardTemplateDrawer.ts`:

- Import `qrCardArtworkFileError` from `@/lib/adminQrCards` and drop `illustrationFileError` from the `@/lib/adminThemePresets` import.
- `handleFileChange` uses `const problem = qrCardArtworkFileError(next);` and its comment says "the server checks the A6 shape and the 1748 px width (3111)".
- `previewStyle` gains:

```ts
            layout: saved?.layout ?? DEFAULT_QR_CARD_LAYOUT,
            sizes: ['A6'],
```

(import `DEFAULT_QR_CARD_LAYOUT` from `@/lib/qrCardLayout`). The preview never prints, so its sizes don't matter.

- [ ] **Step 5: Update the copy**

`messages/en.json`, `AdminPage.qrCards.drawer`:

```json
            "artworkHint": "WebP recommended: it keeps the file small. PNG also works. A6 portrait (105 × 148), at least 1748 px wide, up to 10 MB.",
            "artworkSize": "Use an image up to 10 MB.",
```

`messages/el.json`, same keys:

```json
            "artworkHint": "Προτείνεται WebP, γιατί κρατά το αρχείο μικρό. Γίνεται δεκτό και PNG. Κάθετο A6 (105 × 148), πλάτος τουλάχιστον 1748 px, έως 10 MB.",
            "artworkSize": "Χρησιμοποιήστε εικόνα έως 10 MB.",
```

- [ ] **Step 6: Run the tests and the type check**

```bash
npx vitest run lib/adminQrCards.test.ts hooks/useQrCardTemplateDrawer.test.tsx components/admin/qrCards
npx tsc --noEmit
```

Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/adminQrCards.ts lib/adminQrCards.test.ts hooks/useQrCardTemplateDrawer.ts hooks/useQrCardTemplateDrawer.test.tsx components/admin/qrCards/QrCardTemplatePreview.tsx messages
git commit -m "feat(qr-cards): 10 MB, 1748 px artwork; preview draws the saved layout"
```

---

### Task 8: Editor copy

**Files:**
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the keys**

`messages/en.json`, inside `AdminPage.qrCards`, add `"layout"` to `drawer` (`"layout": "Layout",`) and a new `layout` object next to `drawer`:

```json
        "layout": {
            "edit": "Edit layout",
            "editSaveFirst": "Save the design first.",
            "title": "Layout: {name}",
            "canvas": "Card layout",
            "cardLabel": "QR card: {title}",
            "elements": { "title": "Title", "code": "Code", "lines": "Lines" },
            "selectHint": "Select something on the card to change it.",
            "position": "X {x} · Y {y} · W {width} · H {height} mm",
            "align": "Alignment",
            "alignOptions": { "left": "Left", "center": "Centre", "right": "Right" },
            "titleSize": "Largest text size",
            "linesSize": "Text size",
            "panel": "White panel",
            "panelOffNote": "Test-scan a printed card before offering this template.",
            "radius": "Corner rounding",
            "mm": "{value} mm",
            "sample": { "label": "Sample", "short": "Short card", "gift": "Gift card" },
            "sampleGiver": "With love from Eleni",
            "reset": "Reset layout",
            "cancel": "Cancel",
            "save": "Save layout",
            "network": "Couldn't reach the server. Check your connection and try again.",
            "discard": {
                "title": "Discard layout changes?",
                "body": "Your changes to this layout will be lost.",
                "confirm": "Discard changes",
                "keep": "Keep editing"
            }
        }
```

`messages/el.json`, `drawer.layout`: `"layout": "Διάταξη",` and:

```json
        "layout": {
            "edit": "Επεξεργασία διάταξης",
            "editSaveFirst": "Αποθηκεύστε πρώτα το σχέδιο.",
            "title": "Διάταξη: {name}",
            "canvas": "Διάταξη κάρτας",
            "cardLabel": "Κάρτα QR: {title}",
            "elements": { "title": "Τίτλος", "code": "Κωδικός", "lines": "Γραμμές" },
            "selectHint": "Επιλέξτε ένα στοιχείο της κάρτας για να το αλλάξετε.",
            "position": "X {x} · Y {y} · Π {width} · Υ {height} mm",
            "align": "Στοίχιση",
            "alignOptions": { "left": "Αριστερά", "center": "Κέντρο", "right": "Δεξιά" },
            "titleSize": "Μέγιστο μέγεθος κειμένου",
            "linesSize": "Μέγεθος κειμένου",
            "panel": "Λευκό πλαίσιο",
            "panelOffNote": "Σκανάρετε μια τυπωμένη κάρτα πριν διαθέσετε αυτό το πρότυπο.",
            "radius": "Στρογγύλεμα γωνιών",
            "mm": "{value} mm",
            "sample": { "label": "Δείγμα", "short": "Σύντομη κάρτα", "gift": "Κάρτα δώρου" },
            "sampleGiver": "Με αγάπη, Ελένη",
            "reset": "Επαναφορά διάταξης",
            "cancel": "Ακύρωση",
            "save": "Αποθήκευση διάταξης",
            "network": "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.",
            "discard": {
                "title": "Απόρριψη αλλαγών διάταξης;",
                "body": "Οι αλλαγές σε αυτή τη διάταξη θα χαθούν.",
                "confirm": "Απόρριψη αλλαγών",
                "keep": "Συνέχεια επεξεργασίας"
            }
        }
```

The editor's sample text reuses existing keys: `AdminPage.qrCards.preview.sampleTitle` and `sampleLine`, and `GiftMode.card.scan`, `pin`, `email`.

- [ ] **Step 2: Check the files parse and match**

```bash
node -e "const en=require('./messages/en.json'),el=require('./messages/el.json');const k=o=>Object.entries(o).flatMap(([a,v])=>typeof v==='object'?k(v).map(b=>a+'.'+b):[a]);const a=k(en.AdminPage.qrCards),b=k(el.AdminPage.qrCards);console.log(a.filter(x=>!b.includes(x)),b.filter(x=>!a.includes(x)))"
```

Expected: `[] []`.

- [ ] **Step 3: Commit**

```bash
git add messages
git commit -m "feat(qr-cards): layout editor copy"
```

---

### Task 9: Editor state (`useQrCardLayoutEditor`)

**Files:**
- Create: `hooks/useQrCardLayoutEditor.ts`
- Test: `hooks/useQrCardLayoutEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

`hooks/useQrCardLayoutEditor.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useAdminQrCardTemplates', () => ({ usePatchQrCardTemplate: () => patch }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'api error' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));

import { useQrCardLayoutEditor } from '@/hooks/useQrCardLayoutEditor';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    artworkWidth: 1748,
};

function key(name: string, options: { shiftKey?: boolean; target?: EventTarget } = {}) {
    return { key: name, shiftKey: false, target: document.body, preventDefault: vi.fn(), ...options } as unknown as KeyboardEvent<HTMLElement>;
}

function renderEditor() {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const hook = renderHook(() => useQrCardLayoutEditor({ template: LINEN, onSavedAction: onSaved, onCloseAction: onClose }));
    return { ...hook, onSaved, onClose };
}

beforeEach(() => {
    patch.mutateAsync.mockReset();
});

describe('useQrCardLayoutEditor', () => {
    it('starts on the default layout, clean, nothing selected', () => {
        const { result } = renderEditor();
        expect(result.current.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
        expect(result.current.dirty).toBe(false);
        expect(result.current.selected).toBeNull();
    });

    it('nudges the selected element with the arrow keys', () => {
        const { result } = renderEditor();
        act(() => result.current.select('code'));
        act(() => result.current.handleKeyDown(key('ArrowRight')));
        expect(result.current.layout.code.x).toBe(21);
        act(() => result.current.handleKeyDown(key('ArrowRight', { shiftKey: true })));
        expect(result.current.layout.code.x).toBe(26);
        expect(result.current.dirty).toBe(true);
    });

    it('leaves arrow keys to an input in the side panel', () => {
        const { result } = renderEditor();
        act(() => result.current.select('code'));
        act(() => result.current.handleKeyDown(key('ArrowRight', { target: document.createElement('input') })));
        expect(result.current.layout.code.x).toBe(20.5);
    });

    it('Escape deselects first, then closes when clean', () => {
        const { result, onClose } = renderEditor();
        act(() => result.current.select('title'));
        act(() => result.current.handleKeyDown(key('Escape')));
        expect(result.current.selected).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
        act(() => result.current.handleKeyDown(key('Escape')));
        expect(onClose).toHaveBeenCalled();
    });

    it('asks before closing with changes', () => {
        const { result, onClose } = renderEditor();
        act(() => result.current.handleAlignChange('title', 'left'));
        act(() => result.current.requestClose());
        expect(result.current.confirmingDiscard).toBe(true);
        expect(onClose).not.toHaveBeenCalled();
        act(() => result.current.keepEditing());
        expect(result.current.confirmingDiscard).toBe(false);
    });

    it('resets to the default layout', () => {
        const { result } = renderEditor();
        act(() => result.current.handleAlignChange('lines', 'right'));
        act(() => result.current.reset());
        expect(result.current.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
    });

    it('saves the layout, hands back the template and closes', async () => {
        const saved = { ...LINEN, layout: DEFAULT_QR_CARD_LAYOUT };
        patch.mutateAsync.mockResolvedValue(saved);
        const { result, onSaved, onClose } = renderEditor();
        act(() => result.current.handleAlignChange('title', 'left'));

        await act(() => result.current.save());

        expect(patch.mutateAsync).toHaveBeenCalledWith({ id: 't1', input: { layout: result.current.layout } });
        expect(onSaved).toHaveBeenCalledWith(saved);
        expect(onClose).toHaveBeenCalled();
    });

    it('keeps the editor open with a message when a save fails', async () => {
        patch.mutateAsync.mockRejectedValue(new TypeError('offline'));
        const { result, onClose } = renderEditor();

        await act(() => result.current.save());

        expect(result.current.saveError).toBe('layout.network'); // the mocked t returns the key
        expect(onClose).not.toHaveBeenCalled();
    });

    it('switches the sample to the gift card stack', () => {
        const { result } = renderEditor();
        expect(result.current.sampleLines).toHaveLength(1);
        act(() => result.current.handleSampleChange({ currentTarget: { value: 'gift' } } as never));
        expect(result.current.sampleLines.map((line) => line.tone)).toEqual(['body', 'code', 'small', 'strong']);
    });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useQrCardLayoutEditor.test.tsx`
Expected: FAIL, cannot resolve the hook.

- [ ] **Step 3: Write the hook**

`hooks/useQrCardLayoutEditor.ts`:

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, type FocusEvent, type KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { usePatchQrCardTemplate } from '@/hooks/useAdminQrCardTemplates';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isQrCardDetailError } from '@/lib/adminQrCards';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, QrCardTextAlign } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { giftQrCardLines, type QrCardLine } from '@/lib/qrCard';
import {
    DEFAULT_QR_CARD_LAYOUT,
    elementRect,
    moveElementTo,
    type QrCardElement,
    type QrCardLayout,
    sameQrCardLayout,
    setCodeOptions,
    setLinesOptions,
    setTitleOptions,
} from '@/lib/qrCardLayout';

export type QrCardLayoutSample = 'short' | 'gift';

const NUDGE = 0.5;
const NUDGE_LARGE = 5;
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// The layout editor's draft, selection and sample card, its keyboard, and the save. Only Save sends
// anything; closing with changes asks first.
export function useQrCardLayoutEditor({
    template,
    onSavedAction,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto;
    onSavedAction: (template: AdminQrCardTemplateDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards');
    const tGift = useTranslations('GiftMode.card');
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();
    const patch = usePatchQrCardTemplate();

    const saved = template.layout ?? DEFAULT_QR_CARD_LAYOUT;
    const [layout, setLayout] = useState<QrCardLayout>(saved);
    const [selected, setSelected] = useState<QrCardElement | null>(null);
    const [sample, setSample] = useState<QrCardLayoutSample>('short');
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    const dirty = !sameQrCardLayout(layout, saved);

    const sampleLines = useMemo<QrCardLine[]>(
        () =>
            sample === 'short'
                ? [{ text: t('preview.sampleLine'), tone: 'body' }]
                : giftQrCardLines({
                      line: tGift('scan'),
                      pin: tGift('pin', { pin: '4821 9934' }),
                      email: tGift('email', { email: 'maria@example.com' }),
                      giver: t('layout.sampleGiver'),
                  }),
        [sample, t, tGift],
    );

    const select = useCallback((element: QrCardElement | null) => setSelected(element), []);
    // Each element on the canvas names itself in data-element; focusing it selects it.
    const handleElementFocus = useCallback((event: FocusEvent<SVGElement>) => {
        const element = event.currentTarget.dataset.element as QrCardElement | undefined;
        if (element) setSelected(element);
    }, []);

    const requestClose = useCallback(() => {
        if (dirty) setConfirmingDiscard(true);
        else onCloseAction();
    }, [dirty, onCloseAction]);
    const keepEditing = useCallback(() => setConfirmingDiscard(false), []);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (selected) setSelected(null);
                else requestClose();
                return;
            }
            const arrow = ARROWS[event.key];
            // A range slider in the side panel uses the arrows itself.
            if (!arrow || !selected || event.target instanceof HTMLInputElement) return;
            event.preventDefault();
            const step = event.shiftKey ? NUDGE_LARGE : NUDGE;
            setLayout((current) => {
                const rect = elementRect(current, selected);
                return moveElementTo(current, selected, { x: rect.x + arrow[0] * step, y: rect.y + arrow[1] * step });
            });
        },
        [requestClose, selected],
    );

    const handleAlignChange = useCallback((element: 'title' | 'lines', align: QrCardTextAlign) => {
        setLayout((current) => (element === 'title' ? setTitleOptions(current, { align }) : setLinesOptions(current, { align })));
    }, []);
    const handleTitleSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const maxSize = Number(event.currentTarget.value);
        setLayout((current) => setTitleOptions(current, { maxSize }));
    }, []);
    const handleLinesSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const textSize = Number(event.currentTarget.value);
        setLayout((current) => setLinesOptions(current, { textSize }));
    }, []);
    const handlePanelChange = useCallback((panel: boolean) => setLayout((current) => setCodeOptions(current, { panel })), []);
    const handleRadiusChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const radius = Number(event.currentTarget.value);
        setLayout((current) => setCodeOptions(current, { radius }));
    }, []);
    const handleSampleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSample(event.currentTarget.value as QrCardLayoutSample);
    }, []);

    const reset = useCallback(() => setLayout(DEFAULT_QR_CARD_LAYOUT), []);

    const save = useCallback(async () => {
        setFailure(null);
        try {
            const updated = await patch.mutateAsync({ id: template.id, input: { layout } });
            onSavedAction(updated);
            onCloseAction();
        } catch (error) {
            setFailure(error);
        }
    }, [layout, onCloseAction, onSavedAction, patch, template.id]);

    // A non-ApiError is fetch failing before any response; a layout rejection's detail names the rule.
    let saveError: string | null = null;
    if (failure !== null) {
        if (!(failure instanceof ApiError)) saveError = t('layout.network');
        else if (isQrCardDetailError(failure)) saveError = failure.problem?.detail?.trim() || apiErrorMessage(failure);
        else saveError = apiErrorMessage(failure);
    }

    return {
        name: resolveLocalizedText(template.name, locale),
        layout,
        setLayout,
        selected,
        select,
        sample,
        sampleTitle: t('preview.sampleTitle'),
        sampleLines,
        dirty,
        confirmingDiscard,
        isSaving: patch.isPending,
        saveError,
        handleElementFocus,
        handleKeyDown,
        handleAlignChange,
        handleTitleSizeChange,
        handleLinesSizeChange,
        handlePanelChange,
        handleRadiusChange,
        handleSampleChange,
        requestClose,
        keepEditing,
        reset,
        save,
    };
}

export type QrCardLayoutEditorState = ReturnType<typeof useQrCardLayoutEditor>;
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run hooks/useQrCardLayoutEditor.test.tsx`
Expected: PASS. If `save` sends a `layout` that differs from `result.current.layout` read after the await, assert against the layout read before `save` instead.

- [ ] **Step 5: Commit**

```bash
git add hooks/useQrCardLayoutEditor.ts hooks/useQrCardLayoutEditor.test.tsx
git commit -m "feat(qr-cards): layout editor state"
```

---

### Task 10: Drag and resize (`useQrCardLayoutPointer`)

**Files:**
- Create: `hooks/useQrCardLayoutPointer.ts`

Pointer maths in a DOM-free test would only re-test `lib/qrCardLayout.ts`; this hook is checked through the editor component test (Task 13) and in the browser (Task 15).

- [ ] **Step 1: Write the hook**

`hooks/useQrCardLayoutPointer.ts`:

```ts
'use client';

import { type Dispatch, type PointerEvent, type SetStateAction, useCallback, useRef, useState } from 'react';

import { QR_CARD_HEIGHT, QR_CARD_WIDTH } from '@/lib/qrCard';
import {
    elementRect,
    moveElementTo,
    type Point,
    type QrCardElement,
    type QrCardGuide,
    type QrCardHandle,
    type QrCardLayout,
    type Rect,
    resizeElement,
    snapPosition,
} from '@/lib/qrCardLayout';

type Drag = { element: QrCardElement; handle: QrCardHandle | null; pointerId: number; startPoint: Point; startRect: Rect };

// Dragging and resizing on the editor's overlay, in card millimetres. Elements and handles name
// themselves with data-element and data-handle; the overlay <svg> gets the move, up and cancel
// events (pointer capture retargets them to the pressed element, and they bubble up to it).
// Holding Alt turns snapping off.
export function useQrCardLayoutPointer({
    layout,
    setLayout,
    select,
}: {
    layout: QrCardLayout;
    setLayout: Dispatch<SetStateAction<QrCardLayout>>;
    select: (element: QrCardElement) => void;
}) {
    const overlayRef = useRef<SVGSVGElement | null>(null);
    const drag = useRef<Drag | null>(null);
    const [guides, setGuides] = useState<QrCardGuide[]>([]);

    const toCard = useCallback((event: PointerEvent<SVGElement>): Point => {
        const box = overlayRef.current?.getBoundingClientRect();
        if (!box || box.width === 0 || box.height === 0) return { x: 0, y: 0 };
        return { x: ((event.clientX - box.left) / box.width) * QR_CARD_WIDTH, y: ((event.clientY - box.top) / box.height) * QR_CARD_HEIGHT };
    }, []);

    const handlePointerDown = useCallback(
        (event: PointerEvent<SVGElement>) => {
            const element = event.currentTarget.dataset.element as QrCardElement | undefined;
            if (event.button !== 0 || !element) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            select(element);
            drag.current = {
                element,
                handle: (event.currentTarget.dataset.handle as QrCardHandle | undefined) ?? null,
                pointerId: event.pointerId,
                startPoint: toCard(event),
                startRect: elementRect(layout, element),
            };
        },
        [layout, select, toCard],
    );

    const handlePointerMove = useCallback(
        (event: PointerEvent<SVGSVGElement>) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            const point = toCard(event);
            const dx = point.x - current.startPoint.x;
            const dy = point.y - current.startPoint.y;
            if (current.handle) {
                setLayout(resizeElement(layout, current.element, current.handle, current.startRect, dx, dy));
                return;
            }
            const to = { x: current.startRect.x + dx, y: current.startRect.y + dy };
            const snapped = event.altKey ? { ...to, guides: [] } : snapPosition(layout, current.element, to);
            setGuides(snapped.guides);
            setLayout(moveElementTo(layout, current.element, snapped));
        },
        [layout, setLayout, toCard],
    );

    const handlePointerEnd = useCallback((event: PointerEvent<SVGSVGElement>) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        setGuides([]);
    }, []);

    return { overlayRef, guides, handlePointerDown, handlePointerMove, handlePointerEnd };
}

export type QrCardLayoutPointer = ReturnType<typeof useQrCardLayoutPointer>;
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useQrCardLayoutPointer.ts
git commit -m "feat(qr-cards): drag and resize on the layout canvas"
```

---

### Task 11: Editor components

**Files:**
- Create: everything under `components/admin/qrCards/layoutEditor/`

Load the `design:design-system` skill first. The editor is admin UI: slate surfaces, coral only for the primary action and the selection, monospace for millimetre values, desktop-first.

- [ ] **Step 1: Segmented control and range**

`QrCardLayoutSegmented.tsx`:

```tsx
'use client';

import type { ChangeEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// A small radio group drawn as one pill: the editor's alignment and sample switches.
export function QrCardLayoutSegmented<T extends string>({
    name,
    legend,
    value,
    options,
    onChangeAction,
}: {
    name: string;
    legend: string;
    value: T;
    options: Array<{ value: T; label: string; icon?: ReactNode }>;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{legend}</legend>
            <div className="inline-flex rounded-md bg-canvas p-0.5">
                {options.map((option) => (
                    <label
                        key={option.value}
                        title={option.icon ? option.label : undefined}
                        className={cn(
                            'flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded px-2.5 text-xs font-semibold has-focus-visible:ring-2 has-focus-visible:ring-primary/30',
                            option.value === value ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={onChangeAction} className="sr-only" />
                        {option.icon}
                        <span className={option.icon ? 'sr-only' : undefined}>{option.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
```

`QrCardLayoutRange.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { formatMm } from '@/lib/adminQrCards';

// A labelled slider in 0.5 mm steps, its value shown in millimetres.
export function QrCardLayoutRange({
    label,
    value,
    min,
    max,
    disabled = false,
    onChangeAction,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    disabled?: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const locale = useLocale();
    const id = useId();

    return (
        <div className="space-y-1.5">
            {/* Label */}
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                    {label}
                </label>
                <span className="font-mono text-xs text-ink">{t('mm', { value: formatMm(value, locale) })}</span>
            </div>
            {/* Slider */}
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={value}
                disabled={disabled}
                onChange={onChangeAction}
                className="w-full accent-primary disabled:opacity-50"
            />
        </div>
    );
}
```

Add `formatMm` to `lib/adminQrCards.ts` (with a test in `lib/adminQrCards.test.ts`: `expect(formatMm(8, 'en')).toBe('8.0'); expect(formatMm(10.5, 'el')).toBe('10,5');`):

```ts
// A layout length for the editor, always one decimal: 8 → "8.0" ("8,0" in Greek).
export function formatMm(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
```

- [ ] **Step 2: Guides and handles**

`QrCardLayoutGuides.tsx`:

```tsx
import type { QrCardGuide } from '@/lib/qrCardLayout';
import { QR_CARD_HEIGHT, QR_CARD_WIDTH } from '@/lib/qrCard';

// The snap lines while dragging: full-card hairlines in the accent colour.
export function QrCardLayoutGuides({ guides }: { guides: QrCardGuide[] }) {
    return (
        <g className="text-primary" pointerEvents="none">
            {guides.map((guide) =>
                guide.axis === 'x' ? (
                    <line key={`x-${guide.at}`} x1={guide.at} x2={guide.at} y1={0} y2={QR_CARD_HEIGHT} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ) : (
                    <line key={`y-${guide.at}`} y1={guide.at} y2={guide.at} x1={0} x2={QR_CARD_WIDTH} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ),
            )}
        </g>
    );
}
```

`QrCardLayoutHandles.tsx`:

```tsx
import type { PointerEvent } from 'react';

import { handlePoint, handlesFor, type QrCardElement, type QrCardHandle, type Rect } from '@/lib/qrCardLayout';

// Handle squares, in mm on the card. Small enough not to cover text, big enough for a mouse.
const HANDLE_SIZE = 2.4;
const CURSORS: Record<QrCardHandle, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
};

// The selected element's resize handles. Mouse only: the keyboard moves elements, and sizes are set
// in the side panel or by mouse.
export function QrCardLayoutHandles({
    element,
    rect,
    onPointerDownAction,
}: {
    element: QrCardElement;
    rect: Rect;
    onPointerDownAction: (event: PointerEvent<SVGElement>) => void;
}) {
    return (
        <g className="text-primary">
            {handlesFor(element).map((handle) => {
                const point = handlePoint(rect, handle);
                return (
                    <rect
                        key={handle}
                        data-element={element}
                        data-handle={handle}
                        x={point.x - HANDLE_SIZE / 2}
                        y={point.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                        rx={0.4}
                        fill="#FFFFFF"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        style={{ cursor: CURSORS[handle] }}
                        onPointerDown={onPointerDownAction}
                    />
                );
            })}
        </g>
    );
}
```

- [ ] **Step 3: Canvas**

`QrCardLayoutCanvas.tsx`:

```tsx
'use client';

import type { FocusEvent } from 'react';
import { useTranslations } from 'next-intl';

import { QrCardLayoutGuides } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutGuides';
import { QrCardLayoutHandles } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutHandles';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import type { QrCardLayoutPointer } from '@/hooks/useQrCardLayoutPointer';
import { QR_CARD_SAMPLE_URL } from '@/lib/adminQrCards';
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, type QrCardLine, type QrCardStyle } from '@/lib/qrCard';
import { elementRect, QR_CARD_ELEMENTS, QR_CARD_SAFE_AREA, type QrCardElement } from '@/lib/qrCardLayout';
import { cn } from '@/lib/utils';

const SAFE = QR_CARD_SAFE_AREA;

// The real card, with a transparent overlay of the same size on top for selecting, dragging and
// resizing. The card's height follows the screen's, so the whole card always shows.
export function QrCardLayoutCanvas({
    style,
    title,
    lines,
    selected,
    pointer,
    onElementFocusAction,
}: {
    style: QrCardStyle;
    title: string;
    lines: QrCardLine[];
    selected: QrCardElement | null;
    pointer: QrCardLayoutPointer;
    onElementFocusAction: (event: FocusEvent<SVGElement>) => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="flex items-start justify-center rounded-lg bg-canvas p-4 md:p-6">
            <div className="relative aspect-[105/148] w-full max-w-[min(100%,calc((100dvh-15rem)*105/148))] overflow-hidden rounded-md bg-white shadow-sm">
                {/* Card */}
                <QrCardSvg style={style} url={QR_CARD_SAMPLE_URL} title={title} lines={lines} label={t('cardLabel', { title })} className="block h-full w-full" />

                {/* Overlay */}
                <svg
                    ref={pointer.overlayRef}
                    viewBox={`0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}`}
                    role="group"
                    aria-label={t('canvas')}
                    className="absolute inset-0 h-full w-full touch-none select-none"
                    onPointerMove={pointer.handlePointerMove}
                    onPointerUp={pointer.handlePointerEnd}
                    onPointerCancel={pointer.handlePointerEnd}
                >
                    {/* Safe area */}
                    <rect
                        x={SAFE.left}
                        y={SAFE.top}
                        width={SAFE.right - SAFE.left}
                        height={SAFE.bottom - SAFE.top}
                        fill="none"
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                    />
                    {/* Guides */}
                    <QrCardLayoutGuides guides={pointer.guides} />
                    {/* Elements */}
                    {QR_CARD_ELEMENTS.map((element) => {
                        const rect = elementRect(style.layout, element);
                        return (
                            <rect
                                key={element}
                                data-element={element}
                                role="button"
                                tabIndex={0}
                                aria-label={t(`elements.${element}`)}
                                aria-pressed={selected === element}
                                x={rect.x}
                                y={rect.y}
                                width={rect.width}
                                height={rect.height}
                                fill="transparent"
                                stroke={selected === element ? 'var(--color-primary)' : '#64748B'}
                                strokeWidth={selected === element ? 2 : 1}
                                strokeDasharray={selected === element ? undefined : '3 3'}
                                vectorEffect="non-scaling-stroke"
                                className={cn('cursor-move outline-none', 'focus-visible:[stroke-width:3]')}
                                onPointerDown={pointer.handlePointerDown}
                                onFocus={onElementFocusAction}
                            />
                        );
                    })}
                    {/* Handles */}
                    {selected && <QrCardLayoutHandles element={selected} rect={elementRect(style.layout, selected)} onPointerDownAction={pointer.handlePointerDown} />}
                </svg>
            </div>
        </div>
    );
}
```

Check the accent token's CSS variable name in `app/globals.css` (search `--color-primary`); if the admin shell uses another name, use that. The canvas sits inside the drawer's `.admin-shell` popup, so admin tokens apply.

- [ ] **Step 4: Inspector**

`QrCardLayoutInspector.tsx`:

```tsx
'use client';

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardLayoutRange } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutRange';
import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState } from '@/hooks/useQrCardLayoutEditor';
import { formatMm } from '@/lib/adminQrCards';
import type { QrCardTextAlign } from '@/lib/api/types';
import { elementRect, QR_CARD_LAYOUT_LIMITS } from '@/lib/qrCardLayout';

const ALIGN_ICONS = { left: <AlignLeft className="h-4 w-4" aria-hidden="true" />, center: <AlignCenter className="h-4 w-4" aria-hidden="true" />, right: <AlignRight className="h-4 w-4" aria-hidden="true" /> };
const ALIGNMENTS: QrCardTextAlign[] = ['left', 'center', 'right'];

// The side panel: what the selected element can change.
export function QrCardLayoutInspector({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const locale = useLocale();
    const { selected, layout } = editor;

    if (!selected) return <p className="text-sm text-ink-muted">{t('selectHint')}</p>;

    const rect = elementRect(layout, selected);
    const alignOptions = ALIGNMENTS.map((value) => ({ value, label: t(`alignOptions.${value}`), icon: ALIGN_ICONS[value] }));
    const onAlign = (element: 'title' | 'lines') => (event: ChangeEvent<HTMLInputElement>) =>
        editor.handleAlignChange(element, event.currentTarget.value as QrCardTextAlign);

    return (
        <div className="space-y-5">
            {/* Heading */}
            <div className="space-y-1">
                <h3 className="text-sm font-bold text-ink">{t(`elements.${selected}`)}</h3>
                <p className="font-mono text-xs text-ink-muted">
                    {t('position', {
                        x: formatMm(rect.x, locale),
                        y: formatMm(rect.y, locale),
                        width: formatMm(rect.width, locale),
                        height: formatMm(rect.height, locale),
                    })}
                </p>
            </div>

            {/* Title */}
            {selected === 'title' && (
                <>
                    <QrCardLayoutSegmented name="title-align" legend={t('align')} value={layout.title.align} options={alignOptions} onChangeAction={onAlign('title')} />
                    <QrCardLayoutRange
                        label={t('titleSize')}
                        value={layout.title.maxSize}
                        min={QR_CARD_LAYOUT_LIMITS.titleMaxSize.min}
                        max={QR_CARD_LAYOUT_LIMITS.titleMaxSize.max}
                        onChangeAction={editor.handleTitleSizeChange}
                    />
                </>
            )}

            {/* Lines */}
            {selected === 'lines' && (
                <>
                    <QrCardLayoutSegmented name="lines-align" legend={t('align')} value={layout.lines.align} options={alignOptions} onChangeAction={onAlign('lines')} />
                    <QrCardLayoutRange
                        label={t('linesSize')}
                        value={layout.lines.textSize}
                        min={QR_CARD_LAYOUT_LIMITS.linesTextSize.min}
                        max={QR_CARD_LAYOUT_LIMITS.linesTextSize.max}
                        onChangeAction={editor.handleLinesSizeChange}
                    />
                </>
            )}

            {/* Code */}
            {selected === 'code' && (
                <>
                    <div className="space-y-1.5">
                        <AdminSwitch label={t('panel')} checked={layout.code.panel} onCheckedChangeAction={editor.handlePanelChange} />
                        {!layout.code.panel && <p className="text-[11px] leading-4 text-status-warn">{t('panelOffNote')}</p>}
                    </div>
                    <QrCardLayoutRange
                        label={t('radius')}
                        value={layout.code.radius}
                        min={QR_CARD_LAYOUT_LIMITS.radius.min}
                        max={QR_CARD_LAYOUT_LIMITS.radius.max}
                        disabled={!layout.code.panel}
                        onChangeAction={editor.handleRadiusChange}
                    />
                </>
            )}
        </div>
    );
}
```

The `onAlign` curried handler is UI wiring; if lint (or review) flags it as logic in a component, move it into the hook as `handleTitleAlignChange` / `handleLinesAlignChange` taking the change event. Check `text-status-warn` exists in the admin tokens (search `status-warn` in `app/globals.css`); use the admin's warning token name if it differs.

- [ ] **Step 5: Toolbar and discard modal**

`QrCardLayoutToolbar.tsx`:

```tsx
'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState, QrCardLayoutSample } from '@/hooks/useQrCardLayoutEditor';

const SAMPLES: QrCardLayoutSample[] = ['short', 'gift'];

// The editor's footer: sample card, reset, any save error, cancel and save.
export function QrCardLayoutToolbar({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="flex w-full flex-wrap items-end justify-between gap-3">
            {/* Sample */}
            <div className="flex items-end gap-3">
                <QrCardLayoutSegmented
                    name="layout-sample"
                    legend={t('sample.label')}
                    value={editor.sample}
                    options={SAMPLES.map((value) => ({ value, label: t(`sample.${value}`) }))}
                    onChangeAction={editor.handleSampleChange}
                />
                {/* Reset */}
                <button
                    type="button"
                    onClick={editor.reset}
                    disabled={editor.isSaving}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reset')}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {editor.saveError && (
                    <p role="alert" className="max-w-xs text-xs text-status-danger">
                        {editor.saveError}
                    </p>
                )}
                <button
                    type="button"
                    onClick={editor.requestClose}
                    disabled={editor.isSaving}
                    className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    {t('cancel')}
                </button>
                <button
                    type="button"
                    onClick={editor.save}
                    disabled={editor.isSaving || !editor.dirty}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {editor.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('save')}
                </button>
            </div>
        </div>
    );
}
```

`QrCardLayoutDiscardModal.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

// Closing the editor with unsaved changes asks first.
export function QrCardLayoutDiscardModal({ open, onDiscardAction, onKeepAction }: { open: boolean; onDiscardAction: () => void; onKeepAction: () => void }) {
    const t = useTranslations('AdminPage.qrCards.layout.discard');

    return (
        <ConfirmActionModal
            open={open}
            title={t('title')}
            body={t('body')}
            confirmLabel={t('confirm')}
            cancelLabel={t('keep')}
            onCloseAction={onKeepAction}
            onConfirmAction={onDiscardAction}
        />
    );
}
```

- [ ] **Step 6: Editor shell**

`QrCardLayoutEditor.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { QrCardLayoutCanvas } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutCanvas';
import { QrCardLayoutDiscardModal } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutDiscardModal';
import { QrCardLayoutInspector } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutInspector';
import { QrCardLayoutToolbar } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutToolbar';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { useQrCardLayoutEditor } from '@/hooks/useQrCardLayoutEditor';
import { useQrCardLayoutPointer } from '@/hooks/useQrCardLayoutPointer';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import type { QrCardStyle } from '@/lib/qrCard';

// The full-screen layout editor for one template. `style` is the drawer's live look (colours, font,
// a picked but unsaved artwork); the layout is the editor's own draft. × and Esc are the editor's
// (closeDisabled hands them over): Esc deselects, then asks before discarding changes. The browser's
// Back still closes it, as it does every drawer.
export function QrCardLayoutEditor({
    template,
    style,
    onSavedAction,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto;
    style: QrCardStyle;
    onSavedAction: (template: AdminQrCardTemplateDto) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const editor = useQrCardLayoutEditor({ template, onSavedAction, onCloseAction });
    const pointer = useQrCardLayoutPointer({ layout: editor.layout, setLayout: editor.setLayout, select: editor.select });

    return (
        <AdminDrawer
            open
            size="modal"
            closeDisabled
            onClose={onCloseAction}
            title={t('title', { name: editor.name })}
            closeLabel={t('cancel')}
            footer={<QrCardLayoutToolbar editor={editor} />}
        >
            <div onKeyDown={editor.handleKeyDown} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
                {/* Canvas */}
                <QrCardLayoutCanvas
                    style={{ ...style, layout: editor.layout }}
                    title={editor.sampleTitle}
                    lines={editor.sampleLines}
                    selected={editor.selected}
                    pointer={pointer}
                    onElementFocusAction={editor.handleElementFocus}
                />
                {/* Inspector */}
                <aside className="md:border-l md:border-border md:pl-6">
                    <QrCardLayoutInspector editor={editor} />
                </aside>
            </div>
            <ThemeFontFace font={style.headingFont} />
            <QrCardLayoutDiscardModal open={editor.confirmingDiscard} onDiscardAction={onCloseAction} onKeepAction={editor.keepEditing} />
        </AdminDrawer>
    );
}
```

The `onKeyDown` on a `div` with no role is fine for lint only if the repo's jsx-a11y config allows it (keyboard events bubble from the focusable elements inside). If lint flags `no-static-element-interactions`, give the div `role="application"` with `aria-label={t('canvas')}` — that also tells screen readers the arrows move things.

- [ ] **Step 7: Type check and lint**

```bash
npx tsc --noEmit
npx eslint components/admin/qrCards/layoutEditor hooks/useQrCardLayoutEditor.ts hooks/useQrCardLayoutPointer.ts lib/qrCardLayout.ts lib/adminQrCards.ts
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/admin/qrCards/layoutEditor lib/adminQrCards.ts lib/adminQrCards.test.ts
git commit -m "feat(qr-cards): layout editor components"
```

---

### Task 12: Open the editor from the template drawer

**Files:**
- Modify: `hooks/useQrCardTemplateDrawer.ts` (+ test)
- Modify: `components/admin/qrCards/QrCardTemplateDrawer.tsx` (+ test)

- [ ] **Step 1: Write the failing tests**

`components/admin/qrCards/QrCardTemplateDrawer.test.tsx`:

- Add to the `state()` defaults: `savedTemplate: LINEN, layoutEditorOpen: false, openLayoutEditor: vi.fn(), closeLayoutEditor: vi.fn(), handleLayoutSaved: vi.fn(),`. Add `layout: null, artworkWidth: null` to `LINEN` if Task 1 hasn't.
- Mock the editor: `vi.mock('@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor', () => ({ QrCardLayoutEditor: () => <div data-testid="layout-editor" /> }));`
- Add:

```tsx
    it('opens the layout editor for a saved design', () => {
        state();
        render(<QrCardTemplateDrawer template={LINEN} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));
        expect(drawerState.current.openLayoutEditor).toHaveBeenCalled();
    });

    it('asks to save a new design before its layout', () => {
        state({ isCreate: true, savedTemplate: null });
        render(<QrCardTemplateDrawer template={null} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'edit' })).toBeDisabled();
        expect(screen.getByText('editSaveFirst')).toBeInTheDocument();
    });

    it('shows the editor while it is open', () => {
        state({ layoutEditorOpen: true });
        render(<QrCardTemplateDrawer template={LINEN} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
        expect(screen.getByTestId('layout-editor')).toBeInTheDocument();
    });
```

The test's `next-intl` mock returns the bare key, so the button's name is `edit` and the hint is `editSaveFirst`. If another element in the drawer already has the accessible name `edit`, use `getAllByRole(...).at(-1)` or scope with `within`.

`hooks/useQrCardTemplateDrawer.test.tsx`:

```ts
    it('opens and closes the layout editor, and keeps a saved layout', () => {
        const { result } = renderDrawer(LINEN);
        act(() => result.current.openLayoutEditor());
        expect(result.current.layoutEditorOpen).toBe(true);
        const layout = { ...DEFAULT_QR_CARD_LAYOUT, code: { ...DEFAULT_QR_CARD_LAYOUT.code, panel: false } };
        act(() => result.current.handleLayoutSaved({ ...LINEN, layout }));
        expect(result.current.savedTemplate?.layout).toEqual(layout);
        expect(result.current.previewStyle.layout).toEqual(layout);
        act(() => result.current.closeLayoutEditor());
        expect(result.current.layoutEditorOpen).toBe(false);
    });
```

(`renderDrawer` and `LINEN` as above.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/admin/qrCards/QrCardTemplateDrawer.test.tsx hooks/useQrCardTemplateDrawer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the editor state to the drawer hook**

In `hooks/useQrCardTemplateDrawer.ts`:

```ts
    const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
    const openLayoutEditor = useCallback(() => setLayoutEditorOpen(true), []);
    const closeLayoutEditor = useCallback(() => setLayoutEditorOpen(false), []);
    // The editor saved the layout: the drawer's copy follows, so its preview shows it.
    const handleLayoutSaved = useCallback((updated: AdminQrCardTemplateDto) => setSaved(updated), []);
```

Return `savedTemplate: saved, layoutEditorOpen, openLayoutEditor, closeLayoutEditor, handleLayoutSaved`. The drawer's own Save never sends `layout` (`buildQrCardTemplatePatchPayload` doesn't know it), so the two saves can't overwrite each other.

- [ ] **Step 4: Add the button and the editor to the drawer**

In `QrCardTemplateDrawer.tsx`, import `LayoutTemplate` from `lucide-react` and `QrCardLayoutEditor`, add `const tLayout = useTranslations('AdminPage.qrCards.layout');`, and after the Artwork field:

```tsx
                    {/* Layout */}
                    <AdminField label={t('layout')} hint={form.isCreate ? tLayout('editSaveFirst') : undefined}>
                        <button
                            type="button"
                            onClick={form.openLayoutEditor}
                            disabled={form.isCreate || form.isSaving}
                            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                        >
                            <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                            {tLayout('edit')}
                        </button>
                    </AdminField>
```

and at the end of the `AdminDrawer`'s children, after the preview grid:

```tsx
            {/* Layout editor */}
            {form.layoutEditorOpen && form.savedTemplate && (
                <QrCardLayoutEditor
                    template={form.savedTemplate}
                    style={form.previewStyle}
                    onSavedAction={form.handleLayoutSaved}
                    onCloseAction={form.closeLayoutEditor}
                />
            )}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/admin/qrCards hooks/useQrCardTemplateDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hooks/useQrCardTemplateDrawer.ts hooks/useQrCardTemplateDrawer.test.tsx components/admin/qrCards/QrCardTemplateDrawer.tsx components/admin/qrCards/QrCardTemplateDrawer.test.tsx
git commit -m "feat(qr-cards): edit a template's layout from its drawer"
```

---

### Task 13: Editor component test

**Files:**
- Create: `components/admin/qrCards/layoutEditor/QrCardLayoutEditor.test.tsx`

- [ ] **Step 1: Write the test**

It renders the real editor (drawer mocked to a plain div, like the drawer test) and drives it the way an admin does: focus an element, nudge it, change an option, save.

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useAdminQrCardTemplates', () => ({ usePatchQrCardTemplate: () => patch }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'api error' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
        <div>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/event/ThemeFontFace', () => ({ ThemeFontFace: () => null }));
vi.mock('@/components/admin/qrCards/layoutEditor/QrCardLayoutDiscardModal', () => ({
    QrCardLayoutDiscardModal: ({ open }: { open: boolean }) => (open ? <div>discard-open</div> : null),
}));

import { QrCardLayoutEditor } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: null,
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: true,
    layout: null,
    artworkWidth: null,
};

beforeEach(() => patch.mutateAsync.mockReset().mockImplementation(async ({ input }) => ({ ...LINEN, layout: input.layout })));
afterEach(cleanup);

function renderEditor() {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<QrCardLayoutEditor template={LINEN} style={PLAIN_QR_CARD_STYLE} onSavedAction={onSaved} onCloseAction={onClose} />);
    return { onSaved, onClose };
}

describe('QrCardLayoutEditor', () => {
    it('asks to select something first', () => {
        renderEditor();
        expect(screen.getByText('selectHint')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it('moves the code with the keyboard and saves the layout', async () => {
        const { onSaved, onClose } = renderEditor();
        const code = screen.getByRole('button', { name: 'elements.code' });
        fireEvent.focus(code);
        // Sideways: nothing shares the code's rows, so it moves the full 5 mm.
        fireEvent.keyDown(code, { key: 'ArrowRight', shiftKey: true });

        expect(screen.getByText(/position .*"x":"25.5"/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(patch.mutateAsync.mock.calls[0][0].input.layout.code.x).toBe(25.5);
        expect(onSaved).toHaveBeenCalled();
    });

    it('turns the panel off and shows the scan note', () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: 'elements.code' }));
        fireEvent.click(screen.getByRole('switch', { name: 'panel' }));
        expect(screen.getByText('panelOffNote')).toBeInTheDocument();
    });

    it('asks before discarding changes', () => {
        const { onClose } = renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: 'elements.title' }));
        fireEvent.click(screen.getByRole('radio', { name: 'alignOptions.left' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('discard-open')).toBeInTheDocument();
    });
});
```

`AdminSwitch` renders a `role="switch"` button named by its label, so `getByRole('switch', { name: 'panel' })` finds it.

- [ ] **Step 2: Run it**

Run: `npx vitest run components/admin/qrCards/layoutEditor/QrCardLayoutEditor.test.tsx`
Expected: PASS. Fix the component, not the test, when a behaviour is missing; fix the test when only a query or a mocked key string is off.

- [ ] **Step 3: Commit**

```bash
git add components/admin/qrCards/layoutEditor/QrCardLayoutEditor.test.tsx
git commit -m "test(qr-cards): layout editor"
```

---

### Task 14: Full checks

- [ ] **Step 1: Run everything**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```

Expected: no type errors, no lint errors, all tests pass. Fix every lint error before moving on (CLAUDE.md, "Cleanup").

- [ ] **Step 2: Stale references**

```bash
git grep -n "QR_CARD_LAYOUT\b\|QR_CARD_EXPORT_\|QR_CARD_PDF_\|illustrationFileError" -- lib components hooks app
```

Expected: `illustrationFileError` only in theme preset code; nothing else.

---

### Task 15: Look at it

Read the memories first: "Dev server shares .next" (only `preview_start {url: "http://localhost:3000/"}`), "Browser pane and signed-in UI" (ask the user for the local test login), "Local backend CORS is :3000 only", "Shared test account revokes mid-run".

- [ ] **Step 1: Run the backend branch locally**

The backend PR must be on staging, or run `feat/qr-card-layout` locally per the backend repo's README. Without it, the admin PATCH ignores `layout` and the host DTO has no `sizes`.

- [ ] **Step 2: Admin, desktop first (1440 × 900)**

- Open `/admin#qr-cards`, open a template, click "Edit layout".
- Drag each element; check snapping to the centre, the margin and the other boxes, with guides; Alt turns it off.
- Resize the code from each corner (stays square, stops at 30 mm) and each text box from edges and corners.
- Try to drag one box onto another: it stops at the edge.
- Tab to each element, nudge with arrows and Shift + arrows; Escape deselects, then asks when there are changes.
- Switch the sample to the gift card: the stack fits its box.
- Turn the panel off: the note shows, rounding disables.
- Save, reopen: the layout is back as saved; the drawer preview matches.
- Check Escape in the editor does not close the template drawer behind it, and the discard modal sits above the editor.
- Then a phone width (390 × 844): the editor stacks, nothing overlaps or overflows.

- [ ] **Step 3: Host, phone first (390 × 844)**

- Open a share link's card page on an event with `qr_cards`. Pick a template with A5 artwork: the size control shows; with an older template it hides.
- Save a PNG and a PDF at each size; open them: 1240 × 1748 and 1748 × 2480 px, A6 and A5 pages.
- Print preview at A5: one page, edge to edge.
- Desktop (1440 × 900): the control and actions sit cleanly.

- [ ] **Step 4: Real scan**

Scan an exported A6 and A5 card (and one with the panel off) from a phone screen or a print.

- [ ] **Step 5: SEO check**

Compare against `docs/seo-guidelines.md`: no new routes, `/admin` and `/events/…` stay private. List any broken rule as a BLOCKER in the PR.

---

### Task 16: Pull request

- [ ] **Step 1: Up to date with staging, checks again**

```bash
git fetch origin
git rebase origin/staging
npx tsc --noEmit && npm run lint && npx vitest run
```

- [ ] **Step 2: Ask the user before pushing**

- [ ] **Step 3: Push and open the PR into `staging`**

```bash
git push -u origin claude/editor-multi-format-artwork-4a59d6
gh pr create --base staging --title "QR card layout editor and A5" --body "$(cat <<'EOF'
Admins arrange each QR card template in a full-screen editor; hosts print or save cards at A6 or A5.

- Layout editor: drag, resize, snap guides, keyboard nudge, alignment, text sizes, code panel and rounding, sample gift card, reset, discard check.
- Card drawing follows the template's layout; templates without one look as before.
- A6 / A5 picker on the card page and gift card; print, PNG and PDF at either size.
- Artwork: 1748 px wide, up to 10 MB, WebP recommended.

Needs the backend PR (layout, artwork width, sizes) on staging first.

Spec: docs/superpowers/specs/2026-10-29-qr-card-layout-editor-design.md

SEO: no new routes; no blockers.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Then follow the session's PR steps (bind the PR, read CI).
