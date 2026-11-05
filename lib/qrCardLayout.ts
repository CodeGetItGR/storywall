import type { LocalizedText, QrCardFieldKind, QrCardLayoutDto, QrCardTextAlign, QrCardTextFieldDto, QrCardWordingKey } from '@/lib/api/types';

// Where a card's title, code, lines and added text fields sit, in A6 millimetres. Mirrors the backend's
// QrCardLayoutValidator; the server stays the authority. Boxes may overlap: the code draws on top, then
// the fields in order.
export type QrCardTextField = QrCardTextFieldDto;
export type QrCardLayout = Omit<QrCardLayoutDto, 'fields'> & { fields: QrCardTextField[] };
export type QrCardTitleBox = NonNullable<QrCardLayout['title']>;
// An added field is selected as `field:<id>`.
export type QrCardElement = 'title' | 'code' | 'lines' | `field:${string}`;

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
    fieldMinHeight: 6,
    titleMaxSize: { min: 5, max: 16 },
    linesTextSize: { min: 3, max: 10 },
    fieldTextSize: { min: 3, max: 16 },
    codeSize: { min: 30, max: 89 },
    radius: { min: 0, max: 8 },
    fields: 5,
    fieldText: 60,
} as const;

export const DEFAULT_QR_CARD_TITLE: QrCardTitleBox = { x: 8, y: 10, width: 89, height: 26, maxSize: 9, align: 'center' };

// Today's fixed spots. Plain and every template without a saved layout use it.
export const DEFAULT_QR_CARD_LAYOUT: QrCardLayout = {
    title: DEFAULT_QR_CARD_TITLE,
    code: { x: 20.5, y: 40, size: 64, panel: true, radius: 4 },
    lines: { x: 8, y: 107, width: 89, height: 33, textSize: 5, align: 'center' },
    fields: [],
};

const SAFE = QR_CARD_SAFE_AREA;
const LIMITS = QR_CARD_LAYOUT_LIMITS;

// A stored layout, or the default when there is none. Layouts saved before KAN-103 have no fields.
export function qrCardLayoutOf(layout: QrCardLayoutDto | null | undefined): QrCardLayout {
    if (!layout) return DEFAULT_QR_CARD_LAYOUT;
    return { title: layout.title ?? null, code: layout.code, lines: layout.lines, fields: layout.fields ?? [] };
}

export function fieldElement(id: string): QrCardElement {
    return `field:${id}`;
}

export function fieldIdOf(element: QrCardElement): string | null {
    return element.startsWith('field:') ? element.slice('field:'.length) : null;
}

export function findField(layout: QrCardLayout, element: QrCardElement): QrCardTextField | null {
    const id = fieldIdOf(element);
    return id === null ? null : (layout.fields.find((field) => field.id === id) ?? null);
}

// Every element on the card, bottom to top: the order they draw and stack in.
export function qrCardElements(layout: QrCardLayout): QrCardElement[] {
    return [...(layout.title ? (['title'] as const) : []), 'lines', ...layout.fields.map((field) => fieldElement(field.id)), 'code'];
}

// The editor's hit targets: the selected element last, so it stays grabbable under the code.
export function qrCardHitOrder(layout: QrCardLayout, selected: QrCardElement | null): QrCardElement[] {
    const elements = qrCardElements(layout);
    return selected && elements.includes(selected) ? [...elements.filter((element) => element !== selected), selected] : elements;
}

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
    const box = element === 'title' ? layout.title : element === 'lines' ? layout.lines : findField(layout, element);
    if (!box) return { x: 0, y: 0, width: 0, height: 0 };
    const { x, y, width, height } = box;
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

function filled(text: LocalizedText | null, blankAllowed = false): boolean {
    return (
        text !== null &&
        ['en', 'el'].every((locale) => (text[locale] ?? '').trim().length <= LIMITS.fieldText && (blankAllowed || (text[locale] ?? '').trim() !== ''))
    );
}

// Whether a field has the words it needs: a fixed field its text, a host field its label, in English and Greek.
export function isFieldComplete(field: QrCardTextField): boolean {
    return field.kind === 'fixed' ? filled(field.text) : filled(field.label) && filled(field.placeholder, true);
}

