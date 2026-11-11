'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { ProgramIconField } from '@/components/saveMyDate/editor/settings/ProgramIconField';
import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsItemView } from '@/components/saveMyDate/editor/settings/SettingsItemView';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import type { ProgramSection } from '@/hooks/useProgramItemsSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ProgramItemPatch } from '@/lib/invitation/sectionSettingsEdits';
import { cn } from '@/lib/utils';

type ProgramItem = ProgramSection['data']['items'][number];

type ProgramItemFormProps = {
    scope: SettingsScope<ProgramSection>;
    item: ProgramItem;
    onChange: (itemId: string, patch: ProgramItemPatch) => void;
    onDelete: (itemId: string) => void;
    onDone: () => void;
};

// One moment: its time and words, and on a program with icons its description and icon.
export function ProgramItemForm({ scope, item, onChange, onDelete, onDone }: ProgramItemFormProps) {
    const t = useTranslations('InvitationEditor');
    const hasIcons = scope.section.type === 'programIcons';
    const setTime = useCallback((time: string) => onChange(item.id, { time }), [item.id, onChange]);
    const setLabel = useCallback((label: string) => onChange(item.id, { label }), [item.id, onChange]);
    const setDescription = useCallback((description: string) => onChange(item.id, { description }), [item.id, onChange]);
    const remove = useCallback(() => onDelete(item.id), [item.id, onDelete]);

    return (
        <SettingsItemView title={t('sectionSettings.moment')} onDone={onDone}>
            {/* Time */}
            <SettingsTextField label={t('sectionSettings.time')} value={item.time} onSave={setTime} maxLength={300} />

            {/* Words */}
            <SettingsTextField label={t(hasIcons ? 'sectionSettings.title' : 'sectionSettings.text')} value={item.label} onSave={setLabel} />
            {'description' in item && (
                <SettingsTextField label={t('sectionSettings.description')} value={item.description} onSave={setDescription} multiline />
            )}

            {/* Icon */}
            {'icon' in item && <ProgramIconField scope={scope} item={item} onChange={onChange} />}

            {/* Delete */}
            <button type="button" onClick={remove} className={cn(SECONDARY_BUTTON_CLASS, 'text-(--smd-editor-danger)')}>
                <Trash2 aria-hidden="true" />
                {t('delete')}
            </button>
        </SettingsItemView>
    );
}
