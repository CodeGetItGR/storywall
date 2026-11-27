'use client';

import { useTranslations } from 'next-intl';

import { SettingsChoices } from '@/components/saveMyDate/editor/settings/SettingsChoices';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useGraduatesSettings } from '@/hooks/useGraduatesSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The graduates: the block's style, rows, and one graduate's name, degree and university at a time.
export function GraduatesSettings({ scope }: { scope: SettingsScope<SectionOf<'graduates'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, title, addLabel, styleLabel, styles, style, setStyle, setName, setDegree, setUniversity } = useGraduatesSettings(scope);

    return (
        <>
            {/* Style */}
            <SettingsGroup>
                <SettingsChoices label={styleLabel} choices={styles} value={style} onChange={setStyle} columns={3} />
            </SettingsGroup>
            {/* Graduates */}
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
        </>
    );
}
