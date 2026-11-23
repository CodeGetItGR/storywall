import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { canBeMembersOnly, setFeedBlockMembersOnly } from '@/lib/feedMembersOnly';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, dressCode] };

describe('members-only blocks', () => {
    it('can be any invitation section but the cover, details and RSVP', () => {
        const [cover, details, description, rsvp] = layout.sections;
        expect([description, dressCode].every(canBeMembersOnly)).toBe(true);
        expect([cover, details, rsvp].some(canBeMembersOnly)).toBe(false);
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
