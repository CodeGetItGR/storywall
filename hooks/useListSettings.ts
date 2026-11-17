'use client';

import { useCallback, useMemo } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSettingsItem } from '@/hooks/useSettingsItem';
import {
    addListItem,
    canAddListItem,
    deleteListItem,
    type EditableList,
    type ListItem,
    type ListItemPatch,
    listItems,
    moveListItem,
    updateListItem,
} from '@/lib/invitation/listEdits';
import { newSectionId } from '@/lib/invitation/newSection';

const NO_ITEMS: readonly never[] = [];

// One list of a section in its settings: rows, one item open at a time, added at the
// end, deleted from its own settings and dragged to another place. Each change is one undo step.
export function useListSettings<L extends EditableList>({ section, edit }: SettingsScope, list: L, labelOf: (item: ListItem<L>) => string) {
    const items = listItems(section, list) ?? NO_ITEMS;
    const { item, open, close } = useSettingsItem(items);

    const rows = useMemo(() => items.map((entry) => ({ id: entry.id, label: labelOf(entry) })), [items, labelOf]);

    const add = useCallback(() => {
        const itemId = newSectionId();
        edit(addListItem(section.id, list, itemId));
        open(itemId);
    }, [edit, list, open, section.id]);

    const update = useCallback(
        (itemId: string, patch: ListItemPatch<L>) => edit(updateListItem(section.id, list, itemId, patch), `item:${itemId}:${Object.keys(patch).join(',')}`),
        [edit, list, section.id],
    );

    const remove = useCallback(
        (itemId: string) => {
            edit(deleteListItem(section.id, list, itemId));
            close();
        },
        [close, edit, list, section.id],
    );

    const itemId = item?.id;
    const removeOpen = useCallback(() => itemId && remove(itemId), [itemId, remove]);

    // Saves one field of the open item.
    const fieldSaver = useCallback(
        <K extends keyof ListItemPatch<L>>(key: K) =>
            (value: ListItemPatch<L>[K]) => {
                if (itemId) update(itemId, { [key]: value } as ListItemPatch<L>);
            },
        [itemId, update],
    );

    const reorder = useCallback((activeId: string, overId: string) => edit(moveListItem(section.id, list, activeId, overId)), [edit, list, section.id]);

    return {
        rows,
        item,
        itemTitle: item ? labelOf(item) : '',
        canAdd: canAddListItem(section, list),
        add,
        update,
        remove,
        removeOpen,
        fieldSaver,
        reorder,
        open,
        close,
    };
}

export type ListSettings<L extends EditableList> = ReturnType<typeof useListSettings<L>>;
