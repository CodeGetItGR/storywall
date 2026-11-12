'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAddSectionList } from '@/hooks/useAddSectionList';
import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import {
    type MoveDirection,
    moveSection,
    reorderSections,
    sectionControls,
    type SectionEdit,
    setSectionVisible,
} from '@/lib/invitation/sectionActions';
import type { EditorMode } from '@/lib/invitation/sectionRules';

// Adding, moving, hiding and deleting sections. Every change goes through the
// editor store, so it is one undo step and autosaves like any other edit.
// With the draft's event, a section the host adds follows it from the start.
export function useSectionActions(
    store: InvitationEditorStore,
    document: InvitationDocument,
    eventType: string,
    mode: EditorMode = 'host',
    event: InvitationEventData | null = null,
) {
    // The section whose tools show on touch screens: the one last tapped.
    const [activeId, setActiveId] = useState<string | null>(null);

    const edit = useCallback<SectionEdit>((recipe) => store.getState().edit(recipe), [store]);
    const controls = useMemo(() => sectionControls(document), [document]);
    const addList = useAddSectionList(edit, document, eventType, mode, setActiveId, event);
    const deleteConfirm = useDeleteSectionConfirm(edit, document);

    const move = useCallback((id: string, direction: MoveDirection) => edit(moveSection(id, direction)), [edit]);
    const reorder = useCallback((activeSectionId: string, overId: string) => edit(reorderSections(activeSectionId, overId)), [edit]);
    const toggleVisible = useCallback(
        (id: string) => {
            const section = store.getState().document.sections.find((item) => item.id === id);
            if (section) edit(setSectionVisible(id, !section.visible));
        },
        [edit, store],
    );

    return { controls, activeId, setActiveId, move, reorder, toggleVisible, addList, deleteConfirm };
}

export type SectionActions = ReturnType<typeof useSectionActions>;
