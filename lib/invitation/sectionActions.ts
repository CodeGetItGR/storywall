import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationSection } from '@/lib/invitation/sections';

// The section edits of the editor, written as Immer recipes for the editor
// store, so each one is one undo step. Locked sections (the footer) never
// move, hide or go away, and nothing moves past them.

type Sections = readonly Pick<InvitationSection, 'id' | 'locked'>[];
type DocumentDraft = Draft<InvitationDocument>;

export type MoveDirection = -1 | 1;

// Applies one recipe to the editor store.
export type SectionEdit = (recipe: (draft: DocumentDraft) => void) => void;

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

// Below the last section there is nothing to add to: the footer closes the page.
export function canAddAfter(sections: Sections, id: string): boolean {
    const index = indexOf(sections, id);
    return index !== -1 && index < sections.length - 1;
}

export function insertSectionAfter(afterId: string, section: InvitationSection) {
    return (draft: DocumentDraft) => {
        const index = indexOf(draft.sections, afterId);
        if (index === -1 || index === draft.sections.length - 1) return;
        draft.sections.splice(index + 1, 0, section as Draft<InvitationSection>);
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
