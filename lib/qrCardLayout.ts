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
