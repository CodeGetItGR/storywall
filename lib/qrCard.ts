import type { EventThemeFontDto, QrCardTemplateDto, QrCornerShape, QrDotShape, QrTargetType } from '@/lib/api/types';

// A6 portrait in millimetres: the card SVG's user units.
export const QR_CARD_WIDTH = 105;
export const QR_CARD_HEIGHT = 148;
// 300 dpi at A6, for the PNG.
export const QR_CARD_EXPORT_WIDTH = 1240;
export const QR_CARD_EXPORT_HEIGHT = 1748;
// A6 in PDF points (1/72 in).
export const QR_CARD_PDF_WIDTH = 297.64;
export const QR_CARD_PDF_HEIGHT = 419.53;

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
    dotShape: QrDotShape;
    cornerShape: QrCornerShape;
    centerLogo: boolean;
};

// Built in, never from the backend: today's printed look at A6.
export const PLAIN_QR_CARD_STYLE: QrCardStyle = {
    id: PLAIN_QR_CARD_ID,
    artworkUrl: null,
    textColor: QR_CARD_INK,
    headingFont: null,
    codeColor: QR_CARD_INK,
    dotShape: 'SQUARE',
    cornerShape: 'SQUARE',
    centerLogo: true,
};

export function qrCardStyleOf(template: QrCardTemplateDto): QrCardStyle {
    return {
        id: template.id,
        artworkUrl: template.artworkUrl,
        textColor: template.textColor,
        headingFont: template.headingFont,
        codeColor: template.codeColor,
        dotShape: template.dotShape,
        cornerShape: template.cornerShape,
        centerLogo: template.centerLogo,
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
export function giftQrCardLines({ line, pin, email, giver }: { line: string; pin: string | null; email: string | null; giver: string }): QrCardLine[] {
    const lines: QrCardLine[] = [{ text: line, tone: 'body' }];
    if (pin) lines.push({ text: pin, tone: 'code' });
    if (email) lines.push({ text: email, tone: 'small' });
    lines.push({ text: giver, tone: 'strong' });
    return lines;
}

// Fixed spots on the card in millimetres, inside an 8 mm safe margin.
export const QR_CARD_LAYOUT = {
    textX: QR_CARD_WIDTH / 2,
    title: { top: 10, bottom: 36 },
    panel: { x: 20.5, y: 40, size: 64, radius: 4 },
    lines: { top: 107, bottom: 140, gap: 2 },
} as const;

export type TextBox = { width: number; maxLines: number; maxSize: number; minSize: number; mono?: boolean };

const TEXT_WIDTH = QR_CARD_WIDTH - 16;
export const QR_CARD_TITLE_BOX: TextBox = { width: TEXT_WIDTH, maxLines: 2, maxSize: 9, minSize: 5 };
export const QR_CARD_LINE_BOXES: Record<QrCardLineTone, TextBox> = {
    body: { width: TEXT_WIDTH, maxLines: 2, maxSize: 5, minSize: 3.5 },
    strong: { width: TEXT_WIDTH, maxLines: 2, maxSize: 5, minSize: 3.5 },
    code: { width: TEXT_WIDTH, maxLines: 1, maxSize: 5.5, minSize: 4, mono: true },
    small: { width: TEXT_WIDTH, maxLines: 2, maxSize: 3.2, minSize: 2.6 },
};

const LINE_HEIGHT = 1.2;
// The baseline's drop from the top of its line box, as a share of the font size: centres capitals and descenders.
const BASELINE = 0.86;
const SIZE_STEP = 0.25;
// A mono glyph plus the 0.2 em letter spacing the code tone draws with.
const MONO_WIDTH = 0.8;
// A stack of lines too tall for its band shrinks every tone together, down to this share.
const MIN_LINES_SCALE = 0.6;
const LINES_SCALE_STEP = 0.05;

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

// Rough advance widths as a share of the font size, on the wide side so a line never spills.
function charWidth(char: string): number {
    if (char === ' ') return 0.32;
    return char !== char.toLocaleLowerCase() ? 0.74 : 0.6;
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

function wrap(text: string, size: number, box: TextBox): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        for (const piece of breakWord(word, size, box)) {
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

// The largest size, in SIZE_STEP steps, at which the text wraps into the box's lines. At the smallest
// size, whatever still runs over ends on an ellipsis.
export function fitText(text: string, box: TextBox): FittedText {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return { lines: [], fontSize: box.maxSize };
    for (let size = box.maxSize; size > box.minSize; size = round(size - SIZE_STEP)) {
        const lines = wrap(clean, size, box);
        if (lines.length <= box.maxLines) return { lines, fontSize: size };
    }
    return { lines: clamp(wrap(clean, box.minSize, box), box.minSize, box), fontSize: box.minSize };
}

export type PlacedText = FittedText & { baselines: number[] };
export type PlacedLine = PlacedText & { tone: QrCardLineTone };

function blockHeight(fitted: FittedText): number {
    return fitted.lines.length * fitted.fontSize * LINE_HEIGHT;
}

function place<T extends FittedText>(fitted: T, top: number): T & { baselines: number[] } {
    return { ...fitted, baselines: fitted.lines.map((_, index) => round(top + (index * LINE_HEIGHT + BASELINE) * fitted.fontSize)) };
}

// The title, centred in its band.
export function layoutTitle(title: string): PlacedText {
    const { top, bottom } = QR_CARD_LAYOUT.title;
    const fitted = fitText(title, QR_CARD_TITLE_BOX);
    return place(fitted, top + (bottom - top - blockHeight(fitted)) / 2);
}

function fitLines(lines: QrCardLine[], scale: number): Array<FittedText & { tone: QrCardLineTone }> {
    return lines.map((line) => {
        const box = QR_CARD_LINE_BOXES[line.tone];
        const scaled = { ...box, maxSize: round(box.maxSize * scale), minSize: round(box.minSize * scale) };
        return { ...fitText(line.text, scaled), tone: line.tone };
    });
}

function stackHeight(items: FittedText[], gap: number): number {
    return items.reduce((sum, item) => sum + blockHeight(item), 0) + Math.max(0, items.length - 1) * gap;
}

// Each line fitted to its tone, the stack centred in the band below the code.
export function layoutLines(lines: QrCardLine[]): PlacedLine[] {
    const { top, bottom, gap } = QR_CARD_LAYOUT.lines;
    const shown = lines.filter((line) => line.text.trim());
    let scale = 1;
    let fitted = fitLines(shown, scale);
    while (stackHeight(fitted, gap) > bottom - top && scale > MIN_LINES_SCALE) {
        scale = round(scale - LINES_SCALE_STEP);
        fitted = fitLines(shown, scale);
    }
    let cursor = top + Math.max(0, bottom - top - stackHeight(fitted, gap)) / 2;
    return fitted.map((item) => {
        const placed = place(item, cursor);
        cursor += blockHeight(item) + gap;
        return placed;
    });
}

// "Maria & Nikos" → "Maria-&-Nikos.png". Characters file systems refuse are dropped.
export function qrCardFileName(title: string, extension: 'png' | 'pdf'): string {
    const base = title
        .replace(/[\\/:*?"<>|\p{Cc}]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
    return `${base || 'storywall-qr'}.${extension}`;
}
