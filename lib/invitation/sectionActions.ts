import type { Draft } from 'immer';

import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { InvitationSection } from '@/lib/invitation/sections';

// The section edits of the editor, written as Immer recipes for the editor
// store, so each one is one undo step. Locked sections (the footer) never
// move, hide or go away, and nothing moves past them.

type Sections = readonly Pick<InvitationSection, 'id' | 'locked'>[];
type DocumentDraft = Draft<InvitationDocument>;

export type MoveDirection = -1 | 1;

// Where a new section goes: right above or right below an existing one.
export type SectionSlot = { id: string; place: 'before' | 'after' };

// Applies one recipe to the editor store.
export type SectionEdit = (recipe: (draft: DocumentDraft) => void) => void;

// What the editor shows around one section.
export type SectionControls = {
    section: InvitationSection;
    canMoveUp: boolean;
    canMoveDown: boolean;
    canAddBefore: boolean;
    canAddAfter: boolean;
};

function indexOf(sections: Sections, id: string): number {
    return sections.findIndex((section) => section.id === id);
}

export function canMoveSection(sections: Sections, id: string, direction: MoveDirection): boolean {
    const index = indexOf(sections, id);
    const target = sections[index + direction];
    return index !== -1 && !sections[index].locked && target !== undefined && !target.locked;
}

// The order after dragging `activeId` onto `overId`, or null when the drop
// would move a locked section or changes nothing.
export function draggedOrder(sections: Sections, activeId: string, overId: string): string[] | null {
    const from = indexOf(sections, activeId);
    const to = indexOf(sections, overId);
    if (from === -1 || to === -1 || from === to) return null;
    const ids = sections.map((section) => section.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    const lockedStays = sections.every((section, index) => !section.locked || ids[index] === section.id);
    return lockedStays ? ids : null;
}

// Only the first section has room above it, so a page down to its footer can still grow.
export function canAddBefore(sections: Sections, id: string): boolean {
    return sections.length > 0 && sections[0].id === id;
}

// Below the last section there is nothing to add to: the footer closes the page.
export function canAddAfter(sections: Sections, id: string): boolean {
    const index = indexOf(sections, id);
    return index !== -1 && index < sections.length - 1;
}

export function canAddAt(sections: Sections, slot: SectionSlot): boolean {
    return slot.place === 'before' ? canAddBefore(sections, slot.id) : canAddAfter(sections, slot.id);
}

export function sectionControls(document: InvitationDocument): SectionControls[] {
    return document.sections.map((section) => ({
        section,
        canMoveUp: canMoveSection(document.sections, section.id, -1),
        canMoveDown: canMoveSection(document.sections, section.id, 1),
        canAddBefore: canAddBefore(document.sections, section.id),
        canAddAfter: canAddAfter(document.sections, section.id),
    }));
}

export function insertSection(slot: SectionSlot, section: InvitationSection) {
    return (draft: DocumentDraft) => {
        if (draft.sections.length >= MAX_SECTIONS || !canAddAt(draft.sections, slot)) return;
        const index = indexOf(draft.sections, slot.id) + (slot.place === 'after' ? 1 : 0);
        draft.sections.splice(index, 0, section as Draft<InvitationSection>);
    };
}

export function moveSection(id: string, direction: MoveDirection) {
    return (draft: DocumentDraft) => {
        if (!canMoveSection(draft.sections, id, direction)) return;
        const index = indexOf(draft.sections, id);
        const [moved] = draft.sections.splice(index, 1);
        draft.sections.splice(index + direction, 0, moved);
    };
}

export function reorderSections(activeId: string, overId: string) {
    return (draft: DocumentDraft) => {
        if (!draggedOrder(draft.sections, activeId, overId)) return;
        // The dragged section takes the place of the one it was dropped on.
        const to = indexOf(draft.sections, overId);
        const [moved] = draft.sections.splice(indexOf(draft.sections, activeId), 1);
        draft.sections.splice(to, 0, moved);
    };
}

export function setSectionVisible(id: string, visible: boolean) {
    return (draft: DocumentDraft) => {
        const section = draft.sections.find((item) => item.id === id);
        if (section && !section.locked) section.visible = visible;
    };
}

export function deleteSection(id: string) {
    return (draft: DocumentDraft) => {
        const index = indexOf(draft.sections, id);
        if (index !== -1 && !draft.sections[index].locked) draft.sections.splice(index, 1);
    };
}

// The section that takes focus once `id` is deleted: the next one that has
// tools, else the one before it that has tools, else whichever neighbour is left.
export function sectionToFocusAfterDelete(sections: Sections, id: string): string | null {
    const index = indexOf(sections, id);
    if (index === -1) return null;
    const after = sections.slice(index + 1);
    const before = sections.slice(0, index).reverse();
    const neighbour = after.find((section) => !section.locked) ?? before.find((section) => !section.locked) ?? after[0] ?? before[0];
    return neighbour?.id ?? null;
}
