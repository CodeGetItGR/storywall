'use client';

import { useTranslations } from 'next-intl';

import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { type PeopleSection, usePeopleSettings } from '@/hooks/usePeopleSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The godparents or wedding sponsors: rows, and one person's name at a time.
export function PeopleSettings({ scope }: { scope: SettingsScope<PeopleSection> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, title, addLabel, setName } = usePeopleSettings(scope);

    return (
        <SettingsList title={title} addLabel={addLabel} list={list}>
            {/* Name */}
            {list.item && <SettingsTextField label={t('name')} value={list.item.name} onSave={setName} />}
        </SettingsList>
    );
}