export function isValidQrCardLayout(layout: QrCardLayout): boolean {
    const { title, code, lines, fields } = layout;
    if (!qrCardElements(layout).every((element) => insideSafeArea(elementRect(layout, element)))) return false;
    if (title && (title.width < LIMITS.textMinWidth - EPSILON || title.height < LIMITS.titleMinHeight - EPSILON)) return false;
    if (title && !within(title.maxSize, LIMITS.titleMaxSize)) return false;
    if (lines.width < LIMITS.textMinWidth - EPSILON || lines.height < LIMITS.linesMinHeight - EPSILON) return false;
    if (!within(lines.textSize, LIMITS.linesTextSize)) return false;
    if (!within(code.size, LIMITS.codeSize) || !within(code.radius, LIMITS.radius)) return false;
    if (fields.length > LIMITS.fields) return false;
    return fields.every(
        (field) =>
            field.width >= LIMITS.textMinWidth - EPSILON &&
            field.height >= LIMITS.fieldMinHeight - EPSILON &&
            within(field.textSize, LIMITS.fieldTextSize) &&
            isFieldComplete(field),
    );
}

function withRect(layout: QrCardLayout, element: QrCardElement, rect: Rect): QrCardLayout {
    const { x, y, width, height } = rect;
    if (element === 'code') return { ...layout, code: { ...layout.code, x, y, size: width } };
    if (element === 'title') return layout.title ? { ...layout, title: { ...layout.title, x, y, width, height } } : layout;
    if (element === 'lines') return { ...layout, lines: { ...layout.lines, x, y, width, height } };
    const id = fieldIdOf(element);
    return { ...layout, fields: layout.fields.map((field) => (field.id === id ? { ...field, x, y, width, height } : field)) };
}

// Moves an element's top-left toward a point, kept inside the safe area. Other boxes don't block it.
export function moveElementTo(layout: QrCardLayout, element: QrCardElement, to: Point): QrCardLayout {
    const start = elementRect(layout, element);
    const x = roundMm(clamp(to.x, SAFE.left, SAFE.right - start.width));
    const y = roundMm(clamp(to.y, SAFE.top, SAFE.bottom - start.height));
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
// the minimum and maximum sizes and the safe area.
export function resizeElement(layout: QrCardLayout, element: QrCardElement, handle: QrCardHandle, start: Rect, dx: number, dy: number): QrCardLayout {
    return withRect(layout, element, resizedRect(element, handle, start, dx, dy));
}

function minHeightOf(element: QrCardElement): number {
    if (element === 'title') return LIMITS.titleMinHeight;
    if (element === 'lines') return LIMITS.linesMinHeight;
    return LIMITS.fieldMinHeight;
}

function resizedRect(element: QrCardElement, handle: QrCardHandle, start: Rect, dx: number, dy: number): Rect {
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
        const minHeight = minHeightOf(element);
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
    return { x: roundMm(x), y: roundMm(y), width: roundMm(width), height: roundMm(height) };
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
    const others = qrCardElements(layout)
        .filter((other) => other !== element)
        .map((other) => elementRect(layout, other));
    const x = snapAxis(to.x, rect.width, [SAFE.left, CENTER_X, SAFE.right, ...others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width])]);
    const y = snapAxis(to.y, rect.height, [SAFE.top, CENTER_Y, SAFE.bottom, ...others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height])]);
    const guides: QrCardGuide[] = [];
    if (x.at !== null) guides.push({ axis: 'x', at: x.at });
    if (y.at !== null) guides.push({ axis: 'y', at: y.at });
    return { x: x.value, y: y.value, guides };
}

export function setTitleOptions(layout: QrCardLayout, options: { maxSize?: number; align?: QrCardTextAlign }): QrCardLayout {
    if (!layout.title) return layout;
    const { min, max } = LIMITS.titleMaxSize;
    const maxSize = roundMm(clamp(options.maxSize ?? layout.title.maxSize, min, max));
    return { ...layout, title: { ...layout.title, maxSize, align: options.align ?? layout.title.align } };
}

export function setLinesOptions(layout: QrCardLayout, options: { textSize?: number; align?: QrCardTextAlign }): QrCardLayout {
    const { min, max } = LIMITS.linesTextSize;
    const textSize = roundMm(clamp(options.textSize ?? layout.lines.textSize, min, max));
    return { ...layout, lines: { ...layout.lines, textSize, align: options.align ?? layout.lines.align } };
}

export const QR_CARD_WORDING_KEYS: QrCardWordingKey[] = ['join', 'invitation', 'gallery', 'guestWish', 'guestBoth', 'gift'];

