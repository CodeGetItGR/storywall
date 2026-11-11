'use client';

import { useCallback } from 'react';

import { type SectionOf, type SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSettingsItem } from '@/hooks/useSettingsItem';
import { newSectionId } from '@/lib/invitation/newSection';
import {
    addProgramItem,
    deleteProgramItem,
    MAX_PROGRAM_ITEMS,
    type ProgramItemPatch,
    updateProgramItem,
} from '@/lib/invitation/sectionSettingsEdits';

export type ProgramSection = SectionOf<'program'> | SectionOf<'programIcons'>;

// The program's moments: rows, one open at a time, added at the end.
export function useProgramItemsSettings({ section, edit }: SettingsScope<ProgramSection>) {
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

    return {
        items,
        canAdd: items.length < MAX_PROGRAM_ITEMS,
        add,
        update,
        remove,
        item: selected.item,
        open,
        close,
        hasIcons: section.type === 'programIcons',
    };
}
