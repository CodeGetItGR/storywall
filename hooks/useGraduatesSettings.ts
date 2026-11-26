'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ListItem } from '@/lib/invitation/listEdits';

// The graduates of a Graduates block: rows by name, and the fields of the one open. Their photos stay on
// the block itself, as the godparents' do.
export function useGraduatesSettings(scope: SettingsScope<SectionOf<'graduates'>>) {
    const t = useTranslations('InvitationEditor');
    const labelOf = useCallback((graduate: ListItem<'graduates'>) => graduate.name.trim() || t('sectionSettings.untitled'), [t]);
    const list = useListSettings(scope, 'graduates', labelOf);

    return {
        list,
        title: t('sectionNames.graduates'),
        addLabel: t('sectionSettings.addGraduate'),
        setName: list.fieldSaver('name'),
        setDegree: list.fieldSaver('degree'),
        setUniversity: list.fieldSaver('university'),
    };
}