// Sets one scan line's wording in one language. Emptied, it goes back to the standard line.
export function setLineWording(layout: QrCardLayout, key: QrCardWordingKey, locale: string, value: string): QrCardLayout {
    const words: Record<string, string> = { ...layout.lines.text?.[key], [locale]: value };
    if (!value) delete words[locale];
    const text: Partial<Record<QrCardWordingKey, Record<string, string>>> = { ...layout.lines.text, [key]: words };
    if (Object.keys(words).length === 0) delete text[key];
    return { ...layout, lines: { ...layout.lines, text: Object.keys(text).length > 0 ? text : null } };
}

// The design's own wording for a scan line in this language, or null for the standard line.
export function qrCardLineWording(layout: QrCardLayout, key: QrCardWordingKey, locale: string): string | null {
    return layout.lines.text?.[key]?.[locale]?.trim() || null;
}

export function setCodeOptions(layout: QrCardLayout, options: { panel?: boolean; radius?: number }): QrCardLayout {
    const { min, max } = LIMITS.radius;
    const radius = roundMm(clamp(options.radius ?? layout.code.radius, min, max));
    return { ...layout, code: { ...layout.code, radius, panel: options.panel ?? layout.code.panel } };
}

// Removes the title, or puts it back at its default spot.
export function setTitleShown(layout: QrCardLayout, shown: boolean): QrCardLayout {
    if (shown === (layout.title !== null)) return layout;
    return { ...layout, title: shown ? DEFAULT_QR_CARD_TITLE : null };
}

export type QrCardFieldChange = Partial<Pick<QrCardTextField, 'textSize' | 'align' | 'font' | 'bold' | 'color' | 'text' | 'label' | 'placeholder'>>;

export function updateField(layout: QrCardLayout, id: string, change: QrCardFieldChange): QrCardLayout {
    const { min, max } = LIMITS.fieldTextSize;
    return {
        ...layout,
        fields: layout.fields.map((field) =>
            field.id === id ? { ...field, ...change, textSize: roundMm(clamp(change.textSize ?? field.textSize, min, max)) } : field,
        ),
    };
}

// A new field across the card's middle, in the template's text colour. Its words start blank.
const NEW_FIELD_HEIGHT = 12;

// The highest full-width band clear of every element, or across the middle when none is.
function freeFieldY(layout: QrCardLayout): number {
    const rects = qrCardElements(layout).map((element) => elementRect(layout, element));
    for (let y = SAFE.top; y <= SAFE.bottom - NEW_FIELD_HEIGHT; y++) {
        const band = { x: SAFE.left, y, width: SAFE.right - SAFE.left, height: NEW_FIELD_HEIGHT };
        if (!rects.some((rect) => rectsOverlap(band, rect))) return y;
    }
    return CENTER_Y - NEW_FIELD_HEIGHT / 2;
}

export function addField(layout: QrCardLayout, { id, kind, color }: { id: string; kind: QrCardFieldKind; color: string }): QrCardLayout {
    if (layout.fields.length >= LIMITS.fields) return layout;
    const blank = { en: '', el: '' };
    const field: QrCardTextField = {
        id,
        kind,
        x: SAFE.left,
        y: freeFieldY(layout),
        width: SAFE.right - SAFE.left,
        height: NEW_FIELD_HEIGHT,
        textSize: 6,
        align: 'center',
        font: 'body',
        bold: false,
        color,
        text: kind === 'fixed' ? blank : null,
        label: kind === 'host' ? blank : null,
        placeholder: kind === 'host' ? blank : null,
    };
    return { ...layout, fields: [...layout.fields, field] };
}

export function removeField(layout: QrCardLayout, id: string): QrCardLayout {
    return { ...layout, fields: layout.fields.filter((field) => field.id !== id) };
}

// Deep value equality for the JSON-shaped layout: key order and identity don't matter.
function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    // Absent and null both mean none: older layouts leave out what newer ones send as null.
    if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => sameValue(left[key], right[key]));
}

export function sameQrCardLayout(a: QrCardLayout, b: QrCardLayout): boolean {
    return sameValue(a, b);
}

// How the editor names an element: a field by its kind and its number among fields of that kind.
export function elementName(layout: QrCardLayout, element: QrCardElement): { key: 'title' | 'code' | 'lines' | QrCardFieldKind; number: number } {
    const field = findField(layout, element);
    if (!field) return { key: element as 'title' | 'code' | 'lines', number: 0 };
    const sameKind = layout.fields.filter((other) => other.kind === field.kind);
    return { key: field.kind, number: sameKind.indexOf(field) + 1 };
}
