import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { canBeMembersOnly, setFeedBlockMembersOnly, splitMembersOnly } from '@/lib/feedMembersOnly';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { FEED_MODE_SECTION_TYPES, type InvitationSection } from '@/lib/invitation/sections';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, dressCode] };

describe('members-only blocks', () => {
    it('can be any invitation section but the cover, details, RSVP and module blocks', () => {
        const [cover, details, description, rsvp] = layout.sections;
        expect([description, dressCode].every(canBeMembersOnly)).toBe(true);
        expect([cover, details, rsvp, feedModuleSection('playlist', () => 'm')].some(canBeMembersOnly)).toBe(false);
    });

    it('is never offered on a feed section', () => {
        expect(FEED_MODE_SECTION_TYPES.some((type) => canBeMembersOnly({ type }))).toBe(false);
    });

    it('sets and clears the flag, never on the cover', () => {
        const marked = produce(layout, setFeedBlockMembersOnly('dress', true));
        expect(marked.sections[4].membersOnly).toBe(true);
        const cleared = produce(marked, setFeedBlockMembersOnly('dress', false));
        expect('membersOnly' in cleared.sections[4]).toBe(false);
        const cover = produce(layout, setFeedBlockMembersOnly('feed-feedCover', true));
        expect(cover.sections[0].membersOnly).toBeUndefined();
    });
});

describe('splitMembersOnly', () => {
    it('takes the stubs out of the public document and says where each one was', () => {
        const raw = {
            ...layout,
            sections: [
                ...layout.sections.slice(0, 2),
                { id: 'feed-feedDescription', type: 'feedDescription', name: 'feedDescription', visible: true, membersOnly: true },
                ...layout.sections.slice(3),
            ],
        };
        const { document, locked } = splitMembersOnly(raw);
        expect((document as { sections: { id: string }[] }).sections.map((section) => section.id)).toEqual([
            'feed-feedCover',
            'feed-feedDetails',
            'feed-feedRsvp',
            'dress',
        ]);
        expect(locked).toEqual([{ id: 'feed-feedDescription', type: 'feedDescription', name: 'feedDescription', at: 2 }]);
    });

    it('leaves out a hidden stub, and a member copy with its content is not a stub', () => {
        const raw = {
            ...layout,
            sections: [
                ...layout.sections,
                { id: 'gone', type: 'faq', name: 'faq', visible: false, membersOnly: true },
                { ...dressCode, id: 'open', membersOnly: true },
            ],
        };
        const { document, locked } = splitMembersOnly(raw);
        expect(locked).toEqual([]);
        expect((document as { sections: { id: string }[] }).sections.map((section) => section.id)).toContain('open');
    });

    it('hands back anything that is not a document as it is', () => {
        expect(splitMembersOnly(null)).toEqual({ document: null, locked: [] });
    });
});
