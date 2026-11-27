import type { UploadFrame } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// The graduation frame (KAN-304, spec 2026-11-26 §7.2): each design is an SVG the size of the photo, drawn over it
// in the browser before upload. The same SVG is the preview, so what the guest sees is what gets uploaded.

export type FramedDesign = Exclude<UploadFrame, 'NONE'>;
export const FRAME_DESIGNS: readonly FramedDesign[] = ['CLASSIC', 'LAUREL', 'CONFETTI'];
export const UPLOAD_FRAME_OPTIONS: readonly UploadFrame[] = ['NONE', ...FRAME_DESIGNS];

export type FrameText = { title: string; date: string };
export type FrameSize = { width: number; height: number };

// The previews' size: a 4:5 portrait, like most phone photos.
export const FRAME_PREVIEW_SIZE: FrameSize = { width: 1200, height: 1500 };

// An SVG drawn as an image can't load web fonts, so the text uses fonts every device has.
const SERIF = "Georgia, 'Times New Roman', serif";
const NAVY = '#1f2a44';
const GOLD = '#c9a227';
const WHITE = '#ffffff';
const CORAL = '#e2725b';
const CONFETTI_COLORS = [GOLD, CORAL, '#4f7cac', '#7bb661'];
// Where the confetti falls, as fractions of the photo, and each piece's turn in degrees. Kept off the middle
// of the photo, where the people are.
const CONFETTI_PIECES: ReadonlyArray<readonly [number, number, number]> = [
    [0.06, 0.05, 20],
    [0.18, 0.09, -30],
    [0.31, 0.04, 60],
    [0.45, 0.08, 10],
    [0.58, 0.03, -50],
    [0.71, 0.07, 35],
    [0.84, 0.04, -15],
    [0.94, 0.09, 45],
    [0.04, 0.2, -40],
    [0.95, 0.22, 25],
    [0.07, 0.36, 55],
    [0.93, 0.4, -20],
    [0.05, 0.55, 15],
    [0.95, 0.6, -45],
];

const n = (value: number) => Math.round(value * 10) / 10;
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Where things sit on a photo of this size. Everything follows the short side, so a portrait and a landscape
// photo get the same proportions and the photo keeps its own shape.
export function frameLayout({ width, height }: FrameSize) {
    const short = Math.min(width, height);
    const border = Math.round(short * 0.035);
    const band = Math.round(short * 0.17);
    return {
        short,
        border,
        band,
        bandTop: height - border - band,
        capSize: Math.round(band * 0.5),
        titleSize: Math.round(band * 0.3),
        dateSize: Math.round(band * 0.2),
        // The band less a band's width on each side for the ornaments.
        textWidth: Math.max(0, width - 2 * border - 2 * band),
    };
}

type Layout = ReturnType<typeof frameLayout>;

// A mortarboard drawn in a 24-unit box at (x, y), size units wide.
function cap(x: number, y: number, size: number, color: string): string {
    return (
        `<g data-part="cap" transform="translate(${n(x)} ${n(y)}) scale(${n(size / 24)})" fill="${color}">` +
        '<path d="M12 3 23 8 12 13 1 8Z"/>' +
        '<path d="M5.5 10.2V15c0 1.7 3 3 6.5 3s6.5-1.3 6.5-3v-4.8L12 13z"/>' +
        `<path d="M21 8.9v5.6" stroke="${color}" stroke-width="1.2" fill="none"/>` +
        '<circle cx="21" cy="15.2" r="1.1"/>' +
        '</g>'
    );
}

// Five leaves up a slight curve, mirrored for the right-hand side.
function laurel(cx: number, cy: number, size: number, mirrored: boolean): string {
    const side = mirrored ? -1 : 1;
    const leaves = [0, 1, 2, 3, 4]
        .map((i) => {
            const x = cx + side * Math.sin((i / 4) * Math.PI) * size * 0.12;
            const y = cy + size * 0.4 - i * size * 0.2;
            return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(size * 0.07)}" ry="${n(size * 0.15)}" transform="rotate(${side * 35} ${n(x)} ${n(y)})"/>`;
        })
        .join('');
    return `<g data-part="laurel" fill="${GOLD}">${leaves}</g>`;
}

function confetti({ width, height }: FrameSize, short: number): string {
    const pieces = CONFETTI_PIECES.map(([fx, fy, turn], i) => {
        const x = n(fx * width);
        const y = n(fy * height);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        if (i % 3 === 0) return `<circle cx="${x}" cy="${y}" r="${n(short * 0.012)}" fill="${color}"/>`;
        const w = n(short * 0.03);
        const h = n(short * 0.012);
        return `<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${w}" height="${h}" fill="${color}" transform="rotate(${turn} ${x} ${y})"/>`;
    }).join('');
    return `<g data-part="confetti">${pieces}</g>`;
}

