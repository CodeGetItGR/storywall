import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import {
    columnBreakMoves,
    customItemMoves,
    DECORATION_WIDTH,
    draggedFrameScale,
    draggedLength,
    draggedSectionSize,
    ELEMENT_WIDTH,
    elementSize,
    hasSavedSize,
    isSizedElement,
    moveColumnBreak,
    moveCustomItem,
    PHOTO_MIN_HEIGHT,
    resetSectionSize,
    SECTION_HEIGHT_MAX,
    setDecorationWidth,
    setElementSize,
    setSectionSize,
    SPACER_HEIGHT,
} from '@/lib/invitation/canvasHandles';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { sampleDraftDocument } from '@/lib/invitation/sampleDraft';

const text = (id: string, fullWidth = false): InvitationElement => ({ id, kind: 'text', role: 'paragraph', text: id, style: {}, fullWidth });
const columnBreak = (id: string): InvitationElement => ({ id, kind: 'columnBreak' });

function sectionOf(document: InvitationDocument, id: string) {
    return document.sections.find((section) => section.id === id)!;
}

function elementOf(document: InvitationDocument, id: string) {
    return document.sections.flatMap((section) => section.elements).find((element) => element.id === id)!;
}

const ids = (document: InvitationDocument, sectionId: string) => sectionOf(document, sectionId).elements.map((element) => element.id);

describe('draggedSectionSize', () => {
    it('grows a text section and splits the room as padding', () => {
        expect(draggedSectionSize('faq', 300, 200, 100)).toEqual({ minHeight: 400, paddingY: 100 });
    });

    it('keeps 40px more than the content, with at least 20px padding', () => {
        expect(draggedSectionSize('faq', 300, 200, -500)).toEqual({ minHeight: 240, paddingY: 20 });
    });

    it('lets a photo go down to 150px, with no padding', () => {
        expect(draggedSectionSize('photo', 420, 0, -1000)).toEqual({ minHeight: PHOTO_MIN_HEIGHT });
        expect(draggedSectionSize('photo', 420, 0, 30.4)).toEqual({ minHeight: 450 });
    });

    it("stops at the document's largest height", () => {
        expect(draggedSectionSize('faq', 300, 200, 10_000).minHeight).toBe(SECTION_HEIGHT_MAX);
        expect(draggedSectionSize('photo', 420, 0, 10_000).minHeight).toBe(SECTION_HEIGHT_MAX);
    });
});

describe('section size edits', () => {
    it('saves the size and resets it back to the content', () => {
        const document = sampleDraftDocument();
        const sized = produce(document, (draft) => setSectionSize(draft, 's-faq', { minHeight: 400, paddingY: 90 }));
        expect(sectionOf(sized, 's-faq').style).toMatchObject({ minHeight: 400, paddingY: 90 });
        expect(hasSavedSize(sectionOf(sized, 's-faq'))).toBe(true);

        const reset = produce(sized, (draft) => resetSectionSize(draft, 's-faq'));
        expect(sectionOf(reset, 's-faq').style).not.toHaveProperty('minHeight');
        expect(sectionOf(reset, 's-faq').style).not.toHaveProperty('paddingY');
        expect(hasSavedSize(sectionOf(reset, 's-faq'))).toBe(false);
    });

    it("leaves a photo's padding alone", () => {
        const document = sampleDraftDocument();
        const sized = produce(document, (draft) => setSectionSize(draft, 's-photo', { minHeight: 300 }));
        expect(sectionOf(sized, 's-photo').style.minHeight).toBe(300);
        expect(sectionOf(sized, 's-photo').style.paddingY).toBe(sectionOf(document, 's-photo').style.paddingY);
    });

    it('ignores a section that is gone', () => {
        const document = sampleDraftDocument();
        expect(produce(document, (draft) => setSectionSize(draft, 'missing', { minHeight: 300 }))).toBe(document);
        expect(produce(document, (draft) => resetSectionSize(draft, 'missing'))).toBe(document);
    });
});

