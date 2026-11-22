'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    moveFeedBlock,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { MoveDirection, SectionEdit } from '@/lib/invitation/sectionActions';

// What the tools on the feed's blocks do, and the Add section row. Without Save my date, a host who
// can buy it goes to Billing (asking first when there are changes); a co-host can't add.
export function useFeedBlockActions(
    store: InvitationEditorStore,
    document: InvitationDocument,
    event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'modules'>,
    leaveTo: (href: string) => void,
) {
    const edit = useCallback<SectionEdit>((recipe) => store.getState().edit(recipe), [store]);
    const remove = useDeleteSectionConfirm(edit, document);
    const billingHref = usePlanUpgradeHref(event.id);
    const locked = !isModuleAvailable(event.modules, 'save_my_date');
    const addable = useMemo(() => addableFeedSectionTypes(document, event.eventType), [document, event.eventType]);
    const [adding, setAdding] = useState(false);

    const find = useCallback((id: string) => document.sections.find((section) => section.id === id) ?? null, [document]);
    const toggleVisible = useCallback(
        (id: string) => {
            const section = find(id);
            if (section) edit(setFeedBlockVisible(id, !section.visible));
        },
        [edit, find],
    );
    const move = useCallback((id: string, direction: MoveDirection) => edit(moveFeedBlock(id, direction)), [edit]);
    const reorder = useCallback((activeId: string, overId: string) => edit(reorderFeedBlocks(activeId, overId)), [edit]);
    const { ask } = remove;
    const askDelete = useCallback(
        (id: string) => {
            const section = find(id);
            if (section && canDeleteFeedBlock(section)) ask(id);
        },
        [ask, find],
    );
    const openAdd = useCallback(() => {
        if (!locked) setAdding(true);
        else if (billingHref) leaveTo(billingHref);
    }, [billingHref, leaveTo, locked]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const add = useCallback(
        (type: NewSectionType) => {
            edit(appendFeedSection(createSection(type, event.eventType)));
            setAdding(false);
        },
        [edit, event.eventType],
    );

    return { toggleVisible, move, reorder, askDelete, remove, addable, adding, openAdd, closeAdd, add, locked, canBuy: billingHref !== null };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
