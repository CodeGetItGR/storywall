import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';

// Blocks every visitor sees, signed out too: never members only (guestwall-be FeedLayoutRules.NEVER_MEMBERS_ONLY).
const ALWAYS_PUBLIC: readonly SectionType[] = ['feedCover', 'feedDetails', 'feedRsvp'];

export function canBeMembersOnly(section: Pick<InvitationSection, 'type'>): boolean {
    return !ALWAYS_PUBLIC.includes(section.type);
}

export function setFeedBlockMembersOnly(id: string, membersOnly: boolean) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === id);
        if (!section || !canBeMembersOnly(section)) return;
        if (membersOnly) section.membersOnly = true;
        else delete section.membersOnly;
    };
}
