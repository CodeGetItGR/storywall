import { describe, expect, it } from 'vitest';

import { isFeedModeSectionType, isFeedSectionType, isSaveMyDateSectionType } from '@/lib/invitation/sections';

describe('kinds of section', () => {
    it('tells the fixed feed blocks, the feed sections and the Save my date sections apart', () => {
        expect(['feedCover', 'feedRsvp'].every((type) => isFeedSectionType(type as never))).toBe(true);
        expect(isFeedSectionType('feedPrompt')).toBe(false);
        expect(['feedSchedule', 'feedPrompt', 'feedHeOrShe'].every((type) => isFeedModeSectionType(type as never))).toBe(true);
        expect(isSaveMyDateSectionType('faq')).toBe(true);
        expect(isSaveMyDateSectionType('feedPrompt')).toBe(false);
        expect(isSaveMyDateSectionType('feedHeOrShe')).toBe(false);
        expect(isSaveMyDateSectionType('feedDescription')).toBe(false);
        expect(isSaveMyDateSectionType('feedModule')).toBe(false);
        expect(isFeedModeSectionType('feedPinned')).toBe(true);
        expect(isSaveMyDateSectionType('feedPinned')).toBe(false);
    });
});
