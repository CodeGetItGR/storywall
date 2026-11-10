'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProgramItemForm } from '@/components/saveMyDate/editor/settings/ProgramItemForm';
import { SECONDARY_BUTTON_CLASS, SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemRows } from '@/components/saveMyDate/editor/settings/SettingsItemRows';
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
                <ProgramItemForm scope={scope} item={program.item} onChange={program.update} onDelete={program.remove} onDone={program.close} />
            ) : (
                <>
                    {/* Moments */}
                    {rows.length > 0 && <SettingsItemRows rows={rows} onOpen={program.open} />}

                    {/* Add */}
                    <button type="button" onClick={program.add} disabled={!program.canAdd} className={SECONDARY_BUTTON_CLASS}>
                        <Plus aria-hidden="true" />
                        {t('addMoment')}
                    </button>
                </>
            )}
        </SettingsGroup>
    );
}
