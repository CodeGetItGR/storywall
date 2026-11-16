'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ListItem } from '@/lib/invitation/listEdits';

// The places to stay as rows, and the details and links of the one open.
export function useStaysSettings(scope: SettingsScope<SectionOf<'accommodation'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const labelOf = useCallback((item: ListItem<'stays'>) => item.name.trim() || t('stays'), [t]);
    const list = useListSettings(scope, 'stays', labelOf);
    const save = list.fieldSaver;

    return {
        list,
        setName: save('name'),
        setAddress: save('address'),
        setPhone: save('phone'),
        setEmail: save('email'),
        setWebsite: save('website'),
        setMap: save('mapUrl'),
    };
}
