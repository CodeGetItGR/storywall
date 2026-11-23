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

// A section the public read cut down (guestwall-be FeedLayoutRules.forPublic), and where it stood among the sections.
export type LockedSection = { id: string; type: SectionType; name: string; at: number };

type Stub = { id: string; type: SectionType; name: string; visible?: boolean; membersOnly: true };

// A stub has the flag and none of a section's own fields; a member's full copy keeps them.
function isMembersOnlyStub(value: unknown): value is Stub {
    if (!value || typeof value !== 'object') return false;
    const section = value as Record<string, unknown>;
    return section.membersOnly === true && !('data' in section) && typeof section.id === 'string' && typeof section.type === 'string';
}

// The signed-out page's document without its stubs (so it parses as a normal layout), and the locks to draw in their
// place. A hidden stub is left out: it would not have shown anyway.
export function splitMembersOnly(raw: unknown): { document: unknown; locked: LockedSection[] } {
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { sections?: unknown }).sections)) return { document: raw, locked: [] };
    const sections = (raw as { sections: unknown[] }).sections;
    const locked: LockedSection[] = [];
    sections.forEach((section, at) => {
        if (isMembersOnlyStub(section) && section.visible !== false) locked.push({ id: section.id, type: section.type, name: section.name, at });
    });
    return { document: { ...raw, sections: sections.filter((section) => !isMembersOnlyStub(section)) }, locked };
}