// The title, squeezed to the room it has when it would run past it, and the date under it.
function lines(size: FrameSize, layout: Layout, text: FrameText, titleColor: string, dateColor: string): string {
    const x = n(size.width / 2);
    const hasDate = text.date.length > 0;
    const titleY = n(layout.bandTop + layout.band * (hasDate ? 0.45 : 0.6));
    const tooWide = text.title.length * layout.titleSize * 0.56 > layout.textWidth;
    const squeeze = tooWide ? ` textLength="${layout.textWidth}" lengthAdjust="spacingAndGlyphs"` : '';
    const title =
        `<text data-part="title" x="${x}" y="${titleY}" text-anchor="middle" font-family="${SERIF}" font-weight="700" ` +
        `font-size="${layout.titleSize}" fill="${titleColor}"${squeeze}>${xml(text.title)}</text>`;
    if (!hasDate) return title;
    const dateY = n(layout.bandTop + layout.band * 0.78);
    return (
        title +
        `<text data-part="date" x="${x}" y="${dateY}" text-anchor="middle" font-family="${SERIF}" ` +
        `font-size="${layout.dateSize}" fill="${dateColor}">${xml(text.date)}</text>`
    );
}

function classic(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize } = layout;
    return (
        `<rect x="${n(b / 2)}" y="${n(b / 2)}" width="${size.width - b}" height="${size.height - b}" fill="none" stroke="${WHITE}" stroke-width="${b}"/>` +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${WHITE}"/>` +
        cap(b + band * 0.25, bandTop + (band - capSize) / 2, capSize, NAVY) +
        lines(size, layout, text, NAVY, GOLD)
    );
}

function laurelDesign(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize } = layout;
    const inset = n(b * 1.6);
    const badge = capSize * 0.75;
    return (
        `<rect x="${n(b / 2)}" y="${n(b / 2)}" width="${size.width - b}" height="${size.height - b}" fill="none" stroke="${WHITE}" stroke-width="${b}"/>` +
        `<rect x="${inset}" y="${inset}" width="${n(size.width - 2 * inset)}" height="${n(size.height - 2 * inset)}" fill="none" stroke="${GOLD}" stroke-width="${n(b * 0.15)}"/>` +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${NAVY}"/>` +
        laurel(b + band * 0.5, bandTop + band * 0.5, band * 0.9, false) +
        laurel(size.width - b - band * 0.5, bandTop + band * 0.5, band * 0.9, true) +
        `<circle cx="${n(size.width / 2)}" cy="${n(b + badge)}" r="${n(badge)}" fill="${NAVY}"/>` +
        cap(size.width / 2 - capSize * 0.5, b + badge - capSize * 0.5, capSize, GOLD) +
        lines(size, layout, text, WHITE, GOLD)
    );
}

function confettiDesign(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize, short } = layout;
    return (
        `<rect x="${n(b * 0.3)}" y="${n(b * 0.3)}" width="${n(size.width - b * 0.6)}" height="${n(size.height - b * 0.6)}" fill="none" stroke="${WHITE}" stroke-width="${n(b * 0.6)}"/>` +
        confetti(size, short) +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${WHITE}" fill-opacity="0.92"/>` +
        cap(b + band * 0.25, bandTop + (band - capSize) / 2, capSize, NAVY) +
        lines(size, layout, text, NAVY, CORAL)
    );
}

const DESIGNS: Record<FramedDesign, (size: FrameSize, layout: Layout, text: FrameText) => string> = {
    CLASSIC: classic,
    LAUREL: laurelDesign,
    CONFETTI: confettiDesign,
};

export function frameSvg(design: FramedDesign, size: FrameSize, text: FrameText): string {
    const { width, height } = size;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        DESIGNS[design](size, frameLayout(size), text) +
        '</svg>'
    );
}

export const frameSvgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// The event's title and start date, the date in the uploader's language on the event's own calendar day.
export function frameText(event: { title?: string | null; startAt?: string | null; timezone?: string | null }, locale: string): FrameText {
    const date = event.startAt
        ? formatDate(locale, event.startAt, { dateStyle: 'long', ...(event.timezone ? { timeZone: event.timezone } : {}) })
        : '';
    return { title: (event.title ?? '').trim(), date };
}

// Add frame stays as the guest left it for the rest of the visit, per event. Held in memory too, for a
// browser that refuses session storage.
const choices = new Map<string, boolean>();
const listeners = new Set<() => void>();
const choiceKey = (eventId: string) => `storywall:upload-frame:${eventId}`;

export function readFrameChoice(eventId: string): boolean {
    const held = choices.get(eventId);
    if (held !== undefined) return held;
    try {
        return sessionStorage.getItem(choiceKey(eventId)) === 'on';
    } catch {
        return false;
    }
}

export function saveFrameChoice(eventId: string, on: boolean): void {
    choices.set(eventId, on);
    try {
        sessionStorage.setItem(choiceKey(eventId), on ? 'on' : 'off');
    } catch {
        // Memory still holds it for this page.
    }
    listeners.forEach((listener) => listener());
}

export function subscribeFrameChoice(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// What a switch needs: whether it is on, how to flip it, and its preview.
export type UploadFrameControl = { on: boolean; toggle: () => void; previewSrc: string; label: string; alt: string };
