import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout, PLAIN_FEED_STYLE } from '@/lib/feedLayout';
import { createFeedModeSection, feedPreviewSection, hasFeedSection, setFeedPromptText } from '@/lib/feedSections';
import { invitationDocumentSchema } from '@/lib/invitation/document';
import { FEED_MODE_SECTION_TYPES } from '@/lib/invitation/sections';

describe('feed sections', () => {
    it('starts each one plain and empty', () => {
        expect(createFeedModeSection('feedPrompt', () => 'id-1')).toMatchObject({
            id: 'id-1',
            type: 'feedPrompt',
            visible: true,
            locked: false,
            data: { text: '' },
            style: PLAIN_FEED_STYLE,
        });
        expect(createFeedModeSection('feedSchedule', () => 'id-2').data).toEqual({});
        expect(createFeedModeSection('feedHeOrShe', () => 'id-3').data).toEqual({});
        expect(createFeedModeSection('feedPinned', () => 'id-4').data).toEqual({ photos: [] });
    });

    it("draws the Add sheet's picture of the prompt with the placeholder line", () => {
        expect(feedPreviewSection('feedPrompt', 'Show us').data).toEqual({ text: 'Show us' });
        expect(feedPreviewSection('feedSchedule', 'Show us').data).toEqual({});
    });

    it('makes sections the document takes', () => {
        const sections = FEED_MODE_SECTION_TYPES.map((type) => createFeedModeSection(type));
        const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, ...sections] };
        expect(invitationDocumentSchema.safeParse(layout).success).toBe(true);
    });

    it('tells whether a layout holds a type, hidden or not', () => {
        const hidden = { ...createFeedModeSection('feedHeOrShe', () => 'h'), visible: false };
        expect(hasFeedSection([...defaultFeedLayout().sections, hidden], 'feedHeOrShe')).toBe(true);
        expect(hasFeedSection(defaultFeedLayout().sections, 'feedHeOrShe')).toBe(false);
    });

    it('changes a prompt, cut to 80 characters, and no other section', () => {
        const prompt = createFeedModeSection('feedPrompt', () => 'p');
        const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, prompt] };
        const typed = produce(layout, setFeedPromptText('p', 'x'.repeat(90)));
        expect((typed.sections[4].data as { text: string }).text).toHaveLength(80);
        expect(produce(layout, setFeedPromptText('feed-feedDescription', 'Hi'))).toBe(layout);
    });
});