describe('element sizes', () => {
    it('knows which elements have a size and what it is', () => {
        const document = sampleDraftDocument();
        const spacer = elementOf(document, 'b3-space');
        const image = elementOf(document, 'b1-leaf');
        const frame = elementOf(document, 'e-frame');
        expect([spacer, image, frame].every(isSizedElement)).toBe(true);
        expect(isSizedElement(elementOf(document, 'b1-title'))).toBe(false);
        if (!isSizedElement(spacer) || !isSizedElement(image) || !isSizedElement(frame)) return;
        expect([elementSize(spacer), elementSize(image), elementSize(frame)]).toEqual([24, 180, 1]);
    });

    it('drags a length within its limits', () => {
        expect(draggedLength(40, 12.6, SPACER_HEIGHT)).toBe(53);
        expect(draggedLength(40, -100, SPACER_HEIGHT)).toBe(SPACER_HEIGHT.min);
        expect(draggedLength(500, 300, ELEMENT_WIDTH)).toBe(ELEMENT_WIDTH.max);
    });

    it('scales a frame by the way the pointer moved most', () => {
        expect(draggedFrameScale(1, 50, 10, 200, 200)).toBe(1.25);
        expect(draggedFrameScale(1, 10, -100, 200, 200)).toBe(0.5);
        expect(draggedFrameScale(1, 1000, 0, 200, 200)).toBe(1.8);
    });

    it('saves each kind of size, clamped', () => {
        const document = sampleDraftDocument();
        const next = produce(document, (draft) => {
            setElementSize(draft, 'b3-space', 9999);
            setElementSize(draft, 'b1-leaf', 10);
            setElementSize(draft, 'e-frame', 1.4);
        });
        expect(elementOf(next, 'b3-space')).toMatchObject({ height: SPACER_HEIGHT.max });
        expect(elementOf(next, 'b1-leaf')).toMatchObject({ width: ELEMENT_WIDTH.min });
        expect(elementOf(next, 'e-frame')).toMatchObject({ boxScale: 1.4 });
    });

    it("saves a family section's decoration width", () => {
        const document = sampleDraftDocument();
        const next = produce(document, (draft) => setDecorationWidth(draft, 's-parentsSimple', 400));
        expect(sectionOf(next, 's-parentsSimple').data).toMatchObject({ decoration: { width: DECORATION_WIDTH.max } });
        // A section without one is left alone.
        expect(produce(document, (draft) => setDecorationWidth(draft, 's-faq', 100))).toBe(document);
    });
});

describe('custom section moves', () => {
    const elements = [text('head', true), text('a'), text('b'), columnBreak('break'), text('c'), text('foot', true)];

    it('offers moves within the full-width row and through the columns', () => {
        expect(customItemMoves(elements, 'head')).toEqual({ canBack: false, canForward: true });
        expect(customItemMoves(elements, 'foot')).toEqual({ canBack: true, canForward: false });
        expect(customItemMoves(elements, 'a')).toEqual({ canBack: false, canForward: true });
        expect(customItemMoves(elements, 'c')).toEqual({ canBack: true, canForward: false });
    });

    it('shows no arrows on an item with nothing to swap with, nor on the break', () => {
        expect(customItemMoves([text('alone'), text('wide', true)], 'alone')).toBeNull();
        expect(customItemMoves(elements, 'break')).toBeNull();
        expect(customItemMoves(elements, 'missing')).toBeNull();
    });

    it('moves the break one item at a time', () => {
        expect(columnBreakMoves(elements, 'break')).toEqual({ canBack: true, canForward: true });
        expect(columnBreakMoves([columnBreak('break'), text('a')], 'break')).toEqual({ canBack: false, canForward: true });
    });

    it('swaps an item with its neighbour in the same lane', () => {
        const document = sampleDraftDocument();
        const next = produce(document, (draft) => moveCustomItem(draft, 's-blank-2', 'b2-left', 1));
        // b2-head is full width, so b2-left swaps with the break and crosses into the right column.
        expect(ids(next, 's-blank-2')).toEqual(['b2-head', 'b2-break', 'b2-left', 'b2-right']);
        const back = produce(next, (draft) => moveCustomItem(draft, 's-blank-2', 'b2-left', -1));
        expect(ids(back, 's-blank-2')).toEqual(ids(document, 's-blank-2'));
    });

    it('moves an item across the break by moving the break', () => {
        const document = sampleDraftDocument();
        const right = produce(document, (draft) => moveColumnBreak(draft, 's-blank-2', 'b2-break', -1));
        expect(ids(right, 's-blank-2')).toEqual(['b2-head', 'b2-break', 'b2-left', 'b2-right']);
        const left = produce(document, (draft) => moveColumnBreak(draft, 's-blank-2', 'b2-break', 1));
        expect(ids(left, 's-blank-2')).toEqual(['b2-head', 'b2-left', 'b2-right', 'b2-break']);
    });

    it('does nothing past the ends or outside a custom section', () => {
        const document = sampleDraftDocument();
        expect(produce(document, (draft) => moveCustomItem(draft, 's-blank-2', 'b2-head', -1))).toBe(document);
        expect(produce(document, (draft) => moveCustomItem(draft, 's-photoFrame', 'e-frame', 1))).toBe(document);
        expect(produce(document, (draft) => moveColumnBreak(draft, 's-blank-2', 'b2-left', 1))).toBe(document);
    });
});
