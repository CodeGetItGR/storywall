import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import {
    addFeedBlockLink,
    addFeedBlockPhoto,
    blockTextColor,
    colorFeedBlockText,
    elementSectionId,
    FEED_PHOTO_WIDTH,
    removeFeedBlockElement,
} from '@/lib/feedBlockEdits';
import { defaultFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dress = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress', elements: [] };
const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, dress] };
const block = (document: typeof layout) => document.sections.find((section) => section.id === 'dress')!;

describe('feed block edits', () => {
    it('adds a photo at the end of the block', () => {
        const next = produce(layout, addFeedBlockPhoto('dress', 'p1', 'img-1'));
        expect(block(next).elements).toEqual([{ id: 'p1', kind: 'image', image: { source: 'media', mediaId: 'img-1' }, width: FEED_PHOTO_WIDTH }]);
    });

    it('adds an empty link after the text being edited', () => {
        const withText = produce(layout, (draft) => {
            block(draft).elements.push({ id: 't1', kind: 'text', role: 'paragraph', text: 'Hi', style: {} }, { id: 't2', kind: 'text', role: 'paragraph', text: 'Bye', style: {} });
        });
        const next = produce(withText, addFeedBlockLink('dress', 'l1', 't1'));
        expect(block(next).elements.map((element) => element.id)).toEqual(['t1', 'l1', 't2']);
        expect(block(next).elements[1]).toEqual({ id: 'l1', kind: 'link', text: '', url: '' });
    });

    it('colours every text in the block, and nothing in another block', () => {
        const next = produce(layout, colorFeedBlockText('dress', '#aa0000', ['title']));
        expect(block(next).textStyles.title?.color).toBe('#aa0000');
        expect(next.sections.find((section) => section.type === 'feedCover')).toEqual(layout.sections.find((section) => section.type === 'feedCover'));
    });

    it('removes an added photo', () => {
        const withPhoto = produce(layout, addFeedBlockPhoto('dress', 'p1', 'img-1'));
        expect(block(produce(withPhoto, removeFeedBlockElement('dress', 'p1'))).elements).toEqual([]);
    });

    it('does nothing to a locked block', () => {
        const locked = produce(layout, (draft) => {
            block(draft).locked = true;
        });
        expect(produce(locked, addFeedBlockPhoto('dress', 'p1', 'img-1'))).toEqual(locked);
    });
});

describe('blockTextColor', () => {
    it("starts from the block's own colour, else the invitation's", () => {
        expect(blockTextColor({ textStyles: { title: { color: '#aa0000' } }, elements: [] }, { textColor: '#333333' })).toBe('#aa0000');
        expect(blockTextColor({ textStyles: {}, elements: [] }, { textColor: '#333333' })).toBe('#333333');
    });
});

describe('elementSectionId', () => {
    it('finds the block an added photo is in', () => {
        const withPhoto = produce(layout, addFeedBlockPhoto('dress', 'p1', 'img-1'));
        expect(elementSectionId(withPhoto, 'p1')).toBe('dress');
        expect(elementSectionId(withPhoto, 'nope')).toBeUndefined();
    });
});
