'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { graduatesStyleOf } from '@/lib/invitation/graduatesStyles';
import type { ListItem } from '@/lib/invitation/listEdits';
import { GRADUATES_STYLES, type GraduatesStyle } from '@/lib/invitation/sections';
import { setGraduatesStyle } from '@/lib/invitation/sectionSettingsEdits';

// The graduates of a Graduates block: its style, rows by name, and the fields of the one open. Their
// photos stay on the block itself, as the godparents' do.
export function useGraduatesSettings(scope: SettingsScope<SectionOf<'graduates'>>) {
    const t = useTranslations('InvitationEditor');
    const { section, edit } = scope;
    const labelOf = useCallback((graduate: ListItem<'graduates'>) => graduate.name.trim() || t('sectionSettings.untitled'), [t]);
    const list = useListSettings(scope, 'graduates', labelOf);
    const styles = useMemo(() => GRADUATES_STYLES.map((value) => ({ value, label: t(`sectionSettings.graduatesStyles.${value}`) })), [t]);
    const setStyle = useCallback((style: GraduatesStyle) => edit(setGraduatesStyle(section.id, style)), [edit, section.id]);

    return {
        list,
        title: t('sectionNames.graduates'),
        addLabel: t('sectionSettings.addGraduate'),
        styleLabel: t('sectionSettings.graduatesStyle'),
        styles,
        style: graduatesStyleOf(section.data),
        setStyle,
        setName: list.fieldSaver('name'),
        setDegree: list.fieldSaver('degree'),
        setUniversity: list.fieldSaver('university'),
    };
}
