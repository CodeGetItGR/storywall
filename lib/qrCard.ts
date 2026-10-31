import type { EventThemeFontDto, QrCardSize, QrCardTemplateDto, QrCardTextAlign, QrTargetType } from '@/lib/api/types';
import { DEFAULT_QR_CARD_LAYOUT, type QrCardLayout } from '@/lib/qrCardLayout';

// A6 portrait in millimetres: the card SVG's user units.
export const QR_CARD_WIDTH = 105;
export const QR_CARD_HEIGHT = 148;

// Each paper size a card prints at, 300 dpi for the PNG. The SVG is drawn once, in A6 millimetres;
// these only set the output.
export const QR_CARD_SIZES: Record<
    QrCardSize,
    { widthMm: number; heightMm: number; widthPx: number; heightPx: number; widthPt: number; heightPt: number }
> = {
    A6: { widthMm: 105, heightMm: 148, widthPx: 1240, heightPx: 1748, widthPt: 297.64, heightPt: 419.53 },
    A5: { widthMm: 148, heightMm: 210, widthPx: 1748, heightPx: 2480, widthPt: 419.53, heightPt: 595.28 },
};

export const QR_CARD_TITLE_MAX = 40;
export const QR_CARD_LINE_MAX = 60;

// Mirrors the --ink token: today's printed card's text and code colour.
export const QR_CARD_INK = '#241F1A';
// Today's print popup font. Every device has it, so the preview and the exported file match.
export const QR_CARD_FONT = 'Arial, Helvetica, sans-serif';
export const QR_CARD_MONO_FONT = '"Courier New", Courier, monospace';
export const QR_CARD_LOGO_SRC = '/assets/Logo.svg';
// The quiet zone, in modules, on the white panel around the code.
export const QR_QUIET_ZONE = 4;

export const PLAIN_QR_CARD_ID = 'plain';

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

// The default line under the code (a QrCardPage.lines key), by what the QR opens.
export const QR_CARD_LINE_KEYS = {
    EVENT_JOIN: 'join',
    INVITATION: 'invitation',
    MEDIA_UPLOAD: 'gallery',
} as const satisfies Record<QrTargetType, string>;

export type QrCardLineTone = 'body' | 'strong' | 'code' | 'small';
export type QrCardLine = { text: string; tone: QrCardLineTone };

// The gift card's stack under the code. pin and email come already worded; null leaves the line out.
export function giftQrCardLines({
    line,
    pin,
    email,
    giver,
}: {
    line: string;
    pin: string | null;
    email: string | null;
    giver: string;
}): QrCardLine[] {
    const lines: QrCardLine[] = [{ text: line, tone: 'body' }];
    if (pin) lines.push({ text: pin, tone: 'code' });
    if (email) lines.push({ text: email, tone: 'small' });
    lines.push({ text: giver, tone: 'strong' });
    return lines;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

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

const LINE_HEIGHT = 1.2;
// The baseline's drop from the top of its line box, as a share of the font size: centres capitals and descenders.
const BASELINE = 0.86;
const SIZE_STEP = 0.25;
// A mono glyph plus the 0.2 em letter spacing the code tone draws with.
const MONO_WIDTH = 0.8;
// A stack of lines too tall for its band shrinks every tone together, down to this share.
const MIN_LINES_SCALE = 0.6;
const LINES_SCALE_STEP = 0.05;

// Bold Arial's widest glyphs (M 0.83, W 0.94, O 0.78, m 0.89, & 0.72, @ 0.98 em, plus their Greek and Cyrillic kin).
const WIDE_CHARS = new Set([...'MWOGQ@&mwΜΘΟΦΨΩωψφШЩЖЮЫМ']);
const WIDE_CHAR_WIDTH = 1;

// Rough advance widths as a share of the font size, a little over bold Arial's so a line never spills.
// A custom heading font is not measured; this margin is its only protection.
function charWidth(char: string): number {
    if (char === ' ') return 0.32;
    if (WIDE_CHARS.has(char)) return WIDE_CHAR_WIDTH;
    return char !== char.toLocaleLowerCase() ? 0.74 : 0.615;
}

export function estimateTextWidth(text: string, size: number, mono = false): number {
    const chars = [...text];
    const units = mono ? chars.length * MONO_WIDTH : chars.reduce((sum, char) => sum + charWidth(char), 0);
    return units * size;
}

function fits(text: string, size: number, box: TextBox): boolean {
    return estimateTextWidth(text, size, box.mono) <= box.width;
}

// A word wider than the box, split into pieces that each fit.
function breakWord(word: string, size: number, box: TextBox): string[] {
    if (fits(word, size, box)) return [word];
    const pieces: string[] = [];
    let piece = '';
    for (const char of word) {
        if (piece && !fits(piece + char, size, box)) {
            pieces.push(piece);
            piece = char;
        } else {
            piece += char;
        }
    }
    if (piece) pieces.push(piece);
    return pieces;
}

// Wraps on spaces. A word wider than the box is split only when breakWords is set, otherwise it keeps a line to itself.
function wrap(text: string, size: number, box: TextBox, breakWords: boolean): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        for (const piece of breakWords ? breakWord(word, size, box) : [word]) {
            const candidate = line ? `${line} ${piece}` : piece;
            if (fits(candidate, size, box)) {
                line = candidate;
            } else {
                if (line) lines.push(line);
                line = piece;
            }
        }
    }
    if (line) lines.push(line);
    return lines;
}

function clamp(lines: string[], size: number, box: TextBox): string[] {
    if (lines.length <= box.maxLines) return lines;
    const kept = lines.slice(0, box.maxLines);
    let last = kept[kept.length - 1];
    while (last && !fits(`${last}…`, size, box)) last = [...last].slice(0, -1).join('').trimEnd();
    kept[kept.length - 1] = `${last}…`;
    return kept;
}

export type FittedText = { lines: string[]; fontSize: number };

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

function place<T extends FittedText>(
    fitted: T,
    top: number,
    anchor: { x: number; anchor: TextAnchor },
): T & { baselines: number[]; x: number; anchor: TextAnchor } {
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

// "Maria & Nikos" → "Maria-&-Nikos.png". Characters file systems refuse are dropped.
export function qrCardFileName(title: string, extension: 'png' | 'pdf'): string {
    const clean = title
        .replace(/[\\/:*?"<>|\p{Cc}]/gu, '')
        .trim()
        .replace(/\s+/g, '-');
    // Cut by code point so an emoji is never split, then drop a dash left at the cut.
    const base = [...clean].slice(0, 60).join('').replace(/-+$/, '');
    return `${base || 'storywall-qr'}.${extension}`;
}
