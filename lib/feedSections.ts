import type { Draft } from 'immer';

import { PLAIN_FEED_STYLE } from '@/lib/feedLayout';
import type { InvitationDocument } from '@/lib/invitation/document';
import { newSectionId } from '@/lib/invitation/newSection';
import { FEED_PROMPT_MAX_LENGTH, type FeedModeSectionType, type InvitationSection } from '@/lib/invitation/sections';

// Feed mode's sections: what a new one holds, and the edits to its content. They take no style.

const EMPTY_DATA: { [T in FeedModeSectionType]: Extract<InvitationSection, { type: T }>['data'] } = {
    feedSchedule: {},
    feedPrompt: { text: '' },
    feedHeOrShe: {},
    feedPinned: { photos: [] },
};

export function createFeedModeSection(type: FeedModeSectionType, newId: () => string = newSectionId): InvitationSection {
    return {
        id: newId(),
        type,
        name: type,
        visible: true,
        locked: false,
        data: EMPTY_DATA[type],
        textStyles: {},
        elements: [],
        style: PLAIN_FEED_STYLE,
    } as InvitationSection;
}

export function setFeedPromptText(id: string, text: string) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section?.type === 'feedPrompt') section.data = { text: text.slice(0, FEED_PROMPT_MAX_LENGTH) };
    };
}

// Whether a layout holds a section of this type, shown or hidden. A feed holds at most one of each.
export function hasFeedSection(sections: readonly Pick<InvitationSection, 'type'>[], type: FeedModeSectionType): boolean {
    return sections.some((section) => section.type === type);
}

// The Add sheet's live picture of a feed section: the prompt with its placeholder line.
export function feedPreviewSection(type: FeedModeSectionType, promptPlaceholder: string): InvitationSection {
    const section = createFeedModeSection(type, () => `preview-${type}`);
    return section.type === 'feedPrompt' ? { ...section, data: { text: promptPlaceholder } } : section;
}
