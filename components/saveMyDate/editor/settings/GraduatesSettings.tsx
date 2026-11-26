'use client';

import { useTranslations } from 'next-intl';

import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useGraduatesSettings } from '@/hooks/useGraduatesSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The graduates: rows, and one graduate's name, degree and university at a time.
export function GraduatesSettings({ scope }: { scope: SettingsScope<SectionOf<'graduates'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, title, addLabel, setName, setDegree, setUniversity } = useGraduatesSettings(scope);

    return (
        <SettingsList title={title} addLabel={addLabel} list={list}>
            {list.item && (
                <>
                    {/* Name */}
                    <SettingsTextField label={t('name')} value={list.item.name} onSave={setName} />
                    {/* Degree */}
                    <SettingsTextField label={t('degree')} value={list.item.degree} onSave={setDegree} />
                    {/* University */}
                    <SettingsTextField label={t('university')} value={list.item.university} onSave={setUniversity} />
                </>
            )}
        </SettingsList>
    );
}
