'use client';

import { useCallback } from 'react';

import { type SectionOf, type SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSettingsItem } from '@/hooks/useSettingsItem';
import { programLock } from '@/lib/invitation/eventLinks';
import { newSectionId } from '@/lib/invitation/newSection';
import {
    addProgramItem,
    deleteProgramItem,
    MAX_PROGRAM_ITEMS,
    moveProgramItem,
    type ProgramItemPatch,
    updateProgramItem,
} from '@/lib/invitation/sectionSettingsEdits';

export type ProgramSection = SectionOf<'program'> | SectionOf<'programIcons'>;

// The program's moments: rows, one open at a time, added at the end and dragged to another place. Once they are the event's sessions (KAN-84)
// the host changes them on the schedule; only their icons change here.
export function useProgramItemsSettings({ section, edit, event, eventFieldLinks }: SettingsScope<ProgramSection>) {
    const items = section.data.items as ProgramSection['data']['items'];
    const selected = useSettingsItem(items);
    const { open, close } = selected;

    const add = useCallback(() => {
        const itemId = newSectionId();
        edit(addProgramItem(section.id, itemId));
        open(itemId);
    }, [edit, open, section.id]);

    const update = useCallback(
        (itemId: string, patch: ProgramItemPatch) =>
            edit(updateProgramItem(section.id, itemId, patch), `item:${itemId}:${Object.keys(patch).join(',')}`),
        [edit, section.id],
    );

    const remove = useCallback(
        (itemId: string) => {
            edit(deleteProgramItem(section.id, itemId));
            close();
        },
        [close, edit, section.id],
    );

    const reorder = useCallback((itemId: string, overId: string) => edit(moveProgramItem(section.id, itemId, overId)), [edit, section.id]);

    const lock = programLock(section, event);

    return {
        items,
        lock,
        lockHref: lock ? eventFieldLinks?.[lock] : undefined,
        canAdd: items.length < MAX_PROGRAM_ITEMS,
        add,
        update,
        // The event's sessions keep the schedule's order, so locked rows don't move.
        reorder: lock ? null : reorder,
        remove,
        item: selected.item,
        open,
        close,
        hasIcons: section.type === 'programIcons',
    };
}
