import { describe, expect, it } from 'vitest';

import { feedBlockTools } from '@/lib/feedBlockMenu';
import { newFeedBlock } from '@/lib/feedLayout';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { createFeedModeSection } from '@/lib/feedSections';
import { createSection } from '@/lib/invitation/newSection';

const all = { hasSettings: true, canDelete: true };

describe('feedBlockTools', () => {
    it('gives a Save my date section all four, in the order drawn', () => {
        expect(feedBlockTools(createSection('faq', 'WEDDING'), all)).toEqual(['settings', 'photo', 'color', 'delete']);
    });

    it('leaves the backgrounds out on every other block', () => {
        for (const section of [newFeedBlock('feedDescription'), createFeedModeSection('feedPrompt'), feedModuleSection('playlist')]) {
            expect(feedBlockTools(section, all)).toEqual(['settings', 'delete']);
        }
    });

    it('holds only what the block has', () => {
        expect(feedBlockTools(newFeedBlock('feedCover'), { hasSettings: true, canDelete: false })).toEqual(['settings']);
        expect(feedBlockTools(newFeedBlock('feedRsvp'), { hasSettings: false, canDelete: false })).toEqual([]);
        expect(feedBlockTools({ ...createSection('faq', 'WEDDING'), locked: true }, { hasSettings: true, canDelete: false })).toEqual(['settings']);
    });
});
