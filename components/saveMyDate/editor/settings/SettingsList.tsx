'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemView } from '@/components/saveMyDate/editor/settings/SettingsItemView';
import { SortableItemRows } from '@/components/saveMyDate/editor/settings/SortableItemRows';
import type { ListSettings } from '@/hooks/useListSettings';
import type { EditableList } from '@/lib/invitation/listEdits';
import { cn } from '@/lib/utils';

type SettingsListProps<L extends EditableList> = {
    title: string;
    addLabel: string;
    list: ListSettings<L>;
    // The open item's fields; Delete comes after them.
    children: ReactNode;
};

// One list in a section's settings: its rows and an add button, or the one item open.
export function SettingsList<L extends EditableList>({ title, addLabel, list, children }: SettingsListProps<L>) {
    const t = useTranslations('InvitationEditor');
    const { item } = list;

    return (
        <SettingsGroup title={title}>
            {item ? (
                /* One item */
                <SettingsItemView title={list.itemTitle} onDone={list.close}>
                    {children}

                    {/* Delete */}
                    <button type="button" onClick={list.removeOpen} className={cn(SECONDARY_BUTTON_CLASS, 'text-(--smd-editor-danger)')}>
                        <Trash2 aria-hidden="true" />
                        {t('delete')}
                    </button>
                </SettingsItemView>
            ) : (
                <>
                    {/* Items */}
                    {list.rows.length > 0 && <SortableItemRows rows={list.rows} onOpen={list.open} onReorder={list.reorder} />}

                    {/* Add */}
                    <button type="button" onClick={list.add} disabled={!list.canAdd} className={SECONDARY_BUTTON_CLASS}>
                        <Plus aria-hidden="true" />
                        {addLabel}
                    </button>
                </>
            )}
        </SettingsGroup>
    );
}
