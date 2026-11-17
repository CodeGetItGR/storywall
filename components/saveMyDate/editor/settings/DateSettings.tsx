'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SettingsChoices } from '@/components/saveMyDate/editor/settings/SettingsChoices';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { DateLanguage } from '@/lib/invitation/dateDisplay';
import { DATE_DISPLAY_STYLES } from '@/lib/invitation/sections';
import { type DateLayout, setDateLanguage, setDateLayout } from '@/lib/invitation/sectionSettingsEdits';

const LANGUAGES: DateLanguage[] = ['el', 'en'];

// The date's layout and language (old date style panel).
export function DateSettings({ scope }: { scope: SettingsScope<SectionOf<'date'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { section, edit } = scope;
    const layouts = DATE_DISPLAY_STYLES.map((value) => ({ value, label: t(`dateLayouts.${value}`) }));
    const languages = LANGUAGES.map((value) => ({ value, label: t(`languages.${value}`) }));
    const pickLayout = useCallback((layout: DateLayout) => edit(setDateLayout(section.id, layout)), [edit, section.id]);
    const pickLanguage = useCallback((language: DateLanguage) => edit(setDateLanguage(section.id, language)), [edit, section.id]);

    return (
        <SettingsGroup>
            {/* Layout */}
            <SettingsChoices label={t('dateLayout')} choices={layouts} value={section.data.displayStyle} onChange={pickLayout} />

            {/* Language */}
            <SettingsChoices label={t('language')} choices={languages} value={section.data.displayLanguage} onChange={pickLanguage} />
        </SettingsGroup>
    );
}
