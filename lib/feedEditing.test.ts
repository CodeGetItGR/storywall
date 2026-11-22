import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    canHideFeedBlock,
    canMoveFeedBlock,
    deleteFeedBlock,
    feedBlockControls,
    feedBlockParts,
    feedEditFrame,
    feedSettingsGroups,
    isMiddleBlock,
    moveFeedBlock,
    noFeedUploads,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import { defaultFeedLayout } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' };

// cover, details, description, rsvp, then the Save my date blocks the host added.
function layout(...extra: InvitationSection[]): InvitationDocument {
    const base = defaultFeedLayout();
    return { ...base, sections: [...base.sections, ...extra] };
}

const ids = (document: InvitationDocument) => document.sections.map((section) => section.id);

describe('feedEditFrame', () => {
    it('lists every block, hidden ones too', () => {
        const hidden = produce(layout(dressCode), (draft) => {
            draft.sections[1].visible = false;
            draft.sections[4].visible = false;
        });
        const frame = feedEditFrame(hidden);
        expect(frame.cover.type).toBe('feedCover');
        expect(frame.details?.type).toBe('feedDetails');
        expect(frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(frame.rsvp?.type).toBe('feedRsvp');
    });
});

describe('which block may do what', () => {
    const [cover, details, description, rsvp] = defaultFeedLayout().sections;

    it('hides every block but the cover', () => {
        expect(canHideFeedBlock(cover)).toBe(false);
        expect([details, description, rsvp, dressCode].every(canHideFeedBlock)).toBe(true);
    });

    it('deletes only Save my date blocks', () => {
        expect([cover, details, description, rsvp].some(canDeleteFeedBlock)).toBe(false);
        expect(canDeleteFeedBlock(dressCode)).toBe(true);
    });

    it('moves only middle blocks, and only among themselves', () => {
        const sections = layout(dressCode).sections;
        expect(isMiddleBlock(description)).toBe(true);
        expect(isMiddleBlock(rsvp)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', -1)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedDescription', 1)).toBe(true);
        expect(canMoveFeedBlock(sections, 'dress', 1)).toBe(false);
        expect(canMoveFeedBlock(sections, 'feed-feedRsvp', -1)).toBe(false);
    });

    it('sums it up per block', () => {
        const sections = layout(dressCode).sections;
        expect(feedBlockControls(sections, cover)).toEqual({ canHide: false, canDelete: false, movable: false, canMoveUp: false, canMoveDown: false });
        expect(feedBlockControls(sections, dressCode)).toEqual({ canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: false });
    });
});

describe('edits', () => {
    it('moves a middle block past its middle neighbour and leaves the frame in place', () => {
        const next = produce(layout(dressCode, faq), moveFeedBlock('faq', -1));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'feed-feedRsvp', 'faq', 'dress']);
    });

    it('drags among middle blocks only', () => {
        const next = produce(layout(dressCode, faq), reorderFeedBlocks('faq', 'feed-feedDescription'));
        expect(next.sections.filter(isMiddleBlock).map((section) => section.id)).toEqual(['faq', 'feed-feedDescription', 'dress']);
        expect(next.sections[0].id).toBe('feed-feedCover');
        expect(next.sections[1].id).toBe('feed-feedDetails');
    });

    it('ignores a drop on a block outside the middle', () => {
        const start = layout(dressCode);
        expect(produce(start, reorderFeedBlocks('dress', 'feed-feedRsvp'))).toBe(start);
    });

    it('never hides the cover', () => {
        const start = layout();
        expect(produce(start, setFeedBlockVisible('feed-feedCover', false))).toBe(start);
        expect(produce(start, setFeedBlockVisible('feed-feedRsvp', false)).sections[3].visible).toBe(false);
    });

    it('never deletes a feed block', () => {
        const start = layout(dressCode);
        expect(produce(start, deleteFeedBlock('feed-feedDescription'))).toBe(start);
        expect(ids(produce(start, deleteFeedBlock('dress')))).not.toContain('dress');
    });

    it('appends after the last middle block', () => {
        const start = produce(layout(dressCode), (draft) => {
            // RSVP last, as a saved layout can order it.
            const [rsvp] = draft.sections.splice(3, 1);
            draft.sections.push(rsvp);
        });
        const next = produce(start, appendFeedSection(faq));
        expect(ids(next)).toEqual(['feed-feedCover', 'feed-feedDetails', 'feed-feedDescription', 'dress', 'faq', 'feed-feedRsvp']);
    });
});

describe('what the add row offers', () => {
    it('offers only Save my date blocks a feed may hold', () => {
        const types = addableFeedSectionTypes(layout(), 'WEDDING');
        expect(types.length).toBeGreaterThan(0);
        expect(types).toContain('dressCode');
        expect(types).not.toContain('date');
        expect(types).not.toContain('rsvp');
    });
});

describe('the pencil sheet', () => {
    it('maps each feed block to its event parts, among those the event has', () => {
        expect(feedBlockParts('feedCover', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['cover', 'title']);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'description'])).toEqual([]);
        expect(feedBlockParts('feedDetails', ['cover', 'title', 'date', 'location', 'description'])).toEqual(['date', 'location']);
        expect(feedBlockParts('feedDescription', ['description'])).toEqual(['description']);
        expect(feedBlockParts('feedRsvp', ['cover', 'title', 'date', 'location', 'description'])).toEqual([]);
        expect(feedBlockParts('dressCode', ['cover'])).toEqual([]);
    });

    it('leaves out photo uploads and following the event', () => {
        expect(feedSettingsGroups(['follow', 'gallery', 'background', 'dressCode'])).toEqual(['background', 'dressCode']);
    });

    it('refuses uploads', async () => {
        await expect(noFeedUploads(new Blob())).rejects.toThrow();
    });
});
