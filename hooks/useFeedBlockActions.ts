'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import { HE_OR_SHE_MODULE } from '@/hooks/useHeOrShe';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import {
    addableFeedModeTypes,
    addableFeedSectionTypes,
    canDeleteFeedBlock,
    type FeedAddKind,
    type FeedAddPlace,
    type HostBlockOptions,
    insertFeedSection,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import { newFeedBlock } from '@/lib/feedLayout';
import { feedModuleSection, type TileModuleKey } from '@/lib/feedModuleBlocks';
import { hasTimedSessions } from '@/lib/feedSchedule';
import { createFeedModeSection } from '@/lib/feedSections';
import { type InvitationDocument, MAX_SECTIONS } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { SectionEdit } from '@/lib/invitation/sectionActions';
import { type FeedModeSectionType, type InvitationSection, isFeedModeSectionType } from '@/lib/invitation/sections';

// The Add sheet that is open, and the row it was opened from. Feed mode's sections always go last.
export type FeedAdding = { kind: FeedAddKind; at: FeedAddPlace };

// What the tools on the feed's blocks do, and the Add section rows.
export function useFeedBlockActions(
    store: InvitationEditorStore,
    document: InvitationDocument,
    event: Pick<EventDetailResponseDto, 'eventType' | 'modules' | 'sessions' | 'schedule'>,
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
    // Feed mode's sheet has only its sections, so its row goes once there are none left to add.
    const addableFeed = useMemo(
        () =>
            addableFeedModeTypes(document, {
                hasSchedule: hasTimedSessions(event),
                hasHeOrShe: isModuleAvailable(event.modules, HE_OR_SHE_MODULE),
            }),
        [document, event],
    );
    const showAddFeed = addableFeed.length > 0;
    const [adding, setAdding] = useState<FeedAdding | null>(null);

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
        (kind: FeedAddKind, at: FeedAddPlace = null) => {
            if (kind === 'feed' ? showAddFeed : showAdd) setAdding({ kind, at });
        },
        [showAdd, showAddFeed],
    );
    const closeAdd = useCallback(() => setAdding(null), []);
    // Puts a new block at the row the sheet was opened from.
    const place = useCallback(
        (section: InvitationSection) => {
            edit(insertFeedSection(section, adding?.at ?? null, options));
            setAdding(null);
        },
        [adding, edit, options],
    );
    const add = useCallback(
        (type: NewSectionType | FeedModeSectionType) => {
            if (!isFeedModeSectionType(type)) place(createSection(type, event.eventType));
            // Each feed section once: a second tap while the sheet closes adds nothing.
            else if (addableFeed.includes(type)) place(createFeedModeSection(type));
        },
        [addableFeed, event.eventType, place],
    );
    // A Premium tile that adds: RSVP's own block, or the module's block (lib/feedModuleBlocks), in the sheet's place.
    const addModule = useCallback(
        (module: TileModuleKey) => place(module === 'rsvp' ? newFeedBlock('feedRsvp') : feedModuleSection(module)),
        [place],
    );

    return { toggleVisible, reorder, askDelete, remove, addable, showAdd, addableFeed, showAddFeed, adding, openAdd, closeAdd, add, addModule };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
