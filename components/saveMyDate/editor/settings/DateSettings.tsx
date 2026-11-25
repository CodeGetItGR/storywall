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

type DateScope = { scope: SettingsScope<SectionOf<'date'>> };

// The date's layout and language (old date style panel).
export function DateSettings({ scope }: DateScope) {
    return (
        <SettingsGroup>
            <DateLayoutSetting scope={scope} />
            <DateLanguageSetting scope={scope} />
        </SettingsGroup>
    );
}

export function DateLayoutSetting({ scope: { section, edit } }: DateScope) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const layouts = DATE_DISPLAY_STYLES.map((value) => ({ value, label: t(`dateLayouts.${value}`) }));
    const pick = useCallback((layout: DateLayout) => edit(setDateLayout(section.id, layout)), [edit, section.id]);

    return <SettingsChoices label={t('dateLayout')} choices={layouts} value={section.data.displayStyle} onChange={pick} />;
}

export function DateLanguageSetting({ scope: { section, edit } }: DateScope) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const languages = LANGUAGES.map((value) => ({ value, label: t(`languages.${value}`) }));
    const pick = useCallback((language: DateLanguage) => edit(setDateLanguage(section.id, language)), [edit, section.id]);

    return <SettingsChoices label={t('language')} choices={languages} value={section.data.displayLanguage} onChange={pick} />;
}
