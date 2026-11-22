import type { Draft } from 'immer';

import { type FeedFrame, feedFrame, PAID_FEED_SECTION_TYPES } from '@/lib/feedLayout';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { ImageUploader } from '@/lib/invitation/editorUploads';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { deleteSection, type MoveDirection, setSectionVisible } from '@/lib/invitation/sectionActions';
import { addableSectionTypes } from '@/lib/invitation/sectionRules';
import { type InvitationSection, isFeedSectionType, type SectionType } from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import type { SettingsPart } from '@/lib/settingsPreview';

// Edit mode on the feed (KAN-245). The four feed blocks keep their places and can only be hidden
// (the cover not even that); the host orders, hides and deletes the middle's Save my date blocks.
// Every edit is an Immer recipe for the old editor's store.

type DocumentDraft = Draft<InvitationDocument>;
type Block = Pick<InvitationSection, 'id' | 'type' | 'locked'>;

// The description and every Save my date block: what the host orders.
export function isMiddleBlock(section: Pick<InvitationSection, 'type'>): boolean {
    return section.type === 'feedDescription' || !isFeedSectionType(section.type);
}

// Edit mode lists every block, hidden ones too, and the middle is never dropped after the event.
export function feedEditFrame(layout: InvitationDocument): FeedFrame {
    const find = (type: SectionType) => layout.sections.find((section) => section.type === type) ?? null;
    return {
        cover: feedFrame(layout, { ended: false }).cover,
        details: find('feedDetails'),
        middle: layout.sections.filter(isMiddleBlock),
        rsvp: find('feedRsvp'),
    };
}

export function canHideFeedBlock(section: Block): boolean {
    return section.type !== 'feedCover' && !section.locked;
}

export function canDeleteFeedBlock(section: Block): boolean {
    return !isFeedSectionType(section.type) && !section.locked;
}

function middleIds(sections: readonly Block[]): string[] {
    return sections.filter(isMiddleBlock).map((section) => section.id);
}

export function canMoveFeedBlock(sections: readonly Block[], id: string, direction: MoveDirection): boolean {
    const order = middleIds(sections);
    const index = order.indexOf(id);
    return index !== -1 && order[index + direction] !== undefined;
}

export type FeedBlockControls = { canHide: boolean; canDelete: boolean; movable: boolean; canMoveUp: boolean; canMoveDown: boolean };

export function feedBlockControls(sections: readonly Block[], section: Block): FeedBlockControls {
    const movable = isMiddleBlock(section);
    return {
        canHide: canHideFeedBlock(section),
        canDelete: canDeleteFeedBlock(section),
        movable,
        canMoveUp: movable && canMoveFeedBlock(sections, section.id, -1),
        canMoveDown: movable && canMoveFeedBlock(sections, section.id, 1),
    };
}

// The dragged middle block takes the place of the one it was dropped on. The frame's blocks stay
// where they are, so only the middle's own slots are rewritten.
export function reorderFeedBlocks(activeId: string, overId: string) {
    return (draft: DocumentDraft) => {
        const slots = draft.sections.flatMap((section, index) => (isMiddleBlock(section) ? [index] : []));
        const middle = slots.map((slot) => draft.sections[slot]);
        const from = middle.findIndex((section) => section.id === activeId);
        const to = middle.findIndex((section) => section.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        const [moved] = middle.splice(from, 1);
        middle.splice(to, 0, moved);
        slots.forEach((slot, place) => {
            draft.sections[slot] = middle[place];
        });
    };
}

export function moveFeedBlock(id: string, direction: MoveDirection) {
    return (draft: DocumentDraft) => {
        const order = middleIds(draft.sections);
        const index = order.indexOf(id);
        const target = index === -1 ? undefined : order[index + direction];
        if (target !== undefined) reorderFeedBlocks(id, target)(draft);
    };
}

export function setFeedBlockVisible(id: string, visible: boolean) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canHideFeedBlock(section)) setSectionVisible(id, visible)(draft);
    };
}

export function deleteFeedBlock(id: string) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && canDeleteFeedBlock(section)) deleteSection(id)(draft);
    };
}

// A new block goes to the end of the middle.
export function appendFeedSection(section: InvitationSection) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS) return;
        const lastMiddle = draft.sections.map(isMiddleBlock).lastIndexOf(true);
        const rsvp = draft.sections.findIndex((item) => item.type === 'feedRsvp');
        const index = lastMiddle !== -1 ? lastMiddle + 1 : rsvp !== -1 ? rsvp : draft.sections.length;
        draft.sections.splice(index, 0, section as Draft<InvitationSection>);
    };
}

const FEED_TYPES: readonly SectionType[] = PAID_FEED_SECTION_TYPES;

export function addableFeedSectionTypes(document: InvitationDocument, eventType: string): NewSectionType[] {
    if (document.sections.length >= MAX_SECTIONS) return [];
    return addableSectionTypes(document, eventType, 'host').filter((type) => FEED_TYPES.includes(type));
}

// The event's own fields each feed block shows, edited on the event as the Settings page does.
const FEED_BLOCK_PARTS: Partial<Record<SectionType, SettingsPart[]>> = {
    feedCover: ['cover', 'title'],
    feedDetails: ['date', 'location'],
    feedDescription: ['description'],
};

export function feedBlockParts(type: SectionType, available: readonly SettingsPart[]): SettingsPart[] {
    return (FEED_BLOCK_PARTS[type] ?? []).filter((part) => available.includes(part));
}

// The feed takes no new photos yet, and a feed block never follows the event like an invitation cover.
const LEFT_OUT: readonly SettingsGroup[] = ['gallery', 'follow'];

export function feedSettingsGroups(groups: readonly SettingsGroup[]): SettingsGroup[] {
    return groups.filter((group) => !LEFT_OUT.includes(group));
}

export const noFeedUploads: ImageUploader = () => Promise.reject(new Error('The feed takes no photo uploads yet.'));
