'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventLockNote } from '@/components/saveMyDate/editor/EventLockNote';
import { ProgramItemForm } from '@/components/saveMyDate/editor/settings/ProgramItemForm';
import { SECONDARY_BUTTON_CLASS, SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemRows } from '@/components/saveMyDate/editor/settings/SettingsItemRows';
import { SortableItemRows } from '@/components/saveMyDate/editor/settings/SortableItemRows';
import { type ProgramSection, useProgramItemsSettings } from '@/hooks/useProgramItemsSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The program's moments (old program items panel): rows, and one moment's fields at a time.
export function ProgramItemsSettings({ scope }: { scope: SettingsScope<ProgramSection> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const program = useProgramItemsSettings(scope);
    const rows = program.items.map((item) => ({ id: item.id, label: item.label.trim() || t('moment'), detail: item.time.trim() || undefined }));

    return (
        <SettingsGroup title={t('moments')}>
            {program.item ? (
                /* One moment */
                <ProgramItemForm
                    scope={scope}
                    item={program.item}
                    lock={program.lock}
                    lockHref={program.lockHref}
                    onChange={program.update}
                    onDelete={program.remove}
                    onDone={program.close}
                />
            ) : (
                <>
                    {/* Moments */}
                    {rows.length > 0 &&
                        (program.reorder ? (
                            <SortableItemRows rows={rows} onOpen={program.open} onReorder={program.reorder} />
                        ) : (
                            <SettingsItemRows rows={rows} onOpen={program.open} />
                        ))}

                    {program.lock ? (
                        /* From the event */
                        <EventLockNote source={program.lock} href={program.lockHref} />
                    ) : (
                        /* Add */
                        <button type="button" onClick={program.add} disabled={!program.canAdd} className={SECONDARY_BUTTON_CLASS}>
                            <Plus aria-hidden="true" />
                            {t('addMoment')}
                        </button>
                    )}
                </>
            )}
        </SettingsGroup>
    );
}
