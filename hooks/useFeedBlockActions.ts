'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import type { EventDetailResponseDto } from '@/lib/api/types';
import {
    addableFeedSectionTypes,
    canDeleteFeedBlock,
    type FeedAddPlace,
    type HostBlockOptions,
    insertFeedSection,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import { newFeedBlock } from '@/lib/feedLayout';
import { feedModuleSection, type TileModuleKey } from '@/lib/feedModuleBlocks';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { SectionEdit } from '@/lib/invitation/sectionActions';
import type { InvitationSection } from '@/lib/invitation/sections';

// What the tools on the feed's blocks do, and the Add section rows. Edit mode only opens with Save my date.
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
    // At the section limit nothing more fits, so the Add section rows aren't drawn. Otherwise the sheet opens even with
    // an empty list: the Premium tiles may still be there.
    const showAdd = document.sections.length < MAX_SECTIONS;
    // The sheet is open for one place (FeedAddPlace). undefined: closed.
    const [addingAt, setAddingAt] = useState<FeedAddPlace | undefined>(undefined);
    const adding = addingAt !== undefined;

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
            if (section && canDeleteFeedBlock(section, options)) ask(id);
        },
        [ask, find, options],
    );
    const openAdd = useCallback(
        (at: FeedAddPlace = null) => {
            if (showAdd) setAddingAt(at);
        },
        [showAdd],
    );
    const closeAdd = useCallback(() => setAddingAt(undefined), []);
    // Puts a new block at the row the sheet was opened from.
    const place = useCallback(
        (section: InvitationSection) => {
            edit(insertFeedSection(section, addingAt ?? null, options));
            setAddingAt(undefined);
        },
        [addingAt, edit, options],
    );
    const add = useCallback((type: NewSectionType) => place(createSection(type, event.eventType)), [event.eventType, place]);
    // A Premium tile that adds: RSVP's own block, or the module's block (lib/feedModuleBlocks), in the sheet's place.
    const addModule = useCallback(
        (module: TileModuleKey) => place(module === 'rsvp' ? newFeedBlock('feedRsvp') : feedModuleSection(module)),
        [place],
    );

    return { toggleVisible, reorder, askDelete, remove, addable, showAdd, adding, openAdd, closeAdd, add, addModule };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
