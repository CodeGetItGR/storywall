import { describe, expect, it } from 'vitest';

import {
    addField,
    DEFAULT_QR_CARD_LAYOUT,
    DEFAULT_QR_CARD_TITLE,
    elementName,
    elementRect,
    fieldElement,
    handlePoint,
    isFieldComplete,
    isValidQrCardLayout,
    moveElementTo,
    qrCardElements,
    qrCardHitOrder,
    type QrCardLayout,
    qrCardLayoutOf,
    qrCardLineWording,
    rectsOverlap,
    removeField,
    resizeElement,
    roundMm,
    sameQrCardLayout,
    setCodeOptions,
    setLinesOptions,
    setLineWording,
    setTitleOptions,
    setTitleShown,
    snapPosition,
    updateField,
} from '@/lib/qrCardLayout';

const L = DEFAULT_QR_CARD_LAYOUT;
const T = DEFAULT_QR_CARD_TITLE;
const withText = addField(L, { id: 'a', kind: 'fixed', color: '#112233' });

describe('the default layout', () => {
    it("is today's fixed spots, and valid", () => {
        expect(L).toEqual({
            title: { x: 8, y: 10, width: 89, height: 26, maxSize: 9, align: 'center' },
            code: { x: 20.5, y: 40, size: 64, panel: true, radius: 4 },
            lines: { x: 8, y: 107, width: 89, height: 33, textSize: 5, align: 'center' },
            fields: [],
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
        ['outside the margin', { ...L, title: { ...T, x: 7.9 } }],
        ['a small code', { ...L, code: { ...L.code, size: 29.9 } }],
        ['a large title size', { ...L, title: { ...T, maxSize: 16.1 } }],
        ['a field without its words', withText],
    ])('rejects %s', (_, layout) => {
        expect(isValidQrCardLayout(layout)).toBe(false);
    });

    it('accepts overlapping boxes and a removed title', () => {
        expect(isValidQrCardLayout({ ...L, title: { ...T, height: 60 } })).toBe(true);
        expect(isValidQrCardLayout(setTitleShown(L, false))).toBe(true);
    });
});

describe('qrCardLayoutOf', () => {
    it('falls back to the default, and reads a layout saved before fields as having none', () => {
        expect(qrCardLayoutOf(null)).toBe(L);
        const { fields: _fields, ...old } = L;
        expect(qrCardLayoutOf(old)).toEqual(L);
    });
});

describe('fields', () => {
    it('adds a blank field across the middle, selected by its element id', () => {
        expect(withText.fields).toEqual([
            expect.objectContaining({ id: 'a', kind: 'fixed', color: '#112233', text: { en: '', el: '' }, label: null, placeholder: null }),
        ]);
        expect(qrCardElements(withText)).toEqual(['title', 'lines', 'field:a', 'code']);
        expect(elementRect(withText, fieldElement('a'))).toEqual({ x: 8, y: 68, width: 89, height: 12 });
    });

    it('needs its words in both languages; a placeholder may stay blank', () => {
        const fixed = updateField(withText, 'a', { text: { en: 'Thanks', el: 'Ευχαριστούμε' } });
        expect(isFieldComplete(fixed.fields[0])).toBe(true);
        expect(isValidQrCardLayout(fixed)).toBe(true);
        const host = addField(L, { id: 'h', kind: 'host', color: '#000000' });
        expect(isFieldComplete(updateField(host, 'h', { label: { en: 'Date', el: 'Ημερομηνία' } }).fields[0])).toBe(true);
        expect(isFieldComplete(updateField(host, 'h', { label: { en: 'Date', el: ' ' } }).fields[0])).toBe(false);
    });

    it('starts in the first clear band when there is one', () => {
        const short = { ...L, lines: { ...L.lines, y: 120, height: 20 } };
        expect(addField(short, { id: 'a', kind: 'fixed', color: '#000000' }).fields[0].y).toBe(104);
    });

    it('puts the selected element on top of the hit targets', () => {
        expect(qrCardHitOrder(withText, 'field:a')).toEqual(['title', 'lines', 'code', 'field:a']);
        expect(qrCardHitOrder(withText, null)).toEqual(qrCardElements(withText));
    });

    it('stops at five', () => {
        let layout = L;
        for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) layout = addField(layout, { id, kind: 'fixed', color: '#000000' });
        expect(layout.fields.map((field) => field.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('clamps a text size, and removes a field', () => {
        expect(updateField(withText, 'a', { textSize: 40 }).fields[0].textSize).toBe(16);
        expect(removeField(withText, 'a').fields).toEqual([]);
    });

    it('names fields by kind and number', () => {
        const two = addField(addField(withText, { id: 'h', kind: 'host', color: '#000000' }), { id: 'b', kind: 'fixed', color: '#000000' });
        expect(elementName(two, 'field:b')).toEqual({ key: 'fixed', number: 2 });
        expect(elementName(two, 'field:h')).toEqual({ key: 'host', number: 1 });
        expect(elementName(two, 'code')).toEqual({ key: 'code', number: 0 });
    });

    it('moves and resizes like any text box', () => {
        expect(moveElementTo(withText, 'field:a', { x: 30, y: 200 }).fields[0]).toMatchObject({ x: 8, y: 128 });
        expect(resizeElement(withText, 'field:a', 's', elementRect(withText, 'field:a'), 0, -20).fields[0].height).toBe(6);
    });
});

describe('the title', () => {
    it('can be removed and put back at its default spot', () => {
        const without = setTitleShown(moveElementTo(L, 'title', { x: 8, y: 50 }), false);
        expect(without.title).toBeNull();
        expect(qrCardElements(without)).toEqual(['lines', 'code']);
        expect(setTitleShown(without, true).title).toEqual(T);
        expect(setTitleOptions(without, { align: 'left' })).toBe(without);
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

    it('moves over other boxes', () => {
        expect(moveElementTo(L, 'code', { x: 20.5, y: 60 }).code.y).toBe(60);
        expect(moveElementTo(L, 'title', { x: 8, y: 30 }).title?.y).toBe(30);
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

    it('grows over other boxes, up to the safe area', () => {
        expect(resizeElement(L, 'code', 'se', start, 20, 20).code).toMatchObject({ x: 20.5, y: 40, size: 76.5 }); // 97 - 20.5
        expect(resizeElement(L, 'title', 's', elementRect(L, 'title'), 0, 50).title).toMatchObject({ y: 10, height: 76 });
    });

    it('resizes a text box from an edge, within its minimum', () => {
        const titleStart = elementRect(L, 'title');
        expect(resizeElement(L, 'title', 'e', titleStart, -30, 0).title?.width).toBe(59);
        expect(resizeElement(L, 'title', 'e', titleStart, -80, 0).title?.width).toBe(20);
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
        expect(setTitleOptions(L, { maxSize: 30 }).title?.maxSize).toBe(16);
        expect(setTitleOptions(L, { align: 'left' }).title?.align).toBe('left');
        expect(setLinesOptions(L, { textSize: 1 }).lines.textSize).toBe(3);
        expect(setCodeOptions(L, { radius: 12 }).code.radius).toBe(8);
        expect(setCodeOptions(L, { panel: false }).code.panel).toBe(false);
    });
});

describe('sameQrCardLayout', () => {
    it('compares values, not identity', () => {
        expect(sameQrCardLayout(L, structuredClone(L))).toBe(true);
        expect(sameQrCardLayout(L, setTitleOptions(L, { align: 'left' }))).toBe(false);
        expect(sameQrCardLayout(withText, updateField(withText, 'a', { text: { el: '', en: '' } }))).toBe(true);
        expect(sameQrCardLayout(withText, updateField(withText, 'a', { text: { en: 'x', el: '' } }))).toBe(false);
        expect(sameQrCardLayout(L, withText)).toBe(false);
    });
});

describe('line wording', () => {
    it('sets one language at a time and drops emptied ones', () => {
        const worded = setLineWording(setLineWording(L, 'join', 'en', 'Scan to celebrate'), 'gift', 'el', 'Σκάναρε');
        expect(worded.lines.text).toEqual({ join: { en: 'Scan to celebrate' }, gift: { el: 'Σκάναρε' } });
        expect(qrCardLineWording(worded, 'join', 'en')).toBe('Scan to celebrate');
        expect(qrCardLineWording(worded, 'join', 'el')).toBeNull();
        const cleared = setLineWording(setLineWording(worded, 'join', 'en', ''), 'gift', 'el', '');
        expect(cleared.lines.text).toBeNull();
        expect(sameQrCardLayout(cleared, L)).toBe(true);
    });

    it('reads blank wording as the standard line', () => {
        expect(qrCardLineWording(setLineWording(L, 'join', 'en', '   '), 'join', 'en')).toBeNull();
    });
});
