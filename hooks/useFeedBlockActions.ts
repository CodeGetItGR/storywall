'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import type { EventDetailResponseDto } from '@/lib/api/types';
import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    type HostBlockOptions,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { SectionEdit } from '@/lib/invitation/sectionActions';

// What the tools on the feed's blocks do, and the Add section row. Edit mode only opens with Save my date.
export function useFeedBlockActions(
    store: InvitationEditorStore,
    document: InvitationDocument,
    event: Pick<EventDetailResponseDto, 'eventType' | 'modules'>,
    options: HostBlockOptions,
) {
    const edit = useCallback<SectionEdit>((recipe) => store.getState().edit(recipe), [store]);
    const remove = useDeleteSectionConfirm(edit, document);
    const addable = useMemo(
        () => addableFeedSectionTypes(document, event.eventType, event.modules ?? []),
        [document, event.eventType, event.modules],
    );
    // With nothing left to add (the section limit), the Add section row isn't drawn.
    const showAdd = addable.length > 0;
    const [adding, setAdding] = useState(false);

    const find = useCallback((id: string) => document.sections.find((section) => section.id === id) ?? null, [document]);
    const toggleVisible = useCallback(
        (id: string) => {
            const section = find(id);
            if (section) edit(setFeedBlockVisible(id, !section.visible));
        },
        [edit, find],
    );
    const reorder = useCallback((activeId: string, overId: string) => edit(reorderFeedBlocks(activeId, overId, options)), [edit, options]);
    const { ask } = remove;
    const askDelete = useCallback(
        (id: string) => {
            const section = find(id);
            if (section && canDeleteFeedBlock(section)) ask(id);
        },
        [ask, find],
    );
    const openAdd = useCallback(() => {
        if (addable.length > 0) setAdding(true);
    }, [addable.length]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const add = useCallback(
        (type: NewSectionType) => {
            edit(appendFeedSection(createSection(type, event.eventType), options));
            setAdding(false);
        },
        [edit, event.eventType, options],
    );

    return { toggleVisible, reorder, askDelete, remove, addable, showAdd, adding, openAdd, closeAdd, add };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
