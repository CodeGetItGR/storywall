'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSettingsItem } from '@/hooks/useSettingsItem';
import { setStayLinks } from '@/lib/invitation/sectionSettingsEdits';

// The places to stay as rows, and the links of the one open.
export function useStaysSettings({ section, edit }: SettingsScope<SectionOf<'accommodation'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { items } = section.data;
    const { item, open, close } = useSettingsItem(items);
    const itemId = item?.id;

    const setWebsite = useCallback((website: string) => itemId && edit(setStayLinks(section.id, itemId, { website })), [edit, itemId, section.id]);
    const setMap = useCallback((mapUrl: string) => itemId && edit(setStayLinks(section.id, itemId, { mapUrl })), [edit, itemId, section.id]);

    const nameOf = (entry: (typeof items)[number]) => entry.name.trim() || t('stays');
    const rows = items.map((entry) => ({ id: entry.id, label: nameOf(entry) }));

    return { rows, item, itemTitle: item ? nameOf(item) : '', open, close, setWebsite, setMap };
}
