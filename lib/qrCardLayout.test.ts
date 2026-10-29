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
